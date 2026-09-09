'use strict';
var GAME_VERSION = 30;
try {
  if (localStorage.getItem('sqVer') && parseInt(localStorage.getItem('sqVer'), 10) < GAME_VERSION) {
    localStorage.setItem('sqVer', String(GAME_VERSION));
    location.reload();
  } else {
    localStorage.setItem('sqVer', String(GAME_VERSION));
  }
} catch (e) {}
var ASPECT = 1.58;
var TOP_PAD = 78;
var H = 822;
var VW = 520, DW = 260, LANES = [];
var LINE_Y = 240, STAND_Y = 286, START_Y = 780;
var DOLL_W = 242, DOLL_H = 230;
var GUARD_W = 41, GX_L = 146, GX_R = 340, GY = 167;
var PLAYER_W = 32;
var RUN_MS = 20500;
var GAME_TIME = 60000;
var timerRunning = false;
var remainingTime = 60000;
var timedOut = false;
var level = 1, lastScore = 0, runPoints = 0, runOver = false, pendingScore = 0;
var board = [];
// Dificultad por nivel: 1-3 progresivo, 4+ muro casi imposible
function diff() {
  var d = { time: 60000, grace: 380, redMin: 900, redMax: 1800, boost: 0, run: 20500 };
  if (level >= 2) { d.time = 56000; d.grace = 340; d.redMin = 950;  d.redMax = 1900; d.boost = .08; }
  if (level >= 3) { d.time = 51000; d.grace = 285; d.redMin = 1050; d.redMax = 2100; d.boost = .22; }
  if (level >= 4) { d.time = 42000; d.grace = 200; d.redMin = 1500; d.redMax = 2800; d.boost = .5;  d.run = 21500; }
  if (level >= 5) { d.time = 39000; d.grace = 175; d.redMin = 1700; d.redMax = 3100; d.boost = .62; d.run = 22200; }
  if (level >= 6) { d.time = 36000; d.grace = 155; d.redMin = 1900; d.redMax = 3300; d.boost = .7;  d.run = 22800; }
  if (level >= 7) { d.time = 34000; d.grace = 140; d.redMin = 2100; d.redMax = 3500; d.boost = .76; d.run = 23400; }
  if (level >= 8) { d.time = 32000; d.grace = 125; d.redMin = 2300; d.redMax = 3700; d.boost = .8;  d.run = 24000; }
  return d;
}
function levelTime() { return diff().time; }
function loadBoard() {
  board = [];
  try {
    var b = JSON.parse(localStorage.getItem('sqBoard') || '[]');
    if (Object.prototype.toString.call(b) === '[object Array]') {
      for (var i = 0; i < b.length && board.length < 5; i++) {
        if (b[i] && isFinite(b[i].s) && b[i].s > 0) board.push({ n: String(b[i].n || 'JUGADOR').slice(0, 10), s: Math.round(b[i].s) });
      }
      board.sort(function(a, c){ return c.s - a.s; });
    }
  } catch (e) { board = []; }
}
function saveBoard() {
  try { localStorage.setItem('sqBoard', JSON.stringify(board.slice(0, 5))); } catch (e) {}
}
function qualifies(s) {
  if (!(s > 0)) return false;
  if (board.length < 5) return true;
  return s > board[board.length - 1].s;
}
function renderBoard() {
  var list = $('boardList');
  if (!list) return;
  list.innerHTML = '';
  var medals = ['1', '2', '3', '4', '5'];
  for (var i = 0; i < board.length; i++) {
    var li = document.createElement('li');
    li.textContent = medals[i] + ' · ' + board[i].n + ' — ' + board[i].s + ' pts';
    list.appendChild(li);
  }
  if (!board.length) {
    var li0 = document.createElement('li');
    li0.textContent = 'Sin marcas aún. ¡Sé la primera leyenda!';
    list.appendChild(li0);
  }
}
loadBoard();
var A = 'assets/', AU = A + 'audio/', IM = A + 'images/';

