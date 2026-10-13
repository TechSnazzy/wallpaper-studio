/* Wallpaper Studio — plain JavaScript, no libraries, works offline. */
(() => {
'use strict';

/* =====================================================================
   EASY-TO-EDIT SETTINGS  (see README.md)
   ===================================================================== */

// 12 paint colors (any CSS color works)
const COLORS = [
  '#ff3b3b', '#ff6fa8', '#ff8a1f', '#ffd21f', '#9be22b', '#25c26a',
  '#2fc4f0', '#3b6fe0', '#9b4de0', '#d43ad0', '#8b5a2b', '#33334d'
];

// 5 brush sizes in canvas pixels (the canvas is 1920 x 1080)
const BRUSH_SIZES = [6, 14, 26, 44, 70];
// Matching sticker sizes
const STICKER_SIZES = [90, 140, 200, 280, 380];

// Stickers: any emoji works. Add or remove emoji here.
const STICKERS = ['⭐', '❤️', '🌸', '🦋', '☁️', '🐶', '🐱', '🦄', '🪐'];

// Short, friendly tips for the paintbrush friend
const TIPS = [
  'Try the rainbow brush!', 'Add some stickers!', 'Great job!', 'Pick a new color!',
  'Try the glitter brush!', 'Make it sparkle!', 'Change the background!',
  'Press Save when you are done!', 'Draw a big sun!', 'You are so creative!',
  'Try the Mystery color!', 'Fill it with color!'
];
const TIP_SECONDS = 9;

// Undo steps kept
const MAX_UNDO = 40;
const AUTOSAVE_SECONDS = 4;
const STORAGE_KEY = 'wallpaperStudio.v1';

/* =====================================================================
   Basics
   ===================================================================== */
const W = 1920, H = 1080;
const $ = (id) => document.getElementById(id);
const stage = $('stage'), bgCanvas = $('bg-canvas'), drawCanvas = $('draw-canvas'), strokeCanvas = $('stroke-canvas');
const bgCtx = bgCanvas.getContext('2d');
const dctx = drawCanvas.getContext('2d', { willReadFrequently: true });
const sctx = strokeCanvas.getContext('2d');
const cursorEl = $('cursor');
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));

const state = {
  tool: 'paintbrush',
  stamp: null,        // index into STICKERS when a sticker is selected
  color: COLORS[0],
  rainbow: false,
  sizeIndex: 2,
  bg: { id: 'white', color: null },
  muted: false
};

/* =====================================================================
   Tools
   ===================================================================== */
