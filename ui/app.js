'use strict';

const MAX_SEED = 10_000_000;
let meshB64   = null;
let imageB64  = null;
let pollTimer = null;

const $ = id => document.getElementById(id);

function apiUrl() { return $('serverUrl').value.trim().replace(/\/$/, ''); }

// ─── Alert ──────────────────────────────────────────────────────────────────

function showAlert(msg, type = 'error') {
  const el = $('alertBox');
  el.textContent = msg;
  el.className = `alert-box ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 8000);
}

// ─── Progress ───────────────────────────────────────────────────────────────

function setProgress(active, label = '', text = '') {
  $('progressWrap').classList.toggle('show', active);
  if (label) $('progressLabel').textContent = label;
  $('progressText').textContent = text;
}

// ─── Lock buttons ───────────────────────────────────────────────────────────

function lockButtons(locked, activeId = null) {
  ['btnShape', 'btnTextured'].forEach(id => {
    const btn = $(id);
    btn.disabled = locked;
    btn.classList.toggle('busy', locked && id === activeId);
  });
  if (!locked) {
    $('btnTransform').disabled = !meshB64;
    $('btnDownload').disabled  = !meshB64;
  } else {
    $('btnTransform').disabled = true;
  }
}

// ─── Health check ───────────────────────────────────────────────────────────

async function checkHealth() {
  try {
    await fetch(`${apiUrl()}/status/__ping__`, { signal: AbortSignal.timeout(3000) });
    $('statusDot').className    = 'status-dot online';
    $('statusText').textContent = 'Online';
  } catch {
    $('statusDot').className    = 'status-dot offline';
    $('statusText').textContent = 'Offline';
  }
}
$('serverUrl').addEventListener('change', checkHealth);
checkHealth();
setInterval(checkHealth, 15_000);

// ─── Source tabs ────────────────────────────────────────────────────────────

document.querySelectorAll('.pill-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const sw = btn.closest('.pill-tabs');
    sw.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const section = sw.closest('.section');
    section.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    $(btn.dataset.tab)?.classList.add('active');
  });
});

// ─── Viewer nav ─────────────────────────────────────────────────────────────

document.querySelectorAll('.vnav').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vnav').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.vslot').forEach(s => s.classList.remove('active'));
    $(btn.dataset.slot)?.classList.add('active');
  });
});

// ─── Collapsible sections ────────────────────────────────────────────────────

document.querySelectorAll('.toggleable').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.closest('.collapsible').classList.toggle('closed');
  });
});

// ─── Image upload ───────────────────────────────────────────────────────────

const uploadZone = $('uploadZone');
const fileInput  = $('fileInput');

function loadImageFile(file) {
  if (!file?.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    imageB64 = e.target.result.split(',')[1];
    $('imgPreview').src = e.target.result;
    $('imgPreview').style.display = 'block';
    $('btnClearImg').style.display = 'block';
    $('uploadEmpty').style.display = 'none';
    uploadZone.classList.add('has-image');
    fileInput.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener('change', e => loadImageFile(e.target.files[0]));
uploadZone.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  loadImageFile(e.dataTransfer.files[0]);
});
$('btnClearImg').addEventListener('click', () => {
  imageB64 = null;
  $('imgPreview').src = ''; $('imgPreview').style.display = 'none';
  $('btnClearImg').style.display = 'none';
  $('uploadEmpty').style.display = '';
  uploadZone.classList.remove('has-image');
  fileInput.style.display = ''; fileInput.value = '';
});

// ─── Sliders ────────────────────────────────────────────────────────────────

function updateSliderFill(slider) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min) * 100).toFixed(1);
  slider.style.setProperty('--pct', `${pct}%`);
}

function bindSlider(sliderId, valId, numId, fmt) {
  const sl  = $(sliderId);
  const val = valId ? $(valId) : null;
  const num = numId ? $(numId) : null;
  const upd = v => {
    if (val) val.textContent = fmt ? fmt(v) : v;
    updateSliderFill(sl);
  };
  sl.addEventListener('input', () => { upd(sl.value); if (num) num.value = sl.value; });
  if (num) num.addEventListener('input', () => { sl.value = num.value; upd(num.value); });
  upd(sl.value);
}

bindSlider('sliderCfg',    'valCfg',    null,     v => parseFloat(v).toFixed(1));
bindSlider('sliderChunks', 'valChunks', null,     v => Number(v).toLocaleString());
bindSlider('sliderFace',   'valFace',   null,     v => Number(v).toLocaleString());
bindSlider('sliderSeed',   null,        'numSeed');

$('cbSimplify').addEventListener('change', e => {
  $('rowFaceNum').style.display = e.target.checked ? 'block' : 'none';
});

// ─── Presets ────────────────────────────────────────────────────────────────

const GEN_PRESETS = {
  Turbo:    { steps: 5,  desc: 'Recommended for most cases' },
  Fast:     { steps: 10, desc: 'Better for complex objects' },
  Standard: { steps: 20, desc: 'Best quality — significantly slower' },
};
const DECODE_PRESETS = {
  Low:      { octree: 196, desc: 'Simpler mesh — faster' },
  Standard: { octree: 256, desc: 'Balanced quality & speed' },
  High:     { octree: 384, desc: 'High resolution — more VRAM' },
};

function applyPresetDefaults() {
  $('sliderCfg').value    = 5;
  $('valCfg').textContent = '5.0';
  updateSliderFill($('sliderCfg'));
  $('sliderChunks').value    = 20000;
  $('valChunks').textContent = Number(20000).toLocaleString();
  updateSliderFill($('sliderChunks'));
}

document.querySelectorAll('#genModeGroup .radio-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#genModeGroup .radio-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const p = GEN_PRESETS[card.dataset.gen];
    $('genModeDesc').textContent = p.desc;
    applyPresetDefaults();
  });
});

document.querySelectorAll('#decodeModeGroup .radio-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#decodeModeGroup .radio-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const p = DECODE_PRESETS[card.dataset.decode];
    $('decodeModeDesc').textContent = p.desc;
    applyPresetDefaults();
  });
});

// ─── Log ────────────────────────────────────────────────────────────────────

function typewriteLog(lines) {
  const el = $('statsDisplay');
  el.innerHTML = '';
  lines.forEach((item, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = `log-line ${item.cls || ''}`;
      div.textContent = item.text;
      el.appendChild(div);
      el.scrollTop = el.scrollHeight;
    }, i * 38);
  });
}

function buildLogLines(uid, params, withTexture, elapsed) {
  const now    = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const sep    = '  ' + '─'.repeat(44);
  const sep2   = '  ' + '═'.repeat(44);
  const genKey = document.querySelector('#genModeGroup .radio-card.active')?.dataset.gen ?? '—';
  const decKey = document.querySelector('#decodeModeGroup .radio-card.active')?.dataset.decode ?? '—';
  const input  = $('tab-image').classList.contains('active') ? 'Image' : 'Text';
  return [
    { text: sep2,                                                              cls: 'log-sep'  },
    { text: '  Hunyuan3D-2 · Job Report',                                     cls: 'log-head' },
    { text: sep2,                                                              cls: 'log-sep'  },
    { text: `  Job ID   ${uid}`,                                              cls: 'log-line' },
    { text: `  Started  ${now}`,                                              cls: 'log-line' },
    { text: sep,                                                               cls: 'log-sep'  },
    { text: `  Input    ${input}`,                                            cls: 'log-line' },
    { text: `  Mode     ${genKey}  (${params.num_inference_steps} steps)`,    cls: 'log-val'  },
    { text: `  Quality  ${decKey}  (octree ${params.octree_resolution})`,     cls: 'log-val'  },
    { text: `  Guidance ${params.guidance_scale}`,                            cls: 'log-val'  },
    { text: `  Chunks   ${Number(params.num_chunks).toLocaleString()}`,       cls: 'log-val'  },
    { text: `  Seed     ${params.seed}`,                                      cls: 'log-val'  },
    { text: `  Texture  ${withTexture ? 'Yes' : 'No'}`,                      cls: 'log-val'  },
    { text: sep,                                                               cls: 'log-sep'  },
    { text: `  Status   Completed`,                                           cls: 'log-ok'   },
    { text: `  Elapsed  ${elapsed}s`,                                         cls: 'log-ok'   },
    { text: sep2,                                                              cls: 'log-sep'  },
  ];
}

// ─── 3D Viewer ──────────────────────────────────────────────────────────────

function b64ToBlob(b64, mime = 'model/gltf-binary') {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

function autoLoadMesh(b64) {
  const mv  = $('mv-gen');
  const ph  = $('ph-gen');
  mv.setAttribute('src', URL.createObjectURL(b64ToBlob(b64)));
  mv.style.display = 'block';
  ph.style.display = 'none';
}

function prepareExportMesh(b64) {
  $('ph-export').style.display = 'none';
  $('lp-export').style.display = 'flex';
  $('mv-export').style.display = 'none';
  $('mv-export')._blobUrl = URL.createObjectURL(b64ToBlob(b64));
}

$('btnLoadExport').addEventListener('click', () => {
  const mv = $('mv-export');
  mv.setAttribute('src', mv._blobUrl);
  mv.style.display = 'block';
  $('lp-export').style.display = 'none';
});

// ─── Key light toggle ────────────────────────────────────────────────────────
// Uses a studio HDR env-map to give the model directional reflections + highlights.
// Polyhaven studio_small_08 is CORS-open and public domain.
const KEY_LIGHT_HDR = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr';

let keyLit = false;
$('btnKeyLight').addEventListener('click', () => {
  keyLit = !keyLit;
  const viewers = [$('mv-gen'), $('mv-export')];
  const btn = $('btnKeyLight');
  if (keyLit) {
    viewers.forEach(mv => mv.setAttribute('environment-image', KEY_LIGHT_HDR));
    btn.classList.add('lit');
    $('keyLabel').textContent = 'Key light on';
  } else {
    viewers.forEach(mv => mv.removeAttribute('environment-image'));
    btn.classList.remove('lit');
    $('keyLabel').textContent = 'Key light off';
  }
});


// ─── Polling ────────────────────────────────────────────────────────────────

function pollStatus(uid, label) {
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const timeout = 600_000;
    pollTimer = setInterval(async () => {
      elapsed += 2000;
      setProgress(true, label, `${Math.round(elapsed / 1000)}s · ${uid.slice(0, 8)}…`);
      try {
        const r    = await fetch(`${apiUrl()}/status/${uid}`);
        const data = await r.json();
        if (data.status === 'completed') {
          clearInterval(pollTimer);
          resolve({ b64: data.model_base64, elapsed: Math.round(elapsed / 1000) });
        } else if (elapsed >= timeout) {
          clearInterval(pollTimer);
          reject(new Error('Job timed out (10 min)'));
        }
      } catch (e) { clearInterval(pollTimer); reject(e); }
    }, 2000);
  });
}

// ─── Build params ───────────────────────────────────────────────────────────

function buildParams(withTexture) {
  let seed = parseInt($('numSeed').value) || 1234;
  if ($('cbRandomSeed').checked) {
    seed = Math.floor(Math.random() * MAX_SEED);
    $('sliderSeed').value = seed;
    $('numSeed').value    = seed;
    updateSliderFill($('sliderSeed'));
  }

  const genKey = document.querySelector('#genModeGroup .radio-card.active')?.dataset.gen ?? 'Turbo';
  const decKey = document.querySelector('#decodeModeGroup .radio-card.active')?.dataset.decode ?? 'Standard';

  const params = {
    seed,
    num_inference_steps: GEN_PRESETS[genKey]?.steps ?? 5,
    octree_resolution:   DECODE_PRESETS[decKey]?.octree ?? 256,
    guidance_scale:      parseFloat($('sliderCfg').value),
    num_chunks:          parseInt($('sliderChunks').value),
    texture: withTexture,
  };

  const inImageTab = $('tab-image').classList.contains('active');
  if (inImageTab) {
    if (!imageB64) { showAlert('No image loaded — upload an image first'); return null; }
    params.image = imageB64;
  } else {
    const text = $('textInput').value.trim();
    if (!text) { showAlert('No text input — enter a prompt'); return null; }
    params.text = text;
  }
  return params;
}

// ─── Generate ───────────────────────────────────────────────────────────────

async function generate(withTexture) {
  const params = buildParams(withTexture);
  if (!params) return;

  const label = withTexture ? 'Generating textured shape' : 'Generating shape';
  const btnId = withTexture ? 'btnTextured' : 'btnShape';

  lockButtons(true, btnId);
  setProgress(true, label, 'Connecting…');
  $('alertBox').classList.remove('show');

  try {
    const r = await fetch(`${apiUrl()}/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params),
    });
    if (!r.ok) throw new Error(`Server returned HTTP ${r.status}`);
    const { uid } = await r.json();

    setProgress(true, label, 'Job dispatched — waiting for GPU…');
    const { b64, elapsed } = await pollStatus(uid, label);

    meshB64 = b64;
    autoLoadMesh(b64);

    document.querySelector('[data-slot="slot-gen"]').click();
    typewriteLog(buildLogLines(uid, params, withTexture, elapsed));

    $('btnDownload').disabled  = false;
    $('btnTransform').disabled = false;
    if (withTexture) $('rowTexture').style.display = 'flex';

    setProgress(false);
    showAlert(`Mesh generated in ${elapsed}s`, 'success');

  } catch (e) {
    clearInterval(pollTimer);
    setProgress(false);
    showAlert(e.message);
  } finally {
    lockButtons(false);
  }
}

