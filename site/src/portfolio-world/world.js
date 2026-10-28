// The house. Pure functions that return plain data; app.js turns it into DOM.
// Every room is a 600 x 600 floor seen from a fixed orthographic three-quarter view:
// rotateX(60deg) rotateZ(45deg). +x runs to the screen's lower right, +y to its lower left,
// the back wall is y = 0 and the left wall is x = 0. z is height.

export const STAGE_W = 1000, STAGE_H = 720;

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f <= 1) { r *= f; g *= f; b *= f; } else { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  const h = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}
const sh = shade;

// World point -> stage pixel (the floor centre projects to 500, 430).
export function project(x, y, z) {
  const px = x - 300, py = y - 300, x1 = (px - py) * 0.70711, y1 = (px + py) * 0.70711;
  return { sx: 500 + x1, sy: 430 + y1 * 0.5 - z * 0.866 };
}
// Stage pixel on the floor plane (z = 0) -> world point.
export function unproject(sx, sy) {
  const x1 = sx - 500, y1 = (sy - 430) * 2, k = 0.70711;
  return { x: (x1 + y1) / (2 * k) + 300, y: (y1 - x1) / (2 * k) + 300 };
}

export const fx = (v) => (Math.abs(v) < 1e-6 ? 0 : +v.toFixed(4));
export const rect = (c, x, y, w, h) => `linear-gradient(${c},${c}) ${x}px ${y}px/${w}px ${h}px no-repeat`;

export function collector() {
  const boxes = [], decals = [], bbs = [];
  const B = (x, y, w, d, z, h, c, o = {}) => boxes.push({ x, y, w, d, z, h, top: o.top || c, front: o.front || sh(c, 0.74), side: o.side || sh(c, 0.56), glow: o.glow || 'none', cls: o.cls || '' });
  const dec = (w, h, m, bg, o = {}) => decals.push({ w, h, m, bg, r: o.r || '0', sh: o.sh || 'none', cls: o.cls || '', html: o.html || '', id: o.id || '' });
  const floor = (x, y, w, d, z, bg, o) => dec(w, d, `translate3d(${x}px,${y}px,${z}px)`, bg, o);
  const yPlane = (x, y, z, W, H, bg, o) => dec(W, H, `matrix3d(1,0,0,0,0,0,-1,0,0,1,0,0,${x},${y},${z + H},1)`, bg, o);
  const xPlane = (x, y, z, W, H, bg, o) => dec(W, H, `matrix3d(0,-1,0,0,0,0,-1,0,1,0,0,0,${x},${y + W},${z + H},1)`, bg, o);
  const bb = (x, y, z, html) => bbs.push({ x, y, z, html });
  const shadow = (x, y, w, d) => floor(x, y, w, d, 0.8, 'radial-gradient(closest-side,rgba(0,0,0,.5),transparent)');
  const glowAt = (x, y, r, a) => floor(x - r, y - r, 2 * r, 2 * r, 0.9, `radial-gradient(closest-side,rgba(240,184,104,${a}),transparent)`);
  const plant = (x, y) => B(x - 12, y - 12, 24, 24, 0, 28, '#2A3445', { top: 'radial-gradient(circle,#2A1E16 0 9px,#2A3445 10px)' });
  const rug = (x, y, w, d, c1, c2) => floor(x, y, w, d, 0.6, `repeating-linear-gradient(45deg,${c2} 0 2px,transparent 2px 7px),${c1}`, { r: '6px', sh: `inset 0 0 0 7px ${c1}, inset 0 0 0 8px rgba(169,184,255,.16)` });
  return { boxes, decals, bbs, B, dec, floor, yPlane, xPlane, bb, shadow, glowAt, plant, rug };
}

// ---------------------------------------------------------------- time of day
// Sunrise and sunset for Lagos (6.52 N, 3.38 E), NOAA approximation, in minutes of local time (WAT, UTC+1).
export function sunTimes(y, m, d) {
  const lat = 6.5244 * Math.PI / 180, lon = 3.3792;
  const start = Date.UTC(y, 0, 0), N = Math.floor((Date.UTC(y, m - 1, d) - start) / 864e5);
  const g = 2 * Math.PI / 365 * (N - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl)) * 180 / Math.PI;
  return { rise: 720 - 4 * (lon + ha) - eq + 60, set: 720 - 4 * (lon - ha) - eq + 60 };
}
export function phaseAt(min, sun) {
  if (min < sun.rise - 50) return 'night';
  if (min < sun.rise + 40) return 'dawn';
  if (min < 690) return 'morning';
  if (min < sun.set - 80) return 'afternoon';
  if (min < sun.set + 15) return 'sunset';
  if (min < sun.set + 80) return 'evening';
  return 'night';
}
export const PHASE_NAME = { night: 'Night', dawn: 'Dawn', morning: 'Morning', afternoon: 'Afternoon', sunset: 'Sundown', evening: 'Evening' };
export const isDark = (p) => p === 'night' || p === 'evening' || p === 'sunset';

const SKY = {
  night: 'linear-gradient(180deg,#070D1A 0%,#0E1A30 70%,#16243E 100%)',
  dawn: 'linear-gradient(180deg,#26315E 0%,#7E5486 45%,#E08A6E 78%,#F3B470 100%)',
  morning: 'linear-gradient(180deg,#6E9EE0 0%,#A7C8EE 60%,#E6EEF6 100%)',
  afternoon: 'linear-gradient(180deg,#3F7BD0 0%,#78A9E6 60%,#B9D4F0 100%)',
  sunset: 'linear-gradient(180deg,#2C3F7A 0%,#B0607A 45%,#F08A4E 78%,#FFC46A 100%)',
  evening: 'linear-gradient(180deg,#0F1838 0%,#2E2A5C 50%,#6A4A78 85%,#A6607A 100%)'
};

function windowBack(c, ph, x0, W, z0, H) {
  const lights = isDark(ph), bright = ph === 'morning' || ph === 'afternoon';
  const bld = bright ? '#4A5D7C' : ph === 'dawn' || ph === 'sunset' ? '#2A2440' : '#090E18';
  const win = [rect('#1C2536', W / 2 - 1, 0, 2, H)];
  const n = Math.floor(W / 22);
  for (let i = 0; i < n; i++) {
    const bx = i * 22, bh = 30 + ((i * 37) % 45), by = H - bh;
    if (lights) for (let r = 0; r < 5; r++) if ((i * 3 + r * 5) % 3 === 0) win.push(`radial-gradient(circle at ${bx + 8}px ${by + 6 + r * 7}px,rgba(240,196,130,.9) 0 .7px,transparent 1.3px)`);
    win.push(rect(bld, bx, by, 18, bh));
  }
  if (ph === 'night') win.push(`radial-gradient(circle at ${W - 26}px 20px,rgba(237,241,250,.85) 0 3px,rgba(237,241,250,.12) 4px,transparent 14px)`);
  if (ph === 'evening') win.push(`radial-gradient(circle at ${W * 0.2}px 16px,rgba(237,241,250,.9) 0 .9px,transparent 1.5px)`, `radial-gradient(circle at ${W * 0.55}px 26px,rgba(237,241,250,.7) 0 .7px,transparent 1.3px)`);
  const sun = { dawn: [0.2, H - 24, '255,214,150', 9], morning: [0.35, 30, '255,250,232', 7], afternoon: [0.7, 16, '255,252,240', 7], sunset: [0.82, H - 28, '255,180,100', 10] }[ph];
  if (sun) win.push(`radial-gradient(circle at ${W * sun[0]}px ${sun[1]}px,rgba(${sun[2]},.95) 0 ${sun[3]}px,rgba(${sun[2]},.3) ${sun[3] + 3}px,transparent ${sun[3] * 4}px)`);
  win.push(SKY[ph]);
  c.yPlane(x0, 0.6, z0, W, H, win.join(','), { sh: `inset 0 0 0 4px #1E2839, inset 0 0 0 5px rgba(169,184,255,.14), 0 0 40px ${ph === 'night' || ph === 'evening' ? 'rgba(60,100,190,.12)' : bright ? 'rgba(200,225,255,.16)' : 'rgba(255,170,110,.18)'}` });
  c.B(x0 - 6, 0, W + 12, 8, z0 - 3, 3, '#2A3446');
  if (ph !== 'night' && ph !== 'evening') {
    const shaft = { dawn: 'rgba(255,170,110,.16)', morning: 'rgba(255,244,220,.16)', afternoon: 'rgba(255,240,210,.12)', sunset: 'rgba(255,150,80,.2)' }[ph];
    c.floor(x0 - 20, 30, W + 60, 200, 0.45, `linear-gradient(180deg,${shaft},transparent 85%)`, { r: '4px' });
  } else {
    c.floor(x0 - 20, 0.5, W + 40, 150, 0.4, `radial-gradient(ellipse ${W * 0.7}px 120px at ${W / 2 + 20}px 0px,rgba(120,150,220,.09),transparent 80%)`);
  }
}