const TOOLS = [
  { id: 'paintbrush', name: 'Paintbrush', icon: '<g transform="rotate(45 24 24)"><rect x="21" y="1" width="6" height="21" rx="3" fill="#c98a4b" stroke="#7a4a1d" stroke-width="1.5"/><rect x="19.5" y="21" width="9" height="9" rx="1.5" fill="#d9e1e6" stroke="#8aa0ad" stroke-width="1.5"/><path d="M19.5 30h9c0 6-2 11-4.5 14-2.5-3-4.5-8-4.5-14z" fill="#e0367a" stroke="#7a2a50" stroke-width="1.5"/></g>' },
  { id: 'crayon', name: 'Crayon', icon: '<g transform="rotate(45 24 24)"><rect x="17" y="4" width="14" height="28" rx="2" fill="#f6a623" stroke="#9a5f06" stroke-width="1.5"/><rect x="17" y="10" width="14" height="14" fill="#fcd27c" stroke="#9a5f06" stroke-width="1.5"/><path d="M17 32h14l-7 12z" fill="#f6a623" stroke="#9a5f06" stroke-width="1.5" stroke-linejoin="round"/></g>' },
  { id: 'marker', name: 'Marker', icon: '<g transform="rotate(45 24 24)"><rect x="16" y="3" width="16" height="25" rx="3" fill="#7e57c2" stroke="#3f2a7a" stroke-width="1.5"/><rect x="16" y="9" width="16" height="9" fill="#cdbdf2" stroke="#3f2a7a" stroke-width="1.5"/><path d="M19 28h10l-2 13h-6z" fill="#4527a0" stroke="#2a1760" stroke-width="1.5" stroke-linejoin="round"/></g>' },
  { id: 'spray', name: 'Spray Paint', icon: '<rect x="13" y="19" width="19" height="25" rx="4" fill="#9ccbf7" stroke="#4f86c4" stroke-width="1.5"/><rect x="17" y="11" width="11" height="8" rx="2" fill="#7e57c2" stroke="#3f2a7a" stroke-width="1.5"/><rect x="20" y="6" width="5" height="5" fill="#fff" stroke="#3f2a7a" stroke-width="1.2"/><path d="M22.5 27c3 4 4.5 6 4.5 8a4.5 4.5 0 0 1-9 0c0-2 1.500-4 4.500-8z" fill="#3b6fe0"/><g fill="#7e57c2"><circle cx="33" cy="8" r="1.8"/><circle cx="38" cy="12" r="1.8"/><circle cx="34" cy="14" r="1.4"/><circle cx="40" cy="6" r="1.4"/><circle cx="37" cy="18" r="1.6"/></g>' },
  { id: 'eraser', name: 'Eraser', icon: '<g transform="rotate(-30 24 24)"><rect x="6" y="14" width="36" height="20" rx="6" fill="#ff8fb1" stroke="#c7416f" stroke-width="1.5"/><path d="M6 20a6 6 0 0 1 6-6h8v20h-8a6 6 0 0 1-6-6z" fill="#fff3f7" stroke="#c7416f" stroke-width="1.5"/></g>' },
  { id: 'fill', name: 'Fill Bucket', icon: '<path d="M11 18h24l-3 21a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="#b8c4cc" stroke="#6b7c87" stroke-width="1.5"/><ellipse cx="23" cy="18" rx="12" ry="4" fill="#dfe6ea" stroke="#6b7c87" stroke-width="1.5"/><path d="M12 17c0-12 22-12 22 0" fill="none" stroke="#6b7c87" stroke-width="2"/><path d="M38 26c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z" fill="#e53950"/>' },
  { id: 'rainbow', name: 'Rainbow Brush', icon: '<g fill="none" stroke-width="5.500" stroke-linecap="round"><path d="M6 38Q24 6 42 38" stroke="#ef5350"/><path d="M11 38Q24 14 37 38" stroke="#ffb02e"/><path d="M16 38Q24 22 32 38" stroke="#3fa9f5"/></g>' },
  { id: 'glitter', name: 'Glitter Brush', icon: '<path d="M8 42 28 22" stroke="#7e57c2" stroke-width="5.500" stroke-linecap="round"/><path d="M33 4l3.200 7.500L44 14l-7.800 2.500L33 24l-3.200-7.500L22 14l7.800-2.500z" fill="#ffd21f" stroke="#e29a00" stroke-width="1.500" stroke-linejoin="round"/><circle cx="12" cy="14" r="2.500" fill="#ff6fa8"/><circle cx="40" cy="34" r="2.500" fill="#3fa9f5"/><circle cx="20" cy="6" r="1.800" fill="#25c26a"/>' }
];

/* =====================================================================
   Backgrounds (all drawn with canvas code, so no image files)
   ===================================================================== */
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function star4(ctx, x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}
function star5(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

const BACKGROUNDS = [
  { id: 'rainbow', name: 'Rainbow Stripes', draw(ctx, w, h) {
      const cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#9775fa', '#f783ac'];
      const band = w / 16;
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 5);
      const n = Math.ceil((w + h) * 1.2 / band);
      for (let i = -n; i < n; i++) {
        ctx.fillStyle = cols[((i % 7) + 7) % 7];
        ctx.fillRect(i * band, -w, band + 1, w * 2);
      }
      ctx.restore();
  } },
  { id: 'dots', name: 'Polka Dots', draw(ctx, w, h) {
      ctx.fillStyle = '#b79cf5'; ctx.fillRect(0, 0, w, h);
      const s = w / 14;
      ctx.fillStyle = '#fff';
      for (let row = -1; row < h / s + 1; row++) {
        for (let col = -1; col < w / s + 1; col++) {
          ctx.beginPath();
          ctx.arc(col * s + (row % 2 ? s / 2 : 0), row * s * 0.9, s * 0.2, 0, 7);
          ctx.fill();
        }
      }
  } },
  { id: 'galaxy', name: 'Galaxy', draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#3b2f9e'); g.addColorStop(.5, '#7b3fc4'); g.addColorStop(1, '#2d6fd0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      [[.25, .3, '#ff7ad9', .45], [.75, .7, '#4fd6ff', .5], [.6, .2, '#ffd86b', .3]].forEach(([x, y, c, r]) => {
        const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
        rg.addColorStop(0, c + 'aa'); rg.addColorStop(1, c + '00');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      });
      const r = mulberry32(7); ctx.fillStyle = '#fff';
      for (let i = 0; i < 160; i++) {
        ctx.globalAlpha = .5 + r() * .5;
        const x = r() * w, y = r() * h;
        if (i % 9 === 0) star4(ctx, x, y, w * (.008 + r() * .01));
        else { ctx.beginPath(); ctx.arc(x, y, w * (.0015 + r() * .003), 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
  } },
  { id: 'sky', name: 'Sky & Clouds', draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#58b9ff'); g.addColorStop(1, '#d6f1ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      [[.18, .22, .1], [.55, .14, .08], [.82, .34, .11], [.35, .6, .09], [.7, .78, .1], [.1, .85, .07]].forEach(([x, y, s]) => {
        const cx = x * w, cy = y * h, r = s * w;
        ctx.beginPath();
        ctx.arc(cx, cy, r * .55, 0, 7); ctx.arc(cx + r * .6, cy + r * .08, r * .45, 0, 7);
        ctx.arc(cx - r * .6, cy + r * .1, r * .4, 0, 7); ctx.arc(cx + r * .1, cy - r * .3, r * .45, 0, 7);
        ctx.fill();
        ctx.fillRect(cx - r * .8, cy + r * .1, r * 1.6, r * .43);
      });
  } },
  { id: 'white', name: 'White', draw(ctx, w, h) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); } },
  { id: 'color', name: 'Plain Color', draw(ctx, w, h, bg) { ctx.fillStyle = (bg && bg.color) || '#ffd21f'; ctx.fillRect(0, 0, w, h); } }
];
const bgById = (id) => BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[4];

