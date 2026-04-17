/**
 * PDF Encryption Check — Client-side şifreli PDF tespit
 *
 * PDF.js kullanarak upload sırasında şifreli PDF'i algılar, kullanıcıyı
 * unlock aracına yönlendiren modal gösterir.
 */

let pdfjsLib = null;

async function loadPdfJs() {
    if (pdfjsLib) return pdfjsLib;
    if (window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
        return pdfjsLib;
    }
    // Dinamik yükle
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
    pdfjsLib = window.pdfjsLib;
    if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return pdfjsLib;
}

/**
 * Tek bir File objesini kontrol et. Şifreliyse true döner.
 */
export async function isPdfEncrypted(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return false;
    try {
        const lib = await loadPdfJs();
        if (!lib) return false;
        const arrayBuffer = await file.arrayBuffer();
        try {
            await lib.getDocument({ data: arrayBuffer, password: '' }).promise;
            return false; // Şifresiz açıldı
        } catch (e) {
            if (e.name === 'PasswordException' || /password/i.test(e.message || '')) {
                return true;
            }
            return false;
        }
    } catch (e) {
        console.warn('PDF encryption check hatası:', e);
        return false;
    }
}

/**
 * Dosya listesindeki şifrelileri döndür.
 */
export async function detectEncryptedPdfs(files) {
    const results = [];
    for (const f of files) {
        if (await isPdfEncrypted(f)) {
            results.push(f.name);
        }
    }
    return results;
}

/**
 * Şifreli PDF modal'ını göster. unlock aracına yönlendirir.
 */
export function showEncryptedPdfModal(encryptedNames) {
    // Eski modal varsa kaldır
    const existing = document.getElementById('encryptedPdfModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'encryptedPdfModal';
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8">
            <div class="flex items-start gap-4 mb-4">
                <div class="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-lock text-orange-600 text-xl"></i>
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-1">Şifreli PDF algılandı</h3>
                    <p class="text-sm text-gray-600">Aşağıdaki dosyalar parola ile korunmuş:</p>
                </div>
            </div>
            <ul class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-5 max-h-40 overflow-y-auto">
                ${encryptedNames.map(n => `<li class="text-sm text-orange-800 flex items-center gap-2 py-1"><i class="fas fa-file-pdf"></i>${n}</li>`).join('')}
            </ul>
            <p class="text-sm text-gray-700 mb-5">Bu dosyalarda işlem yapmak için önce <strong>PDF Şifre Kaldır</strong> aracını kullanarak parolayı kaldırmanız gerekir.</p>
            <div class="flex flex-col sm:flex-row gap-3">
                <a href="/pdf-sifre-kaldir" class="flex-1 inline-flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-medium transition shadow-md">
                    <i class="fas fa-unlock mr-2"></i> PDF Şifre Kaldır'a Git
                </a>
                <button onclick="document.getElementById('encryptedPdfModal').remove()" class="flex-1 inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-xl font-medium transition">
                    Kapat
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Tool sayfalarında global enforcement. fileHandler.handleFiles'tan önce çağır.
 * @returns {Promise<boolean>} false = şifreli bulundu, işlem durdurulmalı
 */
export async function enforceNoEncryptedPdfs(files) {
    const fileList = Array.from(files);
    const encrypted = await detectEncryptedPdfs(fileList);
    if (encrypted.length > 0) {
        showEncryptedPdfModal(encrypted);
        return false;
    }
    return true;
}

export default { isPdfEncrypted, detectEncryptedPdfs, showEncryptedPdfModal, enforceNoEncryptedPdfs };
