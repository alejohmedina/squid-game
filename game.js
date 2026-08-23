'use strict';
var GAME_VERSION = 18;
try {
  if (localStorage.getItem('sqVer') && parseInt(localStorage.getItem('sqVer'), 10) < GAME_VERSION) {
    localStorage.setItem('sqVer', String(GAME_VERSION));
    location.reload();
  } else {
    localStorage.setItem('sqVer', String(GAME_VERSION));
  }
} catch (e) {}
var H = 720;
var VW = 520, DW = 260, LANES = [];
var LINE_Y = 316, STAND_Y = 358, START_Y = 662;
var DOLL_W = 170, DOLL_H = 162, LINES_W = 160, LINES_H = 152, LINES_TOP = 10;
var GUARD_W = 45, GX_L = 40, GX_R = 400, GY = 150;
var RUN_MS = 12500;
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
var GO_FRAMES = ['go1.png','go2.png','go3.png','go4.png'];
var STOP_FRAMES = ['stop1.png','stop2.png','stop3.png','stop4.png'];
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
var assetsReady = false, loadPct = 0;

function loadAssets(done) {
  var total = Object.keys(SHEETS).length + SOUNDS.length + CONFETTI_FILES.length + 8;
  var loaded = 0;
  function tickOne() {
    loaded++;
    loadPct = Math.round(loaded / total * 100);
    var el = document.getElementById('loadPct');
    if (el) el.textContent = loadPct + '%';
    var fill = document.getElementById('loadFill');
    if (fill) fill.style.width = loadPct + '%';
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
  GO_FRAMES.concat(STOP_FRAMES).forEach(function(f) {
    var im = new Image();
    im.onload = tickOne; im.onerror = tickOne;
    im.src = IM + 'sprites/' + f;
    imgs[f] = im;
  });
}

var muted = false;
function playSnd(name, loop, vol) {
  if (muted || !snds[name]) return null;
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
  var base = [1.18, 1.1, 1.03, 0.97, 0.91, 0.85].sort(function(){ return Math.random() - .5; });
  players = [];
  for (var i = 0; i < 6; i++) {
    players.push({ idx: i, kind: (i % 2 === 0) ? 'p1' : 'p2', x: 0, p: 0,
      alive: true, crossed: false, deadT: 0, anim: null, walkSndOn: false, speed: base[i] });
  }
}
function setMovingUI() {
  $('btnGo').classList.toggle('active', moving);
}
function setPhaseUI() {
  var chip = $('phaseChip');
  if (state !== 'playing') {
    chip.className = 'chip'; chip.innerHTML = '&#9209; En espera';
    return;
  }
  if (phase === 'green') {
    chip.className = 'chip green'; chip.innerHTML = '&#128994; LUZ VERDE';
  } else {
    chip.className = 'chip red'; chip.innerHTML = '&#128308; LUZ ROJA';
  }
}function updateHud() {
  var al = 0, cr = 0;
  players.forEach(function(p){ if (p.crossed) cr++; else if (p.alive) al++; });
  $('aliveCount').textContent = al;
  $('crossedCount').textContent = cr;
}

function pressGo() {
  if (state !== 'playing') return;
  moving = true; setMovingUI();
}
function releaseGo() { moving = false; setMovingUI(); }
function pressStop_unused() {
  if (state !== 'playing') return;
  moving = false; setMovingUI();

  

}

function pickChant() {
  var crossedN = players.filter(function(p){ return p.crossed; }).length;
  var r = Math.random();
  if (crossedN >= 4) return r < .7 ? 'younghee-chant-fast' : 'younghee-chant-regular';
  if (crossedN >= 2) return r < .5 ? 'younghee-chant-fast'
                      : r < .8 ? 'younghee-chant-regular' : 'younghee-chant-slow';
  return r < .5 ? 'younghee-chant-slow'
          : r < .9 ? 'younghee-chant-regular' : 'younghee-chant-fast';
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
  phaseDur = first ? rnd(2600, 4200) : rnd(2400, 5200);
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
function GRACE_MS() { return Math.ceil(13 / 24 * 1000) + 250; }

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
  $('endOverlay').classList.add('hidden');
  setPhaseUI(); updateHud();
}
function startGame() {
  if (!assetsReady || state === 'playing') return;
  resetRound();
  state = 'playing';
  setPhaseUI();
  $('invite').classList.add('hidden');
  $('exitBtn').classList.add('show');
  $('btnGo').disabled = false;
  startGreenPhase(true);
}
function backToCard() {
  state = 'card';
  stopAllLooping();
  resetRound();
  $('invite').classList.remove('hidden');
  $('exitBtn').classList.remove('show');
  $('btnGo').disabled = true;
}
var lastResultText = '';
function endGame() {
  state = 'over';
  moving = false; setMovingUI();
  $('btnGo').disabled = true;
  players.forEach(stopWalk);
  if (chantName) { stopSnd(chantName); chantName = null; }
  linesOn = false;
  var n = players.filter(function(p){ return p.crossed; }).length;
  var t = $('endTitle'), m = $('endMsg');
  if (n === 0) {
    t.className = 'end-title pink'; t.textContent = 'Eliminados';
    m.textContent = 'Ning\u00fan jugador cruz\u00f3 la meta.';
    playSnd('end-lose', false, .75);
    lastResultText = '\u00a1La mu\u00f1eca me elimin\u00f3 en Luz Verde, Luz Roja!';
  } else if (n === 6) {
    t.className = 'end-title gold'; t.textContent = '\u00a1PERFECTO!';
    m.textContent = 'Los 6 jugadores cruzaron. La hucha se llena.';
    pigPhase = 1; pigAnim = new Anim('pig-intro', false);
    playSnd('end-pig', false, .85);
    spawnImgConfetti(60);
    lastResultText = '\u00a1Final perfecto! Salv\u00e9 a los 6 en Luz Verde, Luz Roja.';
  } else {
    t.className = 'end-title green'; t.textContent = '\u00a1Ronda superada!';
    m.textContent = n + ' de 6 jugadores cruzaron la meta.';
    spawnImgConfetti(90);
    playSnd('end-confetti', false, .8);
    lastResultText = 'Salv\u00e9 a ' + n + ' de 6 en Luz Verde, Luz Roja.';
  }
  setTimeout(function(){ $('endOverlay').classList.remove('hidden'); }, n === 6 ? 2600 : 900);
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
      phaseDur = chantDur + 180;
    } else if (dollState === 'turning-danger' && dollAnim.finished) {
      dollState = 'idleFront'; dollAnim = null;
    } else if (dollState === 'angry' && dollAnim.finished) {
      dollState = phase === 'red' ? 'idleFront' : 'idleBack';
      dollAnim = null;
    }
  }
  if (pigPhase === 1 && pigAnim && pigAnim.finished) { pigPhase = 2; pigAnim = new Anim('pig-sparkle', true); }

  if (state !== 'playing') return;

  if (phase === 'green') {
    phaseT += dt;
    var turnDone = dollState === 'idleBack';
    if (phaseT >= phaseDur && turnDone) startRedPhase();
  } else {
    phaseT += dt; graceT -= dt;
    var turning = dollState === 'turning-danger';
    if (!turning && moving && !punished && graceT <= 0) punish();
    if (!turning && dollState !== 'angry' && redAfter <= 0) redAfter = rnd(900, 1800);
    if (redAfter > 0) { redAfter -= dt; if (redAfter <= 0) { redAfter = 0; startGreenPhase(false); } }
  }

  // DINAMICA ESTRICTA: mientras O este presionado avanzan, en cualquier fase
  if (moving) {
    var sp = dt / RUN_MS;
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
  if (!LANES.length || Math.abs(H - VW * 1.42) > 2) layoutScene(VW);
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

  if (linesOn) drawFrame('yh-lines', dollLinesFrame(dt), Math.round(DW - LINES_W / 2), LINES_TOP, LINES_W);

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

  var p0 = players[0];
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(6, H - 22, 238, 18);
  ctx.fillStyle = '#a8f0c8'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('p0 x=' + Math.round(p0 ? p0.x : -1) +
    ' y=' + Math.round(p0 ? runnerY(p0.p) : -1) +
    ' | cv' + cv.width + 'x' + cv.height +
    ' VW' + VW + ' H' + H +
    ' img:' + ((imgs['p1-back'] && imgs['p1-back'].complete) ? 'ok' : 'NO'),
    10, H - 9);
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
    ctx.beginPath(); ctx.ellipse(0, 2, 16, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  var key;
  if (pl.crossed) key = pl.kind + '-front';
  else key = pl.kind + '-back';
  var frame = (!pl.alive || !pl.anim) ? 0 : pl.anim.frame;
  var im = imgs[key];
  if (!im || !im.complete || !im.naturalWidth) {
    ctx.fillStyle = '#14967f';
    roundRect(-12, -78, 24, 74, 8); ctx.fill();
    ctx.fillStyle = '#17171a';
    ctx.beginPath(); ctx.arc(0, -84, 10, 0, Math.PI * 2); ctx.fill();
  } else {
    drawFrame(key, frame, -19, -80, 38);
  }
  ctx.restore();
  if (!pl.alive && deadK >= 1) {
    ctx.fillStyle = 'rgba(255,60,100,.95)';
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('\u2715', pl.x, y - 30);
  }
  if (pl.crossed) {
    ctx.fillStyle = '#2ecc8f';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('\u2713', pl.x, y - 92);
  }
}

function layoutScene(vw) {
  VW = Math.round(vw); DW = Math.round(VW / 2);
  H = Math.round(VW * 1.42);
  LINE_Y = Math.max(92, Math.round(H * .205));
  STAND_Y = LINE_Y + 46;
  START_Y = H - 58;
  DOLL_W = Math.min(138, Math.round(VW * .26));
  DOLL_H = Math.round(DOLL_W * 240 / 252);
  LINES_W = Math.round(DOLL_W * .78);
  LINES_H = Math.round(LINES_W * 240 / 252);
  LINES_TOP = Math.max(4, LINE_Y - DOLL_H - Math.round(LINES_H * .5));
  GUARD_W = 45;
  GY = LINE_Y - 80;
  GX_L = DW - Math.round(DOLL_W / 2) - 52;
  GX_R = DW + Math.round(DOLL_W / 2) + 7;
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
  if (!LANES.length || Math.abs(target - VW) > 24 || Math.abs(H - Math.round(VW * 1.42)) > 2) layoutScene(target);
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
    animateButtons(dt);
  } catch (err) {
    if (!loop._errShown) { loop._errShown = true; console.error('loop error:', err); }
  }
  requestAnimationFrame(loop);
}