function paintBackground() {
  bgById(state.bg.id).draw(bgCtx, W, H, state.bg);
}

/* =====================================================================
   Sound (Web Audio, quiet, no files)
   ===================================================================== */
let actx = null;
function audio() {
  if (state.muted) return null;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { return null; }
  return actx;
}
function tone(freq, dur = 0.12, { type = 'sine', vol = 0.05, delay = 0, to = null } = {}) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  click: () => tone(620, 0.07, { vol: 0.04 }),
  select: () => tone(500, 0.1, { to: 760, vol: 0.045 }),
  pop: () => tone(380, 0.12, { to: 820, vol: 0.06 }),
  fill: () => { tone(300, 0.15, { to: 560, vol: 0.05 }); tone(450, 0.15, { to: 840, vol: 0.04, delay: 0.07 }); },
  undo: () => tone(520, 0.12, { to: 330, vol: 0.045, type: 'triangle' }),
  redo: () => tone(330, 0.12, { to: 520, vol: 0.045, type: 'triangle' }),
  save: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { delay: i * 0.1, vol: 0.05, type: 'triangle' })),
  oops: () => tone(300, 0.15, { to: 240, vol: 0.04 })
};

/* =====================================================================
   Colors
   ===================================================================== */
let hue = 0;
function currentColor() {
  if (state.tool === 'rainbow' || state.rainbow) return `hsl(${hue % 360},95%,55%)`;
  return state.color;
}
function previewColor() {
  return (state.tool === 'rainbow' || state.rainbow) ? `hsl(${(performance.now() / 8) % 360},95%,55%)` : state.color;
}
const px1 = document.createElement('canvas'); px1.width = px1.height = 1;
const px1c = px1.getContext('2d', { willReadFrequently: true });
function colorToRGB(c) {
  px1c.clearRect(0, 0, 1, 1); px1c.fillStyle = c; px1c.fillRect(0, 0, 1, 1);
  const d = px1c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
}

/* =====================================================================
   Drawing engine
   ===================================================================== */
let stroke = null;   // active stroke state
let drawing = false;
let busy = false;    // true while undo/redo is restoring
let dirty = false;

const toolSize = () => BRUSH_SIZES[state.sizeIndex];
function toolDiameter() {
  const s = toolSize();
  switch (state.tool) {
    case 'eraser': return s * 1.6;
    case 'marker': return s * 1.3;
    case 'spray': return s * 3;
    case 'crayon': return s * 1.1;
    case 'glitter': return s * 1.2;
    default: return s;
  }
}

function toCanvas(e) {
  const r = stage.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}

function beginStroke(p) {
  drawing = true;
  stroke = { lx: p.x, ly: p.y, mx: p.x, my: p.y, dist: 0, carry: 0, tickTimer: null };
  if (state.tool === 'marker') sctx.clearRect(0, 0, W, H);
  if (state.tool === 'spray') {
    spray(p.x, p.y, 10);
    stroke.tickTimer = setInterval(() => spray(stroke.lx, stroke.ly, 8), 35);
  }
  segment(p.x, p.y, true);
}

