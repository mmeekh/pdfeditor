import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class UnlockTool {
    constructor(){
        this.toolId = 'unlock';
        this.toolName = "PDF Şifre Kaldır";
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length !== 1) { 
            notifications.error('Lütfen tek bir PDF yükleyin'); 
            return; 
        }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            // Şifreyi al
            const password = document.getElementById('password')?.value?.trim();
            if (!password) {
                notifications.error('Lütfen PDF şifresini girin');
                if (btn) btn.disabled = false;
                return;
            }

            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `Dosya yükleniyor` });
            const up = await pdfApi.uploadFileForUnlock(files[0]);
            const sessionId = up.session_id;

            pdfLoader.updateProgress(50, 'PDF şifresi kaldırılıyor...');
            const result = await pdfApi.processUnlock(sessionId, password);

            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); }, 150);
        }catch(e){
            console.error('PDF Şifre Kaldırma failed', e);
            notifications.error(e.message || 'PDF Şifre Kaldırma sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    showResult(result){
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;

        const wasEncrypted = result.was_encrypted;
        const message = wasEncrypted 
            ? `PDF başarıyla şifresiz hale getirildi! Şifre koruması kaldırıldı.`
            : `PDF zaten şifresizdi. Dosya kopyalandı.`;

        resultArea.innerHTML = `
            <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fa-solid fa-check-circle text-green-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-green-700">
                            ${message}
                        </p>
                    </div>
                </div>
            </div>
            <div class="flex justify-center">
                <button onclick="downloadFile('${pdfApi.getUnlockDownloadUrl(result.session_id, result.output_file)}')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mr-3 transition">
                    <i class="fa-solid fa-download mr-2"></i>Tekrar İndir
                </button>
                <button id="resetToolButton" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg transition">
                    <i class="fa-solid fa-redo mr-2"></i>Yeniden Başla
                </button>
            </div>
            <div class="mt-4 text-center text-gray-500 italic">
                <i class="fa-solid fa-download text-blue-500"></i> Dosyanız İndirilenler klasörünüze kaydedildi. Başka bir işlem yapmak ister misiniz?
            </div>
        `;
        resultArea.classList.remove('hidden');

        // Download function ekle
        window.downloadFile = (url) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        // Otomatik indirmeyi başlat
        window.downloadFile(`${pdfApi.getUnlockDownloadUrl(result.session_id, result.output_file)}`);
    }

    getOptions(){
        return `
            <div class="space-y-6">
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                        PDF Şifresi <span class="text-red-500">*</span>
                    </label>
                    <input type="password" 
                           id="password" 
                           name="password" 
                           required
                           class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="PDF'in şifresini girin">
                    <p class="mt-1 text-sm text-gray-500">
                        Bu şifre PDF'den kaldırılacak ve yeni dosya şifresiz olacak.
                    </p>
                </div>
                
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fa-solid fa-exclamation-triangle text-yellow-400"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700">
                                <strong>Dikkat:</strong> Bu işlem PDF'den şifre korumasını tamamen kaldırır. 
                                Sadece kendi PDF'lerinizde kullanın.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFunnyQuote(){ 
        return '🔓 Hapishaneden kurtulun! PDF artık özgür!'; 
    }
    
    getDescription(){ 
        return "PDF dosyalarınızdaki şifre korumasını tamamen kaldırın. Şifreli PDF'lerinizi özgür bırakın!"; 
    }
}

const unlockTool = new UnlockTool();
export default unlockTool;
