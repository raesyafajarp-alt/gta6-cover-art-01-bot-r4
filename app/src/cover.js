// Vice Coast — cover rendering engine (ES module).
// Draws GTA-style multi-panel cover art on a 2D canvas: an original painted
// Vice City backdrop (gradient sky, striped retro sun, two-layer skyline,
// palm silhouettes, sea shimmer), photo panels in four layouts, six colour
// grades, bold Anton lettering with an offset accent shadow and thick
// outline, a Pacifico script subtitle, a badge ribbon, film grain and a
// vignette. No Rockstar logo, artwork, character or font is used anywhere;
// every shape here is drawn in code from scratch.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#2b1055', '#a84a86', '#ff6b4a', '#ffc46b'],
    sun: ['#ffe66d', '#ff4d6d'],
    ink: '#ffffff', accent: '#ff2e88', shadow: '#1a0b2e',
    tint: '#ff7e5f', tintAlpha: 0.10, stroke: '#fff3e0',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#04041a', '#2a0a5e', '#8b2ff7', '#ff2e88'],
    sun: ['#ff9de2', '#00e5ff'],
    ink: '#ffffff', accent: '#00e5ff', shadow: '#0a0618',
    tint: '#b967ff', tintAlpha: 0.12, stroke: '#e6f9ff',
  },
  golden: {
    label: 'Golden Hour',
    sky: ['#5e2a00', '#a85a10', '#f2a541', '#ffe9b0'],
    sun: ['#fff6b8', '#ff8c1a'],
    ink: '#fff8ec', accent: '#d9480f', shadow: '#2b1503',
    tint: '#f2a541', tintAlpha: 0.10, stroke: '#fff8ec',
  },
  noir: {
    label: 'Teal Noir',
    sky: ['#02141a', '#0b3d46', '#177e89', '#8fd6c9'],
    sun: ['#d8fff4', '#5ec8b8'],
    ink: '#f2fffc', accent: '#5ec8b8', shadow: '#01161a',
    tint: '#177e89', tintAlpha: 0.10, stroke: '#eafffa',
  },
  candy: {
    label: 'Cotton Candy',
    sky: ['#5b21b6', '#c084fc', '#f9a8d4', '#fde68a'],
    sun: ['#fff1f2', '#fb7185'],
    ink: '#ffffff', accent: '#ec4899', shadow: '#2e1065',
    tint: '#f9a8d4', tintAlpha: 0.10, stroke: '#fff7ed',
  },
  drive: {
    label: 'Midnight Drive',
    sky: ['#0b0626', '#1e1b4b', '#4c1d95', '#db2777'],
    sun: ['#fde68a', '#f472b6'],
    ink: '#ffffff', accent: '#f472b6', shadow: '#0b0626',
    tint: '#a855f7', tintAlpha: 0.12, stroke: '#fdf4ff',
  },
};
export const GRADE_ORDER = ['sunset', 'neon', 'golden', 'noir', 'candy', 'drive'];

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};
export const SIZE_ORDER = ['square', 'portrait', 'wide'];

// Panel rectangles in unit coordinates (0..1 of the canvas). The title band
// starts at y = 0.70 in every layout, so panels stay above it.
export const LAYOUTS = {
  poster: {
    label: 'Poster',
    hint: 'One hero panel plus three side panels, the classic poster look.',
    panels: () => [
      { x: 0.03, y: 0.03, w: 0.61, h: 0.64, r: 0 },
      { x: 0.67, y: 0.03, w: 0.30, h: 0.20, r: 0 },
      { x: 0.67, y: 0.26, w: 0.30, h: 0.20, r: 0 },
      { x: 0.67, y: 0.49, w: 0.30, h: 0.18, r: 0 },
    ],
  },
  grid: {
    label: 'Grid 9',
    hint: 'Nine equal panels, a comic-strip wall of moments.',
    panels: () => {
      const out = [];
      const xs = [0.02, 0.345, 0.67];
      const ys = [0.02, 0.245, 0.47];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: xs[c], y: ys[r], w: 0.31, h: 0.205, r: 0 });
        }
      }
      return out;
    },
  },
  hero: {
    label: 'Hero',
    hint: 'One photo, full bleed, title over the sunset band.',
    panels: () => [{ x: 0, y: 0, w: 1, h: 0.70, r: 0 }],
  },
  snapshots: {
    label: 'Snapshots',
    hint: 'Tilted photo cards scattered over the painted sunset.',
    sun: { x: 0.82, y: 0.24, r: 0.15 },
    panels: () => [
      { x: 0.05, y: 0.06, w: 0.38, h: 0.48, r: -0.09 },
      { x: 0.33, y: 0.13, w: 0.38, h: 0.50, r: 0.04 },
      { x: 0.61, y: 0.05, w: 0.35, h: 0.46, r: 0.11 },
    ],
  },
};
export const LAYOUT_ORDER = ['poster', 'grid', 'hero', 'snapshots'];