function moveStroke(p) {
  if (!stroke) return;
  const dx = p.x - stroke.lx, dy = p.y - stroke.ly;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return;
  stroke.dist += d;
  hue += d * 0.45;
  const t = state.tool;
  if (t === 'paintbrush' || t === 'rainbow' || t === 'marker' || t === 'eraser') {
    // smooth quadratic curve through midpoints
    const mx = (stroke.lx + p.x) / 2, my = (stroke.ly + p.y) / 2;
    const c = t === 'marker' ? sctx : dctx;
    setupLine(c);
    c.beginPath(); c.moveTo(stroke.mx, stroke.my);
    c.quadraticCurveTo(stroke.lx, stroke.ly, mx, my); c.stroke();
    stroke.mx = mx; stroke.my = my;
  } else if (t === 'crayon') {
    walk(stroke.lx, stroke.ly, p.x, p.y, Math.max(2, toolSize() * 0.22), crayonDab);
  } else if (t === 'glitter') {
    walk(stroke.lx, stroke.ly, p.x, p.y, Math.max(12, toolSize() * 0.7), glitterDab);
  } else if (t === 'spray') {
    walk(stroke.lx, stroke.ly, p.x, p.y, Math.max(3, toolSize() * 0.2), (x, y) => spray(x, y, 7));
  }
  stroke.lx = p.x; stroke.ly = p.y;
}

function endStroke() {
  if (!stroke) return;
  const t = state.tool;
  if (t === 'paintbrush' || t === 'rainbow' || t === 'marker' || t === 'eraser') {
    const c = t === 'marker' ? sctx : dctx;
    setupLine(c);
    c.beginPath(); c.moveTo(stroke.mx, stroke.my); c.lineTo(stroke.lx, stroke.ly); c.stroke();
  }
  if (t === 'marker') {
    dctx.save(); dctx.globalAlpha = 0.55; dctx.drawImage(strokeCanvas, 0, 0); dctx.restore();
    sctx.clearRect(0, 0, W, H);
  }
  clearInterval(stroke.tickTimer);
  stroke = null; drawing = false;
  commit();
}

function setupLine(c) {
  c.lineCap = state.tool === 'marker' ? 'square' : 'round';
  c.lineJoin = 'round';
  c.lineWidth = toolDiameter();
  c.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
  c.strokeStyle = state.tool === 'eraser' ? '#000' : currentColor();
}

// first dab at pointer down
function segment(x, y) {
  const t = state.tool;
  if (t === 'paintbrush' || t === 'rainbow' || t === 'marker' || t === 'eraser') {
    const c = t === 'marker' ? sctx : dctx;
    const r = toolDiameter() / 2;
    c.save();
    c.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over';
    c.fillStyle = t === 'eraser' ? '#000' : currentColor();
    c.beginPath();
    if (t === 'marker') c.rect(x - r, y - r, r * 2, r * 2); else c.arc(x, y, r, 0, 7);
    c.fill(); c.restore();
  } else if (t === 'crayon') crayonDab(x, y);
  else if (t === 'glitter') glitterDab(x, y);
}

function walk(x0, y0, x1, y1, spacing, cb) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  let pos = spacing - stroke.carry;
  while (pos <= d) {
    const f = pos / d; cb(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
    pos += spacing;
  }
  stroke.carry = d - (pos - spacing);
}

function crayonDab(x, y) {
  const s = toolDiameter(), r = s / 2;
  dctx.save();
  dctx.fillStyle = currentColor();
  const n = Math.ceil(s * 0.85) + 3;
  for (let i = 0; i < n; i++) {
    const a = rnd(Math.PI * 2), d = Math.sqrt(Math.random()) * r;
    const w = rnd(1.2, 2 + s * 0.07);
    dctx.globalAlpha = rnd(0.45, 0.95);
    dctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, w, w * rnd(0.8, 1.6));
  }
  dctx.globalAlpha = 0.3;
  dctx.beginPath(); dctx.arc(x, y, r * 0.8, 0, 7); dctx.fill();
  dctx.restore();
}

function spray(x, y, n) {
  const R = toolDiameter() / 2;
  dctx.save();
  dctx.fillStyle = currentColor();
  for (let i = 0; i < n; i++) {
    const a = rnd(Math.PI * 2), d = R * Math.pow(Math.random(), 0.75);
    dctx.globalAlpha = rnd(0.5, 1);
    dctx.beginPath(); dctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rnd(1.2, 2.6), 0, 7); dctx.fill();
  }
  dctx.restore();
}

function glitterDab(x, y) {
  const s = toolSize();
  dctx.save();
  const n = 2 + Math.floor(s / 18);
  for (let i = 0; i < n; i++) {
    const a = rnd(Math.PI * 2), d = Math.sqrt(Math.random()) * toolDiameter() / 2;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    const col = `hsl(${Math.floor(rnd(360))},100%,${Math.floor(rnd(55, 70))}%)`;
    dctx.fillStyle = col; dctx.shadowColor = col; dctx.shadowBlur = 6;
    const r = rnd(5, 8 + s * 0.28);
    const k = Math.random();
    if (k < 0.55) star4(dctx, px, py, r);
    else if (k < 0.8) star5(dctx, px, py, r * 0.8);
    else { dctx.beginPath(); dctx.arc(px, py, r * 0.35, 0, 7); dctx.fill(); }
  }
  dctx.restore();
}

