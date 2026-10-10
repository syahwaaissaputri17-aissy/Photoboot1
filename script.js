/* =========================================================
   Otomotif × Engineering Photobooth
   Kamera HP + countdown otomatis + frame + ekspor kualitas cetak
   ========================================================= */

// ---------- Konfigurasi (boleh diubah sesuai kebutuhan) ----------
const SHOTS_REQUIRED = 4;      // jumlah foto per sesi (dipakai strip & kolase)
const COUNTDOWN_SECONDS = 3;   // hitung mundur sebelum tiap jepretan
const GAP_BETWEEN_SHOTS_MS = 700; // jeda singkat antar jepretan
const PRINT_DPI = 300;         // resolusi cetak

// Ukuran cetak fisik (inci) per format
const SIZES = {
  strip:   { wIn: 2, hIn: 6 },
  collage: { wIn: 4, hIn: 6 }
};

// Tema frame: warna + label ala bengkel/blueprint
const FRAME_THEMES = {
  navy:  { bg: '#334066', panel: '#3E4D78', accent: '#E89A66', text: '#FBF4E8', grid: 'rgba(255,255,255,0.08)', label: 'WROOM & FIX!' },
  cream: { bg: '#FBF4E8', panel: '#FFFFFF', accent: '#C76B3C', text: '#334066', grid: 'rgba(51,64,102,0.08)',   label: 'GEARED UP!' },
  sage:  { bg: '#8FAF86', panel: '#9EC093', accent: '#334066', text: '#FBF4E8', grid: 'rgba(255,255,255,0.10)', label: 'CREATIVE ENGINE' }
};

// ---------- State aplikasi ----------
const state = {
  format: 'strip',
  frame: 'navy',
  facingMode: 'user',
  stream: null,
  photos: [],        // array of HTMLCanvasElement (resolusi asli kamera)
  retakeIndex: null,
  busy: false
};

// ---------- Ambil referensi elemen DOM ----------
const el = {
  errorBanner: document.getElementById('error-banner'),
  supportWarning: document.getElementById('support-warning'),

  formatOptions: document.getElementById('format-options'),
  frameOptions: document.getElementById('frame-options'),
  btnStartCamera: document.getElementById('btn-start-camera'),

  video: document.getElementById('video-preview'),
  shotCount: document.getElementById('shot-count'),
  shotTotal: document.getElementById('shot-total'),
  countdownOverlay: document.getElementById('countdown-overlay'),
  countdownNumber: document.getElementById('countdown-number'),
  flashOverlay: document.getElementById('flash-overlay'),
  btnSwitchCamera: document.getElementById('btn-switch-camera'),
  btnCaptureSequence: document.getElementById('btn-capture-sequence'),
  thumbsRow: document.getElementById('thumbs-row'),

  reviewGrid: document.getElementById('review-grid'),
  btnRetakeAll: document.getElementById('btn-retake-all'),
  btnContinueResult: document.getElementById('btn-continue-result'),

  finalCanvas: document.getElementById('final-canvas'),
  printInfo: document.getElementById('print-info'),
  btnDownload: document.getElementById('btn-download'),
  btnRestart: document.getElementById('btn-restart')
};

el.shotTotal.textContent = SHOTS_REQUIRED;

// =========================================================
// Navigasi antar layar
// =========================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showError(msg) {
  el.errorBanner.textContent = msg;
  el.errorBanner.classList.remove('hidden');
}
function clearError() {
  el.errorBanner.classList.add('hidden');
  el.errorBanner.textContent = '';
}

// =========================================================
// Layar 1: pilihan format & frame
// =========================================================
el.formatOptions.addEventListener('click', (e) => {
  const btn = e.target.closest('.choice-card');
  if (!btn) return;
  state.format = btn.dataset.format;
  el.formatOptions.querySelectorAll('.choice-card').forEach(b => b.classList.toggle('active', b === btn));
});

el.frameOptions.addEventListener('click', (e) => {
  const btn = e.target.closest('.frame-card');
  if (!btn) return;
  state.frame = btn.dataset.frame;
  el.frameOptions.querySelectorAll('.frame-card').forEach(b => b.classList.toggle('active', b === btn));
});

// Peringatan dini jika browser/konteks tidak mendukung kamera
(function checkSupportOnLoad() {
  const hasAPI = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const isSecure = window.isSecureContext; // true utk https:// dan http://localhost
  if (!hasAPI || !isSecure) {
    el.supportWarning.textContent =
      'Perangkat/browser ini belum bisa mengakses kamera di sini. Pastikan situs dibuka lewat HTTPS ' +
      '(atau localhost saat uji coba di komputer) dan gunakan Chrome/Safari versi terbaru.';
    el.supportWarning.classList.remove('hidden');
  }
})();

el.btnStartCamera.addEventListener('click', async () => {
  state.photos = [];
  state.retakeIndex = null;
  showScreen('screen-camera');
  await startCamera();
});