// Deterministic pseudo-random numbers, so the skyline, stars and grain look
// the same on every render of the same cover.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function fitFont(ctx, text, maxWidth, startPx, family) {
  let px = startPx;
  ctx.font = `400 ${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = `400 ${px}px ${family}`;
  }
  return px;
}

// Wrap a title into at most two balanced lines.
function wrapTitle(text, maxChars) {
  const words = String(text || 'VICE COAST').toUpperCase().split(/\s+/);
  if (words.join(' ').length <= maxChars) return [words.join(' ')];
  let first = '';
  const rest = [];
  for (const word of words) {
    if (rest.length === 0 && (first + ' ' + word).trim().length <= maxChars) {
      first = (first + ' ' + word).trim();
    } else {
      rest.push(word);
    }
  }
  return [first, rest.join(' ')];
}

// --------------------------------------------------------------------- sky
function drawSky(ctx, w, h, grade) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(0.45, grade.sky[1]);
  g.addColorStop(0.72, grade.sky[2]);
  g.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx, w, h, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.38;
    const r = 0.6 + rnd() * 1.6;
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// The striped retro sun: a gradient disc, then horizontal sky-coloured
// slits cut across its lower half, widening toward the bottom.
function drawStripedSun(ctx, grade, cx, cy, r) {
  ctx.save();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, grade.sun[0]);
  g.addColorStop(1, grade.sun[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = grade.sky[1];
  let y = cy + r * 0.02;
  let gap = r * 0.03;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.11;
    gap *= 1.5;
  }
  ctx.restore();
  // Soft glow behind the disc.
  ctx.save();
  ctx.globalAlpha = 0.32;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.1);
  glow.addColorStop(0, grade.sun[1]);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// One skyline layer: seeded building blocks with a few lit windows.
// `lift` shifts the layer up (far layer) and `alpha` fades it.
function drawSkylineLayer(ctx, w, horizonY, color, seed, lift, alpha) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  let x = -10;
  const base = horizonY - lift;
  while (x < w + 10) {
    const bw = w * (0.03 + rnd() * 0.05);
    const bh = horizonY * (0.08 + rnd() * 0.26);
    ctx.fillRect(x, base - bh, bw, bh);
    if (rnd() > 0.6) {
      ctx.fillRect(x + bw * 0.45, base - bh - 14, 3, 14);
    }
    const wins = Math.floor(rnd() * 5);
    for (let i = 0; i < wins; i++) {
      ctx.fillStyle = 'rgba(255, 214, 110, 0.85)';
      ctx.fillRect(x + 4 + rnd() * Math.max(1, bw - 10), base - bh + 6 + rnd() * Math.max(1, bh - 14), 4, 6);
      ctx.fillStyle = color;
    }
    x += bw + rnd() * w * 0.02;
  }
  ctx.restore();
}

// Original palm silhouette: a curved trunk drawn in segments, eight
// drooping fronds fanning from the crown, two coconuts.
function drawPalm(ctx, x, y, s, color, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(lean || 0);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: three short segments, each bending a little more.
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(3, -34);
  ctx.lineTo(8, -66);
  ctx.lineTo(15, -96);
  ctx.stroke();
  // Fronds: long arcs drooping from the crown at (15, -96).
  ctx.lineWidth = 5;
  const crownX = 15;
  const crownY = -96;
  const fronds = [
    [-170, 58, -24], [-140, 62, -30], [-110, 58, -26], [-80, 52, -14],
    [-45, 48, -2], [-12, 46, 8], [18, 44, 16], [48, 40, 22],
  ];
  for (const [deg, len, droop] of fronds) {
    const a = deg * Math.PI / 180;
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + Math.sin(a) * len * 0.55 + droop;
    const midX = crownX + Math.cos(a) * len * 0.55;
    const midY = crownY + Math.sin(a) * len * 0.2 - 10;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(crownX - 4, crownY + 4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(crownX + 5, crownY + 5, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPaintedBackdrop(ctx, w, h, grade, seed, sunPos) {
  drawSky(ctx, w, h, grade);
  if (grade === GRADES.neon || grade === GRADES.noir || grade === GRADES.drive) {
    drawStars(ctx, w, h, seed);
  }
  const sunR = Math.min(w, h) * (sunPos.r || 0.21);
  const sunX = w * (sunPos.x || 0.68);
  const sunY = h * (sunPos.y || 0.42);
  drawStripedSun(ctx, grade, sunX, sunY, sunR);
  const horizonY = h * 0.70;
  // Far skyline, faded and lifted, then the near one, solid.
  drawSkylineLayer(ctx, w, horizonY, grade.shadow, seed + 3, h * 0.05, 0.55);
  drawSkylineLayer(ctx, w, horizonY, grade.shadow, seed + 7, 0, 1);
  // Sea shimmer below the horizon: thin light bands.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = grade.sun[0];
  for (let i = 0; i < 7; i++) {
    const yy = horizonY + 8 + i * ((h - horizonY) / 7);
    ctx.fillRect(w * 0.55, yy, w * 0.30, 2);
  }
  ctx.restore();
  // Palms framing the corners, in front of the skyline.
  const ps = Math.min(w, h) / 620;
  drawPalm(ctx, w * 0.045, h * 0.70, ps * 1.15, grade.shadow, -0.06);
  drawPalm(ctx, w * 0.955, h * 0.70, ps * 0.95, grade.shadow, 0.10);
}

// ------------------------------------------------------------------ panels
function drawPhotoInto(ctx, img, x, y, w, h, photo) {
  if (!img || !img.naturalWidth) return false;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const zoom = (photo && photo.zoom) || 1;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let ox = (photo && photo.ox) || 0;
  let oy = (photo && photo.oy) || 0;
  // Never let a shift open a gap: the photo must always cover the panel.
  ox = clamp(ox, -Math.max(0, (dw - w) / 2 / w), Math.max(0, (dw - w) / 2 / w));
  oy = clamp(oy, -Math.max(0, (dh - h) / 2 / h), Math.max(0, (dh - h) / 2 / h));
  const cx = x + w / 2 + ox * w;
  const cy = y + h / 2 + oy * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
  return true;
}

function drawPanel(ctx, w, h, rect, img, photo, grade) {
  const x = rect.x * w;
  const y = rect.y * h;
  const pw = rect.w * w;
  const ph = rect.h * h;
  ctx.save();
  if (rect.r) {
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.rotate(rect.r);
    ctx.translate(-pw / 2, -ph / 2);
  }
  const ox = rect.r ? 0 : x;
  const oy = rect.r ? 0 : y;
  // Card backing so tilted snapshots read as physical cards.
  ctx.fillStyle = '#fdf6ec';
  ctx.fillRect(ox - 5, oy - 5, pw + 10, ph + 10);
  const ok = drawPhotoInto(ctx, img, ox, oy, pw, ph, photo);
  if (!ok) { // empty slot: painted placeholder, never a broken image
    ctx.fillStyle = grade.sky[1];
    ctx.fillRect(ox, oy, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `600 ${Math.round(ph * 0.09)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', ox + pw / 2, oy + ph / 2);
  }
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeStyle = grade.stroke;
  ctx.strokeRect(ox, oy, pw, ph);
  ctx.restore();
}

