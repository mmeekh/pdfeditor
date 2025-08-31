import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class ProtectTool {
    constructor(){
        this.toolId = 'protect';
        this.toolName = "PDF Şifrele";
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length < 1){ notifications.error('En az 1 PDF yükleyin'); return; }
        if (files.length > 10){ notifications.error('Maksimum 10 dosya'); return; }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try{
            // Şifreleme seçeneklerini al
            const protectionOptions = this.getProtectionOptions();
            if (!protectionOptions) {
                if (btn) btn.disabled = false;
                return;
            }

            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });
            const up = await pdfApi.uploadFilesForProtect(files);
            const sessionId = up.session_id;

            pdfLoader.updateProgress(50, 'PDF şifreleniyor...');
            const result = await pdfApi.processProtect(sessionId, protectionOptions);

            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); }, 150);
        }catch(e){
            console.error('PDF Şifreleme failed', e);
            notifications.error(e.message || 'PDF Şifreleme sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    getProtectionOptions() {
        const userPassword = document.getElementById('userPassword')?.value?.trim();
        const ownerPassword = document.getElementById('ownerPassword')?.value?.trim();
        
        if (!userPassword) {
            notifications.error('Lütfen kullanıcı şifresi girin');
            return null;
        }

        return {
            userPassword: userPassword,
            ownerPassword: ownerPassword || null,
            canPrint: document.getElementById('canPrint')?.checked || false,
            canModify: document.getElementById('canModify')?.checked || false,
            canCopy: document.getElementById('canCopy')?.checked || false,
            canAnnotate: document.getElementById('canAnnotate')?.checked || false,
            canFillForms: document.getElementById('canFillForms')?.checked || false,
            canAccessibility: document.getElementById('canAccessibility')?.checked || false,
            canAssemble: document.getElementById('canAssemble')?.checked || false,
            canModifyContents: document.getElementById('canModifyContents')?.checked || false
        };
    }

    showResult(result){
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;

        const url = window.location.origin + result.download_url;
        fileHandler.triggerFileDownload(url);

        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn){
            downloadBtn.innerHTML = '<i class="fa-solid fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        notifications.success(`PDF başarıyla şifrelendi! 🔒`);
    }

    getOptions(){
        return `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Kullanıcı Şifresi <span class="text-red-500">*</span>
                    </label>
                    <input type="password" id="userPassword" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="PDF açmak için gerekli şifre">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Sahip Şifresi (Opsiyonel)
                    </label>
                    <input type="password" id="ownerPassword" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="PDF düzenlemek için gerekli şifre">
                </div>

                <div class="border-t pt-4">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">İzin Ayarları</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex items-center">
                            <input type="checkbox" id="canPrint" class="mr-2">
                            <span class="text-sm text-gray-600">Yazdırma</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="canModify" class="mr-2">
                            <span class="text-sm text-gray-600">Düzenleme</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="canCopy" class="mr-2">
                            <span class="text-sm text-gray-600">Kopyalama</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="canAnnotate" class="mr-2">
                            <span class="text-sm text-gray-600">Açıklama</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="canFillForms" class="mr-2">
                            <span class="text-sm text-gray-600">Form Doldurma</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="canAccessibility" class="mr-2">
                            <span class="text-sm text-gray-600">Erişilebilirlik</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="canAssemble" class="mr-2">
                            <span class="text-sm text-gray-600">Birleştirme</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="canModifyContents" class="mr-2">
                            <span class="text-sm text-gray-600">İçerik Değiştirme</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    getFunnyQuote(){ 
        return 'PDF artık güvenli! 🔐 Şifreler sizin, gizlilik bizim!'; 
    }
    
    getDescription(){
        return "PDF dosyalarınıza güçlü şifre koruması ekleyin; birden fazlaysa ZIP olarak indirin.";
    }
}

const protectTool = new ProtectTool();
export default protectTool;
