/**
 * PDF İmzalama Aracı
 */

import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

// PDF.js CDN import will be done dynamically
let pdfjsLib = null;

class SignTool {
  constructor() {
    this.toolId = 'sign';
    this.toolName = 'PDF İmzala';
    this.signatureCanvas = null;
    this.signatureCtx = null;
    this.isDrawing = false;
    this.signatureData = null;
    this.signatureType = 'drawn'; // 'drawn' or 'uploaded'
    this.selectedFiles = [];
    this.maxSignatures = 3;
  }

  async process() {
    const files = fileHandler.getSelectedFiles();
    if (files.length < 1) { 
      notifications.error('En az 1 PDF yükleyin'); 
      return; 
    }
    if (files.length > fileHandler.MAX_FILES) { 
      notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); 
      return; 
    }

    // İmza verilerini kontrol et
    if (!this.signatureData) {
      notifications.error('Lütfen önce imzanızı oluşturun');
      return;
    }

    const name = document.getElementById('signerName')?.value?.trim();
    const surname = document.getElementById('signerSurname')?.value?.trim();
    
    if (!name || !surname) {
      notifications.error('Lütfen isim ve soyisim girin');
      return;
    }

    // Seçili dosyaları kontrol et
    const selectedFiles = this.getSelectedFiles();
    if (selectedFiles.length === 0) {
      notifications.error('Lütfen imzalanacak PDF dosyalarını seçin');
      return;
    }

    const btn = document.getElementById('processButton');
    if (btn) btn.disabled = true;

