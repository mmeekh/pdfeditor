/**
 * PDF Preview — Ortak PDF sayfa thumbnail rendering modülü
 *
 * rotate, split, watermark, compress gibi araçlarda
 * sayfa bazlı işlem için kullanılır.
 *
 * Kullanım:
 *   import pdfPreview from './pdfPreview.js';
 *   const pages = await pdfPreview.renderFile(file, container, { scale: 0.3 });
 *   // pages = [{ index, canvas, pageNumber, fileIndex }]
 */

let pdfjsLib = null;

async function getPdfJs() {
    if (pdfjsLib) return pdfjsLib;
    try {
        pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
        if (pdfjsLib?.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
        }
    } catch (e) {
        console.error('PDF.js yüklenemedi:', e);
        throw new Error('PDF önizleme modülü yüklenemedi.');
    }
    return pdfjsLib;
}

/**
 * Tek bir File'ın tüm sayfalarını render eder.
 * @param {File} file
 * @param {Object} opts { scale = 0.3, maxPages = 500, onProgress }
 * @returns {Promise<Array>} [{ pageNumber, canvas, width, height }]
 */
export async function renderFile(file, opts = {}) {
    const { scale = 0.3, maxPages = 500, onProgress = null } = opts;
    const lib = await getPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    const pages = [];

    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push({ pageNumber: i, canvas, width: viewport.width, height: viewport.height });
        if (onProgress) onProgress(i, pageCount);
    }
    return pages;
}

/**
 * Thumbnail grid oluşturur. Her sayfa için özelleştirilebilir overlay/control destekler.
 *
 * @param {HTMLElement} container - thumbnail'lerin ekleneceği element
 * @param {Array<File>} files - PDF files
 * @param {Object} opts
 *   - scale: render scale (default 0.3)
 *   - showPageNumber: sayfa numarası göster (default true)
 *   - showRemove: silme butonu göster (default false)
 *   - selectable: tıklayınca seçim (default false)
 *   - overlayBuilder: (page, file, allPages) => HTMLElement (opsiyonel)
 *   - onPageClick: (page, file) => void
 *   - onRemove: (page) => void
 * @returns {Promise<Array>} [{ file, fileIndex, pageNumber, originalPageNumber, canvas, element, rotation }]
 */
export async function renderGrid(container, files, opts = {}) {
    const {
        scale = 0.3,
        showPageNumber = true,
        showRemove = false,
        selectable = false,
        overlayBuilder = null,
        onPageClick = null,
        onRemove = null,
    } = opts;

    container.innerHTML = '';
    container.classList.add('pdf-preview-grid');
    const allPages = [];

    for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi];
        if (!file.name.toLowerCase().endsWith('.pdf')) continue;

        const rendered = await renderFile(file, { scale });
        for (const p of rendered) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pdf-preview-page';
            wrapper.dataset.fileIndex = fi;
            wrapper.dataset.pageNumber = p.pageNumber;

            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'pdf-preview-canvas-wrap';
            canvasWrap.appendChild(p.canvas);
            wrapper.appendChild(canvasWrap);

            if (showPageNumber) {
                const label = document.createElement('div');
                label.className = 'pdf-preview-label';
                label.textContent = files.length > 1 ? `${file.name.slice(0, 15)} • s${p.pageNumber}` : `Sayfa ${p.pageNumber}`;
                wrapper.appendChild(label);
            }

            if (showRemove) {
                const btn = document.createElement('button');
                btn.className = 'pdf-preview-remove';
                btn.innerHTML = '<i class="fas fa-times"></i>';
                btn.title = 'Sayfayı sil';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    wrapper.classList.add('removed');
                    if (onRemove) onRemove({ fileIndex: fi, pageNumber: p.pageNumber, element: wrapper });
                };
                wrapper.appendChild(btn);
            }

            const pageData = {
                file,
                fileIndex: fi,
                pageNumber: p.pageNumber,
                originalPageNumber: p.pageNumber,
                canvas: p.canvas,
                element: wrapper,
                rotation: 0,
            };

            if (overlayBuilder) {
                const overlay = overlayBuilder(pageData, file, allPages);
                if (overlay) wrapper.appendChild(overlay);
            }

            if (selectable) {
                wrapper.classList.add('selectable');
                wrapper.onclick = () => {
                    wrapper.classList.toggle('selected');
                    if (onPageClick) onPageClick(pageData);
                };
            } else if (onPageClick) {
                wrapper.onclick = () => onPageClick(pageData);
            }

            allPages.push(pageData);
            container.appendChild(wrapper);
        }
    }
    return allPages;
}

/**
 * Sayfa elementine rotation uygula (CSS transform).
 */
export function rotatePage(pageData, degrees) {
    pageData.rotation = ((pageData.rotation || 0) + degrees) % 360;
    const canvasWrap = pageData.element.querySelector('.pdf-preview-canvas-wrap');
    if (canvasWrap) {
        canvasWrap.style.transform = `rotate(${pageData.rotation}deg)`;
    }
}

export default { renderFile, renderGrid, rotatePage };
