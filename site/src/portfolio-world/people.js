// Toy-brick avatar, built from boxes and faceted cylinders.
// Local coordinates: a figure faces -x, +y is its left side, z is up. Standing figures stand
// on z = 0; seated poses put the hips at z = 0 so the caller lifts them onto a seat.
import { shade as sh, fx } from './world.js';

export const FIG_SCALE = 1.32;

function part(list, x, y, w, d, z, h, c, o = {}) {
  list.push({ x, y, w, d, z, h, top: o.top || sh(c, 1.08), front: o.front || sh(c, 0.86), side: o.side || sh(c, 0.66), back: o.back || sh(c, 0.6), cls: o.cls || '', origin: o.origin != null ? `50% 50% ${o.origin}px` : '' });
}
function cyl(list, cx, cy, z0, H, r, n, c, capC) {
  const ap = r * Math.cos(Math.PI / n), w = 2 * r * Math.sin(Math.PI / n) + 0.7;
  for (let i = 0; i < n; i++) {
    const th = (i + 0.5) * 2 * Math.PI / n, nx = Math.cos(th), ny = Math.sin(th), tx = -ny, ty = nx;
    const ox = cx + ap * nx - tx * w / 2, oy = cy + ap * ny - ty * w / 2;
    const lit = 0.62 + 0.5 * Math.max(0, nx * 0.42 + ny * 0.9);
    list.push({ w, h: H, m: `matrix3d(${[tx, ty, 0, 0, 0, 0, -1, 0, nx, ny, 0, 0, ox, oy, z0 + H, 1].map(fx).join(',')})`, bg: sh(c, lit), r: '0' });
  }
  if (capC) list.push({ w: 2 * r, h: 2 * r, m: `translate3d(${cx - r}px,${cy - r}px,${z0 + H}px)`, bg: capC, r: '50%' });
}

export const LOOKS = {
  agent: { skin: '#6B4530', hair: 'short', hairC: '#16110E', label: 'Agent' }
};
const OUTFITS = {
  work: { top: '#1F2738', hem: '#171D29', bottom: '#55524D', bottom2: '#4C4945', hip: '#45423E', shoe: '#E6E9EF', sole: '#4C8DFF' },
  home: { top: '#4A5568', hem: '#3E475A', bottom: '#2A2D34', bottom2: '#25282E', hip: '#1C1F24', shoe: '#2A2E36', sole: '#E9ECF2' },
  gym: { top: '#16181D', hem: '#4C8DFF', bottom: '#16181D', bottom2: '#16181D', hip: '#16181D', shoe: '#16181D', sole: '#E9ECF2', bareArms: true, shorts: true },
  sleep: { top: '#5A6070', hem: '#4E5464', bottom: '#6B7282', bottom2: '#646B7A', hip: '#5A6070', shoe: null, sole: null },
  out: { top: '#4A5240', hem: '#3E4536', bottom: '#2A3550', bottom2: '#253049', hip: '#222A3E', shoe: '#F2F4F8', sole: '#C8784A' },
  towel: { towel: true }
};
function clothes(lookId, outfit) {
  const L = LOOKS[lookId];
  if (lookId !== 'agent') return { top: L.top, hem: sh(L.top, 0.85), bottom: L.bottom, bottom2: sh(L.bottom, 0.92), hip: L.hip, shoe: L.shoe, sole: L.sole };
  return OUTFITS[outfit] || OUTFITS.work;
}

const STAND = new Set(['stand', 'browse', 'throw', 'talk', 'wave', 'counter', 'cook', 'wash', 'sink', 'drink', 'curl', 'swing', 'stretch', 'lift', 'squat', 'run', 'shower']);
const HEADPHONES = new Set(['desk', 'run', 'lift', 'squat', 'curl', 'benchcurl', 'swing']);
export const isStanding = (pose) => STAND.has(pose);

