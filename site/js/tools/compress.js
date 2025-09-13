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

  async process(){
    const files = fileHandler.getSelectedFiles();
    if (files.length < 1) { notifications.error('En az 1 PDF yükleyin'); return; }
    if (files.length > fileHandler.MAX_FILES) { notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }

    const btn = document.getElementById('processButton');
    if (btn) btn.disabled = true;

    try{
      pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });

      const up = await pdfApi.uploadFilesForCompress(files);
      const sessionId = up.session_id;
      const level = (document.getElementById('compressLevel')?.value)||'medium';

      pdfLoader.updateProgress(50,'PDF sıkıştırılıyor...');
      const result = await pdfApi.processCompress(sessionId, level);

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
        <label class="tool-option-label" for="compressLevel">Sıkıştırma Seviyesi</label>
        <select id="compressLevel" class="form-input">
          <option value="low">Düşük (hızlı)</option>
          <option value="medium" selected>Orta (önerilen)</option>
          <option value="high">Yüksek (daha küçük dosya)</option>
        </select>
      </div>
    `;
  }

  getFunnyQuote(){ return 'PDF sıkıştırma işlemi, dosya boyutunu küçültürken kaliteyi korur. Optimize edilmiş belgeler için PDFişlemleri.com\'u tercih edin.'; }
  getDescription(){ return 'Bir veya birden fazla PDF’i sıkıştırın. Birden fazlaysa ZIP olarak indirin.'; }
}

const compressTool = new CompressTool();
export default compressTool;


