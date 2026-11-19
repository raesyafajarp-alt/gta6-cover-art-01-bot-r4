// Vice Coast Cover Maker — editor wiring (ES module).
// Owns the app state, the controls, photo uploads (files stay on the user's
// machine, never uploaded anywhere), live preview rendering and PNG export.
// Dragging on the preview pans the selected panel's photo; clicking a panel
// selects it. A `?shot=` URL mode drives the app headlessly for screenshots:
// it applies the query (photo, layout, grade, size, caption, subtitle),
// renders, and sets window.__shotReady once the cover is painted.
import { GRADES, GRADE_ORDER, SIZES, SIZE_ORDER, LAYOUTS, LAYOUT_ORDER, renderCover, layoutPanelCount } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { name: 'sunset-rider', label: 'Sunset Rider', src: 'samples/sunset-rider.jpg' },
  { name: 'neon-pier', label: 'Neon Pier', src: 'samples/neon-pier.jpg' },
];

const state = {
  layout: 'poster',
  grade: 'sunset',
  size: 'square',
  title: 'VICE COAST',
  subtitle: 'Sunset Heist',
  badge: 'VICE COAST',
  frame: false,
  photos: [],
  photoMap: [0, 1, 0, 1],
  selectedPanel: 0,
  useOnePhoto: true,
};

let canvas = null;
let statusEl = null;
let renderQueued = false;

function $(id) { return document.getElementById(id); }

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderNow();
  });
}

function renderNow() {
  if (!canvas || !state.photos.length) return;
  try {
    renderCover(canvas, state);
  } catch (err) {
    setStatus('Render failed: ' + err.message);
    return;
  }
  updatePanelStrip();
  setStatus('Cover ready — ' + SIZES[state.size].label + ' · ' +
    LAYOUTS[state.layout].label + ' · ' + GRADES[state.grade].label);
}

// ------------------------------------------------------------ photos
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('could not read that file'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
}

function defaultPhotoMap() {
  const n = layoutPanelCount(state.layout);
  const map = [];
  for (let i = 0; i < n; i++) map.push(i % state.photos.length);
  if (state.useOnePhoto) {
    for (let j = 0; j < n; j++) map[j] = 0;
  }
  return map;
}

function selectedPhoto() {
  return state.photos[state.photoMap[state.selectedPanel]] || state.photos[0];
}

function applyPhotoToSelected(img) {
  const photo = { img, zoom: 1.12, ox: 0, oy: 0 };
  state.photos.push(photo);
  const idx = state.photos.length - 1;
  if (state.useOnePhoto) {
    state.photoMap = state.photoMap.map(() => idx);
  } else {
    state.photoMap[state.selectedPanel] = idx;
  }
  queueRender();
}

// ------------------------------------------------------------ controls
function buildChoiceButtons(containerId, items, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (item.value === current ? ' active' : '');
    b.textContent = item.label;
    b.setAttribute('aria-pressed', item.value === current ? 'true' : 'false');
    if (item.swatch) {
      b.style.setProperty('--swatch', item.swatch);
      b.classList.add('swatch');
    }
    b.addEventListener('click', () => onPick(item.value));
    box.appendChild(b);
  });
}

function refreshChoices() {
  buildChoiceButtons('layoutChoices', LAYOUT_ORDER.map((k) => (
    { value: k, label: LAYOUTS[k].label }
  )), state.layout, (v) => {
    state.layout = v;
    state.photoMap = defaultPhotoMap();
    state.selectedPanel = 0;
    $('layoutHint').textContent = LAYOUTS[v].hint;
    refreshChoices();
    queueRender();
  });
  buildChoiceButtons('gradeChoices', GRADE_ORDER.map((k) => (
    { value: k, label: GRADES[k].label, swatch: GRADES[k].sky[2] }
  )), state.grade, (v) => {
    state.grade = v;
    refreshChoices();
    queueRender();
  });
  buildChoiceButtons('sizeChoices', SIZE_ORDER.map((k) => (
    { value: k, label: SIZES[k].label }
  )), state.size, (v) => {
    state.size = v;
    refreshChoices();
    queueRender();
  });
  $('layoutHint').textContent = LAYOUTS[state.layout].hint;
}

