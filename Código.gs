const ID_SHEET = '1e-bUwDRWE6ijS2wC9Uz0Q_YiAgneNMpDWAJgWP9QdHU';
const NOMBRE_HOJA = 'Hoja 1'; 
const NOMBRE_HOJA_CLAVE = 'Hoja 2'; // Aquí definimos dónde está tu contraseña

// ==========================================
// CONFIGURACIÓN DE PLATAFORMAS
// ==========================================
const PLATAFORMAS = [
  {
    nombre: 'Netflix',
    remitente: 'info@account.netflix.com',
    regex: /Ingresa este código para iniciar sesión[\s\S]*?(\d\s*\d\s*\d\s*\d)/i
  }
];

// ==========================================
// 1. FRONTEND Y CONSULTA (TU APLICACIÓN WEB)
// ==========================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Visor de OTP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Ahora la función recibe el correo y la contraseña
function obtenerUltimoOTP(correoIngresado, claveIngresada) {
  try {
    if (!correoIngresado || correoIngresado.trim() === "") return { error: "Ingresa un correo." };
    if (!claveIngresada || claveIngresada.trim() === "") return { error: "Ingresa la contraseña." };

    const libro = SpreadsheetApp.openById(ID_SHEET);
    
    // --- VERIFICACIÓN DE CONTRASEÑA ---
    const hojaClave = libro.getSheetByName(NOMBRE_HOJA_CLAVE);
    if (!hojaClave) {
      return { error: "Error interno: No se encontró la 'Hoja 2' en tu base de datos." };
    }
    
    // Leemos el valor de la celda A1 y lo comparamos con lo que el usuario escribió
    const claveReal = hojaClave.getRange('A1').getValue().toString().trim();
    if (claveIngresada.trim() !== claveReal) {
      return { error: "Contraseña incorrecta. Acceso denegado." };
    }
    // -----------------------------------

    correoIngresado = correoIngresado.trim().toLowerCase();
    const sheet = libro.getSheetByName(NOMBRE_HOJA);
    const datos = sheet.getDataRange().getValues();

    // Buscar el correo de ABAJO hacia ARRIBA
    for (let i = datos.length - 1; i > 0; i--) { 
      let correoEnFila = datos[i][1].toString().trim().toLowerCase(); 
      
      if (correoEnFila === correoIngresado || correoEnFila.includes(correoIngresado)) {
        return {
          fecha: Utilities.formatDate(new Date(datos[i][0]), "GMT-5", "dd/MM/yyyy HH:mm:ss"), 
          otp: datos[i][2].toString() 
        };
      }
    }
    return { error: "No se encontraron códigos en la base de datos para este correo." };

  } catch (e) {
    return { error: "Error al consultar la base de datos: " + e.toString() };
  }
}

// ==========================================
// 2. AUTOMATIZADOR (LLENADO DE LA BASE DE DATOS)
// ==========================================

function guardarCorreosEnSheet() {
  const sheet = SpreadsheetApp.openById(ID_SHEET).getSheetByName(NOMBRE_HOJA);
  
  PLATAFORMAS.forEach(plataforma => {
    const query = `is:unread from:${plataforma.remitente}`;
    const hilos = GmailApp.search(query, 0, 10);

    hilos.forEach(hilo => {
      let mensajes = hilo.getMessages();
      mensajes.forEach(mensaje => {
        if (mensaje.isUnread()) {
          let cuerpo = mensaje.getPlainBody();
          let destinatario = mensaje.getTo(); 
          let correoMatch = destinatario.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
          let correoLimpio = correoMatch ? correoMatch[1] : destinatario;
          let match = cuerpo.match(plataforma.regex);

          if (match && match[1]) {
            let otp = match[1].replace(/\s+/g, '');
            sheet.appendRow([mensaje.getDate(), correoLimpio, otp, plataforma.nombre]);
          }
          mensaje.markRead(); 
        }
      });
    });
  });
}