/* ---- sticker ---- */
function drawSticker(ctx, emoji, x, y, size, angle = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#fff'; ctx.shadowBlur = Math.max(4, size * 0.07);
  for (let i = 0; i < 4; i++) ctx.fillText(emoji, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = Math.max(4, size * 0.05); ctx.shadowOffsetY = size * 0.025;
  ctx.fillText(emoji, 0, 0);
  ctx.restore();
}
function placeSticker(p) {
  drawSticker(dctx, STICKERS[state.stamp], p.x, p.y, STICKER_SIZES[state.sizeIndex], rnd(-0.2, 0.2));
  sfx.pop(); commit();
}

/* ---- flood fill ---- */
const compCanvas = document.createElement('canvas'); compCanvas.width = W; compCanvas.height = H;
const compCtx = compCanvas.getContext('2d', { willReadFrequently: true });

function floodFill(p) {
  const sx = Math.max(0, Math.min(W - 1, Math.round(p.x))), sy = Math.max(0, Math.min(H - 1, Math.round(p.y)));
  compCtx.clearRect(0, 0, W, H);
  compCtx.drawImage(bgCanvas, 0, 0); compCtx.drawImage(drawCanvas, 0, 0);
  const img = compCtx.getImageData(0, 0, W, H), d = img.data;
  const si = (sy * W + sx) * 4;
  const r0 = d[si], g0 = d[si + 1], b0 = d[si + 2];
  const TOL = 70, EDGE_TOL = 330;
  const near = (i, tol) => Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) <= tol;
  const mask = new Uint8Array(W * H);
  const stack = [sx, sy];
  // scanline flood fill
  while (stack.length) {
    const y = stack.pop(), x0 = stack.pop();
    let x = x0;
    while (x >= 0 && !mask[y * W + x] && near((y * W + x) * 4, TOL)) x--;
    x++;
    let up = false, down = false;
    while (x < W && !mask[y * W + x] && near((y * W + x) * 4, TOL)) {
      mask[y * W + x] = 1;
      if (y > 0) {
        const ok = !mask[(y - 1) * W + x] && near(((y - 1) * W + x) * 4, TOL);
        if (ok && !up) { stack.push(x, y - 1); up = true; } else if (!ok) up = false;
      }
      if (y < H - 1) {
        const ok = !mask[(y + 1) * W + x] && near(((y + 1) * W + x) * 4, TOL);
        if (ok && !down) { stack.push(x, y + 1); down = true; } else if (!ok) down = false;
      }
      x++;
    }
  }
  // grow 2px into anti-aliased edge pixels (but not into solid lines)
  for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (mask[i]) continue;
        if ((mask[i - 1] | mask[i + 1] | mask[i - W] | mask[i + W]) && near(i * 4, EDGE_TOL)) add.push(i);
      }
    }
    for (let k = 0; k < add.length; k++) mask[add[k]] = 1;
  }
  const [r, g, b] = colorToRGB(currentColor());
  const out = compCtx.createImageData(W, H), o = out.data;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) { const j = i * 4; o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = 255; }
  }
  compCtx.putImageData(out, 0, 0);
  dctx.drawImage(compCanvas, 0, 0);
  hue += 40;
  sfx.fill(); commit();
}

/* =====================================================================
   Undo / redo (PNG snapshots of the drawing layer + which background)
   ===================================================================== */
const history = [];
let hIndex = -1;
let queue = Promise.resolve();

function snapshot() {
  return { bg: { ...state.bg }, blob: new Promise((res) => drawCanvas.toBlob(res, 'image/png')) };
}
function pushHistory() {
  history.length = hIndex + 1;
  history.push(snapshot());
  while (history.length > MAX_UNDO + 1) history.shift();
  hIndex = history.length - 1;
  updateHistoryButtons();
}
function commit() { dirty = true; pushHistory(); }

function goHistory(delta) {
  queue = queue.then(async () => {
    const ni = hIndex + delta;
    if (ni < 0 || ni >= history.length || drawing) return;
    busy = true;
    try {
      hIndex = ni;
      const entry = history[ni];
      const blob = await entry.blob;
      const bmp = await createImageBitmap(blob);
      dctx.clearRect(0, 0, W, H); dctx.drawImage(bmp, 0, 0);
      state.bg = { ...entry.bg }; paintBackground();
      dirty = true; refreshUI(); (delta < 0 ? sfx.undo : sfx.redo)();
    } catch (e) { /* ignore */ }
    busy = false; updateHistoryButtons();
  });
}
function updateHistoryButtons() {
  setDisabled($('undo'), hIndex <= 0);
  setDisabled($('redo'), hIndex >= history.length - 1);
}
function setDisabled(btn, off) {
  btn.classList.toggle('disabled', off);
  btn.setAttribute('aria-disabled', off ? 'true' : 'false');
  btn.tabIndex = off ? -1 : 0;
}