var SHEETS = {
  'yh-front':   { f: 'sprites/younghee-turn-front-spritesheet.png', n: 9,  fps: 24 },
  'yh-back':    { f: 'sprites/younghee-turn-back-spritesheet.png',  n: 13, fps: 24 },
  'yh-angry':   { f: 'sprites/younghee-angry-spritesheet.png',      n: 27, fps: 24 },
  'yh-lines':   { f: 'sprites/younghee-chant-lines-spritesheet.png',n: 22, fps: 22 },
  'p1-back':    { f: 'sprites/person-1-back-walk-spritesheet.png',  n: 19, fps: 35 },
  'p1-front':   { f: 'sprites/person-1-front-walk-spritesheet.png', n: 20, fps: 35 },
  'p2-back':    { f: 'sprites/person-2-back-walk-spritesheet.png',  n: 19, fps: 35 },
  'p2-front':   { f: 'sprites/person-2-front-walk-spritesheet.png', n: 20, fps: 35 },
  'guard':      { f: 'sprites/pink-suit-1.png',                     n: 1,  fps: 1  },
  'pig-intro':  { f: 'sprites/pig-intro-spritesheet.png',           n: 96, fps: 24 },
  'pig-sparkle':{ f: 'sprites/pig-sparkle-spritesheet.png',         n: 95, fps: 24 }
};
var CONFETTI_FILES = [];
for (var ci = 1; ci <= 14; ci++) {
  var nn = (ci < 10 ? '0' : '') + ci;
  CONFETTI_FILES.push('confetti/ellipse' + nn + '.png');
  CONFETTI_FILES.push('confetti/polygon' + nn + '.png');
  CONFETTI_FILES.push('confetti/rectangle' + nn + '.png');
}
var SOUNDS = ['player-1-walking','player-2-walking','player-3-walking','player-4-walking',
  'player-5-walking','player-6-walking','younghee-chant-slow','younghee-chant-regular',
  'younghee-chant-fast','younghee-turn-away','younghee-turn-forward','player-caught',
  'player-crosses','end-confetti','end-lose','end-pig'];

var imgs = {}, snds = {};
var assetsReady = false;

function loadAssets(done) {
  var total = Object.keys(SHEETS).length + SOUNDS.length + CONFETTI_FILES.length;
  var loaded = 0;
  function tickOne() {
    loaded++;
    var pct = Math.round(loaded / total * 100);
    var fill = document.getElementById('loadFill');
    var pctEl = document.getElementById('loadPct');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (loaded >= total) { assetsReady = true; if (done) done(); }
  }
  Object.keys(SHEETS).forEach(function(k) {
    var im = new Image();
    im.onload = tickOne; im.onerror = tickOne;
    im.src = IM + SHEETS[k].f;
    imgs[k] = im;
  });
  SOUNDS.forEach(function(s) {
    var a = new Audio(AU + s + '.mp3');
    a.preload = 'auto';
    a.addEventListener('canplaythrough', tickOne, { once: true });
    a.addEventListener('error', tickOne, { once: true });
    snds[s] = a;
  });
  CONFETTI_FILES.forEach(function(f) {
    var im = new Image();
    im.onload = tickOne; im.onerror = tickOne;
    im.src = IM + f;
    imgs['cf_' + f] = im;
  });
}

var muted = false;
var audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  Object.values(snds).forEach(function(a) {
    var p = a.play();
    if (p && p.catch) p.catch(function(){});
    a.pause();
    a.currentTime = 0;
  });
  audioUnlocked = true;
}
function playSnd(name, loop, vol) {
  if (muted || !snds[name]) return null;
  if (!audioUnlocked) return null; // silenciar hasta desbloquear
  var base = snds[name];
  try { base.pause(); } catch (e) {}
  base.loop = !!loop;
  base.volume = vol == null ? .55 : vol;
  base.currentTime = 0;
  var p = base.play();
  if (p && p.catch) p.catch(function(){});
  return base;
}
function stopSnd(name) {
  if (!snds[name]) return;
  try { snds[name].pause(); } catch (e) {}
}
function stopAllLooping() {
  SOUNDS.forEach(function(s){ stopSnd(s); });
}

function sheet(key) { return SHEETS[key]; }
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawFrame(key, idx, x, y, w) {
  var s = SHEETS[key], im = imgs[key];
  if (!im || !im.complete || !im.naturalWidth) return;
  var fw = im.naturalWidth / s.n, fh = im.naturalHeight;
  idx = Math.max(0, Math.min(s.n - 1, idx | 0));
  var scale = w / fw;
  ctx.drawImage(im, idx * fw, 0, fw, fh, x, y, fw * scale, fh * scale);
}

function Anim(key, loop) {
  this.key = key; this.t = 0; this.done = false; this.loop = !!loop;
  Object.defineProperty(this, 'frame', { get: function() {
    var s = SHEETS[this.key];
    var f = Math.floor(this.t / 1000 * s.fps);
    return this.loop ? (f % s.n) : Math.min(f, s.n - 1);
  }});
  Object.defineProperty(this, 'finished', { get: function() {
    if (this.loop) return false;
    var s = SHEETS[this.key];
    return this.t >= (s.n / s.fps) * 1000;
  }});
}
Anim.prototype.step = function(dt) { this.t += dt; };

var cv = document.getElementById('game');
var ctx = cv.getContext('2d');
function $(id) { return document.getElementById(id); }
var stage = $('stage');