// Returns parts for one person. hold: pad | book | plate | phone | mug | bottle | dumbbells | none.
export function buildPerson(lookId, outfit, pose, hold = 'none') {
  const L = LOOKS[lookId], K = clothes(lookId, outfit), SK = L.skin;
  const body = [], bodyD = [], head = [], headD = [];
  const hand = { top: `radial-gradient(circle at 50% 50%,${sh(SK, 0.55)} 0 1.4px,${sh(SK, 1.1)} 1.8px)` };
  const shoeO = K.shoe ? { top: sh(K.shoe, 1.05), front: sh(K.shoe, 0.85), side: sh(K.shoe, 0.72) } : null;
  const soleO = K.sole ? { top: K.shoe ? sh(K.shoe, 1.05) : SK, front: K.sole, side: sh(K.sole, 0.85) } : null;
  const armC = K.towel || K.bareArms ? SK : K.top;
  let headZ, headCls = '', eyes = 'open';

  if (STAND.has(pose)) {
    const legC = K.towel || K.shorts ? SK : K.bottom, legC2 = K.towel || K.shorts ? sh(SK, 0.95) : K.bottom2;
    const legCls = pose === 'squat' ? 'st-squatLeg' : '';
    part(body, -9, -19, 18, 18, 0, 32, legC, { cls: legCls || 'st-legL', origin: legCls ? 0 : 32, front: sh(legC, 0.8) });
    part(body, -9, 1, 18, 18, 0, 32, legC2, { cls: legCls || 'st-legR', origin: legCls ? 0 : 32 });
    if (K.shorts) { part(body, -9.6, -19.6, 19.2, 18.6, 16, 16.4, K.bottom, { cls: legCls || 'st-legL', origin: legCls ? 0 : 16 }); part(body, -9.6, 1, 19.2, 18.6, 16, 16.4, K.bottom, { cls: legCls || 'st-legR', origin: legCls ? 0 : 16 }); }
    if (K.shoe) {
      part(body, -12.4, -19.4, 4.8, 18.8, 0, 9, K.shoe, { cls: legCls || 'st-legL', origin: legCls ? 0 : 32, ...shoeO });
      part(body, -12.4, 0.6, 4.8, 18.8, 0, 9, K.shoe, { cls: legCls || 'st-legR', origin: legCls ? 0 : 32, ...shoeO });
      part(body, -12.4, -19.4, 4.8, 18.8, 0, 2.4, K.sole, { cls: legCls || 'st-legL', origin: legCls ? 0 : 32, ...soleO });
      part(body, -12.4, 0.6, 4.8, 18.8, 0, 2.4, K.sole, { cls: legCls || 'st-legR', origin: legCls ? 0 : 32, ...soleO });
    } else {
      part(body, -12, -19, 4, 18, 0, 6, SK, { cls: 'st-legL', origin: 32 }); part(body, -12, 1, 4, 18, 0, 6, SK, { cls: 'st-legR', origin: 32 });
    }
    const up = pose === 'squat' ? 'st-squatTop' : '';
    if (K.towel) {
      part(body, -11.6, -20.6, 23.2, 41.2, 14, 31, '#E8E2D6', { cls: up, front: 'repeating-linear-gradient(0deg,#E8E2D6 0 3px,#D9D1C2 3px 4px)', side: '#CFC6B6', top: '#F1ECE3' });
      part(body, -10, -19, 20, 38, 45, 36, SK, { cls: up, top: sh(SK, 1.1), side: sh(SK, 0.7) });
    } else {
      part(body, -11, -20, 22, 40, 32, 9, K.hip, { cls: up });
      part(body, -10, -19, 20, 38, 41, 40, K.top, { cls: up, top: sh(K.top, 1.18), front: K.bareArms ? `linear-gradient(180deg,${K.top} 0 70%,${K.hem} 70% 73%,${K.top} 73%)` : undefined });
      part(body, -10.6, -19.6, 21.2, 39.2, 41, 4, K.hem, { cls: up });
    }
    part(body, -4, -6, 8, 12, 81, 3, SK, { cls: up });
    cyl(bodyD, 0, 0, 80, 3, 6.5, 12, SK, sh(SK, 1.05));
    const armT = { top: sh(armC, 1.18) };
    const arms = (l, r) => { l(); r(); };
    const downL = (cls = 'st-armL') => { part(body, -6, -26, 12, 7, 52, 28, armC, { cls, origin: 28, ...armT }); part(body, -4, -25.5, 8, 6, 43, 9, SK, { cls, origin: 37, ...hand }); };
    const downR = (cls = 'st-armR') => { part(body, -6, 19, 12, 7, 52, 28, armC, { cls, origin: 28, ...armT }); part(body, -4, 19.5, 8, 6, 43, 9, SK, { cls, origin: 37, ...hand }); };
    const fwdL = (z = 60, cls = '') => { part(body, -6, -26, 12, 7, z, 80 - z, armC, armT); part(body, -30, -25, 26, 7, z, 8, armC, { cls, ...armT }); part(body, -36, -24.5, 7, 6, z - 1, 8, SK, { cls, ...hand }); };
    const fwdR = (z = 60, cls = '') => { part(body, -6, 19, 12, 7, z, 80 - z, armC, armT); part(body, -30, 18, 26, 7, z, 8, armC, { cls, ...armT }); part(body, -36, 18.5, 7, 6, z - 1, 8, SK, { cls, ...hand }); };
    const upR = (cls) => { part(body, -6, 19, 12, 7, 78, 34, armC, { cls, origin: 0, ...armT }); part(body, -4, 19.5, 8, 6, 110, 9, SK, { cls, origin: -32, ...hand }); };
    const upL = (cls) => { part(body, -6, -26, 12, 7, 78, 34, armC, { cls, origin: 0, ...armT }); part(body, -4, -25.5, 8, 6, 110, 9, SK, { cls, origin: -32, ...hand }); };
    switch (pose) {
      case 'cook': fwdL(60); fwdR(60, 'st-stir'); part(body, -54, 19, 20, 4, 63, 2, '#2B2F36', { cls: 'st-stir' }); break;
      case 'counter': fwdL(64, 'st-fiddle'); fwdR(64, 'st-fiddle2'); break;
      case 'wash': fwdL(62, 'st-stir'); fwdR(62, 'st-stir2'); break;
      case 'sink': fwdL(64); part(body, -6, 19, 12, 7, 66, 14, armC, armT); part(body, -22, 18, 16, 7, 72, 8, armC, { cls: 'st-brush', ...armT }); part(body, -26, 18.5, 6, 6, 76, 7, SK, { cls: 'st-brush', ...hand }); part(body, -30, 20, 6, 2, 84, 2, '#4C8DFF', { cls: 'st-brush' }); break;
      case 'drink': downL(''); part(body, -6, 19, 12, 7, 70, 10, armC, armT); part(body, -22, 18, 16, 7, 74, 8, armC, armT); part(body, -26, 18.5, 6, 6, 78, 7, SK, hand); part(body, -31, 18, 7, 7, 82, 13, hold === 'bottle' ? '#4C8DFF' : '#C8D8E8', { top: 'radial-gradient(circle,#E0A040 0 2.5px,#C8D8E8 3px)' }); break;
      case 'browse': downL(''); part(body, -6, 19, 12, 7, 76, 8, armC, armT); part(body, -30, 18, 26, 7, 88, 8, armC, { cls: 'st-reach', ...armT }); part(body, -36, 18.5, 7, 6, 87, 8, SK, { cls: 'st-reach', ...hand }); break;
      case 'throw': downL(''); upR('st-throw'); break;
      case 'wave': downL(''); upR('st-wave'); break;
      case 'talk': fwdL(58, 'st-gestL'); downR(''); break;
      case 'curl': part(body, -6, -26, 12, 7, 52, 28, armC, armT); part(body, -6, 19, 12, 7, 52, 28, armC, armT);
        part(body, -20, -26, 16, 7, 50, 8, SK, { cls: 'st-curlL', ...hand }); part(body, -20, 19, 16, 7, 50, 8, SK, { cls: 'st-curlR', ...hand });
        part(body, -26, -32, 8, 18, 49, 10, '#11151C', { cls: 'st-curlL', top: 'linear-gradient(90deg,#3A4556 0 5px,#11151C 5px 13px,#3A4556 13px)' });
        part(body, -26, 14, 8, 18, 49, 10, '#11151C', { cls: 'st-curlR', top: 'linear-gradient(90deg,#3A4556 0 5px,#11151C 5px 13px,#3A4556 13px)' }); break;
      case 'swing': fwdL(52, 'st-swing'); fwdR(52, 'st-swing'); part(body, -44, -8, 16, 16, 38, 18, '#E05A5A', { cls: 'st-swing', top: 'radial-gradient(circle,#11151C 0 4px,#C04A4A 5px)' }); break;
      case 'stretch': upL('st-sway'); upR('st-sway'); break;
      case 'shower': upL('st-scrub'); upR('st-scrub2'); break;
      case 'run': downL('st-armL'); downR('st-armR'); break;
      case 'lift':
        part(body, -6, -26, 12, 7, 74, 40, armC, { cls: 'st-pressArm', origin: 0, ...armT }); part(body, -6, 19, 12, 7, 74, 40, armC, { cls: 'st-pressArm', origin: 0, ...armT });
        if (K.bareArms) { part(body, -6.4, -26.4, 12.8, 7.8, 70, 8, K.top); part(body, -6.4, 18.6, 12.8, 7.8, 70, 8, K.top); }
        part(body, -4, -25.5, 8, 6, 112, 9, SK, { cls: 'st-press', ...hand }); part(body, -4, 19.5, 8, 6, 112, 9, SK, { cls: 'st-press', ...hand });
        part(body, -2, -52, 4, 104, 118, 3, '#B6BCC8', { top: '#C9CED8', cls: 'st-press' });
        part(body, -9, -50, 18, 7, 108, 24, '#11151C', { top: '#2B3445', cls: 'st-press' }); part(body, -9, 43, 18, 7, 108, 24, '#11151C', { top: '#2B3445', cls: 'st-press' });
        break;
      case 'squat':
        part(body, -6, -26, 12, 7, 66, 16, armC, { cls: up, ...armT }); part(body, -6, 19, 12, 7, 66, 16, armC, { cls: up, ...armT });
        part(body, 6, -52, 4, 104, 84, 3, '#B6BCC8', { top: '#C9CED8', cls: up });
        part(body, -1, -50, 18, 7, 74, 24, '#11151C', { top: '#2B3445', cls: up }); part(body, -1, 43, 18, 7, 74, 24, '#11151C', { top: '#2B3445', cls: up });
        headCls = 'st-squatTop';
        break;
      default: downL(); downR();
    }
    if (hold === 'phone' && pose === 'stand') part(body, -36, 17, 3, 8, 60, 12, '#11151C', { front: '#2B4B8C' });
    headZ = 83;
  } else if (pose === 'lie') {
    eyes = 'closed'; headZ = 0;
  } else {
    // Seated. Hips at z = 0, thighs forward.
    const bare = pose === 'toilet';
    const legC = bare || K.towel ? SK : K.bottom, legC2 = bare || K.towel ? sh(SK, 0.95) : K.bottom2;
    if (pose === 'kneel') {
      // Down on his knees, sitting back on his heels. The caller lifts the figure 18 (local) so the shins rest on the floor.
      part(body, -11, -20, 22, 40, 0, 9, K.hip || K.bottom);
      part(body, -22, -19, 18, 18, -10, 12, legC, { front: sh(legC, 0.8) }); part(body, -22, 1, 18, 18, -10, 12, legC2);
      part(body, -22, -19, 38, 18, -18, 8, legC, { front: sh(legC, 0.8) }); part(body, -22, 1, 38, 18, -18, 8, legC2);
      if (K.shoe) { part(body, 14, -19, 8, 18, -18, 9, K.shoe, shoeO); part(body, 14, 1, 8, 18, -18, 9, K.shoe, shoeO); }
      else { part(body, 14, -19, 6, 18, -18, 6, SK); part(body, 14, 1, 6, 18, -18, 6, SK); }
    } else if (pose !== 'bedsit') {
      part(body, -11, -20, 22, 40, 0, 9, K.hip || K.bottom);
      part(body, -46, -19, 40, 18, 0, 15, legC, { front: sh(legC, 0.8) });
      part(body, -46, 1, 40, 18, 0, 15, legC2);
      if (K.shoe) { part(body, -50, -19, 5, 18, 0, 15, K.shoe, shoeO); part(body, -50, 1, 5, 18, 0, 15, K.shoe, shoeO); }
      else { part(body, -50, -19, 5, 18, 0, 12, SK); part(body, -50, 1, 5, 18, 0, 12, SK); }
      if (bare) part(body, -45, -20, 9, 40, -24, 9, K.bottom || '#55524D', { top: `repeating-linear-gradient(90deg,${K.bottom || '#55524D'} 0 3px,${K.bottom2 || '#4C4945'} 3px 5px)` });
    }
    part(body, -10, -19, 20, 38, 9, 40, K.towel ? SK : K.top, { top: sh(K.towel ? SK : K.top, 1.18) });
    if (!K.towel) part(body, -10.6, -19.6, 21.2, 39.2, 9, 4, K.hem);
    part(body, -4, -6, 8, 12, 49, 3, SK);
    const armT = { top: sh(armC, 1.22) };
    part(body, -7, -26, 13, 7, 30, 18, armC, armT); part(body, -7, 19, 13, 7, 30, 18, armC, armT);
    if (pose === 'kneel') {
      // Arms hang down to the floor in front of him, hands working.
      part(body, -7, -26, 12, 7, 12, 18, armC, armT); part(body, -7, 19, 12, 7, 12, 18, armC, armT);
      part(body, -32, -25, 28, 7, 8, 7, armC, { cls: 'st-rub', ...armT }); part(body, -32, 18, 28, 7, 8, 7, armC, { cls: 'st-rub2', ...armT });
      part(body, -38, -24.5, 7, 6, 7, 7, SK, { cls: 'st-rub', ...hand }); part(body, -38, 18.5, 7, 6, 7, 7, SK, { cls: 'st-rub2', ...hand });
    } else if (pose === 'desk') {
      part(body, -34, -26, 30, 7, 40, 8, armC, { cls: 'st-tapL', ...armT }); part(body, -34, 19, 30, 7, 40, 8, armC, { cls: 'st-tapR', ...armT });
      part(body, -40, -25.5, 7, 6, 39, 8, SK, { cls: 'st-tapL', ...hand }); part(body, -40, 19.5, 7, 6, 39, 8, SK, { cls: 'st-tapR', ...hand });
    } else if (hold === 'pad') {
      part(body, -26, -24, 20, 7, 32, 8, armC, armT); part(body, -26, 17, 20, 7, 32, 8, armC, armT);
      part(body, -32, -16, 7, 7, 31, 8, SK, { cls: 'st-tapL', ...hand }); part(body, -32, 9, 7, 7, 31, 8, SK, { cls: 'st-tapR', ...hand });
      part(body, -36, -12, 10, 24, 33, 5, lookId === 'agent' ? '#E9ECF2' : '#11151C', { top: 'radial-gradient(circle at 5px 7px,#11151C 0 1.6px,transparent 2px),radial-gradient(circle at 5px 17px,#11151C 0 1.6px,transparent 2px),linear-gradient(90deg,#F4F6FA 0 30%,#11151C 30% 70%,#F4F6FA 70%)', cls: 'st-tapL' });
    } else if (hold === 'book') {
      part(body, -26, -22, 20, 7, 36, 8, armC, armT); part(body, -26, 15, 20, 7, 36, 8, armC, armT);
      part(body, -32, -20, 7, 6, 36, 8, SK, hand); part(body, -32, 14, 7, 6, 36, 8, SK, hand);
      part(body, -40, -14, 4, 28, 38, 20, '#E9E2D0', { side: 'linear-gradient(90deg,#C8784A 0 2px,#F4EEE0 2px)', front: '#C8784A', top: '#F4EEE0' });
      part(body, -40, -1, 4, 2, 40, 18, '#C8C0AE', { cls: 'st-page' });
    } else if (hold === 'plate') {
      part(body, -26, -24, 20, 7, 32, 8, armC, armT); part(body, -32, -22, 7, 6, 31, 8, SK, hand);
      part(body, -24, 17, 18, 7, 34, 8, armC, { cls: 'st-eat', ...armT }); part(body, -30, 17.5, 7, 6, 34, 8, SK, { cls: 'st-eat', ...hand });
      part(body, -36, 20, 10, 2, 40, 2, '#B6BCC8', { cls: 'st-eat' });
    } else if (hold === 'phone') {
      part(body, -24, -20, 18, 7, 38, 8, armC, armT); part(body, -24, 13, 18, 7, 38, 8, armC, armT);
      part(body, -30, -8, 4, 16, 42, 22, '#11151C', { side: '#2B4B8C', front: '#11151C', top: '#1C212B' });
      part(body, -30, -18, 6, 10, 40, 8, SK, hand); part(body, -30, 8, 6, 10, 40, 8, SK, hand);
    } else if (hold === 'mug') {
      part(body, -24, -20, 18, 7, 36, 8, armC, armT); part(body, -30, -18, 6, 6, 36, 8, SK, hand);
      part(body, -24, 13, 18, 7, 36, 8, armC, armT); part(body, -30, 13, 6, 6, 36, 8, SK, hand); part(body, -32, 18, 9, 9, 40, 12, '#C8B79E', { top: 'radial-gradient(circle,#3A2416 0 3px,#C8B79E 3.6px)' });
    } else if (hold === 'dumbbells' || pose === 'benchcurl') {
      part(body, -20, -26, 16, 7, 26, 8, SK, { cls: 'st-curlL', ...hand }); part(body, -20, 19, 16, 7, 26, 8, SK, { cls: 'st-curlR', ...hand });
      part(body, -26, -32, 8, 18, 25, 10, '#11151C', { cls: 'st-curlL' }); part(body, -26, 14, 8, 18, 25, 10, '#11151C', { cls: 'st-curlR' });
    } else {
      part(body, -24, -26, 18, 7, 22, 8, armC, armT); part(body, -24, 19, 18, 7, 22, 8, armC, armT);
      part(body, -30, -25.5, 7, 6, 20, 8, SK, hand); part(body, -30, 19.5, 7, 6, 20, 8, SK, hand);
    }
    cyl(bodyD, 0, 0, 48, 3, 6.5, 12, SK, sh(SK, 1.05));
    headZ = 51;
  }

  // head
  cyl(headD, 0, 0, 0, 29, 14.5, 20, SK, null);
  const capTop = `radial-gradient(circle at 40% 40%,${sh(L.hairC, 1.6)},${L.hairC} 70%)`;
  if (L.hair === 'cap') {
    cyl(headD, 0, 0, 20, 12, 16.2, 20, L.cap, `radial-gradient(circle at 40% 40%,${sh(L.cap, 1.25)},${L.cap} 70%)`);
    part(head, 12, -9, 12, 18, 21, 2.4, L.cap, { top: sh(L.cap, 1.15) });
  } else {
    cyl(headD, 0, 0, 19, 13, 16, 20, L.hairC, capTop);
    cyl(headD, 3, 0, 15, 4, 15.6, 20, L.hairC, null);
  }
  if (L.hair === 'puff') {
    cyl(headD, 2, 0, 31, 6, 7, 16, L.hairC, null);
    cyl(headD, 2, 0, 36, 10, 11, 18, L.hairC, `radial-gradient(circle at 40% 40%,${sh(L.hairC, 1.9)},${L.hairC} 70%)`);
    part(head, -2, -2, 4, 4, 33, 3, '#E0B83C', { top: '#F0CF60' });
  }
  if (L.specs) part(head, -15.6, -11, 1.4, 22, 17, 5, '#11151C', { back: 'linear-gradient(90deg,#11151C 0 1px,rgba(200,220,255,.4) 1px 9px,#11151C 9px 13px,rgba(200,220,255,.4) 13px 21px,#11151C 21px)' });
  if (lookId === 'agent' && HEADPHONES.has(pose)) {
    part(head, -2.5, -18, 5, 36, 32, 2.6, '#2A3242', { top: '#38435A' });
    part(head, -2.5, -18.6, 5, 2.4, 14, 20, '#2A3242'); part(head, -2.5, 16.2, 5, 2.4, 14, 20, '#2A3242');
    part(head, -5, -21, 10, 4, 8, 11, '#232B39', { side: '#1A2130' });
    part(head, -5, 17, 10, 4, 8, 11, '#232B39', { front: 'radial-gradient(circle,#4C8DFF 0 1.4px,#232B39 2px)', side: '#1A2130' });
  }
  return { body, bodyD, head, headD, headZ, headCls, eyes, height: headZ + 34 };
}
