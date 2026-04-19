/**
 * PDF Page Count — Client-side sayfa sayısı okuma
 *
 * PDF'ler için PDF.js, DOCX için zipjs ile manifest okuma.
 * Cache'li — aynı File objesini tekrar saymaya gerek yok.
 */

const cache = new WeakMap();

async function loadPdfJs() {
    if (window.__pdfjsLoaded) return window.pdfjsLib || (await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs'));
    const lib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
    if (lib?.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
    }
    window.__pdfjsLoaded = true;
    return lib;
}

/**
 * Tek bir File için sayfa sayısı döndürür.
 * Döner: { pageCount: number | null, error: string | null }
 */
export async function getPageCount(file) {
    if (cache.has(file)) return cache.get(file);

    const name = (file.name || '').toLowerCase();
    let result = { pageCount: null, error: null };

    try {
        if (name.endsWith('.pdf')) {
            const lib = await loadPdfJs();
            const buf = await file.arrayBuffer();
            try {
                const doc = await lib.getDocument({ data: buf, password: '' }).promise;
                result.pageCount = doc.numPages;
                await doc.destroy();
            } catch (e) {
                if (e.name === 'PasswordException') {
                    result.error = 'encrypted';
                } else {
                    result.error = 'invalid';
                }
            }
        } else if (name.endsWith('.docx')) {
            // DOCX: xml içinde w:Pages sayısı ya da sayfa bilgisi
            // Basit yaklaşım: pdf.js yoksa metadata okumaya gerek yok, atla
            // docx'te kesin sayfa bilgisi yok (render'da oluşur), so just skip
            result.pageCount = null;
        } else {
            result.pageCount = null;
        }
    } catch (e) {
        result.error = 'read-fail';
    }

    cache.set(file, result);
    return result;
}

/**
 * Toplu sayfa sayısı — liste için
 */
export async function getPageCounts(files) {
    const results = await Promise.all(files.map(f => getPageCount(f)));
    return results;
}

export default { getPageCount, getPageCounts };