var state = 'card';
var players = [], phase = 'green', phaseT = 0, phaseDur = 3000;
var graceT = 0, punished = false, moving = false, walkPhase = 0;
var shakeT = 0, lastT = 0, loadTick = 0;
var dollAnim = null, dollState = 'idleFront', linesOn = false, chantName = null;
var pigAnim = null, pigPhase = 0;
var confetti = [], redAfter = 0;

function rnd(a, b) { return a + Math.random() * (b - a); }

function initPlayers() {
  var base = [1.1, 1.02, 0.95, 0.9, 0.84, 0.78].sort(function(){ return Math.random() - .5; });
  players = [];
  for (var i = 0; i < 6; i++) {
    players.push({ idx: i, kind: (i % 2 === 0) ? 'p1' : 'p2', x: 0, p: 0,
      alive: true, crossed: false, deadT: 0, anim: null, walkSndOn: false, speed: base[i] });
  }
}
function setMovingUI() {
  var b = $('btnGo');
  if (b) b.classList.toggle('active', moving);
}
function setPhaseUI() {
  var chip = $('phaseChip');
  if (!chip) return;
  if (state !== 'playing') {
    chip.className = 'chip'; chip.innerHTML = '&#9209; En espera';
    return;
  }
  if (phase === 'green') {
    chip.className = 'chip green'; chip.innerHTML = '&#128994; LUZ VERDE';
  } else {
    chip.className = 'chip red'; chip.innerHTML = '&#128308; LUZ ROJA';
  }
}
function fmtTime(ms) {
  var total = Math.max(0, Math.ceil(ms / 1000));
  var m = Math.floor(total / 60), s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function updateHud() {
  var al = $('aliveCount'), cr = $('crossedCount'), timerEl = $('timeLeft');
  var alive = 0, crossed = 0, i;
  for (i = 0; i < players.length; i++) {
    if (players[i].crossed) crossed++;
    else if (players[i].alive) alive++;
  }
  if (al) al.textContent = String(alive);
  if (cr) cr.textContent = String(crossed);
  var lt = $('lvlTag'); if (lt) lt.textContent = 'NIVEL ' + level;
  var pt = $('ptsTag'); if (pt) pt.textContent = 'PUNTOS ' + runPoints;
  var urgent = (state === 'playing' && remainingTime <= 10000);
  if (timerEl) timerEl.textContent = fmtTime(remainingTime);
  var pill = $('timePill');
  if (pill && pill.classList) {
    if (urgent) pill.classList.add('warning');
    else pill.classList.remove('warning');
  } else if (timerEl && timerEl.classList) {
    if (urgent) timerEl.classList.add('warning');
    else timerEl.classList.remove('warning');
  }
  var fill = $('timeFill'), bar = $('timebar');
  if (fill) fill.style.width = (Math.max(0, remainingTime) / levelTime() * 100).toFixed(1) + '%';
  if (bar && bar.classList) {
    if (urgent) bar.classList.add('urgent');
    else bar.classList.remove('urgent');
  }
}
function updateTimerUI() { updateHud(); }

function pressGo() {
  if (state !== 'playing') return;
  moving = true; setMovingUI();
}
function releaseGo() { moving = false; setMovingUI(); }

function pickChant() {
  var crossedN = players.filter(function(p){ return p.crossed; }).length;
  var r = Math.random();
  var pFast, pReg;
  if (crossedN >= 4) { pFast = .7; pReg = .25; }
  else if (crossedN >= 2) { pFast = .5; pReg = .3; }
  else { pFast = .1; pReg = .4; }
  pFast = Math.min(.88, pFast + diff().boost);
  if (r < pFast) return 'younghee-chant-fast';
  if (r < pFast + pReg) return 'younghee-chant-regular';
  return 'younghee-chant-slow';
}
var chantDur = 3600;
function startChant() {
  chantName = pickChant();
  var el = snds[chantName];
  chantDur = (el && isFinite(el.duration) && el.duration > .5) ? el.duration * 1000 : 3600;
  playSnd(chantName, false, .62);
}
function startGreenPhase(first) {
  phase = 'green'; phaseT = 0;
  phaseDur = first ? rnd(2000, 3200) : rnd(1800, 3800);
  punished = false;
  dollState = 'turning-away';
  dollAnim = new Anim('yh-back', false);
  stopSnd('younghee-turn-forward');
  playSnd('younghee-turn-away', false, .6);
  setPhaseUI();
}
function startRedPhase() {
  phase = 'red'; phaseT = 0; graceT = GRACE_MS();
  linesOn = false;
  if (chantName) { stopSnd(chantName); chantName = null; }
  dollState = 'turning-danger';
  dollAnim = new Anim('yh-front', false);
  playSnd('younghee-turn-forward', false, .6);
  setPhaseUI();
}
function GRACE_MS() { return diff().grace; }

function startWalk(pl) {
  if (pl.walkSndOn) return;
  pl.walkSndOn = true;
  var el = playSnd('player-' + (pl.idx + 1) + '-walking', true, .38);
  if (el) { try { el.playbackRate = Math.max(.85, Math.min(1.3, .78 + pl.speed * .4)); } catch (e) {} }
}
function stopWalk(pl) {
  pl.walkSndOn = false;
  stopSnd('player-' + (pl.idx + 1) + '-walking');
}
function punish() {
  var pool = players.filter(function(p){ return p.alive && !p.crossed; });
  if (!pool.length) return;
  pool.sort(function(a, b){ return b.p - a.p; });
  pool[0].alive = false; pool[0].deadT = 0; stopWalk(pool[0]);
  punished = true; shakeT = 380;
  dollState = 'angry'; dollAnim = new Anim('yh-angry', false);
  playSnd('player-caught', false, .7);
  updateHud();
}
function spawnImgConfetti(n) {
  for (var i = 0; i < n; i++) {
    var f = CONFETTI_FILES[(Math.random() * CONFETTI_FILES.length) | 0];
    confetti.push({ im: 'cf_' + f, x: Math.random() * VW, y: rnd(-H * .9, -20),
      vy: rnd(.06, .17), rot: rnd(0, 6.28), vr: rnd(-.004, .004),
      s: rnd(.35, .7), sway: rnd(0, 6.28), swayV: rnd(.001, .003) });
  }
}
function resetRound() {
  initPlayers();
  phase = 'green'; phaseT = 0; phaseDur = 0;
  graceT = 0; punished = false; moving = false; setMovingUI();
  confetti = []; shakeT = 0;
  pigAnim = null; pigPhase = 0; redAfter = 0;
  linesOn = false; chantName = null; dollState = 'idleFront'; dollAnim = null;
  timerRunning = false; remainingTime = levelTime(); timedOut = false;
  update._lastSec = Math.ceil(levelTime() / 1000);
  $('endOverlay').classList.add('hidden');
  setPhaseUI(); updateHud();
}
function startGame() {
  if (state === 'playing') return;
  if (!assetsReady) return;
  resetRound();
  state = 'playing';
  setPhaseUI();
  requestAnimationFrame(fitCanvas);
  var b = $('btnGo');
  if (b) b.disabled = false;
  startGreenPhase(true);
  timerRunning = true;
  remainingTime = levelTime();
  timedOut = false;
  update._lastSec = Math.ceil(levelTime() / 1000);
  updateHud();
}
function startRun() {
  level = 1; runPoints = 0; pendingScore = 0; runOver = false;
  startGame();
}
function enterAppMode() {
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!touch && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
  try {
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) { var r = fn.call(el); if (r && r.catch) r.catch(function(){}); }
  } catch (e) {}
}
function backToStartOverlay() {
  state = 'card';
  stopAllLooping();
  resetRound();
  var startO = document.getElementById('startOverlay');
  if (startO) startO.classList.remove('hidden');
}
function endGame(wasTimeout) {
  if (state === 'over') return;
  state = 'over';
  moving = false; setMovingUI();
  var b = $('btnGo');
  if (b) b.disabled = true;
  players.forEach(stopWalk);
  if (chantName) { stopSnd(chantName); chantName = null; }
  linesOn = false;
  timerRunning = false;
  var n = players.filter(function(p){ return p.crossed; }).length;
  var win = (n >= 4);
  var timeBonus = win ? Math.ceil(Math.max(0, remainingTime) / 1000) * 10 : 0;
  lastScore = n * 100 + timeBonus + (win ? level * 25 : 0);
  runPoints += lastScore;
  var rb = $('retryBtn'), bw = $('boardWrap'), nr = $('nameRow');
  if (bw) bw.classList.add('hidden');
  if (win) {
    if (level < 12) level++;
    runOver = false;
    if (rb) rb.textContent = 'Siguiente nivel ▸';
  } else {
    level = 1;
    runOver = true;
    pendingScore = runPoints;
    if (rb) rb.textContent = 'Empezar de nuevo';
  }
  updateHud();
  var t = $('endTitle'), m = $('endMsg'), sc = $('endScore');
  if (n === 0) {
    t.className = 'end-title pink'; t.textContent = wasTimeout ? '¡Tiempo agotado!' : 'Eliminados';
    m.textContent = wasTimeout ? 'Se acabó el tiempo y ningún jugador cruzó la meta.' : 'Ningún jugador cruzó la meta.';
    playSnd('end-lose', false, .75);
  } else if (n === 6) {
    t.className = 'end-title gold'; t.textContent = '¡PERFECTO!';
    m.textContent = 'Los 6 jugadores cruzaron. La hucha se llena. ¡Subes al nivel ' + level + '!';
    pigPhase = 1; pigAnim = new Anim('pig-intro', false);
    playSnd('end-pig', false, .85);
    spawnImgConfetti(60);
  } else if (win) {
    t.className = 'end-title green'; t.textContent = wasTimeout ? '¡Tiempo agotado!' : '¡Ronda superada!';
    m.textContent = n + ' de 6 cruzaron la meta. ¡Subes al nivel ' + level + '!';
    spawnImgConfetti(90);
    playSnd('end-confetti', false, .8);
  } else {
    t.className = 'end-title pink'; t.textContent = wasTimeout ? '¡Tiempo agotado!' : 'Casi lo logras';
    m.textContent = 'Solo ' + n + ' de 6 cruzaron. Vuelves al nivel 1.';
    playSnd('end-lose', false, .75);
  }
  if (sc) sc.textContent = '+' + lastScore + ' pts · Total ' + runPoints;
  if (!win && bw) {
    renderBoard();
    bw.classList.remove('hidden');
    if (nr) {
      if (qualifies(pendingScore)) {
        nr.classList.remove('hidden');
        var ni = $('nameInput');
        if (ni) ni.value = '';
        setTimeout(function(){ if (ni && ni.focus) { try { ni.focus(); } catch (e) {} } }, 950);
      } else nr.classList.add('hidden');
    }
  }
  setTimeout(function(){ $('endOverlay').classList.remove('hidden'); }, n === 6 ? 4300 : 900);
}

