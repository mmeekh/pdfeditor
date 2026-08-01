/**
 * Ana sayfa evrensel PDF bırakma alanı + araç seçici (2026-08-01)
 *
 * Üç giriş yolu, tek akış:
 *  1) Sayfanın herhangi bir yerine dosya sürükle → overlay → bırak
 *  2) Hero altındaki görünür kutuya tıkla → dosya seç
 *  3) Android paylaş hedefi / ?handoff=TOKEN ile geliş (sw.js yönlendirir)
 * Dosyalar handoffStorage'a (IndexedDB) konur, kullanıcı araç seçer,
 * seçilen araca ?handoff=TOKEN ile gidilir — araç sayfası dosyayı devralır.
 */
import handoffStorage from './modules/handoffStorage.js';

const zone = document.getElementById('homeDropzone');
const overlay = document.getElementById('homeDropOverlay');
const chooser = document.getElementById('toolChooser');
const fileInput = document.getElementById('homeDropInput');
const countEl = document.getElementById('toolChooserCount');

let pendingToken = null;

function pdfsOf(fileList) {
  return Array.from(fileList || []).filter(f =>
    f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)));
}

function openChooser(token, fileCount) {
  pendingToken = token;
  if (countEl) countEl.textContent = fileCount > 1 ? `${fileCount} dosya hazır` : '1 dosya hazır';
  chooser.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const first = chooser.querySelector('a[data-chooser-url]');
  if (first) first.focus();
}

function closeChooser(discard) {
  chooser.classList.add('hidden');
  document.body.style.overflow = '';
  if (discard && pendingToken) handoffStorage.del(pendingToken).catch(() => {});
  pendingToken = null;
}

async function acceptFiles(fileList) {
  const files = pdfsOf(fileList);
  if (!files.length) return;
  try {
    const token = await handoffStorage.put(files);
    openChooser(token, files.length);
  } catch (e) {
    // IDB kullanılamıyorsa en azından birleştirmeye götür (dosyasız)
    window.location.href = '/pdf-birlestir';
  }
}

// 1) Sayfa geneli sürükle-bırak
let dragDepth = 0;
document.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
  dragDepth++;
  overlay.classList.remove('hidden');
});
document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) overlay.classList.add('hidden');
});
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  // Kartların kendi drop hedefleri çalışmaya devam etsin
  if (e.target.closest && e.target.closest('.tool-card')) { dragDepth = 0; overlay.classList.add('hidden'); return; }
  e.preventDefault();
  dragDepth = 0;
  overlay.classList.add('hidden');
  acceptFiles(e.dataTransfer.files);
});

// 2) Görünür kutu: tıkla → seç
if (zone && fileInput) {
  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', () => { acceptFiles(fileInput.files); fileInput.value = ''; });
}

// 3) Araç seçici davranışı
if (chooser) {
  chooser.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-chooser-url]');
    if (a) {
      e.preventDefault();
      const url = a.getAttribute('data-chooser-url');
      const t = pendingToken; pendingToken = null;
      window.location.href = t ? `${url}?handoff=${t}` : url;
      return;
    }
    if (e.target.closest('[data-chooser-close]') || e.target === chooser) closeChooser(true);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !chooser.classList.contains('hidden')) closeChooser(true);
  });
}

// Paylaş hedefinden geliş: /?handoff=TOKEN
const params = new URLSearchParams(window.location.search);
const incoming = params.get('handoff');
if (incoming) {
  history.replaceState(null, '', window.location.pathname);
  openChooser(incoming, 1);
}
