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
        if (files.length === 0) { notifications.error('Lütfen en az bir PDF dosyası seçin'); return; }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            const fileCount = files.length;
            const message = fileCount > 1 ? 
                `${fileCount} PDF dosyası PPT'ye dönüştürülüyor...` : 
                `${this.toolName} işleniyor...`;
            
            pdfLoader.show({ message: message, subMessage: `Dosyalar yükleniyor` });
            
            const up = await pdfApi.uploadFilesForPdfToPpt(files);
            const sessionId = up.session_id;

            // Kullanıcının seçimini al
            const selectedMode = document.querySelector('input[name="pptMode"]:checked').value;
            
            pdfLoader.updateProgress(50, 'Slaytlar hazırlanıyor...');
            const result = await pdfApi.processPdfToPpt(sessionId, selectedMode);

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
            const buttonText = result.is_zip ? 
                '<i class="fas fa-download mr-2"></i>ZIP İndir' : 
                '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.innerHTML = buttonText;
            downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        
        let successMessage;
        if (result.mode === "combined") {
            successMessage = `${result.file_count} PDF dosyası tek PowerPoint'te birleştirildi! Toplam ${result.page_count} slayt oluşturuldu. 📽️`;
        } else if (result.is_zip) {
            successMessage = `${result.file_count} PDF dosyasından ${result.total_pages} slayt oluşturuldu! ZIP dosyası indiriliyor. 📽️`;
        } else {
            successMessage = `PPT hazır! Toplam ${result.page_count} slayt oluşturuldu. 📽️`;
        }
        notifications.success(successMessage);
    }

    getOptions(){ 
        return `
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Dönüştürme Seçeneği
            </label>
            <div class="space-y-2">
                <label class="flex items-center">
                    <input type="radio" name="pptMode" value="separate" checked class="mr-2">
                    <span class="text-sm">Her PDF'den ayrı PowerPoint oluştur</span>
                </label>
                <label class="flex items-center">
                    <input type="radio" name="pptMode" value="combined" class="mr-2">
                    <span class="text-sm">Tüm PDF'leri tek PowerPoint'te birleştir</span>
                </label>
            </div>
        </div>
        `; 
    }
    getFunnyQuote(){ return 'PDF sahneye çıktı, PPT alkışlandı!'; }
    getDescription(){ return "PDF sayfalarını slaytlara dönüştürün; sunumunuz saniyeler içinde hazır."; }
}

const pdfToPptTool = new PdfToPptTool();
export default pdfToPptTool;