function update(dt) {
  var i, pl;
  players.forEach(function(p){ p.x = LANES[p.idx]; });

  for (i = confetti.length - 1; i >= 0; i--) {
    var cf = confetti[i];
    cf.sway += cf.swayV * dt;
    cf.x += Math.sin(cf.sway) * .35; cf.y += cf.vy * dt; cf.rot += cf.vr * dt;
    if (cf.y > H + 40) confetti.splice(i, 1);
  }
  shakeT = Math.max(0, shakeT - dt);
  players.forEach(function(p){ if (!p.alive) p.deadT = Math.min(400, p.deadT + dt); });

  if (dollAnim) {
    dollAnim.step(dt);
    if (dollState === 'turning-away' && dollAnim.finished) {
      dollState = 'idleBack'; dollAnim = null; linesOn = true;
      startChant();
      phaseDur = chantDur + 120;
    } else if (dollState === 'turning-danger' && dollAnim.finished) {
      dollState = 'idleFront'; dollAnim = null;
    } else if (dollState === 'angry' && dollAnim.finished) {
      dollState = phase === 'red' ? 'idleFront' : 'idleBack';
      dollAnim = null;
    }
  }
  if (pigPhase === 1 && pigAnim && pigAnim.finished) { pigPhase = 2; pigAnim = new Anim('pig-sparkle', true); }

  if (state !== 'playing') return;

  // Temporizador de 1 minuto - cuenta regresiva
  if (timerRunning) {
    remainingTime -= dt;
    if (remainingTime <= 0) {
      remainingTime = 0;
      timerRunning = false;
      timedOut = true;
      updateHud();
      endGame(true);
      return;
    }
    var secNow = Math.ceil(remainingTime / 1000);
    if (secNow !== update._lastSec) { update._lastSec = secNow; updateHud(); }
  }

  if (phase === 'green') {
    phaseT += dt;
    var turnDone = dollState === 'idleBack';
    if (phaseT >= phaseDur && turnDone) startRedPhase();
  } else {
    phaseT += dt; graceT -= dt;
    var turning = dollState === 'turning-danger';
    if (!turning && moving && !punished && graceT <= 0) punish();
    if (!turning && dollState !== 'angry' && redAfter <= 0) { var dd = diff(); redAfter = rnd(dd.redMin, dd.redMax); }
    if (redAfter > 0) { redAfter -= dt; if (redAfter <= 0) { redAfter = 0; startGreenPhase(false); } }
  }

  // DINAMICA ESTRICTA: mientras O este presionado avanzan, en cualquier fase
  if (moving) {
    var sp = dt / diff().run;
    players.forEach(function(p2){
      if (p2.alive && !p2.crossed) {
        p2.p = Math.min(1, p2.p + sp * p2.speed);
        startWalk(p2);
        if (!p2.anim || p2.anim.key !== p2.kind + '-back') p2.anim = new Anim(p2.kind + '-back', true);
        if (p2.anim) p2.anim.step(dt * p2.speed);
      }
    });
  } else {
    players.forEach(function(p3){
      if (!p3.crossed && p3.alive && p3.walkSndOn) { stopWalk(p3); p3.anim = null; }
    });
  }

  for (i = 0; i < players.length; i++) {
    pl = players[i];
    if (!pl.crossed && pl.alive && pl.p >= 1) {
      pl.crossed = true; pl.p = 1; stopWalk(pl); pl.anim = null;
      playSnd('player-crosses', false, .6);
      updateHud();
    }
  }
  var done = players.every(function(px){ return px.crossed || !px.alive; });
  if (done) endGame();
}
function runnerY(p) { return START_Y - p * (START_Y - STAND_Y); }
var specks = [];

