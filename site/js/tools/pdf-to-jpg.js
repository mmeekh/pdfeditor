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
        if (files.length === 0){ notifications.error('Lütfen PDF dosyaları yükleyin'); return; }
        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;
        try {
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: 'Dosyalar yükleniyor' });
            const up = await pdfApi.uploadFilesForPdfToJpg(files);
            const sessionId = up.session_id;
            pdfLoader.updateProgress(50, 'Sayfalar dönüştürülüyor...');
            const result = await pdfApi.processPdfToJpg(sessionId);
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
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = () => fileHandler.triggerFileDownload(url);
        }
        resultArea.classList.remove('hidden');
        notifications.success('PDF görüntülere dönüştürüldü!');
    }

    getOptions(){ return ''; }
    getFunnyQuote(){ return 'Bir resim bin kelime eder!'; }
    getDescription(){ return 'PDF sayfalarını JPG resimlerine dönüştürün.'; }
}

const pdfToJpgTool = new PdfToJpgTool();
export default pdfToJpgTool;