const THEMES = {
  studio: { floor: '#131A26', top: 'repeating-linear-gradient(90deg,rgba(152,163,181,.04) 0 1px,transparent 1px 75px),repeating-linear-gradient(0deg,rgba(152,163,181,.04) 0 1px,transparent 1px 75px),radial-gradient(circle at 300px 330px,#192233,#111823 75%)', wall: ['#161E2D', '#111827', '#0C111B'] },
  living: { floor: '#211B18', top: 'repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 1px,transparent 1px 46px),repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0 1px,transparent 1px 140px),linear-gradient(135deg,#2A221D,#1A1512)', wall: ['#1B2131', '#151A27', '#0F131D'] },
  kitchen: { floor: '#1B2029', top: 'repeating-linear-gradient(90deg,rgba(0,0,0,.3) 0 1.5px,transparent 1.5px 60px),repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 1.5px,transparent 1.5px 60px),linear-gradient(135deg,#252B36,#1A1F28)', wall: ['#1A2030', '#141A27', '#0E131D'] },
  bedroom: { floor: '#1C1F2C', top: 'repeating-linear-gradient(45deg,rgba(255,255,255,.012) 0 2px,transparent 2px 5px),linear-gradient(135deg,#21253A,#171A27)', wall: ['#1D1E2E', '#161725', '#10111C'] },
  bathroom: { floor: '#1C222C', top: 'repeating-linear-gradient(90deg,rgba(0,0,0,.35) 0 1px,transparent 1px 30px),repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 1px,transparent 1px 30px),linear-gradient(135deg,#283040,#1B212C)', wall: ['#1D2533', '#171E2A', '#111720'] },
  gym: { floor: '#16191E', top: 'radial-gradient(circle at 20% 30%,rgba(255,255,255,.02) 0 1px,transparent 1.5px) 0 0/9px 9px,radial-gradient(circle at 60% 70%,rgba(255,255,255,.02) 0 1px,transparent 1.5px) 0 0/13px 13px,linear-gradient(135deg,#1B1F25,#121419)', wall: ['#22262E', '#1A1E25', '#13161C'] },
  garage: { floor: '#1C1E23', top: 'radial-gradient(ellipse 70px 40px at 300px 360px,rgba(0,0,0,.35),transparent),repeating-linear-gradient(90deg,rgba(0,0,0,.25) 0 1px,transparent 1px 200px),linear-gradient(135deg,#23262C,#17191E)', wall: ['#22252B', '#1A1D22', '#131519'] }
};

function shell(c, id) {
  const T = THEMES[id];
  c.B(0, 0, 600, 600, -30, 30, T.floor, { top: T.top, front: 'linear-gradient(180deg,#090D14,#101722)', side: 'linear-gradient(90deg,#070A10,#0C111A)' });
  c.B(0, -14, 600, 14, 0, 230, '#283347', { front: `linear-gradient(180deg,${T.wall[0]} 0%,${T.wall[1]} 45%,${T.wall[2]} 100%)`, side: '#0E141F' });
  c.B(-14, -14, 14, 614, 0, 230, '#283347', { side: `linear-gradient(90deg,${T.wall[0]} 0%,${T.wall[1]} 45%,${T.wall[2]} 100%)`, front: '#0E141F' });
  c.yPlane(0, 0.5, 0, 600, 5, '#0B1019');
  c.xPlane(0.5, 0, 0, 600, 5, '#0B1019');
  c.yPlane(0, 600.6, -8, 600, 2.4, '#5B95FF', { sh: '0 0 10px 1px rgba(76,141,255,.7), 0 0 30px 4px rgba(76,141,255,.22)' });
  c.xPlane(600.6, 0, -8, 600, 2.4, '#5B95FF', { sh: '0 0 10px 1px rgba(76,141,255,.7), 0 0 30px 4px rgba(76,141,255,.22)' });
}

// Doorways. back and left are openings in the wall with the door standing open;
// east and south lead off the front edges of the floor.
function doorway(c, d) {
  const w = d.w || 64, a = d.at - w / 2;
  if (!d.dynLeaf) doorLeaf(c, d, false);
  if (d.side === 'back') {
    c.yPlane(a, 0.7, 0, w, 168, 'linear-gradient(180deg,#05070B,#0A0E15 70%,rgba(127,166,255,.08))', { sh: 'inset 0 0 0 3px #2A3446, 0 0 0 1px rgba(169,184,255,.12)' });
    c.floor(a, 1, w, 40, 0.5, 'linear-gradient(180deg,rgba(127,166,255,.14),transparent)');
  } else if (d.side === 'left') {
    c.xPlane(0.7, a, 0, w, 168, 'linear-gradient(180deg,#05070B,#0A0E15 70%,rgba(127,166,255,.08))', { sh: 'inset 0 0 0 3px #2A3446, 0 0 0 1px rgba(169,184,255,.12)' });
    c.floor(1, a, 40, w, 0.5, 'linear-gradient(90deg,rgba(127,166,255,.14),transparent)');
  } else if (d.side === 'east') {
    c.floor(548, d.at - 40, 52, 80, 0.6, 'linear-gradient(90deg,transparent,rgba(127,166,255,.22))', { r: '4px' });
  } else {
    c.floor(d.at - 40, 548, 80, 52, 0.6, 'linear-gradient(180deg,transparent,rgba(127,166,255,.22))', { r: '4px' });
  }
}
// The open door leaf (dyn, so a closed bathroom door can replace it).
// Open doors fold flat against the wall beside the opening, so nobody walks into them.
function doorLeaf(c, d, closed) {
  const w = d.w || 64, a = d.at - w / 2;
  const leaf = closed ? a + 2 : a + w + w - 4 <= 598 ? a + w + 2 : a - w + 2;
  const sh = { sh: 'inset 0 0 0 2px #2A2218' };
  if (d.side === 'back') c.yPlane(leaf, closed ? 1.2 : 1.6, 0, w - 4, 164, 'linear-gradient(90deg,#3A3226,#4A3E2E)', sh);
  else if (d.side === 'left') c.xPlane(closed ? 1.2 : 1.6, leaf, 0, w - 4, 164, 'linear-gradient(90deg,#4A3E2E,#3A3226)', sh);
  if (!closed && (d.side === 'back' || d.side === 'left')) {
    // a hinge line where the door meets the frame
    if (d.side === 'back') c.yPlane(leaf > a ? a + w : a - 2, 1.8, 0, 2, 164, '#2A2218');
    else c.xPlane(1.8, leaf > a ? a + w : a - 2, 0, 2, 164, '#2A2218');
  }
}

// Where a door is in world space: p is on the threshold, i is a step inside, label is where its tag floats.
export function doorPoints(d) {
  if (d.side === 'back') return { p: [d.at, 8], i: [d.at, 52], label: [d.at, 0, 192], dir: [1, -0.5] };
  if (d.side === 'left') return { p: [8, d.at], i: [52, d.at], label: [0, d.at, 192], dir: [-1, -0.5] };
  if (d.side === 'east') return { p: [592, d.at], i: [548, d.at], label: [600, d.at, 26], dir: [1, 0.5] };
  return { p: [d.at, 592], i: [d.at, 548], label: [d.at, 600, 26], dir: [-1, 0.5] };
}

// ---------------------------------------------------------------- shared props
const M = '#36414F';
const TALL_PLANT = `<svg style="position:absolute;left:-40px;bottom:-2px" width="80" height="118" viewBox="0 0 80 118"><path d="M40 116 C38 92 34 70 22 54 C30 54 40 70 40 116 Z" fill="#3B6247"/><path d="M40 116 C40 88 46 64 60 46 C60 66 50 88 40 116 Z" fill="#4C7859"/><path d="M40 116 C36 84 30 52 36 14 C46 40 46 84 40 116 Z" fill="#5A8866"/><path d="M40 116 C44 84 54 56 72 30 C70 58 56 88 40 116 Z" fill="#43704F"/><path d="M40 116 C34 90 20 70 6 62 C10 80 26 100 40 116 Z" fill="#507C5C"/><path d="M40 116 C36 74 22 40 12 26 C14 56 28 92 40 116 Z" fill="#46714F"/><path d="M40 116 C42 70 52 30 58 10 C64 40 52 84 40 116 Z" fill="#5F8E6B"/></svg>`;
const SMALL_PLANT = `<svg style="position:absolute;left:-22px;bottom:-2px" width="44" height="42" viewBox="0 0 44 42"><path d="M22 40 C18 30 11 24 3 24 C9 19 19 24 22 40 Z" fill="#3D6449"/><path d="M22 40 C26 30 33 24 41 25 C35 19 25 24 22 40 Z" fill="#4E7A5C"/><path d="M22 40 C19 28 17 16 20 4 C27 12 26 28 22 40 Z" fill="#5F8C6A"/><path d="M22 40 C21 30 26 18 34 12 C34 22 28 32 22 40 Z" fill="#46704F"/><path d="M22 40 C21 31 14 20 8 15 C8 25 15 34 22 40 Z" fill="#54805F"/></svg>`;
const GLOBE = `<svg style="position:absolute;left:-18px;bottom:0" width="36" height="46" viewBox="0 0 36 46"><defs><radialGradient id="glb" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#5674A8"/><stop offset="1" stop-color="#18233A"/></radialGradient></defs><ellipse cx="18" cy="43.5" rx="9" ry="2.2" fill="#8C6E43"/><path d="M18 43 L18 36" stroke="#A8844F" stroke-width="2"/><path d="M5.5 30 A14 14 0 0 0 30.5 30" fill="none" stroke="#B08D57" stroke-width="1.6"/><circle cx="18" cy="18" r="13" fill="url(#glb)"/><path d="M9 13 C12 10 15 12 14 15 C13 18 10 19 9 17 Z M19 9 C23 8 27 11 26 14 C24 16 21 14 20 17 C19 20 22 23 20 26 C18 27 17 24 17 21 C16 17 16 12 19 9 Z" fill="#7E95C4" opacity=".55"/></svg>`;
const BOOK_PAL = ['#3E4C6E', '#C8784A', '#56638A', '#2E4A52', '#8592B8', '#6E5A48', '#A9B8FF', '#344058', '#D9B48C', '#4C8DFF'];

