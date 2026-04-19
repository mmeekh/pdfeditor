import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class WordToPdfTool {
    constructor(){
        this.toolId = 'word-to-pdf';
        this.toolName = "Word'den PDF'e";
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length === 0) { notifications.error('Lütfen en az bir Word dosyası (DOC/DOCX) seçin'); return; }
        if (files.length > fileHandler.MAX_FILES) { notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }
        
        // Tüm dosyaların Word formatında olduğunu kontrol et
        for (let file of files) {
            const name = file.name.toLowerCase();
            if (!(name.endsWith('.doc') || name.endsWith('.docx'))) {
                notifications.error('Geçerli Word dosyaları seçin (DOC/DOCX)');
                return;
            }
        }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            const fileCount = files.length;
            const message = fileCount > 1 ? 
                `${fileCount} Word dosyası PDF'e dönüştürülüyor...` : 
                `${this.toolName} işleniyor...`;
            
            pdfLoader.show({ message: message, subMessage: `Dosyalar yükleniyor` });
            
            const up = await pdfApi.uploadFilesForWordToPdf(files);
            const sessionId = up.session_id;

            pdfLoader.updateProgress(50, 'PDF dönüştürme başlatılıyor...');
            const result = await pdfApi.processWordToPdf(sessionId);

            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); }, 150);
        }catch(e){
            console.error('Word→PDF failed', e);
            notifications.error(e.message || 'Word→PDF sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    showResult(result){
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;
        const url = pdfApi.getWordToPdfDownloadUrl(result.session_id, result.output_file);
        fileHandler.triggerFileDownload(url);

        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn){
            const buttonText = result.is_zip ? 
                '<i class="fas fa-download mr-2"></i>ZIP İndir' : 
                '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.innerHTML = buttonText;
            downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        
        const successMessage = result.is_zip ? 
            `${result.file_count} Word dosyası PDF'e dönüştürüldü! ZIP dosyası indiriliyor.` :
            "Word PDF'e dönüştürüldü! İndirme başlatıldı.";
        notifications.success(successMessage);
    }

    getOptions(){
        // TODO: Bu seçenekler şu an sadece UI'da görünür — backend'de kullanılmıyor.
        // Gelecekte process endpoint'ine quality/page_size/pdf_a parametreleri eklenebilir.
        return `
            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">PDF Kalitesi</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="wordToPdfQuality" value="screen" class="mr-2">
                        <span>Ekran (düşük boyut, 72 DPI)</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="wordToPdfQuality" value="ebook" checked class="mr-2">
                        <span>E-book (önerilen, 150 DPI)</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="wordToPdfQuality" value="print" class="mr-2">
                        <span>Baskı (yüksek kalite, 300 DPI)</span>
                    </label>
                </div>
            </div>

            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">Sayfa Boyutu</label>
                <select name="wordToPdfPageSize" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="A4" selected>A4 (210 × 297 mm)</option>
                    <option value="Letter">Letter (216 × 279 mm)</option>
                    <option value="A5">A5 (148 × 210 mm)</option>
                </select>
            </div>

            <div class="mb-4">
                <label class="flex items-center">
                    <input type="checkbox" name="wordToPdfPdfA" class="mr-2">
                    <span class="text-gray-700">PDF/A uyumluluğu (arşivleme için)</span>
                </label>
                <p class="text-sm text-gray-500 mt-1">Uzun vadeli arşivleme için uygun PDF/A-1b formatı.</p>
            </div>
        `;
    }
    getFunnyQuote(){ return 'Word\'den PDF\'e dönüştürme işlemi, belgelerinizi evrensel formatta sunar. Güvenilir dönüştürme için PDFişlemleri.com\'u tercih edin.'; }
    getDescription(){ return "Word (DOC/DOCX) dosyasını PDF'e dönüştürün."; }
}

const wordToPdfTool = new WordToPdfTool();
export default wordToPdfTool;


