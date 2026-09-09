/**
 * Apps Script - Portal de Acceso + Juego Squid Game
 * Desplegar como Aplicación web (Ejecutar como: Yo, Acceso: Cualquiera)
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('login')
    .setTitle('Portal de Acceso')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Busca el último OTP para el correo/clave dados.
 * REEMPLAZA ESTA FUNCIÓN con tu lógica real (hoja de cálculo, BD, API, etc.)
 */
function obtenerUltimoOTP(correo, clave) {
  // ===== EJEMPLO CON HOJA DE CÁLCULO =====
  // const SS_ID = 'TU_SPREADSHEET_ID_AQUI';
  // const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('OTPs');
  // const data = sheet.getDataRange().getValues();
  // 
  // for (let i = data.length - 1; i >= 1; i--) { // de abajo hacia arriba (último primero)
  //   const rowCorreo = data[i][0];
  //   const rowClave = data[i][1];
  //   const rowOtp = data[i][2];
  //   const rowFecha = data[i][3];
  //   
  //   if (rowCorreo === correo && rowClave === clave) {
  //     return { otp: rowOtp, fecha: rowFecha };
  //   }
  // }
  // return { error: 'No se encontró coincidencia para ese correo y clave' };

  // ===== EJEMPLO CON PROPIEDADES (ScriptProperties) =====
  // const store = PropertiesService.getScriptProperties();
  // const key = correo + '|' + clave;
  // const stored = store.getProperty(key);
  // if (stored) {
  //   const { otp, fecha } = JSON.parse(stored);
  //   return { otp, fecha };
  // }
  // return { error: 'Credenciales no registradas' };

  // ===== MOCK TEMPORAL (para probar ya) =====
  // BORRA ESTO cuando pongas tu lógica real
  if (correo === 'test@test.com' && clave === 'abc12') {
    return { otp: '847291', fecha: new Date().toLocaleString('es-ES') };
  }
  return { error: 'Credenciales de prueba: test@test.com / abc12' };
}

/**
 * Opcional: guardar OTP nuevo (si tu flujo lo requiere)
 */
function guardarOTP(correo, clave, otp) {
  // const store = PropertiesService.getScriptProperties();
  // const key = correo + '|' + clave;
  // store.setProperty(key, JSON.stringify({ otp, fecha: new Date().toISOString() }));
  // return { ok: true };
}