function draw(now, dt) {
  dt = dt || 16.7;
  if (!LANES.length || Math.abs(H - (Math.round(VW * ASPECT) + TOP_PAD)) > 2) layoutScene(VW);
  var wantH = Math.round(cv.width * H / VW);
  if (Math.abs(cv.height - wantH) > 1) cv.height = wantH;
  var k = cv.width / VW;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (shakeT > 0) ctx.translate(rnd(-7, 7) * (shakeT / 380), rnd(-5, 5) * (shakeT / 380));

  var sky = ctx.createLinearGradient(0, 0, 0, LINE_Y + 10);
  sky.addColorStop(0, '#9fd7ec'); sky.addColorStop(1, '#e3f4fb');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, LINE_Y + 10);

  var field = ctx.createLinearGradient(0, LINE_Y, 0, H);
  field.addColorStop(0, '#e6cda1'); field.addColorStop(1, '#caa87b');
  ctx.fillStyle = field; ctx.fillRect(0, LINE_Y + 10, VW, H - LINE_Y);
  ctx.fillStyle = 'rgba(110,80,45,.15)';
  for (var i = 0; i < specks.length; i++) ctx.fillRect(specks[i].x, specks[i].y, 2.2, 2.2);

  ctx.fillStyle = '#f6f1e7'; ctx.fillRect(0, LINE_Y, VW, 8);
  ctx.fillStyle = '#403a5e';
  for (var dx = 14; dx < VW; dx += 46) ctx.fillRect(dx, LINE_Y + 3.2, 22, 2.6);

  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath(); ctx.moveTo(14, START_Y + 8); ctx.lineTo(VW - 14, START_Y + 8); ctx.stroke();
  ctx.setLineDash([]);

  drawFrame('guard', 0, GX_L, GY, GUARD_W);
  drawFrame('guard', 0, GX_R, GY, GUARD_W);

  if (dollState === 'idleBack' || dollState === 'turning-away')
    drawFrame('yh-back', dollAnim ? dollAnim.frame : SHEETS['yh-back'].n - 1, Math.round(DW - DOLL_W / 2), LINE_Y - DOLL_H, DOLL_W);
  else if (dollState === 'angry') drawFrame('yh-angry', dollAnim ? dollAnim.frame : SHEETS['yh-angry'].n - 1, Math.round(DW - DOLL_W / 2), LINE_Y - DOLL_H, DOLL_W);
  else if (dollState === 'idleFront')
    drawFrame('yh-front', SHEETS['yh-front'].n - 1, Math.round(DW - DOLL_W / 2), LINE_Y - DOLL_H, DOLL_W);
  else
    drawFrame('yh-front', dollAnim ? dollAnim.frame : 0, Math.round(DW - DOLL_W / 2), LINE_Y - DOLL_H, DOLL_W);

  if (linesOn) drawFrame('yh-lines', dollLinesFrame(dt), Math.round(DW - DOLL_W / 2), LINE_Y - DOLL_H, DOLL_W);

  var order = players.slice().sort(function(a, b){ return runnerY(a.p) - runnerY(b.p); });
  for (i = 0; i < order.length; i++) drawPlayer(order[i], now);

  for (i = 0; i < confetti.length; i++) {
    var f = confetti[i], im = imgs[f.im];
    if (!im || !im.complete) continue;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
    var w2 = im.naturalWidth * f.s;
    ctx.drawImage(im, -w2 / 2, -w2 / 2, w2, w2);
    ctx.restore();
  }

  if (pigPhase > 0) {
    ctx.fillStyle = 'rgba(12,8,20,.82)';
    ctx.fillRect(0, 0, VW, H);
    var key = pigPhase === 1 ? 'pig-intro' : 'pig-sparkle';
    if (pigAnim) { var pw = Math.min(Math.round(VW * .88), Math.round(H * .6)); pigAnim.step(dt); drawFrame(key, pigAnim.frame, Math.round(DW - pw / 2), Math.round(H * .06), pw); }
  }

  if (state === 'playing') {
    if (phase === 'red') {
      var a = .14 + .1 * Math.sin(now / 90);
      ctx.strokeStyle = 'rgba(255,46,99,' + a.toFixed(3) + ')';
      ctx.lineWidth = 24; ctx.strokeRect(0, 0, VW, H);
    }
  }
}
var _linesA = new Anim('yh-lines', true);
function dollLinesFrame(dt) { _linesA.step(dt); return _linesA.frame; }

