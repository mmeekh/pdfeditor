import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class PdfToPptTool {
    constructor(){
        this.toolId = 'pdf-to-ppt';
        this.toolName = "PDF'den PPT'ye";
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length !== 1) { notifications.error('Lütfen tek bir PDF yükleyin'); return; }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `Dosya yükleniyor` });
            const up = await pdfApi.uploadFileForPdfToPpt(files[0]);
            const sessionId = up.session_id;

            pdfLoader.updateProgress(50, 'Slaytlar hazırlanıyor...');
            const result = await pdfApi.processPdfToPpt(sessionId);

            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); }, 150);
        }catch(e){
            console.error('PDF→PPT failed', e);
            notifications.error(e.message || 'PDF→PPT sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    showResult(result){
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;
        const url = pdfApi.getPdfToPptDownloadUrl(result.session_id, result.output_file);
        fileHandler.triggerFileDownload(url);

        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn){
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        notifications.success(`PPT hazır! Toplam ${result.page_count} slayt oluşturuldu. 📽️`);
    }

    getOptions(){ return ''; }
    getFunnyQuote(){ return 'PDF sahneye çıktı, PPT alkışlandı!'; }
    getDescription(){ return "PDF sayfalarını slaytlara dönüştürün; sunumunuz saniyeler içinde hazır."; }
}

const pdfToPptTool = new PdfToPptTool();
export default pdfToPptTool;