// =========================================================
// Layar 2: kamera, countdown, capture
// =========================================================
async function startCamera() {
  stopCamera();
  clearError();
  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: state.facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1920 }
    }
  };
  try {
    state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    el.video.srcObject = state.stream;
    el.video.classList.toggle('mirrored', state.facingMode === 'user');
  } catch (err) {
    showError(cameraErrorMessage(err));
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
}

function cameraErrorMessage(err) {
  switch (err.name) {
    case 'NotAllowedError':
      return 'Izin kamera ditolak. Buka pengaturan browser → Izin Situs → Kamera, lalu izinkan dan muat ulang halaman.';
    case 'NotFoundError':
      return 'Kamera tidak ditemukan di perangkat ini.';
    case 'NotReadableError':
      return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lain lalu coba lagi.';
    case 'OverconstrainedError':
      return 'Resolusi kamera yang diminta tidak didukung. Mencoba pengaturan lain...';
    default:
      return 'Tidak bisa mengakses kamera (' + err.message + '). Pastikan situs dibuka lewat HTTPS.';
  }
}

el.btnSwitchCamera.addEventListener('click', () => {
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

el.btnCaptureSequence.addEventListener('click', () => {
  if (state.busy) return;
  if (state.retakeIndex !== null) {
    runCaptureSequence(1, state.retakeIndex);
  } else {
    runCaptureSequence(SHOTS_REQUIRED, null);
  }
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function setCaptureButtonMode() {
  if (state.retakeIndex !== null) {
    el.btnCaptureSequence.textContent = '📸 Ambil Ulang Foto Ini';
  } else {
    el.btnCaptureSequence.textContent = '📸 Ambil Foto Otomatis';
  }
}
setCaptureButtonMode();

async function runCaptureSequence(count, replaceIndex) {
  state.busy = true;
  el.btnCaptureSequence.disabled = true;
  el.btnSwitchCamera.disabled = true;

  for (let i = 0; i < count; i++) {
    await runCountdown(COUNTDOWN_SECONDS);
    const shotCanvas = grabFrame();
    flashEffect();

    if (replaceIndex !== null) {
      state.photos[replaceIndex] = shotCanvas;
    } else {
      state.photos.push(shotCanvas);
    }
    el.shotCount.textContent = state.photos.length;
    renderThumbs();
    await delay(GAP_BETWEEN_SHOTS_MS);
  }

  el.btnCaptureSequence.disabled = false;
  el.btnSwitchCamera.disabled = false;
  state.busy = false;

  stopCamera();
  state.retakeIndex = null;
  setCaptureButtonMode();
  showScreen('screen-review');
  renderReview();
}

function runCountdown(seconds) {
  return new Promise((resolve) => {
    let n = seconds;
    el.countdownNumber.textContent = n;
    el.countdownOverlay.classList.remove('hidden');
    const timer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(timer);
        el.countdownOverlay.classList.add('hidden');
        resolve();
      } else {
        el.countdownNumber.textContent = n;
      }
    }, 1000);
  });
}

function grabFrame() {
  const w = el.video.videoWidth;
  const h = el.video.videoHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (state.facingMode === 'user') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(el.video, 0, 0, w, h);
  return c;
}

function flashEffect() {
  el.flashOverlay.classList.add('flash-active');
  setTimeout(() => el.flashOverlay.classList.remove('flash-active'), 180);
}

function renderThumbs() {
  el.thumbsRow.innerHTML = '';
  state.photos.forEach((canvas) => {
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/jpeg', 0.85);
    el.thumbsRow.appendChild(img);
  });
}

// =========================================================
// Layar 3: review & retake per-foto
// =========================================================
function renderReview() {
  el.reviewGrid.innerHTML = '';
  state.photos.forEach((canvas, idx) => {
    const item = document.createElement('div');
    item.className = 'review-item';

    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/jpeg', 0.9);

    const tag = document.createElement('span');
    tag.className = 'slot-tag';
    tag.textContent = 'Foto ' + (idx + 1);

    const retakeBtn = document.createElement('button');
    retakeBtn.className = 'retake-btn';
    retakeBtn.textContent = '🔁';
    retakeBtn.setAttribute('aria-label', 'Ambil ulang foto ' + (idx + 1));
    retakeBtn.addEventListener('click', () => retakeOne(idx));

    item.appendChild(img);
    item.appendChild(tag);
    item.appendChild(retakeBtn);
    el.reviewGrid.appendChild(item);
  });
}

async function retakeOne(idx) {
  state.retakeIndex = idx;
  setCaptureButtonMode();
  showScreen('screen-camera');
  el.shotCount.textContent = state.photos.length;
  await startCamera();
}

el.btnRetakeAll.addEventListener('click', async () => {
  state.photos = [];
  state.retakeIndex = null;
  setCaptureButtonMode();
  el.shotCount.textContent = 0;
  showScreen('screen-camera');
  await startCamera();
});

el.btnContinueResult.addEventListener('click', () => {
  showScreen('screen-result');
  composeFinal();
});

// =========================================================
// Layar 4: kompos hasil akhir (canvas kualitas cetak)
// =========================================================
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPhotoCover(ctx, src, x, y, w, h, radius) {
  const sw = src.width, sh = src.height;
  const srcRatio = sw / sh, dstRatio = w / h;
  let sx = 0, sy = 0, sWidth = sw, sHeight = sh;
  if (srcRatio > dstRatio) {
    sWidth = sh * dstRatio;
    sx = (sw - sWidth) / 2;
  } else {
    sHeight = sw / dstRatio;
    sy = (sh - sHeight) / 2;
  }
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(src, sx, sy, sWidth, sHeight, x, y, w, h);
  ctx.restore();
}

function drawBlueprintGrid(ctx, W, H, color, step) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, W * 0.0015);
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

