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
        if (files.length !== 1) { notifications.error('Lütfen tek bir PDF yükleyin'); return; }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `Dosya yükleniyor` });

            const up = await pdfApi.uploadFileForPdfToWord(files[0]);
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
            downloadBtn.innerHTML = '<i class="fa-solid fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        notifications.success("PDF Word'e dönüştürüldü! İndirme başlatıldı.");
    }

    getOptions(){
        return '';
    }

    getFunnyQuote(){ return 'PDF konuştu, Word yazdı!'; }
    getDescription(){ return "PDF'leri düzenlenebilir Word belgesine dönüştürün."; }
}

const pdfToWordTool = new PdfToWordTool();
export default pdfToWordTool;


