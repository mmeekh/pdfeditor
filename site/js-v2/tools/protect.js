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
        if (files.length > fileHandler.MAX_FILES){ notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }

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
        const userPasswordConfirm = document.getElementById('userPasswordConfirm')?.value?.trim();
        const ownerPassword = document.getElementById('ownerPassword')?.value?.trim();

        if (!userPassword) {
            notifications.error('Lütfen kullanıcı şifresi girin');
            return null;
        }
        if (!userPasswordConfirm){
            notifications.error('Lütfen parolayı onaylayın');
            return null;
        }
        if (userPassword !== userPasswordConfirm){
            notifications.error('Parolalar eşleşmiyor');
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
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = ()=> fileHandler.triggerFileDownload(url);
        }

        resultArea.classList.remove('hidden');
        notifications.success(`PDF başarıyla şifrelendi!`);
    }

    _calcStrength(pw){
        if (!pw) return { score: 0, label: 'Boş', cls: 'pw-strength-empty' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        let label = 'Zayıf', cls = 'pw-strength-weak';
        if (score >= 4){ label = 'Güçlü'; cls = 'pw-strength-strong'; }
        else if (score >= 2){ label = 'Orta'; cls = 'pw-strength-medium'; }
        return { score, label, cls };
    }

    _updateStrength(){
        const pw = document.getElementById('userPassword')?.value || '';
        const bar = document.getElementById('pwStrengthBar');
        const labelEl = document.getElementById('pwStrengthLabel');
        if (!bar || !labelEl) return;
        const { score, label, cls } = this._calcStrength(pw);
        bar.className = `pw-strength-bar ${cls}`;
        bar.style.width = `${Math.min(100, (score / 4) * 100)}%`;
        labelEl.textContent = label;
        labelEl.className = `pw-strength-label ${cls}`;
    }

    _updateMatch(){
        const pw = document.getElementById('userPassword')?.value || '';
        const pw2 = document.getElementById('userPasswordConfirm')?.value || '';
        const warn = document.getElementById('pwMatchWarn');
        if (!warn) return;
        if (!pw2){
            warn.textContent = '';
            warn.className = 'pw-match-warn';
            return;
        }
        if (pw === pw2){
            warn.textContent = 'Parolalar eşleşiyor';
            warn.className = 'pw-match-warn pw-match-ok';
        } else {
            warn.textContent = 'Parolalar eşleşmiyor';
            warn.className = 'pw-match-warn pw-match-err';
        }
    }

    mount(){
        setTimeout(() => {
            const pw = document.getElementById('userPassword');
            const pw2 = document.getElementById('userPasswordConfirm');
            if (pw){
                pw.addEventListener('input', () => { this._updateStrength(); this._updateMatch(); });
            }
            if (pw2){
                pw2.addEventListener('input', () => this._updateMatch());
            }
        }, 100);
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
                    <div class="pw-strength-container">
                        <div class="pw-strength-track">
                            <div id="pwStrengthBar" class="pw-strength-bar pw-strength-empty" style="width: 0%"></div>
                        </div>
                        <span id="pwStrengthLabel" class="pw-strength-label pw-strength-empty">Boş</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">En az 8 karakter, büyük harf, rakam ve özel karakter önerilir.</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Parolayı Onayla <span class="text-red-500">*</span>
                    </label>
                    <input type="password" id="userPasswordConfirm"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Parolayı tekrar girin">
                    <div id="pwMatchWarn" class="pw-match-warn"></div>
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
        return 'PDF şifreleme işlemi, belgelerinizi güvenli hale getirir. Profesyonel koruma için PDFişlemleri.com\'u tercih edin.';
    }

    getDescription(){
        return "PDF dosyalarınıza güçlü şifre koruması ekleyin; birden fazlaysa ZIP olarak indirin.";
    }
}

const protectTool = new ProtectTool();
export default protectTool;