function drawDashedDivider(ctx, x1, y, x2, color, lw) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.setLineDash([lw * 3, lw * 2.4]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawCornerBadge(ctx, cx, cy, r, emoji, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = (r * 1.15) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, cx, cy + r * 0.05);
  ctx.restore();
}

function formatDateID(d) {
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function composeFinal() {
  const theme = FRAME_THEMES[state.frame];
  const size = SIZES[state.format];
  const W = Math.round(size.wIn * PRINT_DPI);
  const H = Math.round(size.hIn * PRINT_DPI);

  el.finalCanvas.width = W;
  el.finalCanvas.height = H;
  const ctx = el.finalCanvas.getContext('2d');

  // latar belakang
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);
  drawBlueprintGrid(ctx, W, H, theme.grid, W * 0.065);

  const margin = W * 0.07;
  const headerH = H * (state.format === 'strip' ? 0.085 : 0.075);
  const footerH = H * 0.085;

  // judul atas
  ctx.fillStyle = theme.text;
  ctx.textAlign = 'center';
  ctx.font = '700 ' + Math.round(W * 0.065) + 'px "Baloo 2", sans-serif';
  ctx.fillText('OTOMOTIF × ENGINEERING', W / 2, headerH * 0.62);

  // badge pojok
  drawCornerBadge(ctx, margin * 0.55, margin * 0.55, W * 0.038, '⚙️', theme.panel);
  drawCornerBadge(ctx, W - margin * 0.55, margin * 0.55, W * 0.038, '🔧', theme.panel);

  // slot foto
  const gap = W * 0.028;
  if (state.format === 'strip') {
    const slotW = W - margin * 2;
    const availableH = H - headerH - footerH - gap * (SHOTS_REQUIRED - 1);
    const slotH = availableH / SHOTS_REQUIRED;
    state.photos.forEach((photo, i) => {
      const y = headerH + i * (slotH + gap);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = W * 0.01;
      drawPhotoCover(ctx, photo, margin, y, slotW, slotH, W * 0.018);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = W * 0.005;
      roundRectPath(ctx, margin, y, slotW, slotH, W * 0.018);
      ctx.stroke();
      ctx.restore();
    });
  } else {
    const slotW = (W - margin * 2 - gap) / 2;
    const availableH = H - headerH - footerH - gap;
    const slotH = availableH / 2;
    state.photos.forEach((photo, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (slotW + gap);
      const y = headerH + row * (slotH + gap);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = W * 0.008;
      drawPhotoCover(ctx, photo, x, y, slotW, slotH, W * 0.022);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = W * 0.006;
      roundRectPath(ctx, x, y, slotW, slotH, W * 0.022);
      ctx.stroke();
      ctx.restore();
    });
  }

  // footer: label tema + tanggal
  const footerY = H - footerH;
  drawDashedDivider(ctx, margin, footerY + footerH * 0.22, W - margin, theme.accent, W * 0.004);
  ctx.fillStyle = theme.text;
  ctx.font = '700 ' + Math.round(W * 0.05) + 'px "Baloo 2", sans-serif';
  ctx.fillText(theme.label, W / 2, footerY + footerH * 0.62);
  ctx.font = '400 ' + Math.round(W * 0.028) + 'px "Poppins", sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText(formatDateID(new Date()), W / 2, footerY + footerH * 0.9);
  ctx.globalAlpha = 1;

  el.printInfo.textContent =
    'Ukuran cetak: ' + size.wIn + '×' + size.hIn + ' inci · ' + W + '×' + H + ' px @ ' + PRINT_DPI + ' DPI — siap cetak di studio foto.';
}

// =========================================================
// Download hasil (PNG kualitas cetak, lossless)
// =========================================================
el.btnDownload.addEventListener('click', () => {
  el.finalCanvas.toBlob((blob) => {
    if (!blob) { showError('Gagal membuat file. Coba lagi.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photobooth-' + state.format + '-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png', 1.0);
});

el.btnRestart.addEventListener('click', () => {
  state.photos = [];
  state.retakeIndex = null;
  setCaptureButtonMode();
  el.shotCount.textContent = 0;
  el.thumbsRow.innerHTML = '';
  clearError();
  showScreen('screen-start');
});

// =========================================================
// Hemat baterai: lepas kamera saat tab disembunyikan
// =========================================================
document.addEventListener('visibilitychange', () => {
  const onCameraScreen = document.getElementById('screen-camera').classList.contains('active');
  if (document.hidden && onCameraScreen) {
    stopCamera();
  } else if (!document.hidden && onCameraScreen && !state.stream) {
    startCamera();
  }
});