// ---------------------------------------------------------------- rooms
// Each room: name, cell on the floor plan, doors, wall clock, things you can't walk through,
// spots people use (a = where they walk to, s = where they settle for seated poses),
// build(phase) for the static scene and dyn(state) for things that change.
export const ROOMS = {
  studio: {
    name: 'Studio', cell: [0, 1],
    doors: [{ to: 'bedroom', side: 'back', at: 216, w: 56 }, { to: 'living', side: 'east', at: 500 }],
    clock: ['left', 112, 150],
    obstacles: [[0, 186, 128, 456], [120, 284, 196, 356], [0, 0, 56, 56], [326, 0, 524, 64], [464, 276, 566, 378], [416, 310, 464, 358], [562, 258, 596, 292]],
    spots: {
      desk: { a: [222, 330], s: [156, 320, 59, 0], pose: 'desk' },
      books: { a: [420, 100], h: 90, pose: 'browse' },
      lounge: { a: [516, 420], s: [516, 344, 48, -90], pose: 'chair' },
      window: { a: [120, 100], h: 90, pose: 'stand' },
    },
    build(ph) {
      const c = collector(); shell(c, 'studio');
      windowBack(c, ph, 60, 120, 72, 120);
      this.doors.forEach((d) => doorway(c, d));
      c.floor(0, 170, 280, 300, 0.4, 'radial-gradient(ellipse 200px 170px at 40px 150px,rgba(76,141,255,.14),transparent 75%)');
      c.floor(104, 266, 108, 108, 0.45, 'rgba(169,184,255,.035)', { r: '8px', sh: 'inset 0 0 0 1px rgba(169,184,255,.08)' });
      c.floor(116, 280, 84, 84, 0.5, 'radial-gradient(closest-side,rgba(0,0,0,.5),transparent)');
      c.B(14, 14, 30, 30, 0, 32, '#222B3A', { top: 'radial-gradient(circle,#2A1E16 0 11px,#222B3A 12px)' });
      c.floor(6, 6, 50, 50, 0.5, 'radial-gradient(closest-side,rgba(0,0,0,.5),transparent)');
      c.bb(29, 29, 32, TALL_PLANT);
      // desk
      c.B(8, 196, 104, 8, 0, 92, '#232C3A'); c.B(8, 438, 104, 8, 0, 92, '#232C3A');
      c.B(10, 372, 86, 62, 0, 70, '#1F2836');
      c.xPlane(96.5, 372, 6, 62, 58, rect('#2C3748', 0, 28, 62, 1) + ',' + rect('#3A4658', 26, 12, 10, 2) + ',' + rect('#3A4658', 26, 40, 10, 2));
      c.B(0, 190, 124, 262, 92, 8, '#2C3748', { top: 'linear-gradient(90deg,#283244,#334055)', side: '#1B2330', front: '#202938' });
      c.xPlane(124.4, 190, 92, 262, 8, 'linear-gradient(0deg,#1B2330,#26303F)');
      c.B(16, 248, 30, 30, 100, 3, M); c.B(24, 259, 8, 8, 103, 40, M);
      c.B(16, 364, 30, 30, 100, 3, M); c.B(24, 375, 8, 8, 103, 40, M);
      c.B(30, 206, 7, 112, 138, 70, '#1A212D'); c.B(30, 322, 7, 112, 138, 70, '#1A212D');
      c.B(90, 274, 20, 92, 100, 3, '#1C2431', { top: 'repeating-linear-gradient(90deg,transparent 0 4px,#121821 4px 5px),repeating-linear-gradient(0deg,#2A3445 0 5px,#121821 5px 6px)' });
      c.floor(86, 374, 32, 38, 100.5, '#161D29', { r: '3px' });
      c.B(96, 386, 9, 13, 100, 4, '#2E3949');
      c.B(88, 214, 11, 11, 100, 13, '#C8B79E', { top: 'radial-gradient(circle,#3A2416 0 3.6px,#C8B79E 4.2px)' });
      c.B(99, 218, 3, 3, 104, 6, '#B8A78E');
      c.B(72, 228, 28, 22, 100, 2, '#2F3D63', { top: 'linear-gradient(90deg,#2F3D63 0 3px,#3A4A76 3px)' });
      c.B(12, 416, 18, 18, 100, 3, M); c.B(19, 423, 4, 4, 103, 58, M); c.B(19, 423, 34, 5, 158, 4, M);
      c.B(44, 418, 14, 14, 150, 10, '#2B3445');
      // office chair
      const C = '#1F2633';
      c.B(128, 317, 56, 6, 8, 5, C); c.B(153, 292, 6, 56, 8, 5, C); c.B(153, 317, 6, 6, 13, 36, '#3A4556');
      c.B(126, 290, 58, 60, 49, 10, '#252E3D', { top: 'radial-gradient(ellipse at 50% 50%,#2E384A,#222A38)' });
      c.B(184, 298, 8, 44, 64, 26, '#232C3A', { side: 'repeating-linear-gradient(0deg,#181F2A 0 2px,#1C2430 2px 4px)', top: '#2C3646' });
      c.B(186, 316, 4, 8, 50, 14, '#3A4556');
      c.B(136, 288, 38, 5, 72, 4, '#2C3646'); c.B(136, 347, 38, 5, 72, 4, '#2C3646');
      c.B(160, 289, 4, 3, 59, 13, '#2C3646'); c.B(160, 348, 4, 3, 59, 13, '#2C3646');
      // bookcase
      c.floor(320, 0.5, 210, 90, 0.5, 'radial-gradient(ellipse 110px 60px at 105px 20px,rgba(0,0,0,.45),transparent)');
      const BC = '#263042';
      c.B(330, 0, 8, 58, 0, 220, BC); c.B(512, 0, 8, 58, 0, 220, BC);
      c.B(330, 0, 190, 58, 212, 8, '#2C374A'); c.B(338, 0, 174, 58, 0, 10, '#1E2736');
      c.B(338, 2, 174, 56, 60, 4, '#2A3446'); c.B(338, 2, 174, 56, 114, 4, '#2A3446'); c.B(338, 2, 174, 56, 168, 4, '#2A3446');
      c.yPlane(338, 0.7, 10, 174, 202, 'linear-gradient(180deg,#121A28,#0D131E)');
      c.yPlane(338, 0.9, 162, 174, 2, 'rgba(127,166,255,.35)', { sh: '0 0 10px rgba(127,166,255,.35)' });
      c.yPlane(338, 0.9, 108, 174, 2, 'rgba(240,184,104,.28)', { sh: '0 0 10px rgba(240,184,104,.28)' });
      const pal = ['#2D3850', '#3E4C6E', '#56638A', '#8592B8', '#1F2738', '#6E5A48', '#A9B8FF', '#344058', '#4C8DFF'];
      const widths = [9, 12, 8, 14, 10, 11, 7, 13, 9, 10], heights = [40, 44, 36, 46, 38, 42, 34, 45, 39, 41];
      const row = (z, xs, xe, seed, maxH) => {
        let x = xs, i = seed;
        for (;;) {
          const w = widths[i % 10], hh = Math.min(heights[(i * 3) % 10], maxH), col = pal[(i * 5) % 9];
          if (x + w > xe) break;
          c.B(x, 10, w, 40, z, hh, col, { front: `linear-gradient(180deg,${sh(col, 0.85)},${col} 30%,${col} 70%,${sh(col, 1.12)})`, top: sh(col, 0.82), side: sh(col, 0.58) });
          x += w + 1; i++;
        }
      };
      row(10, 342, 466, 0, 46); c.B(472, 12, 36, 42, 10, 32, '#2A3445');
      row(64, 342, 446, 3, 46); row(118, 342, 424, 6, 46);
      c.B(430, 10, 72, 4, 118, 46, '#3A465C');
      row(172, 342, 400, 2, 36);
      c.B(410, 10, 52, 38, 172, 6, '#3E4C6E'); c.B(414, 12, 46, 34, 178, 5, '#6E5A48');
      c.B(474, 22, 14, 14, 172, 14, '#B08D57', { top: 'linear-gradient(135deg,#D2AE74,#9C7A47)' });
      c.B(346, 18, 20, 20, 220, 16, '#C8B79E');
      c.bb(488, 32, 64, GLOBE); c.bb(356, 28, 236, SMALL_PLANT);
      // lounge
      c.floor(392, 228, 200, 212, 0.6, 'repeating-linear-gradient(45deg,rgba(169,184,255,.03) 0 2px,transparent 2px 7px),#151C2A', { r: '6px', sh: 'inset 0 0 0 7px #151C2A, inset 0 0 0 8px rgba(169,184,255,.16), 0 0 0 1px rgba(0,0,0,.3)' });
      c.floor(458, 270, 116, 120, 0.9, 'radial-gradient(closest-side,rgba(0,0,0,.5),transparent)');
      const L = '#6A4630';
      c.B(474, 286, 5, 5, 0, 6, '#14181F'); c.B(553, 286, 5, 5, 0, 6, '#14181F'); c.B(474, 366, 5, 5, 0, 6, '#14181F'); c.B(553, 366, 5, 5, 0, 6, '#14181F');
      c.B(470, 282, 92, 18, 6, 104, '#5E3E2A', { top: '#7A5238', front: 'linear-gradient(180deg,#4A3021,#6A4630)' });
      c.B(486, 300, 60, 72, 6, 30, '#55382A');
      c.B(486, 300, 60, 12, 36, 62, '#7A5238', { top: '#8A5E41', front: 'linear-gradient(180deg,#5E3E2A,#86593C 70%,#7A5238)' });
      c.B(486, 312, 60, 60, 36, 12, '#7A5238', { top: 'linear-gradient(0deg,#7A5238,#8E6143)' });
      c.B(470, 300, 16, 72, 6, 58, L, { top: '#82593D' }); c.B(546, 300, 16, 72, 6, 58, L, { top: '#82593D' });
      c.B(570, 266, 20, 20, 0, 3, M); c.B(578, 274, 4, 4, 3, 166, '#3A4556');
      const lamp = isDark(ph);
      c.B(566, 262, 28, 28, 166, 30, '#E8D3AE', { top: lamp ? 'radial-gradient(circle,#FFF4DE,#E8C38A)' : '#D9C6A2', front: 'linear-gradient(180deg,#B98B52,#F2D7A6)', side: 'linear-gradient(90deg,#A97E48,#E2C08A)', glow: lamp ? '0 0 46px 16px rgba(240,184,104,.32)' : 'none' });
      if (lamp) c.floor(430, 140, 170, 280, 0.8, 'radial-gradient(ellipse 150px 150px at 150px 135px,rgba(240,184,104,.22),transparent 72%)');
      c.floor(414, 308, 52, 52, 0.9, 'radial-gradient(closest-side,rgba(0,0,0,.45),transparent)');
      c.B(428, 322, 24, 24, 0, 4, '#2B3445'); c.B(437, 331, 6, 6, 4, 48, '#2B3445');
      c.B(420, 314, 40, 40, 52, 4, '#6E5038', { top: 'linear-gradient(135deg,#86644A,#5E4330)' });
      c.B(428, 322, 26, 18, 56, 1.5, '#E9ECF4', { glow: '0 0 14px rgba(127,166,255,.35)' });
      c.floor(428, 322, 26, 18, 57.8, 'radial-gradient(circle at 13px 9px,#4C8DFF 0 2.4px,transparent 2.9px),linear-gradient(146deg,transparent 47%,rgba(9,12,18,.22) 48% 52%,transparent 53%),linear-gradient(34deg,transparent 47%,rgba(9,12,18,.22) 48% 52%,transparent 53%)');
      return c;
    },
    dyn(s, ph) {
      const c = collector();
      const on = s.desk;
      // Two monitors: the left one moves through code, research, tasks and workflows.
      const glowC = on === 'off' ? 'none' : '0 0 26px rgba(76,141,255,.28)';
      c.xPlane(37.6, 325, 141, 106, 64, '#0B1220', { sh: glowC, html: on === 'work' ? SCREEN_MAIN : on === 'idle' ? SCREEN_IDLE : '', cls: 'st-scr', id: 'scr-main' });
      c.xPlane(37.6, 209, 141, 106, 64, '#0B1220', { sh: glowC, html: on === 'work' ? SCREEN_LOGS : on === 'idle' ? SCREEN_IDLE : '', cls: 'st-scr' });
      if (on === 'work') c.floor(36, 206, 40, 228, 100.5, 'linear-gradient(90deg,rgba(76,141,255,.18),transparent)');
      if (s.deskLamp) {
        c.floor(16, 370, 104, 82, 100.6, 'radial-gradient(ellipse 50px 40px at 38px 52px,rgba(240,184,104,.32),transparent 80%)');
        c.floor(45, 419, 12, 12, 149.4, '#F3C27A', { r: '2px', sh: '0 0 14px 5px rgba(240,184,104,.5)' });
      }
      return c;
    }
  },

  living: {
    name: 'Living room', cell: [1, 1],
    doors: [{ to: 'bathroom', side: 'back', at: 502 }, { to: 'studio', side: 'left', at: 82 }, { to: 'kitchen', side: 'east', at: 290 }, { to: 'garage', side: 'south', at: 300 }],
    clock: ['back', 408, 168],
    obstacles: [[0, 226, 56, 446], [156, 282, 252, 394], [300, 220, 392, 452], [404, 170, 436, 202], [546, 26, 574, 54], [140, 0, 300, 36]],
    spots: {
      sofaA: { a: [276, 292], s: [340, 292, 38, 0], pose: 'sofa' },
      sofaB: { a: [276, 392], s: [340, 392, 38, 0], pose: 'sofa' },
      sofaC: { a: [276, 342], s: [340, 342, 38, 0], pose: 'sofa' },
      shelf: { a: [220, 64], h: 90, pose: 'browse' },
      chat1: { a: [230, 510], h: 180, pose: 'talk' },
      chat2: { a: [292, 510], h: 0, pose: 'talk' },
    },
    build(ph) {
      const c = collector(); shell(c, 'living');
      windowBack(c, ph, 110, 220, 70, 120);
      this.doors.forEach((d) => doorway(c, d));
      c.rug(130, 190, 290, 290, '#1B2232', 'rgba(169,184,255,.03)');
      // TV wall
      c.shadow(0, 220, 80, 240);
      c.B(0, 226, 52, 220, 0, 40, '#2A2F3A', { top: 'linear-gradient(90deg,#3A3226,#2E271E)' });
      c.xPlane(52.4, 226, 6, 220, 28, rect('#1E232D', 0, 13, 220, 1) + ',' + rect('#1E232D', 109, 0, 1, 28) + ',linear-gradient(0deg,#22262F,#2A2F3A)');
      c.B(4, 236, 6, 200, 84, 112, '#11151C');
      c.B(16, 250, 20, 30, 40, 8, '#1C212B');
      // coffee table, sofa
      c.shadow(150, 270, 110, 130);
      c.B(162, 288, 84, 100, 0, 30, '#2B3445');
      c.B(156, 282, 96, 112, 30, 5, '#6E5038', { top: 'linear-gradient(135deg,#86644A,#5E4330)' });
      c.B(214, 352, 11, 11, 35, 12, '#C8B79E', { top: 'radial-gradient(circle,#3A2416 0 3.6px,#C8B79E 4.2px)' });
      c.shadow(300, 200, 120, 270);
      const SF = '#2E4A52';
      c.B(300, 220, 92, 232, 0, 24, sh(SF, 0.8));
      c.B(366, 220, 26, 232, 24, 64, SF, { top: sh(SF, 1.15) });
      c.B(300, 220, 66, 18, 24, 34, SF, { top: sh(SF, 1.15) });
      c.B(300, 434, 66, 18, 24, 34, SF, { top: sh(SF, 1.15) });
      c.B(302, 238, 64, 98, 24, 14, sh(SF, 1.08), { top: `linear-gradient(0deg,${sh(SF, 1.08)},${sh(SF, 1.22)})` });
      c.B(302, 337, 64, 97, 24, 14, sh(SF, 1.08), { top: `linear-gradient(0deg,${sh(SF, 1.08)},${sh(SF, 1.22)})` });
      c.B(354, 226, 12, 30, 38, 24, '#C8784A', { top: '#D88A5C' });
      // floor lamp, plant, wall shelf
      c.B(410, 176, 20, 20, 0, 3, M); c.B(418, 184, 4, 4, 3, 150, '#3A4556');
      const lamp = isDark(ph);
      c.B(406, 172, 28, 28, 150, 26, '#E8D3AE', { top: lamp ? 'radial-gradient(circle,#FFF4DE,#E8C38A)' : '#D9C6A2', front: 'linear-gradient(180deg,#B98B52,#F2D7A6)', side: 'linear-gradient(90deg,#A97E48,#E2C08A)', glow: lamp ? '0 0 46px 16px rgba(240,184,104,.3)' : 'none' });
      if (lamp) c.glowAt(420, 260, 150, 0.18);
      c.plant(560, 40);
      c.B(360, 0, 90, 22, 120, 4, '#2C3748');
      c.B(372, 2, 22, 18, 124, 30, '#1C212B', { front: 'radial-gradient(circle at 11px 12px,#3A4556 0 6px,#1C212B 7px)' });
      // low bookshelf under the window (books are dyn)
      c.shadow(130, 0, 180, 60);
      c.B(140, 0, 160, 34, 0, 6, '#2A221B');
      c.B(140, 0, 6, 34, 0, 62, '#3A2F24'); c.B(294, 0, 6, 34, 0, 62, '#3A2F24'); c.B(218, 0, 4, 34, 0, 62, '#3A2F24');
      c.B(140, 0, 160, 34, 30, 3, '#4A3E2E'); c.B(140, 0, 160, 34, 62, 4, '#5A4A36', { top: 'linear-gradient(135deg,#6E5A44,#4A3E2E)' });
      c.yPlane(146, 0.7, 6, 148, 56, '#15110D');
      c.B(240, 6, 18, 18, 66, 16, '#C8B79E', { top: 'radial-gradient(circle,#4E7A5C 0 6px,#C8B79E 7px)' });
      return c;
    },
    dyn(s) {
      const c = collector();
      // TV screen
      const tv = s.tv;
      if (tv === 'off') {
        c.xPlane(10.4, 242, 90, 188, 104, 'linear-gradient(135deg,#0B0E14 0%,#151A23 46%,#0E1219 54%,#0B0E14 100%)');
      } else if (tv === 'film') {
        c.xPlane(10.4, 242, 90, 188, 104, [rect('#05070B', 0, 0, 188, 12), rect('#05070B', 0, 92, 188, 12), 'radial-gradient(ellipse 40px 22px at 130px 66px,rgba(255,200,140,.9),rgba(240,140,90,.4) 60%,transparent)', 'linear-gradient(180deg,#2B2350 12px,#8E4A6A 60px,#E08A5A 92px)'].join(','), { sh: '0 0 40px rgba(230,140,110,.28)', cls: 'tv-film' });
        c.xPlane(10.6, 242, 90, 188, 104, rect('#120E1A', 0, 74, 188, 18), { cls: 'tv-pan' });
        c.floor(10, 230, 200, 210, 0.7, 'radial-gradient(ellipse 120px 110px at 0px 105px,rgba(230,150,110,.12),transparent 80%)');
      } else {
        const pitch = ['radial-gradient(circle at 100px 56px,transparent 0 13px,rgba(255,255,255,.55) 13px 14px,transparent 14.5px)', rect('rgba(255,255,255,.55)', 99, 6, 1, 100), rect('rgba(255,255,255,.55)', 6, 6, 188, 1), rect('rgba(255,255,255,.55)', 6, 105, 188, 1), rect('rgba(255,255,255,.55)', 6, 6, 1, 100), rect('rgba(255,255,255,.55)', 193, 6, 1, 100), rect('rgba(255,255,255,.5)', 6, 36, 24, 40), rect('#3B7A3E', 7, 37, 22, 38), rect('rgba(255,255,255,.5)', 170, 36, 24, 40), rect('#3B7A3E', 171, 37, 22, 38), rect('rgba(9,12,18,.75)', 70, 2, 60, 6), 'repeating-linear-gradient(90deg,#2F6A35 0 20px,#337239 20px 40px)'];
        c.xPlane(10.4, 242, 90, 188, 104, pitch.join(','), { sh: '0 0 40px rgba(90,200,120,.28)' });
        c.xPlane(10.6, 242, 90, 188, 104, '', { html: tv === 'paused' ? '<div class="tv-pause"><i></i><i></i></div>' : '<div class="tv-game"><i></i><i></i><i></i><i></i><b></b></div>' });
        c.floor(10, 230, 200, 210, 0.7, 'radial-gradient(ellipse 120px 110px at 0px 105px,rgba(110,210,130,.12),transparent 80%)');
      }
      // books on the low shelf; a gap where one has been taken
      for (let i = 0; i < 10; i++) {
        if (s.shelf[i] === 0) continue;
        const sx = i < 5 ? 150 + i * 13 : 226 + (i - 5) * 13, col = BOOK_PAL[i];
        c.B(sx, 8, 10, 22, 33, 24 + (i * 7) % 6, col, { front: `linear-gradient(180deg,${sh(col, 0.85)},${col} 30%,${col} 70%,${sh(col, 1.12)})`, top: sh(col, 0.82), side: sh(col, 0.58) });
      }
      for (let i = 0; i < 6; i++) { const col = BOOK_PAL[(i + 4) % 10]; c.B(150 + i * 23, 8, 18, 22, 6, 20, col, { front: col, top: sh(col, 0.8), side: sh(col, 0.6) }); }
      return c;
    }
  },

  kitchen: {
    name: 'Kitchen', cell: [2, 1],
    doors: [{ to: 'living', side: 'left', at: 282 }, { to: 'gym', side: 'back', at: 548 }],
    clock: ['left', 180, 150],
    obstacles: [[66, 0, 484, 64], [0, 74, 72, 150], [214, 226, 426, 334], [246, 349, 404, 377], [60, 420, 180, 510], [100, 376, 140, 416], [18, 442, 62, 482]],
    spots: {
      stove: { a: [232, 98], h: 90, pose: 'cook' },
      coffee: { a: [106, 98], h: 90, pose: 'counter' },
      sink: { a: [365, 98], h: 90, pose: 'wash' },
      fridge: { a: [100, 112], h: 0, pose: 'counter' },
      island: { a: [446, 282], h: 0, pose: 'drink' },
      island2: { a: [446, 318], h: 20, pose: 'stand' },
      stoolA: { a: [330, 402], s: [330, 363, 66, 90], pose: 'stool' },
      stoolB: { a: [260, 402], s: [260, 363, 66, 90], pose: 'stool' },
      dineN: { a: [120, 352], s: [120, 400, 34, -90], pose: 'chair' },
      dineW: { a: [40, 414], s: [40, 462, 34, 180], pose: 'chair' },
      chat1: { a: [440, 452], h: 180, pose: 'talk' }, chat2: { a: [500, 452], h: 0, pose: 'talk' },
    },
    build(ph) {
      const c = collector(); shell(c, 'kitchen');
      this.doors.forEach((d) => doorway(c, d));
      windowBack(c, ph, 300, 120, 112, 74);
      const CB = '#262D3A', TOP = 'linear-gradient(90deg,#C9CED8,#B6BCC8)';
      c.yPlane(0, 0.65, 92, 480, 48, 'repeating-linear-gradient(90deg,rgba(0,0,0,.22) 0 1px,transparent 1px 24px),repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 12px),#2C3646');
      c.B(70, 0, 410, 60, 0, 88, CB, { front: `repeating-linear-gradient(90deg,${CB} 0 66px,#1B212C 66px 68px)` });
      c.B(66, 0, 418, 64, 88, 5, '#C9CED8', { top: TOP, front: '#9AA3B0' });
      c.xPlane(484.5, 0, 0, 60, 93, '#1B212C');
      c.B(70, 0, 220, 34, 150, 60, CB, { front: `repeating-linear-gradient(90deg,${CB} 0 54px,#1B212C 54px 56px)` });
      c.B(430, 0, 50, 34, 150, 60, CB);
      c.floor(330, 12, 70, 38, 93.4, 'linear-gradient(#9AA3B0,#7D8694)', { r: '6px', sh: 'inset 0 0 0 3px #B6BCC8' });
      c.B(362, 2, 6, 6, 93, 22, '#B6BCC8'); c.B(362, 2, 6, 16, 113, 4, '#B6BCC8');
      c.B(90, 8, 26, 30, 93, 34, '#1C212B', { front: 'radial-gradient(circle at 13px 10px,#4C8DFF 0 1.6px,transparent 2px),#1C212B' });
      c.B(128, 14, 16, 16, 93, 18, '#B6BCC8');
      c.shadow(0, 70, 90, 120);
      c.B(0, 74, 72, 76, 0, 200, '#9AA3B0', { top: '#B6BCC8', side: 'linear-gradient(180deg,#8B94A1 0 62%,#5E6672 62% 63%,#8B94A1 63%)', front: '#7D8694' });
      c.B(72, 88, 3, 4, 120, 60, '#C9CED8');
      // island + stools
      c.shadow(210, 220, 230, 140);
      c.B(220, 232, 200, 96, 0, 88, '#2B3445', { side: 'repeating-linear-gradient(90deg,#1E2532 0 48px,#18202B 48px 50px)' });
      c.B(214, 226, 212, 108, 88, 5, '#C9CED8', { top: 'linear-gradient(135deg,#D3D7DF,#AEB5C2)' });
      c.B(330, 276, 40, 30, 93, 16, '#8C6E43', { top: 'radial-gradient(circle at 12px 14px,#E0B83C 0 5px,transparent 6px),radial-gradient(circle at 26px 12px,#D8503C 0 5px,transparent 6px),radial-gradient(circle at 20px 20px,#7BA24A 0 5px,transparent 6px),#5E4330' });
      [260, 330, 390].forEach((sx) => { c.B(sx - 3, 360, 6, 6, 0, 60, M); c.B(sx - 14, 349, 28, 28, 60, 6, '#2E4A52', { top: '#3E5E68' }); });
      const lamp = isDark(ph);
      [270, 370].forEach((px) => {
        c.B(px - 1, 279, 2, 2, 160, 100, '#3A4556');
        c.B(px - 12, 268, 24, 24, 150, 12, '#1C212B', { glow: lamp ? '0 0 30px 10px rgba(240,184,104,.28)' : 'none' });
        if (lamp) c.glowAt(px, 280, 70, 0.14);
      });
      // dining table and two chairs
      c.shadow(50, 410, 140, 110);
      c.B(70, 432, 8, 8, 0, 52, '#3A2F24'); c.B(162, 432, 8, 8, 0, 52, '#3A2F24'); c.B(70, 490, 8, 8, 0, 52, '#3A2F24'); c.B(162, 490, 8, 8, 0, 52, '#3A2F24');
      c.B(62, 422, 116, 84, 52, 5, '#6E5038', { top: 'linear-gradient(135deg,#8A6A4E,#5E4330)' });
      c.B(108, 446, 24, 24, 57, 12, '#E9ECF2', { top: 'radial-gradient(circle,#5F8C6A 0 6px,#E9ECF2 7px)' });
      const chair = (x, y, back) => {
        c.B(x - 15, y - 14, 30, 28, 30, 4, '#2E4A52', { top: '#3E5E68' });
        [[x - 13, y - 12], [x + 9, y - 12], [x - 13, y + 8], [x + 9, y + 8]].forEach(([lx, ly]) => c.B(lx, ly, 4, 4, 0, 30, '#1C212B'));
        if (back === 'n') c.B(x - 15, y - 16, 30, 4, 34, 34, '#2E4A52', { top: '#3E5E68' });
        else c.B(x - 18, y - 14, 4, 28, 34, 34, '#2E4A52', { top: '#3E5E68' });
      };
      chair(120, 396, 'n'); chair(40, 462, 'w');
      c.floor(110, 200, 26, 18, 0.8, 'radial-gradient(ellipse,#4C8DFF 0 7px,#2B4B8C 8px 11px,transparent 12px)');
      c.floor(82, 206, 22, 16, 0.8, 'radial-gradient(ellipse,#9FD6F4 0 6px,#2B4B8C 7px 10px,transparent 11px)');
      return c;
    },
    dyn(s) {
      const c = collector();
      const hot = s.stove;
      c.floor(190, 10, 80, 44, 93.4, `radial-gradient(circle at 20px 14px,${hot ? '#F26B3A 0 3px,transparent 3.5px,transparent 6px,rgba(242,107,58,.85) 6px 8px' : 'transparent 0 6px,#3A4556 6px 8px'},transparent 8.5px),radial-gradient(circle at 60px 14px,transparent 0 6px,#3A4556 6px 8px,transparent 8.5px),radial-gradient(circle at 20px 32px,transparent 0 6px,#3A4556 6px 8px,transparent 8.5px),radial-gradient(circle at 60px 32px,transparent 0 6px,#3A4556 6px 8px,transparent 8.5px),#11151C`, { r: '3px', sh: hot ? '0 0 18px rgba(242,107,58,.35)' : 'none' });
      c.B(198, 14, 24, 22, 94, 5, '#2B2F36', { top: hot ? 'radial-gradient(circle,#F3D36B 0 4px,#E9E2D0 5px 8px,#2B2F36 9px)' : '#2B2F36' });
      c.B(222, 23, 22, 4, 97, 2, '#2B2F36');
      if (hot) c.bb(210, 24, 120, '<div class="st-steam sm"><i></i><i></i><i></i></div>');
      if (s.coffee) c.bb(103, 22, 132, '<div class="st-steam sm"><i></i><i></i></div>');
      // plates: on the table at a seat, or stacked in the sink
      const plate = (x, y, z, food) => c.B(x, y, 22, 22, z, 2, '#E9ECF2', { top: food ? 'radial-gradient(circle,#E0B83C 0 3px,#C8784A 4px 6px,#7BA24A 7px,#F4F6FA 8px)' : 'radial-gradient(circle,#D9DDE5 0 6px,#F4F6FA 7px)' });
      if (s.plateN === 'food') plate(108, 424, 57, true); else if (s.plateN === 'empty') plate(108, 424, 57, false);
      if (s.plateW === 'food') plate(66, 452, 57, true); else if (s.plateW === 'empty') plate(66, 452, 57, false);
      if (s.plateIsland) plate(400, 296, 93, s.plateIsland === 'food');
      for (let i = 0; i < Math.min(3, s.sinkPlates); i++) c.B(354, 20, 22, 22, 90 + i * 2.2, 2, '#E9ECF2', { top: 'radial-gradient(circle,#D9DDE5 0 6px,#F4F6FA 7px)' });
      return c;
    }
  },

  bedroom: {
    name: 'Bedroom', cell: [0, 0],
    doors: [{ to: 'bathroom', side: 'east', at: 370 }, { to: 'studio', side: 'south', at: 240 }],
    clock: ['back', 58, 150],
    obstacles: [[150, 0, 370, 256], [110, 6, 144, 46], [376, 6, 410, 46], [0, 300, 62, 490], [186, 266, 334, 300]],
    spots: {
      bed: { a: [400, 160], s: 'lie', pose: 'lie' },
      bedRead: { a: [400, 160], s: [262, 64, 50, -90], pose: 'bedsit' },
      wardrobe: { a: [96, 395], h: 0, pose: 'counter' },
      window: { a: [500, 96], h: 90, pose: 'stand' },
    },
    build(ph) {
      const c = collector(); shell(c, 'bedroom');
      windowBack(c, ph, 430, 140, 80, 110);
      c.B(410, 0, 22, 14, 60, 140, '#3A2F4A', { front: 'linear-gradient(90deg,#3A2F4A,#4A3C5E)' }); c.B(568, 0, 22, 14, 60, 140, '#3A2F4A', { front: 'linear-gradient(90deg,#4A3C5E,#3A2F4A)' });
      this.doors.forEach((d) => doorway(c, d));
      c.rug(150, 230, 230, 150, '#2A2540', 'rgba(255,255,255,.025)');
      c.shadow(140, 0, 240, 280);
      c.B(150, 0, 220, 14, 0, 112, '#3B3552', { front: 'repeating-linear-gradient(90deg,#3B3552 0 34px,#332E47 34px 36px)', top: '#4A4366' });
      c.B(160, 14, 200, 240, 0, 28, '#2A2F3D');
      c.B(166, 14, 188, 232, 28, 18, '#E3E6EE', { top: '#ECEEF4' });
      c.B(178, 22, 74, 40, 46, 14, '#F2F3F7', { top: 'linear-gradient(0deg,#E2E5EE,#FFFFFF)' }); c.B(268, 22, 74, 40, 46, 14, '#F2F3F7', { top: 'linear-gradient(0deg,#E2E5EE,#FFFFFF)' });
      [110, 376].forEach((nx) => { c.B(nx, 6, 34, 40, 0, 50, '#3A3226', { top: 'linear-gradient(135deg,#86644A,#5E4330)' }); c.B(nx + 11, 18, 12, 12, 50, 18, M); });
      c.shadow(0, 290, 80, 210);
      c.B(0, 300, 62, 190, 0, 210, '#262B38', { side: 'linear-gradient(180deg,#2C3242,#22273A)', top: '#2F3546' });
      c.B(186, 266, 148, 34, 0, 34, '#3B3552', { top: '#4A4366' });
      if (ph === 'night') c.floor(400, 60, 200, 260, 0.5, 'linear-gradient(180deg,rgba(140,170,240,.08),transparent 80%)');
      return c;
    },
    dyn(s) {
      const c = collector();
      const duvet = 'repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 22px),linear-gradient(90deg,#2C3A63,#34457A)';
      if (s.bed === 'unmade') {
        c.B(162, 150, 196, 100, 30, 16, '#2C3A63', { top: 'radial-gradient(ellipse at 30% 40%,#3A4C84,#2C3A63 70%)', front: '#26335A', side: '#212D50' });
        c.B(200, 118, 120, 40, 30, 22, '#2C3A63', { top: 'radial-gradient(ellipse at 50% 50%,#40538F,#2C3A63 70%)', front: '#26335A', side: '#212D50' });
      } else {
        c.B(162, s.bed === 'read' ? 120 : 72, 196, s.bed === 'read' ? 130 : 178, 30, 22, '#2C3A63', { top: duvet, front: '#26335A', side: '#212D50' });
        c.B(166, s.bed === 'read' ? 120 : 72, 188, 16, 52, 4, '#E3E6EE');
      }
      if (s.bed === 'sleep') {
        const DV = (x, y, w, d, z, h) => c.B(x, y, w, d, z, h, '#2E3D69', { top: 'radial-gradient(ellipse at 50% 45%,#40538F,#2E3D69 75%)', front: '#24305A', side: '#1D2749' });
        DV(222, 74, 76, 56, 52, 20); DV(226, 130, 68, 44, 52, 16); DV(230, 174, 60, 50, 52, 12);
        DV(236, 222, 22, 22, 52, 18); DV(262, 222, 22, 22, 52, 18);
        c.B(292, 92, 12, 52, 72, 9, '#5A6070', { top: '#6B7282' });
        c.B(293, 144, 10, 11, 72, 8, '#6B4530', { top: '#7A503A' });
      } else if (s.bed === 'read') {
        const DV = (x, y, w, d, z, h) => c.B(x, y, w, d, z, h, '#2E3D69', { top: 'radial-gradient(ellipse at 50% 45%,#40538F,#2E3D69 75%)', front: '#24305A', side: '#1D2749' });
        DV(232, 130, 60, 60, 52, 14); DV(236, 200, 22, 22, 52, 18); DV(262, 200, 22, 22, 52, 18);
      }
      // lamps on the nightstands
      [110, 376].forEach((nx) => {
        c.B(nx + 5, 12, 24, 24, 68, 18, '#E8D3AE', { top: s.lamp ? 'radial-gradient(circle,#FFF4DE,#E8C38A)' : '#D9C6A2', glow: s.lamp ? '0 0 28px 8px rgba(240,184,104,.26)' : 'none' });
        if (s.lamp) c.glowAt(nx + 17, 40, 70, 0.12);
      });
      if (s.nightBook) { c.B(116, 30, 18, 12, 50, 6, '#6E5A48'); c.B(118, 31, 16, 10, 56, 4, '#C8784A'); }
      else { c.B(116, 30, 18, 12, 50, 6, '#6E5A48'); }
      // wardrobe front: doors closed or open with clothes inside
      if (s.wardrobe) {
        c.xPlane(62.4, 300, 0, 190, 210, 'repeating-linear-gradient(90deg,#3E4C6E 0 14px,#2A3242 14px 16px,#6E5A48 16px 30px,#2A3242 30px 32px,#1F2738 32px 46px,#2A3242 46px 48px,#C8784A 48px 62px,#2A3242 62px 64px) 6px 30px/178px 120px no-repeat,' + rect('#B6BCC8', 6, 26, 178, 3) + ',#141820');
        c.dec(94, 210, 'matrix3d(0.7071,0.7071,0,0,0,0,-1,0,0.7071,-0.7071,0,0,62.4,300,210,1)', '#2A3044', { sh: 'inset 0 0 0 2px #1A1F2A' });
        c.dec(94, 210, 'matrix3d(0.7071,-0.7071,0,0,0,0,-1,0,-0.7071,-0.7071,0,0,62.4,490,210,1)', '#2A3044', { sh: 'inset 0 0 0 2px #1A1F2A' });
      } else {
        c.xPlane(62.4, 300, 0, 190, 210, rect('#1A1F2A', 94, 0, 2, 210) + ',' + rect('#B08D57', 86, 100, 3, 24) + ',' + rect('#B08D57', 101, 100, 3, 24));
      }
      return c;
    }
  },

  bathroom: {
    name: 'Bathroom', cell: [1, 0],
    doors: [{ to: 'bedroom', side: 'left', at: 506, dynLeaf: true }, { to: 'gym', side: 'east', at: 340 }, { to: 'living', side: 'south', at: 340 }],
    clock: ['back', 214, 150],
    obstacles: [[0, 0, 156, 156], [250, 0, 304, 64], [0, 280, 58, 420], [546, 26, 574, 54]],
    spots: {
      shower: { a: [178, 128], s: [76, 76, 0, 40], pose: 'shower' },
      toilet: { a: [277, 100], s: [277, 44, 30, -90], pose: 'toilet' },
      sink: { a: [88, 350], h: 0, pose: 'sink' },
      towel: { a: [385, 44], h: 90, pose: 'counter' },
    },
    build(ph) {
      const c = collector(); shell(c, 'bathroom');
      const TILE = 'repeating-linear-gradient(90deg,rgba(0,0,0,.28) 0 1px,transparent 1px 30px),repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 30px),';
      c.yPlane(0, 0.6, 0, 600, 200, TILE + 'linear-gradient(180deg,#2A3446,#202838)');
      c.xPlane(0.6, 0, 0, 600, 200, TILE + 'linear-gradient(180deg,#273042,#1D2534)');
      this.doors.forEach((d) => doorway(c, d));
      c.yPlane(460, 0.8, 160, 110, 46, 'linear-gradient(180deg,rgba(220,230,250,.35),rgba(160,180,220,.18)),' + SKY[ph], { sh: 'inset 0 0 0 3px #2A3446' });
      c.floor(4, 4, 150, 150, 0.6, 'repeating-linear-gradient(90deg,rgba(0,0,0,.3) 0 1px,transparent 1px 15px),repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 1px,transparent 1px 15px),#2B3445');
      c.floor(70, 70, 14, 14, 0.8, 'radial-gradient(circle,#11151C 0 3px,#3A4556 4px 7px,transparent 7.5px)');
      c.B(70, 2, 4, 30, 150, 4, '#B6BCC8'); c.B(60, 26, 24, 24, 190, 4, '#C9CED8', { top: 'radial-gradient(circle,#9AA3B0 0 2px,transparent 2.5px) 0 0/6px 6px,#C9CED8' });
      c.B(70, 2, 4, 4, 120, 74, '#B6BCC8');
      c.shadow(240, 0, 80, 90);
      c.B(252, 0, 50, 16, 34, 44, '#E9ECF2', { top: '#F4F6FA', front: '#D9DDE5', side: '#C9CED8' });
      c.B(258, 16, 38, 46, 0, 30, '#E9ECF2', { top: 'radial-gradient(ellipse at 50% 55%,#C9CED8 0 9px,#F4F6FA 10px)', front: '#D9DDE5', side: '#C9CED8' });
      c.B(272, 4, 10, 6, 78, 2, '#B6BCC8');
      c.B(350, 0, 70, 6, 128, 3, '#B6BCC8');
      c.shadow(0, 270, 80, 160);
      c.B(0, 280, 56, 140, 0, 84, '#3A3226', { top: '#E9ECF2', side: 'linear-gradient(90deg,#3A3226,#4A3E2E)' });
      c.floor(10, 320, 38, 60, 84.4, 'radial-gradient(ellipse,#C9CED8 0 12px,#F4F6FA 13px 16px,transparent 17px)', { r: '10px' });
      c.B(2, 344, 10, 10, 84, 16, '#B6BCC8');
      c.B(14, 296, 8, 8, 84, 14, '#4C8DFF'); c.B(26, 298, 6, 6, 84, 10, '#E9ECF2');
      c.floor(170, 60, 70, 46, 0.7, 'repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 2px,transparent 2px 5px),#3E5E68', { r: '6px' });
      c.plant(560, 40);
      return c;
    },
    dyn(s) {
      const c = collector();
      const glass = s.shower ? 'linear-gradient(180deg,rgba(225,232,248,.5),rgba(200,212,236,.4))' : 'linear-gradient(135deg,rgba(200,215,245,.14),rgba(200,215,245,.06))';
      if (s.shower) {
        c.xPlane(2, 6, 10, 150, 180, 'repeating-linear-gradient(90deg,rgba(200,220,255,.0) 0 6px,rgba(200,220,255,.18) 6px 7px)', { cls: 'st-rain' });
        c.bb(76, 76, 200, '<div class="st-steam"><i></i><i></i><i></i><i></i></div>');
      }
      c.yPlane(0, 154, 0, 154, 196, glass, { sh: 'inset 0 0 0 2px rgba(201,206,216,.6)' });
      c.xPlane(154, 0, 0, 100, 196, glass, { sh: 'inset 0 0 0 2px rgba(201,206,216,.6)' });
      if (s.towel === 'rail' || s.towel === 'damp') c.yPlane(358, 6.4, 70, 54, 58, s.towel === 'damp' ? 'linear-gradient(180deg,#A85A32,#8E4C2A)' : 'linear-gradient(180deg,#C8784A,#B0663C)', { r: '2px' });
      c.xPlane(0.9, 292, 108, 116, 80, s.fog ? 'linear-gradient(135deg,rgba(220,228,244,.7),rgba(190,200,220,.6))' : 'linear-gradient(135deg,rgba(180,200,240,.28),rgba(60,80,120,.18) 45%,rgba(180,200,240,.22) 55%,rgba(60,80,120,.16))', { sh: 'inset 0 0 0 3px #B6BCC8' });
      if (s.tap) c.bb(10, 346, 98, '<div class="st-drip"></div>');
      doorLeaf(c, this.doors[0], s.closed);
      return c;
    }
  },

  gym: {
    name: 'Gym', cell: [2, 0],
    doors: [{ to: 'bathroom', side: 'left', at: 142 }, { to: 'kitchen', side: 'south', at: 320 }],
    clock: ['back', 368, 150],
    obstacles: [[196, 16, 212, 32], [312, 16, 328, 32], [196, 132, 212, 148], [312, 132, 328, 148], [138, 28, 160, 62], [440, 146, 572, 214], [0, 220, 46, 390], [378, 298, 430, 324], [212, 274, 348, 314], [390, 28, 408, 46], [358, 38, 372, 52]],
    spots: {
      rack: { a: [262, 172], s: [262, 82, 0, -135], pose: 'lift' },
      squat: { a: [262, 172], s: [262, 82, 0, -135], pose: 'squat' },
      tread: { a: [510, 238], s: [512, 180, 12, 0], pose: 'run' },
      curls: { a: [80, 304], h: 0, pose: 'curl' },
      bench: { a: [280, 346], s: [280, 294, 42, -90], pose: 'benchcurl' },
      kettle: { a: [404, 360], h: 90, pose: 'swing' },
      mat: { a: [300, 460], h: -45, pose: 'stretch' },
      water: { a: [366, 80], h: 90, pose: 'drink' },
    },
    build(ph) {
      const c = collector(); shell(c, 'gym');
      windowBack(c, ph, 430, 150, 90, 110);
      this.doors.forEach((d) => doorway(c, d));
      c.floor(120, 10, 280, 250, 0.6, 'radial-gradient(circle,rgba(255,255,255,.025) 0 1px,transparent 1.5px) 0 0/8px 8px,#121418', { r: '4px', sh: 'inset 0 0 0 1px rgba(169,184,255,.08)' });
      c.floor(250, 420, 110, 70, 0.6, 'repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 10px),#2E4A52', { r: '6px' });
      const RK = '#2B3445';
      [[200, 20], [316, 20], [200, 136], [316, 136]].forEach((p) => c.B(p[0], p[1], 8, 8, 0, 220, RK, { top: '#3A4556' }));
      c.B(200, 20, 124, 8, 214, 6, RK); c.B(200, 136, 124, 8, 214, 6, RK); c.B(200, 20, 8, 124, 214, 6, RK); c.B(316, 20, 8, 124, 214, 6, RK);
      c.shadow(440, 140, 140, 100);
      c.B(448, 150, 120, 60, 0, 12, '#1C212B', { top: 'repeating-linear-gradient(90deg,#11151C 0 3px,#171B22 3px 6px)' });
      c.B(448, 150, 10, 60, 12, 86, M);
      c.B(0, 220, 46, 170, 0, 40, '#2B3445');
      c.xPlane(0.9, 410, 20, 170, 170, 'linear-gradient(135deg,rgba(180,200,240,.22),rgba(60,80,120,.14) 45%,rgba(180,200,240,.18) 55%,rgba(60,80,120,.12))', { sh: 'inset 0 0 0 3px #3A4556' });
      c.B(140, 30, 8, 30, 0, 30, '#11151C', { side: 'radial-gradient(circle,#3A4556 0 3px,#11151C 4px)' }); c.B(150, 30, 8, 30, 0, 30, '#11151C');
      c.B(220, 280, 120, 28, 0, 34, '#2B3445'); c.B(214, 276, 132, 36, 34, 8, '#1C212B', { top: '#252B36' });
      c.B(300, 282, 30, 22, 42, 3, '#E9ECF2');
      c.B(24, 2, 100, 6, 110, 70, '#E9ECF2', { front: rect('#4C8DFF', 10, 14, 60, 3) + ',' + rect('#2B3445', 10, 26, 72, 2) + ',' + rect('#2B3445', 10, 36, 50, 2) + ',' + rect('#E05A5A', 10, 46, 40, 2) + ',#E9ECF2' });
      c.B(392, 30, 14, 14, 0, 26, '#1C212B', { front: 'radial-gradient(circle at 7px 13px,#5FD39A 0 1.4px,#1C212B 2px)' });
      return c;
    },
    dyn(s) {
      const c = collector();
      c.B(440, 156, 12, 48, 98, 28, '#1C212B', { front: `${rect(s.tread === 'run' ? '#5FD39A' : s.tread === 'walk' ? '#E0B83C' : '#4C8DFF', 4, 8, s.tread === 'off' ? 10 : 40, 10)},#1C212B`, glow: s.tread !== 'off' ? '0 0 14px rgba(95,211,154,.35)' : '0 0 8px rgba(76,141,255,.2)' });
      if (s.tread !== 'off') c.floor(458, 152, 108, 56, 12.4, 'repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 2px,transparent 2px 8px)', { cls: 'st-belt' });
      for (let di = 0; di < 7; di++) {
        if (s.dumb === 'out' && di === 3) continue;
        const dy = 228 + di * 23;
        c.B(10, dy, 26, 8, 40, 8, '#11151C', { top: 'linear-gradient(90deg,#3A4556 0 6px,#11151C 6px 20px,#3A4556 20px)' });
      }
      if (s.bar === 'rack') {
        c.B(258, 26, 6, 112, 132, 4, '#B6BCC8', { top: '#C9CED8' });
        c.B(254, 30, 14, 10, 124, 20, '#11151C', { top: '#2B3445' }); c.B(254, 124, 14, 10, 124, 20, '#11151C', { top: '#2B3445' });
      }
      if (!s.kettleOut) c.B(406, 300, 22, 22, 0, 20, '#E05A5A', { top: 'radial-gradient(circle,#11151C 0 4px,#C04A4A 5px)' });
      c.B(380, 300, 18, 18, 0, 16, '#11151C', { top: 'radial-gradient(circle,#11151C 0 4px,#2B3445 5px)' });
      if (!s.bottleOut) c.B(360, 40, 10, 10, 0, 28, '#4C8DFF', { top: '#2B4B8C' });
      return c;
    }
  },

  garage: {
    name: 'Garage', cell: [1, 2],
    doors: [{ to: 'living', side: 'back', at: 532 }],
    clock: ['back', 300, 160],
    obstacles: [[60, 204, 410, 420], [30, 0, 180, 60], [560, 20, 596, 140]],
    spots: {
      bench: { a: [104, 92], h: 90, pose: 'cook' },
      bench2: { a: [206, 92], h: 45, pose: 'stand' },
      hook: { a: [478, 50], h: 90, pose: 'counter' },
      greet1: { a: [150, 480], h: 180, pose: 'wave' }, greet2: { a: [214, 480], h: 0, pose: 'wave' }, greet3: { a: [190, 530], h: 45, pose: 'wave' },
      chat1: { a: [460, 300], h: 180, pose: 'talk' }, chat2: { a: [522, 300], h: 0, pose: 'talk' },
      entry: { a: [40, 470], h: 180 },
    },
    build() {
      const c = collector(); shell(c, 'garage');
      this.doors.forEach((d) => doorway(c, d));
      c.floor(40, 190, 420, 6, 0.6, 'repeating-linear-gradient(90deg,#E0B83C 0 40px,transparent 40px 60px)');
      c.floor(40, 440, 420, 6, 0.6, 'repeating-linear-gradient(90deg,#E0B83C 0 40px,transparent 40px 60px)');
      c.shadow(30, 0, 160, 80);
      c.B(30, 0, 150, 60, 0, 86, '#3A3226', { top: 'linear-gradient(135deg,#86644A,#5E4330)' });
      c.yPlane(30, 0.8, 100, 150, 100, 'radial-gradient(circle,#11151C 0 1px,transparent 1.5px) 0 0/10px 10px,' + rect('#9AA3B0', 20, 20, 4, 40) + ',' + rect('#9AA3B0', 14, 20, 16, 4) + ',' + rect('#E05A5A', 50, 24, 24, 6) + ',' + rect('#9AA3B0', 60, 30, 4, 34) + ',' + rect('#E0B83C', 100, 20, 30, 22) + ',#3A3226');
      c.B(44, 10, 40, 40, 86, 46, '#1C212B', { front: rect('#4C8DFF', 6, 6, 10, 3) + ',#1C212B', top: '#2B3445' });
      c.floor(54, 20, 20, 20, 96, 'radial-gradient(circle,#F26B3A 0 2px,transparent 3px)', { sh: '0 0 10px rgba(242,107,58,.6)' });
      c.B(108, 18, 40, 26, 86, 2, '#2B3445', { top: '#9AA3B0' });
      c.yPlane(110, 18.4, 88, 36, 22, rect('#A9B8FF', 4, 4, 20, 2) + ',' + rect('#5B8CFF', 8, 9, 22, 2) + ',' + rect('#E8C97A', 4, 14, 14, 2) + ',#0B1220', { sh: '0 0 14px rgba(76,141,255,.3)' });
      c.B(560, 20, 36, 120, 0, 150, '#2B3445');
      for (let si = 0; si < 3; si++) { c.B(560, 24, 36, 112, 40 + si * 46, 3, '#3A4556'); c.B(564, 30, 28, 40, 43 + si * 46, 26, ['#E0B83C', '#4C8DFF', '#E05A5A'][si]); c.B(564, 80, 28, 40, 43 + si * 46, 26, '#56638A'); }
      c.B(420, 0, 30, 10, 90, 44, '#E9ECF2', { front: 'radial-gradient(circle at 15px 14px,#5FD39A 0 3px,transparent 3.5px),#E9ECF2' });
      c.B(472, 0, 14, 8, 120, 4, '#9AA3B0');
      return c;
    },
    dyn(s) {
      const c = collector();
      c.xPlane(0.8, 160, s.rollup ? 150 : 0, 300, s.rollup ? 40 : 190, 'repeating-linear-gradient(0deg,#2A2F38 0 14px,#1E222A 14px 16px)', { sh: 'inset 0 0 0 4px #3A4556' });
      if (s.rollup) c.xPlane(0.4, 160, 0, 300, 150, 'linear-gradient(180deg,#26324A,#3A4A66)');
      return c;
    }
  }
};
export const ROOM_IDS = Object.keys(ROOMS);