$('btnShape').addEventListener('click',    () => generate(false));
$('btnTextured').addEventListener('click', () => generate(true));

// ─── Transform ──────────────────────────────────────────────────────────────

$('btnTransform').addEventListener('click', async () => {
  if (!meshB64)  { showAlert('No mesh — run generation first'); return; }
  if (!imageB64) { showAlert('Image required for transform', 'info'); return; }

  const fileType  = $('selType').value;
  const withTex   = $('cbTexture').checked;
  const faceCount = parseInt($('sliderFace').value);
  const params    = { mesh: meshB64, image: imageB64, type: fileType, texture: withTex, face_count: faceCount };

  lockButtons(true, null);
  setProgress(true, 'Transform', 'Sending mesh…');

  try {
    const r = await fetch(`${apiUrl()}/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params),
    });
    if (!r.ok) throw new Error(`Server returned HTTP ${r.status}`);
    const { uid } = await r.json();
    const { b64 } = await pollStatus(uid, 'Transform');

    prepareExportMesh(b64);
    $('btnDownload').onclick = () => downloadMesh(b64, fileType);
    document.querySelector('[data-slot="slot-export"]').click();

    setProgress(false);
    showAlert('Transform complete', 'success');
  } catch (e) {
    clearInterval(pollTimer);
    setProgress(false);
    showAlert(`Transform error: ${e.message}`);
  } finally {
    lockButtons(false);
  }
});

// ─── Download ───────────────────────────────────────────────────────────────

const MIME = {
  glb: 'model/gltf-binary',
  obj: 'text/plain',
  ply: 'application/octet-stream',
  stl: 'application/octet-stream',
};

function downloadMesh(b64, type) {
  const blob = b64ToBlob(b64, MIME[type] ?? 'application/octet-stream');
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `mesh.${type}` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

$('btnDownload').addEventListener('click', () => {
  if (meshB64) downloadMesh(meshB64, $('selType').value);
});