function drawPlayer(pl, now) {
  if (!isFinite(pl.x)) pl.x = LANES[pl.idx] || DW;
  var y = runnerY(pl.p);
  if (!isFinite(y) || y < -90 || y > H + 90) y = START_Y;
  var deadK = pl.alive ? 0 : Math.min(1, pl.deadT / 320);
  ctx.save();
  ctx.translate(pl.x, y);
  if (!pl.alive) { ctx.rotate((Math.PI / 2) * deadK); ctx.globalAlpha = 1 - deadK * .55; }
  else {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(0, 2, PLAYER_W * .42, PLAYER_W * .11, 0, 0, Math.PI * 2); ctx.fill();
  }
  var key;
  if (pl.crossed) key = pl.kind + '-front';
  else key = pl.kind + '-back';
  var frame = (!pl.alive || !pl.anim) ? 0 : pl.anim.frame;
  var im = imgs[key];
  if (!im || !im.complete || !im.naturalWidth) {
    ctx.fillStyle = '#14967f';
    roundRect(-PLAYER_W * .31, -PLAYER_W * 1.95, PLAYER_W * .62, PLAYER_W * 1.84, PLAYER_W * .2); ctx.fill();
    ctx.fillStyle = '#17171a';
    ctx.beginPath(); ctx.arc(0, -PLAYER_W * 2.12, PLAYER_W * .26, 0, Math.PI * 2); ctx.fill();
  } else {
    drawFrame(key, frame, Math.round(-PLAYER_W / 2), -Math.round(PLAYER_W * 80 / 37), PLAYER_W);
  }
  ctx.restore();
  if (!pl.alive && deadK > 0) {
    var th = (Math.PI / 2) * deadK;
    var cx = pl.x + PLAYER_W * 1.08 * Math.sin(th);
    var cy = y - PLAYER_W * 1.08 * Math.cos(th);
    var r = PLAYER_W * .52;
    ctx.save();
    ctx.globalAlpha = deadK;
    ctx.fillStyle = 'rgba(255,46,99,.22)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff2e63';
    ctx.lineWidth = Math.max(3.5, PLAYER_W * .12);
    ctx.lineCap = 'round';
    var s = r * .45;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
    ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
    ctx.stroke();
    ctx.restore();
  }
  if (pl.crossed) {
    ctx.fillStyle = '#2ecc8f';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('\u2713', pl.x, y - PLAYER_W * 2.4);
  }
}