// The desk screens. Tiny live pages: code being typed, a paper being read, a task board, a workflow run.
const SCREEN_MAIN = `<div class="scr" data-mode="code">
<div class="scr-m scr-code"><i style="width:44%"></i><i style="width:62%;margin-left:8%"></i><i style="width:36%;margin-left:8%"></i><i style="width:58%;margin-left:16%"></i><i style="width:30%;margin-left:16%"></i><i style="width:48%;margin-left:8%"></i><i class="ty" style="margin-left:8%"></i></div>
<div class="scr-m scr-read"><div class="rd"><b></b><i></i><i></i><i class="hl"></i><i></i><i></i><i></i><i class="hl"></i><i></i><i></i></div><div class="nt"><i></i><i></i><i class="new"></i></div></div>
<div class="scr-m scr-board"><div><i></i><i></i></div><div><i></i><i class="mv"></i></div><div><i></i><i></i><i></i></div></div>
<div class="scr-m scr-flow"><i class="n a"></i><i class="n b"></i><i class="n c"></i><i class="n d"></i><i class="e e1"></i><i class="e e2"></i><b></b></div>
</div>`;
const SCREEN_LOGS = '<div class="scr scr-logs"><div class="lg"><i></i><i></i><i style="width:40%"></i><i></i><i style="width:55%"></i><i></i><i style="width:30%"></i><i></i><i></i><i style="width:45%"></i><i></i><i style="width:60%"></i></div></div>';
const SCREEN_IDLE = '<div class="scr scr-idle"><i></i></div>';

