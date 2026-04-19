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
        // TODO: Bu seçenekler şu an sadece UI'da görünür — backend'de kullanılmıyor.
        // Gelecekte process endpoint'ine layout/ocr/format parametreleri eklenebilir.
        return `
            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">Dönüştürme Modu</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="pdfToWordLayout" value="layout-preserve" checked class="mr-2">
                        <span>Düzen koru (orijinal formatla)</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="pdfToWordLayout" value="text-only" class="mr-2">
                        <span>Düz metin (sadece yazı)</span>
                    </label>
                </div>
                <p class="text-sm text-gray-500 mt-1">Düzen koru seçeneği tablolar ve sütunları korumaya çalışır.</p>
            </div>

            <div class="mb-4">
                <label class="flex items-center">
                    <input type="checkbox" name="pdfToWordOcr" class="mr-2">
                    <span class="text-gray-700">Taranmış PDF için OCR kullan</span>
                </label>
                <p class="text-sm text-gray-500 mt-1">
                    Not: Gelişmiş OCR sonuçları için <a href="/pdf-ocr" class="text-blue-600 hover:underline">PDF OCR aracını</a> kullanın.
                </p>
            </div>

            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">Çıktı Formatı</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="pdfToWordFormat" value="docx" checked class="mr-2">
                        <span>DOCX (önerilen, modern format)</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="pdfToWordFormat" value="doc" class="mr-2">
                        <span>DOC (eski Word formatı)</span>
                    </label>
                </div>
            </div>
        `;
    }

    getFunnyQuote(){ return 'PDF\'den Word\'e dönüştürme işlemi, belgelerinizi düzenlenebilir hale getirir. Profesyonel dönüştürme için PDFişlemleri.com\'u tercih edin.'; }
    getDescription(){ return "PDF'leri düzenlenebilir Word belgesine dönüştürün."; }
}

const pdfToWordTool = new PdfToWordTool();
export default pdfToWordTool;