// ----------------------------------------------------------------- effects
let noiseCanvas = null;
function grainPattern() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const nctx = noiseCanvas.getContext('2d');
  const rnd = mulberry32(20261119);
  const img = nctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return noiseCanvas;
}

function drawGrain(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = ctx.createPattern(grainPattern(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h * 0.46, Math.min(w, h) * 0.42,
    w / 2, h * 0.5, Math.max(w, h) * 0.78
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// -------------------------------------------------------------- lettering
function drawBadge(ctx, w, h, grade, text) {
  if (!text) return;
  const label = String(text).toUpperCase().slice(0, 24);
  ctx.save();
  const bw = w * 0.28;
  const bh = Math.min(h * 0.052, 56);
  ctx.translate(w - bw * 0.60, bh * 1.1);
  ctx.rotate(0.06);
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, -bh / 2);
  ctx.lineTo(bw / 2, -bh / 2);
  ctx.lineTo(bw / 2 + bh * 0.45, 0);
  ctx.lineTo(bw / 2, bh / 2);
  ctx.lineTo(-bw / 2, bh / 2);
  ctx.lineTo(-bw / 2 - bh * 0.45, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 ${Math.round(bh * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function drawTitleBlock(ctx, w, h, grade, state) {
  const bandTop = h * 0.70;
  // Dark legibility wash over the lower band.
  const wash = ctx.createLinearGradient(0, bandTop - h * 0.06, 0, h);
  wash.addColorStop(0, 'rgba(0,0,0,0)');
  wash.addColorStop(0.35, 'rgba(0,0,0,0.38)');
  wash.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, bandTop - h * 0.06, w, h - bandTop + h * 0.06);

  const margin = w * 0.045;
  const maxW = w - margin * 2;
  const lines = wrapTitle(state.title, 14);
  // Bottom-anchored: the subtitle baseline sits at 96.5% height and the
  // title stacks above it, so nothing is ever clipped at the canvas edge.
  const subPx = Math.min(w * 0.044, 56);
  const subBaseline = h * 0.965;
  const firstPx = fitFont(ctx, lines[0], maxW, Math.min(w * 0.115, 148), 'Anton, sans-serif');
  const lineH = firstPx * 0.98;
  const firstBaseline = subBaseline - subPx * 1.7 - (lines.length - 1) * lineH;
  ctx.save();
  ctx.translate(margin, firstBaseline);
  ctx.rotate(-0.022);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const px = fitFont(ctx, line, maxW, Math.min(w * 0.115, 148), 'Anton, sans-serif');
    const y = i * lineH;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    // Offset accent shadow, then thick dark outline, then the ink fill.
    ctx.fillStyle = grade.accent;
    ctx.fillText(line, px * 0.055, y + px * 0.055);
    ctx.lineWidth = px * 0.10;
    ctx.strokeStyle = grade.shadow;
    ctx.strokeText(line, 0, y);
    ctx.fillStyle = grade.ink;
    ctx.fillText(line, 0, y);
  });
  const subY = (lines.length - 1) * lineH + subPx * 1.7;
  ctx.font = `400 ${subPx}px Pacifico, cursive`;
  ctx.fillStyle = grade.sun[0];
  ctx.fillText(state.subtitle || '', 4, subY);
  ctx.restore();
}

function drawFrame(ctx, w, h, grade) {
  const t = Math.max(10, w * 0.012);
  ctx.save();
  ctx.fillStyle = '#fdf6ec';
  ctx.fillRect(0, 0, w, t);
  ctx.fillRect(0, h - t, w, t);
  ctx.fillRect(0, 0, t, h);
  ctx.fillRect(w - t, 0, t, h);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, w * 0.003);
  ctx.strokeRect(t * 1.6, t * 1.6, w - t * 3.2, h - t * 3.2);
  ctx.restore();
}

// ------------------------------------------------------------------ render
// state: { layout, grade, size, title, subtitle, badge, frame,
//          photos: [{img, zoom, ox, oy}], photoMap: [photoIndex per panel] }
export function renderCover(canvas, state) {
  const size = SIZES[state.size] || SIZES.square;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.poster;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const w = size.w;
  const h = size.h;
  let seed = 11;
  for (let i = 0; i < state.title.length; i++) seed = (seed * 31 + state.title.charCodeAt(i)) >>> 0;

  drawPaintedBackdrop(ctx, w, h, grade, seed, layout.sun || {});
  const rects = layout.panels();
  // When one photo fills several panels, vary each repeat's framing so the
  // panels read as different moments, not the same crop nine times.
  const seen = {};
  const frameShift = [
    { ox: 0, oy: 0, zoom: 1 },
    { ox: 0.16, oy: -0.05, zoom: 1.10 },
    { ox: -0.16, oy: 0.07, zoom: 1.06 },
    { ox: 0.08, oy: 0.10, zoom: 1.16 },
    { ox: -0.08, oy: -0.10, zoom: 1.12 },
    { ox: 0.20, oy: 0.04, zoom: 1.08 },
    { ox: -0.20, oy: -0.02, zoom: 1.14 },
    { ox: 0.05, oy: -0.12, zoom: 1.05 },
    { ox: -0.05, oy: 0.12, zoom: 1.18 },
  ];
  rects.forEach((rect, i) => {
    const photoIdx = state.photoMap && state.photoMap[i] != null ? state.photoMap[i] : 0;
    const photo = state.photos[photoIdx] || state.photos[0];
    let framed = photo;
    if (photo) {
      const nth = seen[photoIdx] || 0;
      seen[photoIdx] = nth + 1;
      if (nth > 0) {
        const shift = frameShift[nth % frameShift.length];
        framed = {
          img: photo.img,
          zoom: (photo.zoom || 1) * shift.zoom,
          ox: (photo.ox || 0) + shift.ox,
          oy: (photo.oy || 0) + shift.oy,
        };
      }
    }
    drawPanel(ctx, w, h, rect, framed ? framed.img : null, framed, grade);
  });
  // Wash the grade tint over everything so panels and paint share it.
  ctx.save();
  try {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grade.tintAlpha;
  } catch (e) {
    ctx.globalAlpha = grade.tintAlpha * 0.5;
  }
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawGrain(ctx, w, h);
  drawVignette(ctx, w, h);
  drawTitleBlock(ctx, w, h, grade, state);
  drawBadge(ctx, w, h, grade, state.badge);
  if (state.frame) drawFrame(ctx, w, h, grade);
  return canvas;
}

export function layoutPanelCount(layoutName) {
  return (LAYOUTS[layoutName] || LAYOUTS.poster).panels().length;
}