function layoutScene(vw) {
  VW = Math.round(vw); DW = Math.round(VW / 2);
  var baseH = Math.round(VW * ASPECT);
  H = baseH + TOP_PAD;
  LINE_Y = TOP_PAD + Math.round(baseH * .325);
  STAND_Y = LINE_Y + 46;
  START_Y = TOP_PAD + baseH - 58;
  DOLL_W = Math.round(VW * .465);
  DOLL_H = Math.round(DOLL_W * 240 / 252);
  GUARD_W = Math.max(24, Math.round(VW * .079));
  GY = LINE_Y - Math.round(GUARD_W * 80 / 45);
  GX_L = DW - Math.round(DOLL_W / 2) + Math.round(VW * .013);
  GX_R = DW + Math.round(DOLL_W / 2) - GUARD_W - Math.round(VW * .013);
  PLAYER_W = Math.max(18, Math.round(VW * .0615));
  LANES = [];
  var m = Math.max(84, Math.round(VW * .17));
  for (var i = 0; i < 6; i++) LANES.push(Math.round(m + (VW - m * 2) * (i / 5)));
  specks.length = 0;
  for (var s2 = 0; s2 < Math.round(VW / 6); s2++) {
    specks.push({ x: 8 + Math.random() * (VW - 16), y: LINE_Y + 36 + Math.random() * Math.max(40, START_Y - LINE_Y - 46) });
  }
}
function fitCanvas() {
  var r = cv.getBoundingClientRect();
  if (!r.width) return;
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var target = Math.round(Math.min(560, Math.max(380, r.width)));
  if (!LANES.length || Math.abs(target - VW) > 24 || Math.abs(H - (Math.round(VW * ASPECT) + TOP_PAD)) > 2) layoutScene(target);
  cv.width = Math.max(300, Math.round(r.width * dpr));
  cv.height = Math.round(cv.width * H / VW);
  cv.style.height = Math.round(r.width * H / VW) + 'px';
}
window.addEventListener('resize', function() {
  fitCanvas();
  players.forEach(function(p){ p.x = LANES[p.idx]; });
});
if (window.ResizeObserver) {
  new ResizeObserver(function() {
    fitCanvas();
    players.forEach(function(p){ p.x = LANES[p.idx]; });
  }).observe(stage);
}
setTimeout(fitCanvas, 350);

