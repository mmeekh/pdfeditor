/**
 * PDF Sıkıştırma Aracı
 */

import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

function formatBytes(b){
  if(!b) return '0 B';
  const u=['B','KB','MB','GB'];
  const i=Math.floor(Math.log(b)/Math.log(1024));
  return `${(b/Math.pow(1024,i)).toFixed(2)} ${u[i]}`;
}

class CompressTool {
  constructor(){
    this.toolId='compress';
    this.toolName='PDF Sıkıştır';
  }

  _getMode(){
    const radio = document.querySelector('input[name="compressMode"]:checked');
    return radio ? radio.value : 'level';
  }

  async process(){
    const files = fileHandler.getSelectedFiles();
    if (files.length < 1) { notifications.error('En az 1 PDF yükleyin'); return; }
    if (files.length > fileHandler.MAX_FILES) { notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }

    const btn = document.getElementById('processButton');
    if (btn) btn.disabled = true;

    try{
      const mode = this._getMode();
      let level = null;
      let targetKb = null;

      if (mode === 'target'){
        const val = parseInt(document.getElementById('compressTargetKb')?.value || '0', 10);
        if (!val || val < 100){
          notifications.error('Hedef boyut en az 100 KB olmalı');
          if (btn) btn.disabled = false;
          return;
        }
        targetKb = val;
      } else {
        level = (document.getElementById('compressLevel')?.value) || 'medium';
      }

      pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });

      const up = await pdfApi.uploadFilesForCompress(files);
      const sessionId = up.session_id;

      pdfLoader.updateProgress(50,'PDF sıkıştırılıyor...');
      const result = await pdfApi.processCompress(sessionId, { level, targetKb });

      pdfLoader.updateProgress(100,'Tamamlandı!');
      setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); }, 150);
    }catch(e){
      console.error('Compress failed', e);
      notifications.error(e.message || 'Sıkıştırma sırasında hata oluştu');
      pdfLoader.hide();
      if (btn) btn.disabled = false;
    }
  }

  showResult(result){
    const resultArea = document.getElementById('resultArea');
    if(!resultArea) return;

    // Metrics banner
    const s = result.summary || { total_input_bytes:0, total_output_bytes:0, total_saved_percent:0 };
    const metricsHtml = `
      <div class="metrics-banner bg-white/60 rounded-lg p-3 mb-3 flex items-center justify-center gap-4">
        <span class="text-red-600 font-semibold">${formatBytes(s.total_input_bytes)}</span>
        <span class="text-gray-500">→</span>
        <span class="text-green-600 font-semibold">${formatBytes(s.total_output_bytes)}</span>
        <span class="text-sm text-gray-600">(${s.total_saved_percent}% daha küçük)</span>
      </div>`;

    const banner = resultArea.querySelector('.bg-green-50');
    if (banner) banner.insertAdjacentHTML('afterend', metricsHtml);

    // 2026-08-03: dürüst sonuç mesajları — %0'ı kutlama.
    const firstRes = (result.results || [])[0] || {};
    let noteHtml = '';
    if (firstRes.method === 'raster' && s.total_saved_percent >= 1) {
      noteHtml = `
        <div class="rounded-lg p-3 mb-3 text-sm" style="background:#eaf0fc;color:#1e40af">
          Bu PDF vektör/tarama ağırlıklı olduğu için standart sıkıştırma işe yaramadı;
          sayfalar <strong>yüksek çözünürlüklü görüntüye çevrilerek</strong> küçültüldü.
          Görünüm korunur, ancak çıktıda metin seçimi/araması devre dışı kalır.
        </div>`;
    } else if (s.total_saved_percent < 1) {
      noteHtml = `
        <div class="rounded-lg p-3 mb-3 text-sm" style="background:#fdf3dd;color:#92400e">
          Bu PDF zaten optimize görünüyor — daha fazla küçültme, görüntü kalitesinden ödün vermeden mümkün değil.
          Daha küçük dosya şartsa <strong>"Yüksek"</strong> seviyeyi deneyin ya da hedef boyut girin.
        </div>`;
    } else if (firstRes.used_level && firstRes.requested_level &&
               firstRes.used_level !== firstRes.requested_level && firstRes.used_level !== 'none') {
      const adlar = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };
      noteHtml = `
        <div class="rounded-lg p-3 mb-3 text-sm" style="background:#eaf0fc;color:#1e40af">
          Seçtiğiniz seviye bu dosyada işe yaramadı; en iyi sonuç için otomatik olarak
          <strong>${adlar[firstRes.used_level] || firstRes.used_level}</strong> seviye uygulandı.
        </div>`;
    }
    if (noteHtml && banner) banner.insertAdjacentHTML('afterend', noteHtml);

    // Auto download
    if (result.download_url){
      const url = window.location.origin + result.download_url;
      fileHandler.triggerFileDownload(url);
    }

    // Button
    const downloadBtn = resultArea.querySelector('button');
    if (downloadBtn && result.download_url){
      downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
      const url = window.location.origin + result.download_url;
      downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
    }

    resultArea.classList.remove('hidden');
    notifications.success('PDF sıkıştırma tamamlandı!');
  }

  getOptions(){
    return `
      <div class="tool-option-group">
        <label class="tool-option-label">Sıkıştırma Modu</label>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="compressMode" value="level" checked>
            <span>Kalite seviyesi</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="compressMode" value="target">
            <span>Hedef boyut (KB)</span>
          </label>
        </div>
      </div>

      <div id="compressLevelBox" class="tool-option-group">
        <label class="tool-option-label" for="compressLevel">Sıkıştırma Seviyesi</label>
        <select id="compressLevel" class="form-input">
          <option value="low">Düşük (hızlı)</option>
          <option value="medium" selected>Orta (önerilen)</option>
          <option value="high">Yüksek (daha küçük dosya)</option>
        </select>
      </div>

      <div id="compressTargetBox" class="tool-option-group hidden">
        <label class="tool-option-label" for="compressTargetKb">Hedef Boyut (KB)</label>
        <input id="compressTargetKb" type="number" class="form-input" value="1000" min="100" step="100">
        <p class="text-xs text-gray-500 mt-1">Sistem, hedefe en yakın boyutu otomatik bulur.</p>
      </div>
    `;
  }

  mount(){
    setTimeout(() => {
      const radios = document.querySelectorAll('input[name="compressMode"]');
      const levelBox = document.getElementById('compressLevelBox');
      const targetBox = document.getElementById('compressTargetBox');
      radios.forEach(r => r.addEventListener('change', () => {
        if (this._getMode() === 'target'){
          levelBox?.classList.add('hidden');
          targetBox?.classList.remove('hidden');
        } else {
          targetBox?.classList.add('hidden');
          levelBox?.classList.remove('hidden');
        }
      }));
    }, 100);
  }

  getFunnyQuote(){ return 'PDF sıkıştırma işlemi, dosya boyutunu küçültürken kaliteyi korur. Optimize edilmiş belgeler için PDFişlemleri.com\'u tercih edin.'; }
  getDescription(){ return 'Bir veya birden fazla PDF’i sıkıştırın; kalite seviyesi veya hedef boyut seçin. Birden fazlaysa ZIP olarak indirin.'; }
}

const compressTool = new CompressTool();
export default compressTool;