function updatePanelStrip() {
  const strip = $('panelStrip');
  if (!strip) return;
  const n = layoutPanelCount(state.layout);
  if (strip.children.length !== n) {
    strip.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'panel-btn';
      b.addEventListener('click', () => {
        state.selectedPanel = i;
        syncCropSliders();
        updatePanelStrip();
      });
      strip.appendChild(b);
    }
  }
  for (let j = 0; j < strip.children.length; j++) {
    strip.children[j].classList.toggle('active', j === state.selectedPanel);
    const pIdx = state.photoMap[j];
    let label = 'Panel ' + (j + 1);
    if (pIdx != null && state.photos[pIdx]) label += ' · photo ' + (pIdx + 1);
    strip.children[j].textContent = label;
  }
}

function syncCropSliders() {
  const photo = selectedPhoto();
  if (!photo) return;
  $('zoomRange').value = photo.zoom;
  $('xRange').value = photo.ox;
  $('yRange').value = photo.oy;
  $('zoomVal').textContent = photo.zoom.toFixed(2) + 'x';
  $('xVal').textContent = (photo.ox * 100).toFixed(0) + '%';
  $('yVal').textContent = (photo.oy * 100).toFixed(0) + '%';
}

function bindCropSlider(id, key) {
  $(id).addEventListener('input', (ev) => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo[key] = parseFloat(ev.target.value);
    syncCropSliders();
    queueRender();
  });
}

// ------------------------------------------------------------ export
function exportPNG() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  renderCover(off, state);
  setStatus('Exporting ' + size.w + ' x ' + size.h + ' PNG…');
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — the browser could not make the PNG.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vice-coast-' + state.size + '-' + size.w + 'x' + size.h + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus('Exported ' + size.w + ' x ' + size.h + ' PNG (' +
      Math.round(blob.size / 1024) + ' KB).');
  }, 'image/png');
}