function loop(t) {
  var dt = Math.min(50, t - lastT); lastT = t;
  try {
    update(dt);
    draw(t, dt);
  } catch (err) {
    loop._errCount = (loop._errCount || 0) + 1;
    if (loop._errCount <= 5) console.error('loop error #' + loop._errCount + ':', err);
  }
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', function(e) {
  if (e.code === 'Space' && !e.repeat && state === 'playing') { e.preventDefault(); unlockAudio(); pressGo(); }

  else if (e.code === 'Escape' && state === 'over') { backToStartOverlay(); }
});
document.addEventListener('keyup', function(e){ if (e.code === 'Space') releaseGo(); });
document.addEventListener('visibilitychange', function(){ if (document.hidden) releaseGo(); });
function onRetry() { if (runOver) startRun(); else startGame(); }
$('retryBtn').addEventListener('click', onRetry);
var saveBtn = $('saveScoreBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', function() {
    if (!pendingScore || !qualifies(pendingScore)) return;
    var inp = $('nameInput');
    var nm = (inp && inp.value ? inp.value : '').trim().slice(0, 10) || 'JUGADOR';
    board.push({ n: nm.toUpperCase(), s: Math.round(pendingScore) });
    board.sort(function(a, b){ return b.s - a.s; });
    board = board.slice(0, 5);
    saveBoard();
    pendingScore = 0;
    var nr = $('nameRow');
    if (nr) nr.classList.add('hidden');
    renderBoard();
    updateHud();
  });
}
var ICON_ON = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.2 8.6a4.8 4.8 0 010 6.8M18.6 6.2a8.2 8.2 0 010 11.6" fill="none" stroke-width="1.8" stroke-linecap="round"/></svg>';
var ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke-width="1.8" stroke-linecap="round"/></svg>';
$('soundBtn').addEventListener('click', function() {
  unlockAudio();
  muted = !muted;
  this.innerHTML = muted ? ICON_OFF : ICON_ON;
  this.title = muted ? 'Activar sonido' : 'Silenciar';
  if (muted) stopAllLooping();
});

initPlayers();
fitCanvas();
setPhaseUI();
updateHud();
loadAssets(function(){
  var loadO = document.getElementById('loadOverlay');
  var startO = document.getElementById('startOverlay');
  if (loadO) loadO.classList.add('hidden');
  if (startO) startO.classList.remove('hidden');
});
requestAnimationFrame(function(t) { lastT = t; requestAnimationFrame(loop); });

// Start card handlers
var startCard = document.getElementById('startCard');
if (startCard) {
  function startFromCard() {
    var startO = document.getElementById('startOverlay');
    if (startO) startO.classList.add('hidden');
    unlockAudio();
    if (runOver) startRun(); else startGame();
  }
  startCard.addEventListener('click', startFromCard);
  startCard.addEventListener('keydown', function(e) {
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); startFromCard(); }
  });
}

setInterval(function() {
  if (location.hash.indexOf('debug') === -1) return;
  var d = document.getElementById('debugPanel');
  if (!d) {
    d = document.createElement('div');
    d.id = 'debugPanel';
    d.style.cssText = 'position:fixed;top:0;left:0;z-index:99;background:#000c;color:#0f0;font:11px monospace;padding:6px;white-space:pre;pointer-events:none;';
    document.body.appendChild(d);
  }
  var p0 = players[0] || {};
  var ib = imgs['p1-back'] || {};
  var st = [
    'state:', state, '| phase:', phase,
    '| players:', players.length,
    '| p0.x:', Math.round(p0.x), 'p0.p:', (p0.p || 0).toFixed(2),
    '| LANES:', JSON.stringify(LANES),
    '| VW:', VW, 'H:', H, 'START_Y:', Math.round(START_Y), 'STAND_Y:', Math.round(STAND_Y),
    '| p1-back:', ib.complete, 'w=', ib.naturalWidth,
    '| cv:', cv.width, 'x', cv.height
  ];
  d.textContent = st.join(' ');
}, 300);

// --- MOBILE TAP-TO-ADVANCE ---
cv.addEventListener('pointerdown', function(e) {
  e.preventDefault();
  unlockAudio();
  pressGo();
});
cv.addEventListener('pointerup', releaseGo);
cv.addEventListener('pointercancel', releaseGo);
cv.addEventListener('pointerleave', releaseGo);
