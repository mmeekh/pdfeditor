import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class PdfToWordTool {
    constructor(){
        this.toolId = 'pdf-to-word';
        this.toolName = "PDF'den Word'e";
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length === 0) { notifications.error('Lütfen en az bir PDF dosyası seçin'); return; }
        if (files.length > fileHandler.MAX_FILES) { notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            const fileCount = files.length;
            const message = fileCount > 1 ? 
                `${fileCount} PDF dosyası Word'e dönüştürülüyor...` : 
                `${this.toolName} işleniyor...`;
            
            pdfLoader.show({ message: message, subMessage: `Dosyalar yükleniyor` });

            const up = await pdfApi.uploadFilesForPdfToWord(files);
            const sessionId = up.session_id;

            pdfLoader.updateProgress(50, 'Word dönüştürme başlatılıyor...');
            const result = await pdfApi.processPdfToWord(sessionId);

            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); }, 150);
        }catch(e){
            console.error('PDF→Word failed', e);
            notifications.error(e.message || 'PDF→Word sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    showResult(result){
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;
        const url = pdfApi.getPdfToWordDownloadUrl(result.session_id, result.output_file);
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
            `${result.file_count} PDF dosyası Word'e dönüştürüldü! ZIP dosyası indiriliyor.` :
            "PDF Word'e dönüştürüldü! İndirme başlatıldı.";
        notifications.success(successMessage);
    }

    getOptions(){
        return '';
    }

    getFunnyQuote(){ return 'PDF\'den Word\'e dönüştürme işlemi, belgelerinizi düzenlenebilir hale getirir. Profesyonel dönüştürme için PDFişlemleri.com\'u tercih edin.'; }
    getDescription(){ return "PDF'leri düzenlenebilir Word belgesine dönüştürün."; }
}

const pdfToWordTool = new PdfToWordTool();
export default pdfToWordTool;