// ---------------------------------------------------------------- paths
const CELL = 10, GN = 60;
const gridCache = {};
// Walkable grid for a room, with obstacles grown by a body radius so people don't clip furniture.
function grid(roomId, r = 14) {
  const key = roomId + r;
  if (gridCache[key]) return gridCache[key];
  const g = new Uint8Array(GN * GN);
  const R = ROOMS[roomId];
  for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++) {
    const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2;
    let block = x < 24 || y < 24 || x > 576 || y > 576;
    // Door corridors are open even though they sit in the wall margin.
    if (block) for (const d of R.doors) {
      const half = (d.w || 64) / 2 - 8;
      const inDoor = d.side === 'back' ? Math.abs(x - d.at) < half && y < 40
        : d.side === 'left' ? Math.abs(y - d.at) < half && x < 40
          : d.side === 'east' ? Math.abs(y - d.at) < 30 && x > 560
            : Math.abs(x - d.at) < 30 && y > 560;
      if (inDoor) { block = false; break; }
    }
    if (!block) for (const [x0, y0, x1, y1] of R.obstacles) { if (x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r) { block = true; break; } }
    g[gy * GN + gx] = block ? 1 : 0;
  }
  gridCache[key] = g;
  return g;
}
export function blocked(roomId, x, y, r = 14) {
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) return true;
  return grid(roomId, r)[gy * GN + gx] === 1;
}
// A* on the grid; returns world points (simplified to straight runs).
export function findPath(roomId, from, to, r = 14) {
  const g = grid(roomId, r);
  const idx = (x, y) => y * GN + x;
  const clampCell = (p) => [Math.max(0, Math.min(GN - 1, Math.floor(p[0] / CELL))), Math.max(0, Math.min(GN - 1, Math.floor(p[1] / CELL)))];
  let [sx, sy] = clampCell(from), [tx, ty] = clampCell(to);
  const nearestFree = (cx, cy) => {
    if (!g[idx(cx, cy)]) return [cx, cy];
    for (let rr = 1; rr < 12; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && ny >= 0 && nx < GN && ny < GN && !g[idx(nx, ny)]) return [nx, ny];
    }
    return [cx, cy];
  };
  [sx, sy] = nearestFree(sx, sy); [tx, ty] = nearestFree(tx, ty);
  const open = [[sx, sy]], came = new Int32Array(GN * GN).fill(-1), cost = new Float32Array(GN * GN).fill(1e9);
  cost[idx(sx, sy)] = 0;
  const h = (x, y) => Math.hypot(x - tx, y - ty);
  const fs = new Float32Array(GN * GN).fill(1e9); fs[idx(sx, sy)] = h(sx, sy);
  const closed = new Uint8Array(GN * GN);
  let found = false, guard = 0;
  while (open.length && guard++ < 6000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (fs[idx(...open[i])] < fs[idx(...open[bi])]) bi = i;
    const [cx, cy] = open.splice(bi, 1)[0];
    if (cx === tx && cy === ty) { found = true; break; }
    closed[idx(cx, cy)] = 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GN || ny >= GN || g[idx(nx, ny)] || closed[idx(nx, ny)]) continue;
      if (dx && dy && (g[idx(cx + dx, cy)] || g[idx(cx, cy + dy)])) continue;
      const nc = cost[idx(cx, cy)] + (dx && dy ? 1.414 : 1);
      if (nc < cost[idx(nx, ny)]) {
        cost[idx(nx, ny)] = nc; came[idx(nx, ny)] = idx(cx, cy); fs[idx(nx, ny)] = nc + h(nx, ny);
        if (!open.some((o) => o[0] === nx && o[1] === ny)) open.push([nx, ny]);
      }
    }
  }
  const end = g[idx(...clampCell(to))] ? [tx * CELL + CELL / 2, ty * CELL + CELL / 2] : to;
  if (!found) return [end];
  const cells = [];
  for (let i = idx(tx, ty); i !== -1; i = came[i]) cells.push([(i % GN) * CELL + CELL / 2, Math.floor(i / GN) * CELL + CELL / 2]);
  cells.reverse();
  // Drop points that lie on a straight line of sight.
  const out = [];
  let anchor = from;
  for (let i = 1; i < cells.length; i++) {
    if (!lineFree(g, anchor, cells[i])) { out.push(cells[i - 1]); anchor = cells[i - 1]; }
  }
  out.push(end);
  return out;
}
function lineFree(g, a, b) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5);
  for (let i = 1; i < n; i++) {
    const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    if (gx < 0 || gy < 0 || gx >= GN || gy >= GN || g[gy * GN + gx]) return false;
  }
  return true;
}
// Rooms between two rooms, by doors.
export function roomRoute(from, to) {
  if (from === to) return [from];
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const r = q.shift();
    for (const d of ROOMS[r].doors) if (!(d.to in prev)) { prev[d.to] = r; if (d.to === to) { q.length = 0; break; } q.push(d.to); }
  }
  const out = [];
  for (let r = to; r; r = prev[r]) out.push(r);
  return out.reverse();
}
export const doorTo = (from, to) => ROOMS[from].doors.find((d) => d.to === to);
