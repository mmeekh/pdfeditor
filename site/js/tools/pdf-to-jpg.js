import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class PdfToJpgTool {
    constructor(){
        this.toolId = 'pdf-to-jpg';
        this.toolName = "PDF'den JPG'ye";
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length === 0) { notifications.error('Lütfen en az bir PDF dosyası seçin'); return; }
        if (files.length > fileHandler.MAX_FILES) { notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }
        
        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;
        
        try {
            const fileCount = files.length;
            const message = fileCount > 1 ? 
                `${fileCount} PDF dosyası JPG'ye dönüştürülüyor...` : 
                `${this.toolName} işleniyor...`;
            
            pdfLoader.show({ message: message, subMessage: 'Dosyalar yükleniyor' });
            
            const up = await pdfApi.uploadFilesForPdfToJpg(files);
            const sessionId = up.session_id;
            
            pdfLoader.updateProgress(50, 'Sayfalar dönüştürülüyor...');

            // Opsiyonları oku
            const dpi = parseInt(document.getElementById('pdfJpgDpi')?.value || '150', 10);
            const result = await pdfApi.processPdfToJpg(sessionId, dpi);
            
            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); },150);
        } catch(e){
            console.error('PDF→JPG failed', e);
            notifications.error(e.message || 'Dönüştürme sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    showResult(result){
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;
        const url = pdfApi.getPdfToJpgDownloadUrl(result.session_id, result.output_file);
        fileHandler.triggerFileDownload(url);

        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn){
            const buttonText = result.is_zip ? 
                '<i class="fas fa-download mr-2"></i>ZIP İndir' : 
                '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.innerHTML = buttonText;
            downloadBtn.onclick = () => fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        
        const successMessage = result.is_zip ? 
            `${result.file_count} PDF dosyasından ${result.image_count} görüntü oluşturuldu! ZIP dosyası indiriliyor.` :
            "PDF görüntülere dönüştürüldü! İndirme başlatıldı.";
        notifications.success(successMessage);
    }

    getOptions(){
        return `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Çözünürlük (DPI)</label>
                    <select id="pdfJpgDpi" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm">
                        <option value="72">Düşük — 72 DPI (ekran, küçük dosya)</option>
                        <option value="150" selected>Orta — 150 DPI (önerilen)</option>
                        <option value="300">Yüksek — 300 DPI (baskı kalitesi)</option>
                        <option value="600">Çok yüksek — 600 DPI (profesyonel)</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Yüksek DPI = büyük dosya boyutu + daha uzun işlem</p>
                </div>
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <i class="fas fa-info-circle mr-1"></i> Birden fazla sayfa varsa ZIP arşivi olarak indirilir. Her sayfa ayrı JPG dosyasıdır.
                </div>
            </div>
        `;
    }
    getFunnyQuote(){ return 'PDF\'den JPG\'ye dönüştürme işlemi, belgelerinizi görsel formatına çevirir. Yüksek kaliteli görseller için PDFişlemleri.com\'u tercih edin.'; }
    getDescription(){ return 'PDF sayfalarını JPG resimlerine dönüştürün.'; }
}

const pdfToJpgTool = new PdfToJpgTool();
export default pdfToJpgTool;