/* =====================================================================
   Dialogs / mascot / tips
   ===================================================================== */
function showDialog({ emoji, title, text, buttons }) {
  $('dlg-emoji').textContent = emoji; $('dlg-title').textContent = title; $('dlg-text').textContent = text;
  const box = $('dlg-buttons'); box.innerHTML = '';
  let first = null;
  buttons.forEach((b, i) => {
    const el = document.createElement('button');
    el.className = 'dlg-btn' + (b.primary ? ' primary' : ''); el.textContent = b.label;
    el.addEventListener('click', () => { closeDialog(); sfx.click(); if (b.action) b.action(); });
    box.appendChild(el); if (i === 0) first = el;
  });
  $('overlay').classList.remove('hidden');
  first && first.focus();
}
function closeDialog() { $('overlay').classList.add('hidden'); }
const dialogOpen = () => !$('overlay').classList.contains('hidden');

let tipIndex = 0;
function showTip(text) {
  const el = $('tip');
  el.classList.add('fade');
  setTimeout(() => { el.textContent = text; el.classList.remove('fade'); }, 250);
}
function nextTip() { tipIndex = (tipIndex + 1) % TIPS.length; showTip(TIPS[tipIndex]); }

/* =====================================================================
   Save to computer
   ===================================================================== */
function saveWallpaper() {
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c = out.getContext('2d');
  c.drawImage(bgCanvas, 0, 0); c.drawImage(drawCanvas, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const t = new Date();
  const name = `wallpaper-${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}.png`;
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    sfx.save(); sparkles();
    showTip('Great job!');
    showDialog({
      emoji: '🎉', title: 'Saved!',
      text: 'Check your Downloads folder. To use it: right-click the picture in File Explorer and choose "Set as desktop background".',
      buttons: [{ label: 'Yay!', primary: true }]
    });
  }, 'image/png');
}
function sparkles() {
  const emo = ['✨', '⭐', '🌈', '💖', '🎈'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('div'); s.className = 'sparkle'; s.textContent = emo[i % emo.length];
    s.style.left = rnd(10, 90) + 'vw'; s.style.top = rnd(40, 90) + 'vh'; s.style.animationDelay = rnd(0, .5) + 's';
    document.body.appendChild(s); setTimeout(() => s.remove(), 1900);
  }
}

/* =====================================================================
   Autosave (localStorage, always inside try/catch)
   ===================================================================== */
function autosave() {
  if (!dirty || drawing) return;
  const payload = (dataUrl) => JSON.stringify({ v: 1, bg: state.bg, draw: dataUrl, muted: state.muted });
  try {
    localStorage.setItem(STORAGE_KEY, payload(drawCanvas.toDataURL('image/png')));
    dirty = false;
  } catch (e) {
    // too big? try a half-size copy so work is never lost
    try {
      const h = document.createElement('canvas'); h.width = W / 2; h.height = H / 2;
      h.getContext('2d').drawImage(drawCanvas, 0, 0, W / 2, H / 2);
      localStorage.setItem(STORAGE_KEY, payload(h.toDataURL('image/png')));
      dirty = false;
    } catch (e2) { /* storage unavailable — keep going */ }
  }
}
function restoreSaved() {
  return new Promise((resolve) => {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { data = null; }
    if (!data) return resolve();
    if (data.bg && data.bg.id) state.bg = { id: data.bg.id, color: data.bg.color || null };
    if (typeof data.muted === 'boolean') state.muted = data.muted;
    if (!data.draw) return resolve();
    const img = new Image();
    img.onload = () => { dctx.drawImage(img, 0, 0, W, H); resolve(); };
    img.onerror = () => resolve();
    img.src = data.draw;
  });
}

/* =====================================================================
   UI building
   ===================================================================== */