$('btnGo').addEventListener('pointerdown', function(e){ e.preventDefault(); pressGo(); });
$('btnGo').addEventListener('pointerup', releaseGo);
$('btnGo').addEventListener('pointerleave', releaseGo);
$('btnGo').addEventListener('pointercancel', releaseGo);

document.addEventListener('keydown', function(e) {
  if (e.code === 'Space' && !e.repeat && state === 'playing') { e.preventDefault(); pressGo(); }

  else if (e.code === 'Escape' && state !== 'card') backToCard();
});
document.addEventListener('keyup', function(e){ if (e.code === 'Space') releaseGo(); });
window.addEventListener('pointerup', releaseGo);
window.addEventListener('pointercancel', releaseGo);
document.addEventListener('visibilitychange', function(){ if (document.hidden) releaseGo(); });
$('invitationCard').addEventListener('click', startGame);
$('invitationCard').addEventListener('keydown', function(e) {
  if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); startGame(); }
});
$('retryBtn').addEventListener('click', startGame);
$('backBtn').addEventListener('click', backToCard);
$('exitBtn').addEventListener('click', backToCard);
var ICON_ON = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.2 8.6a4.8 4.8 0 010 6.8M18.6 6.2a8.2 8.2 0 010 11.6" fill="none" stroke-width="1.8" stroke-linecap="round"/></svg>';
var ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke-width="1.8" stroke-linecap="round"/></svg>';
$('soundBtn').addEventListener('click', function() {
  muted = !muted;
  this.innerHTML = muted ? ICON_OFF : ICON_ON;
  this.title = muted ? 'Activar sonido' : 'Silenciar';
  if (muted) stopAllLooping();
});
$('shareBtn').addEventListener('click', function() {
  var text = lastResultText || 'Juega Luz Verde, Luz Roja.';
  if (navigator.share) navigator.share({ title: 'Squid Game \u00b7 Luz Verde, Luz Roja', text: text }).catch(function(){});
  else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    this.textContent = '\u00a1Copiado!';
    var b = this; setTimeout(function(){ b.textContent = 'Compartir'; }, 1500);
  }
});


var lastGoSrc = '', lastStopSrc = '';
var btnFrameIdx = 0, btnTimer = 0;
function animateButtons(dt) {

  btnTimer += dt;
  if (btnTimer > (moving ? 90 : 170)) {
    btnTimer = 0;
    btnFrameIdx = (btnFrameIdx + 1) % 4;
  }
  var g = IM + 'sprites/' + GO_FRAMES[moving ? btnFrameIdx : 0];

  if (g !== lastGoSrc) { lastGoSrc = g; $('goImg').src = g; }

}

initPlayers();
fitCanvas();
setPhaseUI();
updateHud();
loadAssets(function(){ $('invHint').textContent = 'Toca la tarjeta para entrar'; });
requestAnimationFrame(function(t) { lastT = t; requestAnimationFrame(loop); });

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
  pressGo();
});

// --- X CENTRADA en jugador eliminado ---
// (en drawPlayer, linea ~480)
// Cambiar: ctx.fillText('\\u2715', pl.x, y - 30);
// por centrado en cuerpo caido
