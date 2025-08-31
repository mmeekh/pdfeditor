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
        if (files.length === 0) { notifications.error('Lütfen Word dosyaları yükleyin'); return; }
        const invalid = files.some(f => {
            const n = f.name.toLowerCase();
            return !(n.endsWith('.doc') || n.endsWith('.docx'));
        });
        if (invalid) { notifications.error('Geçerli Word dosyaları seçin (DOC/DOCX)'); return; }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `Dosyalar yükleniyor` });
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
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        notifications.success("Word PDF'e dönüştürüldü! İndirme başlatıldı.");
    }

    getOptions(){ return ''; }
    getFunnyQuote(){ return 'Word uyudu, PDF uyandı!'; }
    getDescription(){ return "Word (DOC/DOCX) dosyasını PDF'e dönüştürün."; }
}

const wordToPdfTool = new WordToPdfTool();
export default wordToPdfTool;