    try {
      pdfLoader.show({ 
        message: `${this.toolName} işleniyor...`, 
        subMessage: `${selectedFiles.length} dosya imzalanıyor` 
      });

      const up = await pdfApi.uploadFilesForSign(files);
      const sessionId = up.session_id;
      const opacity = parseFloat(document.getElementById('signatureOpacity')?.value) || 0.8;

      // Pozisyon bilgilerini topla
      const signaturePositions = this.collectSignaturePositions(selectedFiles);

      pdfLoader.updateProgress(50, 'PDF\'ler imzalanıyor...');
      const result = await pdfApi.processSign(
        sessionId, 
        name, 
        surname, 
        this.signatureData, 
        this.signatureType,
        opacity,
        JSON.stringify(selectedFiles),
        JSON.stringify(signaturePositions)
      );

      pdfLoader.updateProgress(100, 'Tamamlandı!');
      setTimeout(() => { 
        pdfLoader.hide(); 
        this.showResult(result); 
      }, 150);
    } catch (e) {
      // İmzalama başarısız
      notifications.error(e.message || 'İmzalama sırasında hata oluştu');
      pdfLoader.hide();
      if (btn) btn.disabled = false;
    }
  }

  showResult(result) {
    const resultArea = document.getElementById('resultArea');
    if (!resultArea) return;

    // Metrics banner
    const s = result.summary || { total_files: 0, successfully_signed: 0, failed: 0 };
    const metricsHtml = `
      <div class="metrics-banner bg-white/60 rounded-lg p-3 mb-3 flex items-center justify-center gap-4">
        <span class="text-blue-600 font-semibold">${s.total_files} dosya</span>
        <span class="text-gray-500">→</span>
        <span class="text-green-600 font-semibold">${s.successfully_signed} imzalandı</span>
        ${s.failed > 0 ? `<span class="text-red-600">(${s.failed} başarısız)</span>` : ''}
      </div>`;

    const banner = resultArea.querySelector('.bg-green-50');
    if (banner) banner.insertAdjacentHTML('afterend', metricsHtml);

    // Auto download
    if (result.download_url) {
      const url = window.location.origin + result.download_url;
      fileHandler.triggerFileDownload(url);
    }

    // Button
    const downloadBtn = resultArea.querySelector('button');
    if (downloadBtn && result.download_url) {
      downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
      const url = window.location.origin + result.download_url;
      downloadBtn.onclick = () => fileHandler.triggerFileDownload(url);
    }

    resultArea.classList.remove('hidden');
    notifications.success('PDF imzalama tamamlandı!');
  }

  getOptions() {
    return `
      <div class="signature-options space-y-4">
        <!-- İsim Soyisim -->
        <div class="tool-option-group">
          <label class="tool-option-label">İsim Soyisim</label>
          <div class="flex gap-2">
            <input type="text" id="signerName" placeholder="İsim" class="form-input flex-1" required>
            <input type="text" id="signerSurname" placeholder="Soyisim" class="form-input flex-1" required>
          </div>
        </div>

        <!-- İmza Türü -->
        <div class="tool-option-group">
          <label class="tool-option-label">İmza Türü</label>
          <div class="flex gap-4">
            <label class="flex items-center">
              <input type="radio" name="signatureType" value="drawn" checked class="mr-2">
              Elle Çiz
            </label>
            <label class="flex items-center">
              <input type="radio" name="signatureType" value="uploaded" class="mr-2">
              Yükle
            </label>
          </div>
        </div>

        <!-- İmza Alanı -->
        <div class="tool-option-group">
          <label class="tool-option-label">İmza Oluştur</label>
          <div class="signature-container">
            <canvas id="signatureCanvas" width="400" height="150" class="border-2 border-gray-200 rounded-lg bg-white cursor-crosshair hover:border-indigo-400 transition"></canvas>
            <div class="signature-controls mt-3 flex gap-2">
              <button type="button" id="clearSignature" class="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition">
                <i class="fas fa-eraser mr-2"></i>Temizle
              </button>
              <input type="file" id="signatureUpload" accept="image/*" class="hidden">
              <button type="button" id="uploadSignature" class="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition">
                <i class="fas fa-upload mr-2"></i>Resim Yükle
              </button>
            </div>
          </div>
        </div>


        <!-- Opaklık Ayarı -->
        <div class="tool-option-group">
          <label class="tool-option-label" for="signatureOpacity">İmza Şeffaflığı</label>
          <div class="flex items-center gap-2">
            <input type="range" id="signatureOpacity" min="0.1" max="1" step="0.1" value="0.8" class="flex-1">
            <span id="opacityValue" class="text-sm text-gray-600 w-12">80%</span>
          </div>
        </div>

        <!-- Dosya Seçimi -->
        <div class="tool-option-group">
          <div class="flex items-center justify-between mb-2">
            <label class="tool-option-label mb-0"><i class="fas fa-file-pdf text-indigo-600 mr-1"></i>İmzalanacak Dosyalar</label>
            <div class="flex gap-1">
              <button type="button" id="selectAllFiles" class="text-xs px-3 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition">
                Tümü
              </button>
              <button type="button" id="deselectAllFiles" class="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition">
                Temizle
              </button>
            </div>
          </div>
          <div id="fileSelectionList" class="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-1">
            <!-- Dosyalar buraya eklenecek -->
          </div>
        </div>

        <!-- PDF Önizleme -->
        <div class="tool-option-group">
          <div class="flex items-center justify-between mb-2">
            <label class="tool-option-label mb-0"><i class="fas fa-eye text-indigo-600 mr-1"></i>Sayfa Önizleme ve İmza Pozisyonu</label>
            <div class="flex gap-1">
              <button type="button" id="selectAllPages" class="text-xs px-3 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition">
                Tüm Sayfalar
              </button>
              <button type="button" id="deselectAllPages" class="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition">
                Hiçbiri
              </button>
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-xs text-gray-600 mb-3 flex items-start gap-2">
              <i class="fas fa-info-circle text-indigo-500 mt-0.5"></i>
              <span>Sağ üstteki <strong>kutucuğu işaretleyerek</strong> o sayfaya imza atın. İmzayı istediğiniz yere sürükleyin; varsayılan sağ alt köşe.</span>
            </p>
            <div id="pdfPreviewContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
              <!-- PDF sayfa önizlemeleri buraya eklenecek -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  mount() {
    this.initializeSignatureCanvas();
    this.initializeEventListeners();
    this.updateFileSelectionList();
    this.renderPdfPreviews();
    
    // Dosya güncellemelerini dinle (organize tool'undaki gibi)
    document.addEventListener('filesUpdated', (e) => {
      this.updateFileSelectionList();
      this.renderPdfPreviews();
    });
  }

  initializeSignatureCanvas() {
    this.signatureCanvas = document.getElementById('signatureCanvas');
    if (!this.signatureCanvas) return;

    this._fitCanvasToContainer();

    this._canvasResizeHandler = () => this._fitCanvasToContainer();
    window.addEventListener('resize', this._canvasResizeHandler);

    // İlk şeffaflığı ayarla
    this.updateSignatureOpacity();
  }

  _fitCanvasToContainer() {
    if (!this.signatureCanvas) return;
    const w = this.signatureCanvas.offsetWidth || 400;
    this.signatureCanvas.width = w;
    this.signatureCtx = this.signatureCanvas.getContext('2d');
    this.signatureCtx.strokeStyle = '#000000';
    this.signatureCtx.lineWidth = 2;
    this.signatureCtx.lineCap = 'round';
    this.signatureCtx.lineJoin = 'round';
    this.signatureCtx.fillStyle = '#ffffff';
    this.signatureCtx.fillRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
    this.signatureData = null;
  }

  initializeEventListeners() {
    // İmza türü değişikliği
    const signatureTypeRadios = document.querySelectorAll('input[name="signatureType"]');
    signatureTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.signatureType = e.target.value;
        this.updateSignatureInterface();
      });
    });

    // Canvas çizim olayları
    if (this.signatureCanvas) {
      this.signatureCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
      this.signatureCanvas.addEventListener('mousemove', (e) => this.draw(e));
      this.signatureCanvas.addEventListener('mouseup', () => this.stopDrawing());
      this.signatureCanvas.addEventListener('mouseout', () => this.stopDrawing());

      // Touch events for mobile
      this.signatureCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        this.signatureCanvas.dispatchEvent(mouseEvent);
      }, { passive: false });

      this.signatureCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        this.signatureCanvas.dispatchEvent(mouseEvent);
      }, { passive: false });

      this.signatureCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.signatureCanvas.dispatchEvent(mouseEvent);
      }, { passive: false });
    }

    // Temizle butonu
    const clearBtn = document.getElementById('clearSignature');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSignature());
    }

    // Resim yükleme
    const uploadBtn = document.getElementById('uploadSignature');
    const uploadInput = document.getElementById('signatureUpload');
    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener('click', () => uploadInput.click());
      uploadInput.addEventListener('change', (e) => this.handleSignatureUpload(e));
    }

    // Opaklık slider
    const opacitySlider = document.getElementById('signatureOpacity');
    const opacityValue = document.getElementById('opacityValue');
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener('input', (e) => {
        const value = Math.round(e.target.value * 100);
        opacityValue.textContent = `${value}%`;
        this.updateSignatureOpacity(); // Şeffaflığı güncelle
      });
    }

    // İsim-soyisim input event listeners
    const nameInput = document.getElementById('signerName');
    const surnameInput = document.getElementById('signerSurname');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.updateSignatureOpacity(); // Şeffaflığı güncelle
      });
    }
    if (surnameInput) {
      surnameInput.addEventListener('input', () => {
        this.updateSignatureOpacity(); // Şeffaflığı güncelle
      });
    }

    // Dosya seçimi
    const selectAllBtn = document.getElementById('selectAllFiles');
    const deselectAllBtn = document.getElementById('deselectAllFiles');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAllFiles());
    }
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => this.deselectAllFiles());
    }

    // Sayfa bazlı checkbox: "Tüm Sayfalar" / "Hiçbiri"
    const selectAllPagesBtn = document.getElementById('selectAllPages');
    const deselectAllPagesBtn = document.getElementById('deselectAllPages');
    if (selectAllPagesBtn) {
      selectAllPagesBtn.addEventListener('click', () => {
        document.querySelectorAll('.page-sign-checkbox').forEach(cb => {
          cb.checked = true;
          this.updatePageVisual(cb);
        });
      });
    }
    if (deselectAllPagesBtn) {
      deselectAllPagesBtn.addEventListener('click', () => {
        document.querySelectorAll('.page-sign-checkbox').forEach(cb => {
          cb.checked = false;
          this.updatePageVisual(cb);
        });
      });
    }

    // Page checkbox change: görsel feedback (tıklama pdf-preview'u bozmasın)
    document.addEventListener('change', (e) => {
      if (e.target.classList?.contains('page-sign-checkbox')) {
        this.updatePageVisual(e.target);
      }
    });
  }

  /**
   * Sayfa checkbox durumuna göre görsel güncellemesi
   */
  updatePageVisual(checkbox) {
    const wrapper = checkbox.closest('.pdf-page-preview');
    if (!wrapper) return;
    if (checkbox.checked) {
      wrapper.classList.remove('page-unchecked');
      wrapper.classList.add('page-checked');
    } else {
      wrapper.classList.remove('page-checked');
      wrapper.classList.add('page-unchecked');
    }
  }

  updateSignatureInterface() {
    const canvas = this.signatureCanvas;
    const uploadBtn = document.getElementById('uploadSignature');
    
    if (this.signatureType === 'drawn') {
      canvas.style.display = 'block';
      if (uploadBtn) uploadBtn.style.display = 'inline-block';
    } else {
      canvas.style.display = 'none';
      if (uploadBtn) uploadBtn.style.display = 'inline-block';
    }
  }

  startDrawing(e) {
    if (this.signatureType !== 'drawn') return;

    this.isDrawing = true;
    const rect = this.signatureCanvas.getBoundingClientRect();
    const scaleX = this.signatureCanvas.width / rect.width;
    const scaleY = this.signatureCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Opacity'yi ayarla
    const opacitySlider = document.getElementById('signatureOpacity');
    if (opacitySlider) {
      this.signatureCtx.globalAlpha = parseFloat(opacitySlider.value);
    }
    
    this.signatureCtx.beginPath();
    this.signatureCtx.moveTo(x, y);
  }

  draw(e) {
    if (!this.isDrawing || this.signatureType !== 'drawn') return;

    const rect = this.signatureCanvas.getBoundingClientRect();
    const scaleX = this.signatureCanvas.width / rect.width;
    const scaleY = this.signatureCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Opacity'yi uygula
    const opacitySlider = document.getElementById('signatureOpacity');
    if (opacitySlider) {
      this.signatureCtx.globalAlpha = parseFloat(opacitySlider.value);
    }
    
    this.signatureCtx.lineTo(x, y);
    this.signatureCtx.stroke();
    
    // Global alpha'yı sıfırla
    this.signatureCtx.globalAlpha = 1.0;
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    this.signatureCtx.beginPath();
    
    // İmza verisini kaydet
    this.signatureData = this.signatureCanvas.toDataURL('image/png');
    
    // Şeffaflığı güncelle
    this.updateSignatureOpacity();
  }

  clearSignature() {
    if (!this.signatureCtx) return;
    
    this.signatureCtx.fillStyle = '#ffffff';
    this.signatureCtx.fillRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
    this.signatureData = null;
    
    // Şeffaflığı güncelle
    this.updateSignatureOpacity();
  }

  handleSignatureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.signatureData = event.target.result;
      this.signatureType = 'uploaded';
      
      // Radio button'u güncelle
      const uploadedRadio = document.querySelector('input[name="signatureType"][value="uploaded"]');
      if (uploadedRadio) uploadedRadio.checked = true;
      
      this.updateSignatureInterface();
      this.updateSignatureOpacity(); // Şeffaflığı güncelle
      notifications.success('İmza resmi yüklendi');
    };
    reader.readAsDataURL(file);
  }

  updateFileSelectionList() {
    const files = fileHandler.getSelectedFiles();
    const fileList = document.getElementById('fileSelectionList');
    if (!fileList) return;

    fileList.innerHTML = '';
    
    if (files.length === 0) {
      fileList.innerHTML = '<p class="text-gray-500 text-center py-4">Henüz dosya yüklenmedi</p>';
      return;
    }
    
    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'flex items-center gap-2 p-2 hover:bg-gray-50 rounded border border-gray-200';
      fileItem.innerHTML = `
        <input type="checkbox" id="file_${index}" value="${index}" class="file-checkbox" checked>
        <label for="file_${index}" class="flex-1 cursor-pointer flex items-center gap-2">
          <i class="fas fa-file-pdf text-red-500"></i>
          <span class="text-sm">${file.name}</span>
          <span class="text-xs text-gray-500">(${this.formatFileSize(file.size)})</span>
        </label>
      `;
      
      // Checkbox değişikliği
      const checkbox = fileItem.querySelector('.file-checkbox');
      checkbox.addEventListener('change', () => this.updateSelectedFiles());
      
      fileList.appendChild(fileItem);
    });
    
    this.updateSelectedFiles();
  }

  updateSelectedFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    this.selectedFiles = Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  selectAllFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    this.updateSelectedFiles();
  }

  deselectAllFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    this.updateSelectedFiles();
  }

  getSelectedFiles() {
    return this.selectedFiles;
  }

  getFunnyQuote() {
    return 'PDF imzalama işlemi, belgelerinizi güvenli ve profesyonel hale getirir. Dijital imza için PDFişlemleri.com\'u tercih edin.';
  }

  getDescription() {
    return 'PDF dosyalarınızı dijital olarak imzalayın. Elle çizim veya yüklenen imza ile profesyonel sonuçlar.';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async ensurePdfJs() {
    if (!pdfjsLib) {
      try {
        pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
        // PDF.js requires a separate worker file; specify its location when loaded dynamically
        if (pdfjsLib?.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
        }
      } catch (err) {
        notifications.error('PDF önizleme için gerekli kütüphane yüklenemedi');
        throw err;
      }
    }
  }

  async renderPdfPreviews() {
    const container = document.getElementById('pdfPreviewContainer');
    if (!container) return;
    
    container.innerHTML = '';
    const files = fileHandler.getSelectedFiles();
    if (!files || files.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8 col-span-full">Henüz PDF dosyası yüklenmedi</p>';
      return;
    }

    await this.ensurePdfJs();

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Her sayfa için önizleme oluştur
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.5 }); // 0.3'ten 0.5'e çıkarıldı
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

          // PDF sayfa boyutlarını al (gerçek boyutlar)
          const pageRect = page.getViewport({ scale: 1.0 });
          const realWidth = pageRect.width;
          const realHeight = pageRect.height;

          const wrapper = document.createElement('div');
          wrapper.className = 'pdf-page-preview relative border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all';
          wrapper.dataset.fileIndex = String(fileIndex);
          wrapper.dataset.pageNumber = String(pageNum);
          wrapper.dataset.realWidth = String(realWidth);
          wrapper.dataset.realHeight = String(realHeight);
          wrapper.dataset.scale = String(0.5);

          // Sayfa bilgisi (sol üst)
          const pageInfo = document.createElement('div');
          pageInfo.className = 'absolute top-2 left-2 bg-gray-900/75 text-white text-xs px-2 py-1 rounded z-10';
          pageInfo.textContent = files.length > 1 ? `${file.name.slice(0,15)} · s${pageNum}` : `Sayfa ${pageNum}`;
          wrapper.appendChild(pageInfo);

          // Sayfa seçim checkbox'ı (sağ üst)
          const checkboxWrap = document.createElement('label');
          checkboxWrap.className = 'page-select-checkbox absolute top-2 right-2 z-20 bg-white rounded-md shadow-md px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-indigo-50 transition';
          checkboxWrap.title = 'Bu sayfaya imza atılsın';
          checkboxWrap.innerHTML = `
            <input type="checkbox" class="page-sign-checkbox w-4 h-4 accent-indigo-600 cursor-pointer" checked data-file-index="${fileIndex}" data-page-number="${pageNum}">
            <span class="text-xs font-medium text-gray-700">İmzala</span>
          `;
          wrapper.appendChild(checkboxWrap);

          // Canvas'ı ekle
          wrapper.appendChild(canvas);

          // İmza pozisyonu göstergesi (sürüklenebilir)
          const signatureIndicator = document.createElement('div');
          signatureIndicator.className = 'signature-position absolute bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-75 cursor-move select-none';
          signatureIndicator.innerHTML = '<i class="fas fa-signature mr-1"></i>İmza Pozisyonu';
          signatureIndicator.draggable = true;
          signatureIndicator.dataset.fileIndex = String(fileIndex);
          signatureIndicator.dataset.pageNumber = String(pageNum);
          
          // Varsayılan pozisyon (sağ alt köşe)
          signatureIndicator.style.bottom = '8px';
          signatureIndicator.style.right = '8px';
          
          wrapper.appendChild(signatureIndicator);

          // İmza pozisyonu sürükle-bırak event listener'ları
          this.setupSignaturePositionDragging(signatureIndicator, wrapper);
          
          // PDF wrapper'a click event listener ekle
          this.setupPdfClickToPosition(wrapper, signatureIndicator);

          container.appendChild(wrapper);
        }
      } catch (err) {
        // PDF önizleme oluşturma hatası
        const errorDiv = document.createElement('div');
        errorDiv.className = 'col-span-full text-center py-4 text-red-500';
        errorDiv.textContent = `${file.name} önizlenemedi`;
        container.appendChild(errorDiv);
      }
    }
  }

  setupSignaturePositionDragging(indicator, wrapper) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    // Mouse events
    indicator.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      
      const rect = wrapper.getBoundingClientRect();
      const indicatorRect = indicator.getBoundingClientRect();
      
      startX = e.clientX;
      startY = e.clientY;
      startLeft = indicatorRect.left - rect.left;
      startTop = indicatorRect.top - rect.top;
      
      // Pozisyonu mutlak olarak ayarla
      indicator.style.position = 'absolute';
      indicator.style.left = startLeft + 'px';
      indicator.style.top = startTop + 'px';
      indicator.style.bottom = 'auto';
      indicator.style.right = 'auto';
      indicator.style.opacity = '0.9';
      indicator.style.zIndex = '1000';
      indicator.style.pointerEvents = 'none'; // Sürükleme sırasında pointer events'i kapat
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    // Touch events for mobile
    indicator.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDragging = true;
      
      const touch = e.touches[0];
      const rect = wrapper.getBoundingClientRect();
      const indicatorRect = indicator.getBoundingClientRect();
      
      startX = touch.clientX;
      startY = touch.clientY;
      startLeft = indicatorRect.left - rect.left;
      startTop = indicatorRect.top - rect.top;
      
      indicator.style.position = 'absolute';
      indicator.style.left = startLeft + 'px';
      indicator.style.top = startTop + 'px';
      indicator.style.bottom = 'auto';
      indicator.style.right = 'auto';
      indicator.style.opacity = '0.9';
      indicator.style.zIndex = '1000';
      
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    });

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      
      const rect = wrapper.getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newX = startLeft + deltaX;
      const newY = startTop + deltaY;
      
      // Sınırlar içinde tut
      const maxX = rect.width - indicator.offsetWidth;
      const maxY = rect.height - indicator.offsetHeight;
      
      indicator.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
      indicator.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    };

    const handleMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      indicator.style.opacity = '0.75';
      indicator.style.zIndex = 'auto';
      indicator.style.pointerEvents = 'auto'; // Pointer events'i geri aç
      
      // Pozisyonu kaydet
      this.saveSignaturePosition(indicator);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = wrapper.getBoundingClientRect();
      const newX = touch.clientX - rect.left - startX + startLeft;
      const newY = touch.clientY - rect.top - startY + startTop;
      
      // Sınırlar içinde tut
      const maxX = rect.width - indicator.offsetWidth;
      const maxY = rect.height - indicator.offsetHeight;
      
      indicator.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
      indicator.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    };

    const handleTouchEnd = (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      indicator.style.opacity = '0.75';
      indicator.style.zIndex = 'auto';
      
      // Pozisyonu kaydet
      this.saveSignaturePosition(indicator);
      
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }

  saveSignaturePosition(indicator) {
    const fileIndex = parseInt(indicator.dataset.fileIndex);
    const pageNum = parseInt(indicator.dataset.pageNumber);
    const rect = indicator.getBoundingClientRect();
    const wrapper = indicator.parentElement;
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Canvas koordinatlarını al
    const canvasX = rect.left - wrapperRect.left;
    const canvasY = rect.top - wrapperRect.top;
    
    // PDF.js viewport koordinatlarını gerçek PDF koordinatlarına çevir
    const scale = parseFloat(wrapper.dataset.scale);
    const realWidth = parseFloat(wrapper.dataset.realWidth);
    const realHeight = parseFloat(wrapper.dataset.realHeight);
    
    // Canvas boyutları
    const canvasWidth = wrapperRect.width;
    const canvasHeight = wrapperRect.height;
    
    // Gerçek PDF koordinatlarına dönüştür
    const pdfX = (canvasX / canvasWidth) * realWidth;
    const pdfY = (canvasY / canvasHeight) * realHeight;
    
    // Pozisyonu kaydet
    const positionKey = `signature_pos_${fileIndex}_${pageNum}`;
    localStorage.setItem(positionKey, JSON.stringify({ 
      x: canvasX, 
      y: canvasY,
      pdfX: pdfX,
      pdfY: pdfY,
      realWidth: realWidth,
      realHeight: realHeight
    }));
    
    // İmza pozisyonu kaydedildi
    
    notifications.success(`İmza pozisyonu ayarlandı: ${fileIndex + 1}. dosya, ${pageNum}. sayfa`);
  }

  updateSignatureOpacity() {
    const mainCanvas = document.getElementById('signatureCanvas');
    const opacitySlider = document.getElementById('signatureOpacity');
    
    if (!mainCanvas || !opacitySlider) return;
    
    const ctx = mainCanvas.getContext('2d');
    const opacity = parseFloat(opacitySlider.value);
    
    // Eğer imza verisi varsa, opacity ile yeniden çiz
    if (this.signatureData) {
      // Canvas'ı temizle
      ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      
      // Beyaz arka plan
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
      
      // İmza verisini opacity ile çiz
      const img = new Image();
      img.onload = () => {
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);
        ctx.globalAlpha = 1.0;
      };
      img.src = this.signatureData;
    } else {
      // İmza verisi yoksa sadece çizim stilini güncelle
      if (this.signatureCtx) {
        this.signatureCtx.globalAlpha = opacity;
      }
    }
  }

  setupPdfClickToPosition(wrapper, signatureIndicator) {
    // PDF wrapper'a click event listener ekle
    wrapper.addEventListener('click', (e) => {
      // Eğer imza pozisyonu göstergesine tıklandıysa, sürükleme işlemini başlat
      if (e.target === signatureIndicator || signatureIndicator.contains(e.target)) {
        return; // Sürükleme işlemi devam etsin
      }
      
      // PDF canvas'ına tıklandıysa, imza pozisyonunu oraya taşı
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // İmza pozisyonu göstergesini tıklanan yere taşı
      signatureIndicator.style.left = `${x - 10}px`; // İmza göstergesinin merkezi tıklanan noktada olsun
      signatureIndicator.style.top = `${y - 10}px`;
      signatureIndicator.style.right = 'auto';
      signatureIndicator.style.bottom = 'auto';
      
      // Pozisyonu kaydet
      this.saveSignaturePosition(signatureIndicator);
      
      // Görsel geri bildirim
      signatureIndicator.style.transform = 'scale(1.2)';
      signatureIndicator.style.backgroundColor = '#1d4ed8';
      setTimeout(() => {
        signatureIndicator.style.transform = 'scale(1)';
        signatureIndicator.style.backgroundColor = '#3b82f6';
      }, 200);
    });
  }

  collectSignaturePositions(selectedFiles) {
    const positions = {};

    // Sadece işaretli (checked) sayfalar için imza pozisyonu topla
    const checkedPages = new Set();
    document.querySelectorAll('.page-sign-checkbox:checked').forEach(cb => {
      const fi = Number(cb.dataset.fileIndex);
      const pn = Number(cb.dataset.pageNumber);
      checkedPages.add(`${fi}_${pn}`);
    });

    selectedFiles.forEach(fileIndex => {
      positions[fileIndex] = {};
      const file = fileHandler.getSelectedFiles()[fileIndex];
      if (!file) return;

      // DOM'dan bu dosyanın sayfa sayısını bul
      const wrappers = document.querySelectorAll(`.pdf-page-preview[data-file-index="${fileIndex}"]`);
      wrappers.forEach(w => {
        const pageNum = Number(w.dataset.pageNumber);
        const key = `${fileIndex}_${pageNum}`;
        // Bu sayfa checked değilse skip
        if (!checkedPages.has(key)) return;

        // Kaydedilmiş pozisyon varsa kullan, yoksa varsayılan (sağ alt)
        const positionKey = `signature_pos_${fileIndex}_${pageNum}`;
        const savedPosition = localStorage.getItem(positionKey);
        if (savedPosition) {
          try {
            const pos = JSON.parse(savedPosition);
            positions[fileIndex][pageNum] = {
              x: pos.x,
              y: pos.y,
              pdfX: pos.pdfX || pos.x,
              pdfY: pos.pdfY || pos.y,
              relativeX: pos.pdfX ? pos.pdfX / pos.realWidth : pos.x / 400,
              relativeY: pos.pdfY ? pos.pdfY / pos.realHeight : pos.y / 300,
              realWidth: pos.realWidth || 400,
              realHeight: pos.realHeight || 300
            };
          } catch (e) {}
        } else {
          // Varsayılan: sağ alt köşe (backend'in default'u)
          const realWidth = Number(w.dataset.realWidth) || 595;
          const realHeight = Number(w.dataset.realHeight) || 842;
          positions[fileIndex][pageNum] = {
            x: 0, y: 0,
            pdfX: realWidth - 170, pdfY: realHeight - 100,
            relativeX: (realWidth - 170) / realWidth,
            relativeY: (realHeight - 100) / realHeight,
            realWidth, realHeight
          };
        }
      });
    });

    return positions;
  }

  handleSignatureDrop(event, fileIndex, pageNum) {
    // İmza sürüklenip bırakıldığında bu fonksiyon çağrılır
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // İmza pozisyonu ayarlandı
    
    // Burada imza pozisyonunu kaydedebiliriz
    // Şimdilik sadece log yazdırıyoruz
    notifications.info(`İmza pozisyonu ayarlandı: ${fileIndex + 1}. dosya, ${pageNum}. sayfa`);
  }
}

const signTool = new SignTool();
export default signTool;