// Headless helper used by the verification script: renders at the given
// size and resolves with a data URL plus the byte length of the PNG.
function exportPNGDataURL(sizeName) {
  return new Promise((resolve) => {
    const saved = state.size;
    state.size = sizeName;
    const off = document.createElement('canvas');
    renderCover(off, state);
    state.size = saved;
    queueRender();
    off.toBlob((blob) => {
      if (!blob) { resolve({ ok: false }); return; }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ ok: true, bytes: blob.size, dataUrl: reader.result });
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

// ------------------------------------------------------------ shot mode
function applyShotParams(params) {
  if (params.get('layout') && LAYOUTS[params.get('layout')]) {
    state.layout = params.get('layout');
  }
  if (params.get('grade') && GRADES[params.get('grade')]) {
    state.grade = params.get('grade');
  }
  if (params.get('size') && SIZES[params.get('size')]) {
    state.size = params.get('size');
  }
  if (params.get('caption')) state.title = params.get('caption');
  if (params.get('sub')) state.subtitle = params.get('sub');
  if (params.get('badge')) state.badge = params.get('badge');
  if (params.get('frame') === '1') state.frame = true;
  const photo = params.get('photo');
  if (photo) {
    const found = SAMPLES.findIndex((s) => s.name === photo);
    if (found >= 0) {
      // Put the requested sample first so every panel uses it by default.
      const first = state.photos.splice(found, 1)[0];
      state.photos.unshift(first);
    }
  }
  state.photoMap = defaultPhotoMap();
  state.selectedPanel = 0;
}

// ------------------------------------------------------------ boot
function boot() {
  canvas = $('coverCanvas');
  statusEl = $('statusLine');

  // Load the two bundled sample photos so the app works out of the box.
  Promise.all(SAMPLES.map((s) => loadImage(s.src)))
    .then((imgs) => {
      state.photos = imgs.map((img) => ({ img, zoom: 1.12, ox: 0, oy: 0 }));
      state.photoMap = defaultPhotoMap();
      const params = new URLSearchParams(window.location.search);
      if (params.get('shot')) applyShotParams(params);
      refreshChoices();
      syncCropSliders();
      return document.fonts ? document.fonts.ready : Promise.resolve();
    })
    .then(() => {
      renderNow();
      const params = new URLSearchParams(window.location.search);
      if (params.get('shot')) {
        runShot(params.get('shot'), params);
      }
    })
    .catch((err) => {
      setStatus('Could not load the sample photos: ' + err.message);
    });

  // Sample photo buttons.
  const sampleBox = $('sampleChoices');
  SAMPLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = s.label;
    b.addEventListener('click', () => {
      const idx = SAMPLES.indexOf(s);
      const photo = state.photos[idx];
      if (!photo) return;
      if (state.useOnePhoto) {
        state.photoMap = state.photoMap.map(() => idx);
      } else {
        state.photoMap[state.selectedPanel] = idx;
      }
      queueRender();
    });
    sampleBox.appendChild(b);
  });

  // Upload: one or many photos from the user's machine.
  $('photoInput').addEventListener('change', (ev) => {
    const files = Array.prototype.slice.call(ev.target.files || []);
    if (!files.length) return;
    let loaded = 0;
    files.forEach((file) => {
      loadFileAsImage(file).then((img) => {
        applyPhotoToSelected(img);
        loaded++;
        if (loaded === files.length) {
          setStatus(files.length + ' photo(s) loaded — drag the sliders to crop.');
        }
      }).catch((err) => setStatus(err.message));
    });
    ev.target.value = '';
  });

  $('onePhotoToggle').addEventListener('change', (ev) => {
    state.useOnePhoto = ev.target.checked;
    state.photoMap = defaultPhotoMap();
    queueRender();
  });

  $('applyAllBtn').addEventListener('click', () => {
    const idx = state.photoMap[state.selectedPanel];
    state.photoMap = state.photoMap.map(() => idx);
    queueRender();
    setStatus('Photo ' + (idx + 1) + ' now fills every panel.');
  });

  $('nextPhotoBtn').addEventListener('click', () => {
    if (!state.photos.length) return;
    const cur = state.photoMap[state.selectedPanel] || 0;
    const next = (cur + 1) % state.photos.length;
    if (state.useOnePhoto) {
      state.photoMap = state.photoMap.map(() => next);
    } else {
      state.photoMap[state.selectedPanel] = next;
    }
    queueRender();
    setStatus('Panel ' + (state.selectedPanel + 1) + ' now shows photo ' + (next + 1) + '.');
  });

  $('frameToggle').addEventListener('change', (ev) => {
    state.frame = ev.target.checked;
    queueRender();
  });

  // Caption fields.
  $('titleInput').addEventListener('input', (ev) => {
    state.title = ev.target.value || 'VICE COAST';
    queueRender();
  });
  $('subtitleInput').addEventListener('input', (ev) => {
    state.subtitle = ev.target.value;
    queueRender();
  });
  $('badgeInput').addEventListener('input', (ev) => {
    state.badge = ev.target.value;
    queueRender();
  });

  bindCropSlider('zoomRange', 'zoom');
  bindCropSlider('xRange', 'ox');
  bindCropSlider('yRange', 'oy');

  $('exportBtn').addEventListener('click', exportPNG);
  $('shuffleBtn').addEventListener('click', () => {
    state.grade = GRADE_ORDER[Math.floor(Math.random() * GRADE_ORDER.length)];
    state.layout = LAYOUT_ORDER[Math.floor(Math.random() * LAYOUT_ORDER.length)];
    state.photoMap = defaultPhotoMap();
    refreshChoices();
    queueRender();
  });

  // Clicking the preview picks the panel under the pointer; dragging pans
  // the selected panel's photo inside its frame.
  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const ux = (ev.clientX - rect.left) / rect.width;
    const uy = (ev.clientY - rect.top) / rect.height;
    const rects = LAYOUTS[state.layout].panels();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (ux >= r.x && ux <= r.x + r.w && uy >= r.y && uy <= r.y + r.h) {
        state.selectedPanel = i;
        syncCropSliders();
        updatePanelStrip();
        drag = { x: ev.clientX, y: ev.clientY, ox: (selectedPhoto() || {}).ox || 0, oy: (selectedPhoto() || {}).oy || 0, pw: r.w * rect.width, ph: r.h * rect.height };
        canvas.setPointerCapture(ev.pointerId);
        break;
      }
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const photo = selectedPhoto();
    if (!photo) return;
    photo.ox = drag.ox + (ev.clientX - drag.x) / drag.pw;
    photo.oy = drag.oy + (ev.clientY - drag.y) / drag.ph;
    syncCropSliders();
    queueRender();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  window.ViceCoastApp = {
    state,
    render: renderNow,
    exportPNGDataURL,
    exportPNG,
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