const toolButtons = {};
function buildUI() {
  // tools
  const tools = $('tools');
  TOOLS.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'tool'; b.dataset.tool = t.id; b.setAttribute('aria-label', t.name);
    b.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${t.icon}</svg><span>${t.name}</span>`;
    b.addEventListener('click', () => { state.tool = t.id; state.stamp = null; sfx.select(); refreshUI(); });
    tools.appendChild(b); toolButtons[t.id] = b;
  });
  // swatches
  const sw = $('swatches');
  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.style.background = c; b.dataset.color = c; b.setAttribute('aria-label', 'Color ' + c);
    b.addEventListener('click', () => {
      state.color = c; state.rainbow = false;
      if (state.tool === 'rainbow') state.tool = 'paintbrush';
      sfx.select(); refreshUI();
    });
    sw.appendChild(b);
  });
  // sizes
  const sb = $('size-buttons');
  BRUSH_SIZES.forEach((s, i) => {
    const b = document.createElement('button'); b.className = 'size-btn'; b.setAttribute('aria-label', 'Brush size ' + (i + 1));
    const d = 6 + i * 4.5;
    b.innerHTML = `<i style="width:calc(var(--u)*${d});height:calc(var(--u)*${d})"></i>`;
    b.addEventListener('click', () => { state.sizeIndex = i; sfx.click(); refreshUI(); });
    sb.appendChild(b);
  });
  // stickers
  const st = $('stickers');
  STICKERS.forEach((emo, i) => {
    const b = document.createElement('button'); b.className = 'sticker'; b.textContent = emo; b.setAttribute('aria-label', 'Sticker ' + emo);
    b.addEventListener('click', () => { state.stamp = state.stamp === i ? null : i; sfx.select(); refreshUI(); });
    st.appendChild(b);
  });
  // patterns
  const pt = $('patterns');
  BACKGROUNDS.forEach((bg) => {
    const b = document.createElement('button'); b.className = 'pattern'; b.dataset.bg = bg.id; b.setAttribute('aria-label', bg.name);
    const c = document.createElement('canvas'); c.width = 160; c.height = 120;
    b.appendChild(c);
    b.addEventListener('click', () => {
      const col = (state.tool === 'rainbow' || state.rainbow) ? currentColor() : state.color;
      state.bg = { id: bg.id, color: bg.id === 'color' ? col : null };
      paintBackground(); sfx.pop(); commit(); refreshUI();
    });
    pt.appendChild(b);
  });

  $('rainbow').addEventListener('click', () => { state.rainbow = !state.rainbow; sfx.select(); refreshUI(); });
  $('mystery').addEventListener('click', () => {
    state.color = `hsl(${Math.floor(rnd(360))},${Math.floor(rnd(70, 100))}%,${Math.floor(rnd(45, 62))}%)`;
    state.rainbow = false;
    if (state.tool === 'rainbow') state.tool = 'paintbrush';
    sfx.pop(); refreshUI();
  });

  $('undo').addEventListener('click', () => goHistory(-1));
  $('redo').addEventListener('click', () => goHistory(1));
  $('save').addEventListener('click', saveWallpaper);
  $('startover').addEventListener('click', () => {
    sfx.click();
    showDialog({
      emoji: '🎨', title: 'Start a new wallpaper?', text: 'We will get a fresh, clean page. You can press Undo to get your picture back!',
      buttons: [
        { label: 'Yes!', primary: true, action: startOver },
        { label: 'No, keep drawing' }
      ]
    });
  });
  $('mute').addEventListener('click', () => {
    state.muted = !state.muted; refreshUI(); dirty = true;
    if (!state.muted) sfx.pop();
  });
  $('mascot').addEventListener('click', () => {
    nextTip(); sfx.pop();
    const m = $('mascot'); m.classList.remove('wiggle'); void m.offsetWidth; m.classList.add('wiggle');
  });
}

function startOver() {
  dctx.clearRect(0, 0, W, H);
  state.bg = { id: 'white', color: null }; paintBackground();
  commit(); refreshUI(); showTip('A fresh page! Draw something!');
}

const patternThumbDrawn = {};
function refreshUI() {
  Object.entries(toolButtons).forEach(([id, b]) => b.classList.toggle('selected', !state.stamp && state.stamp !== 0 && state.tool === id));
  document.querySelectorAll('.swatch').forEach((b) => {
    b.classList.toggle('selected', !state.rainbow && state.tool !== 'rainbow' && b.dataset.color === state.color);
  });
  document.querySelectorAll('.size-btn').forEach((b, i) => b.classList.toggle('selected', i === state.sizeIndex));
  document.querySelectorAll('.sticker').forEach((b, i) => b.classList.toggle('selected', state.stamp === i));
  document.querySelectorAll('.pattern').forEach((b) => b.classList.toggle('selected', b.dataset.bg === state.bg.id));
  $('rainbow').classList.toggle('selected', state.rainbow || state.tool === 'rainbow');
  const isCustom = !COLORS.includes(state.color) && !state.rainbow && state.tool !== 'rainbow';
  $('mystery').classList.toggle('selected', isCustom);
  $('mystery').querySelector('.orb').style.background = isCustom ? state.color : '';
  $('mute').textContent = state.muted ? '🔇' : '🔊';
  $('mute').classList.toggle('off', state.muted);
  // "Plain Color" thumbnail follows the chosen color
  const colorBtn = document.querySelector('.pattern[data-bg="color"] canvas');
  const col = (state.tool === 'rainbow' || state.rainbow) ? '#ffd21f' : state.color;
  BACKGROUNDS.forEach((bg) => {
    const c = document.querySelector(`.pattern[data-bg="${bg.id}"] canvas`);
    if (!c) return;
    const key = bg.id === 'color' ? col : '1';
    if (patternThumbDrawn[bg.id] === key) return;
    patternThumbDrawn[bg.id] = key;
    bg.draw(c.getContext('2d'), c.width, c.height, { id: bg.id, color: col });
  });
  void colorBtn;
  updateCursorLook();
}

/* =====================================================================
   Cursor preview
   ===================================================================== */
let lastPointer = null;
function updateCursorLook() {
  const scale = stage.getBoundingClientRect().width / W;
  if (state.stamp !== null && state.stamp !== undefined) {
    const s = STICKER_SIZES[state.sizeIndex] * scale;
    cursorEl.classList.add('is-stamp');
    cursorEl.style.width = cursorEl.style.height = s + 'px';
    cursorEl.style.fontSize = s * 0.85 + 'px'; cursorEl.style.fontFamily = EMOJI_FONT;
    cursorEl.textContent = STICKERS[state.stamp];
    cursorEl.style.borderColor = 'transparent'; cursorEl.style.background = 'none';
  } else {
    const dia = state.tool === 'fill' ? 22 : Math.max(8, toolDiameter() * scale);
    const col = previewColor();
    cursorEl.classList.remove('is-stamp');
    cursorEl.textContent = state.tool === 'fill' ? '🪣' : '';
    cursorEl.style.fontSize = '16px';
    cursorEl.style.width = cursorEl.style.height = dia + 'px';
    cursorEl.style.borderColor = state.tool === 'eraser' ? '#888' : col;
    cursorEl.style.background = state.tool === 'eraser' ? 'rgba(255,255,255,.5)' : 'none';
    if (state.tool === 'fill') { cursorEl.style.border = 'none'; cursorEl.style.boxShadow = 'none'; } else cursorEl.style.boxShadow = '';
  }
  if (lastPointer) placeCursor(lastPointer);
}
function placeCursor(e) {
  const r = stage.getBoundingClientRect();
  cursorEl.style.left = (e.clientX - r.left) + 'px';
  cursorEl.style.top = (e.clientY - r.top) + 'px';
}

/* =====================================================================
   Pointer events (mouse, touch and pen)
   ===================================================================== */
function wirePointer() {
  stage.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || busy || dialogOpen()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    audio();
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const p = toCanvas(e);
    lastPointer = e; showCursor(e);
    if (state.stamp !== null) { placeSticker(p); return; }
    if (state.tool === 'fill') { floodFill(p); return; }
    beginStroke(p);
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') { lastPointer = e; showCursor(e); }
    if (!drawing || !e.isPrimary) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (evs.length ? evs : [e]).forEach((ev) => moveStroke(toCanvas(ev)));
  });
  const up = (e) => {
    if (!drawing) return;
    try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    endStroke();
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', () => { if (!drawing) cursorEl.classList.add('hidden'); });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('dragstart', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  // keep the page from scrolling/zooming while touching the canvas
  stage.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}
function showCursor(e) {
  if (e.pointerType === 'touch') { cursorEl.classList.add('hidden'); stage.classList.remove('hide-cursor'); return; }
  cursorEl.classList.remove('hidden');
  stage.classList.add('hide-cursor');
  placeCursor(e);
}

/* =====================================================================
   Keyboard
   ===================================================================== */
document.addEventListener('keydown', (e) => {
  if (dialogOpen()) { if (e.key === 'Escape') closeDialog(); return; }
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); goHistory(-1); }
  else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); goHistory(1); }
  else if (k === 's') { e.preventDefault(); saveWallpaper(); }
});

/* =====================================================================
   Start
   ===================================================================== */
async function init() {
  buildUI();
  wirePointer();
  await restoreSaved();
  paintBackground();
  history.push(snapshot()); hIndex = 0;
  refreshUI(); updateHistoryButtons();
  window.addEventListener('resize', updateCursorLook);
  setInterval(autosave, AUTOSAVE_SECONDS * 1000);
  window.addEventListener('beforeunload', autosave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
  setInterval(nextTip, TIP_SECONDS * 1000);
  setInterval(() => { if (!drawing && (state.rainbow || state.tool === 'rainbow') && state.stamp === null) updateCursorLook(); }, 120);
  $('tip').textContent = TIPS[0];
}
init();
})();
