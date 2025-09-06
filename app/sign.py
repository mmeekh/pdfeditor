import os
import base64
import io
import re
from pathlib import Path
from typing import Optional
import logging

import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont
import tempfile

logger = logging.getLogger(__name__)


class PDFSigner:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        self.max_signatures_per_page = 3
        self.max_signature_size = 1024 * 1024  # 1MB
    
    def _validate_pdf_security(self, pdf_path: str) -> bool:
        """PDF güvenlik kontrolü"""
        try:
            doc = fitz.open(pdf_path)
            
            # PDF boyut kontrolü
            if os.path.getsize(pdf_path) > 50 * 1024 * 1024:  # 50MB
                logger.warning(f"PDF çok büyük: {pdf_path}")
                return False
            
            # Sayfa sayısı kontrolü
            if doc.page_count > 100:
                logger.warning(f"PDF çok fazla sayfa: {doc.page_count}")
                return False
            
            # JavaScript kontrolü (güvenlik riski)
            for page_num in range(doc.page_count):
                page = doc[page_num]
                if page.get_contents():
                    # İçerik kontrolü - basit JavaScript tespiti
                    content = page.get_text()
                    if any(js_keyword in content.lower() for js_keyword in ['javascript', 'script', 'eval', 'function']):
                        logger.warning(f"PDF'de potansiyel JavaScript bulundu: {pdf_path}")
                        # Devam et ama logla
            
            doc.close()
            return True
            
        except Exception as e:
            logger.error(f"PDF güvenlik kontrolü başarısız: {e}")
            return False
    
    def _sanitize_text(self, text: str) -> str:
        """Metin sanitization"""
        if not text:
            return ""
        
        # HTML/XML tag'lerini temizle
        text = re.sub(r'<[^>]*>', '', text)
        
        # Tehlikeli karakterleri temizle
        text = re.sub(r'[<>"\']', '', text)
        
        # Uzunluk sınırı
        return text[:100]

    def sign_pdf(
        self, 
        pdf_path: str, 
        name: str, 
        surname: str, 
        signature_data: str, 
        signature_type: str,
        opacity: float = 0.8,
        positions: dict = None
    ) -> str:
        """
        PDF'e imza ekle
        
        Args:
            pdf_path: PDF dosya yolu
            name: İsim
            surname: Soyisim  
            signature_data: Base64 encoded imza verisi
            signature_type: "drawn" veya "uploaded"
            opacity: İmza şeffaflığı (0.0-1.0)
        """
        # Güvenlik kontrolleri
        if not self._validate_pdf_security(pdf_path):
            raise ValueError("PDF güvenlik kontrolü başarısız")
        
        # Input sanitization
        name = self._sanitize_text(name)
        surname = self._sanitize_text(surname)
        
        # Signature data boyut kontrolü
        if len(signature_data) > self.max_signature_size:
            raise ValueError("İmza verisi çok büyük")
        
        # Opacity kontrolü
        if not (0.1 <= opacity <= 1.0):
            opacity = 0.8
        
        try:
            # PDF'i aç
            doc = fitz.open(pdf_path)
            
            # İmza verisini işle
            signature_image = self._process_signature_data(signature_data, signature_type, opacity)
            
            # İsim-soyisim metni oluştur
            name_text = f"{name} {surname}"
            
            # Her sayfaya imza ekle
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Sayfa boyutlarını al
                page_rect = page.rect
                
                # Mevcut imza sayısını kontrol et (basit kontrol)
                existing_signatures = 0
                try:
                    # Sayfadaki mevcut imzaları say (basit yöntem)
                    page_text = page.get_text()
                    if "İmza" in page_text or "Signature" in page_text:
                        existing_signatures = page_text.count("İmza") + page_text.count("Signature")
                except:
                    pass
                
                # Maksimum imza sayısı kontrolü
                if existing_signatures >= self.max_signatures_per_page:
                    logger.warning(f"Sayfa {page_num + 1} zaten maksimum imza sayısına sahip: {existing_signatures}")
                    continue
                
                # İmza pozisyonu (kullanıcı tarafından ayarlanmış veya varsayılan)
                signature_width = 150
                signature_height = 80
                
                # Pozisyon bilgisi var mı kontrol et
                page_key = str(page_num + 1)  # Sayfa numarası 1'den başlar
                if positions and page_key in positions:
                    pos = positions[page_key]
                    
                    # PDF koordinatlarını kullan (eğer varsa)
                    if 'pdfX' in pos and 'pdfY' in pos:
                        x = pos['pdfX']
                        y = pos['pdfY']
                        logger.info(f"PDF coordinates for page {page_num + 1}: x={x}, y={y}")
                    else:
                        # Relative pozisyonu gerçek pozisyona çevir
                        x = pos.get('relativeX', 0.8) * page_rect.width
                        y = pos.get('relativeY', 0.8) * page_rect.height
                        logger.info(f"Relative coordinates for page {page_num + 1}: x={x}, y={y}")
                    
                    # İmza boyutunu da ayarla (eğer belirtilmişse)
                    if 'realWidth' in pos and 'realHeight' in pos:
                        # İmza boyutunu sayfa boyutuna göre ölçekle
                        scale_factor = min(page_rect.width / pos['realWidth'], page_rect.height / pos['realHeight'])
                        signature_width = int(150 * scale_factor)
                        signature_height = int(80 * scale_factor)
                        logger.info(f"Scaled signature size: {signature_width}x{signature_height}")
                else:
                    # Varsayılan pozisyon (sağ alt köşe)
                    x = page_rect.width - signature_width - 20
                    y = page_rect.height - signature_height - 20
                    logger.info(f"Default position for page {page_num + 1}: x={x}, y={y}")
                
                # İsim-soyisim metnini ekle
                text_rect = fitz.Rect(x, y, x + signature_width, y + 20)
                page.insert_text(
                    (x, y + 15), 
                    name_text, 
                    fontsize=12, 
                    color=(0, 0, 0)
                )
                
                # İmza resmini ekle
                signature_rect = fitz.Rect(x, y + 25, x + signature_width, y + signature_height)
                
                # İmza resmini PDF'e ekle
                page.insert_image(
                    signature_rect,
                    pixmap=signature_image,
                    overlay=True
                )
            
            # Çıktı dosyasını kaydet
            output_path = os.path.join(self.temp_dir, f"signed_{Path(pdf_path).name}")
            doc.save(output_path)
            doc.close()
            
            logger.info(f"PDF successfully signed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"PDF signing failed: {e}")
            raise

    def _process_signature_data(self, signature_data: str, signature_type: str, opacity: float = 0.8) -> fitz.Pixmap:
        """
        İmza verisini işle ve PyMuPDF Pixmap'e dönüştür
        """
        try:
            logger.info(f"Processing signature data, type: {signature_type}, data length: {len(signature_data)}")
            
            # Base64 verisini decode et
            if signature_data.startswith('data:image'):
                # data:image/png;base64, formatından sadece base64 kısmını al
                signature_data = signature_data.split(',')[1]
            
            image_data = base64.b64decode(signature_data)
            logger.info(f"Decoded image data length: {len(image_data)}")
            
            if signature_type == "drawn":
                # Elle çizim imzası - PNG formatında gelir
                image = Image.open(io.BytesIO(image_data))
            else:
                # Yüklenen imza resmi
                image = Image.open(io.BytesIO(image_data))
            
            logger.info(f"Image loaded, mode: {image.mode}, size: {image.size}")
            
            # Resmi RGBA formatına çevir (şeffaflık için)
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            # Opaklık ayarla
            if opacity < 1.0:
                # Alpha kanalını ayarla
                alpha = image.split()[-1]
                alpha = alpha.point(lambda p: int(p * opacity))
                image.putalpha(alpha)
            
            # Resmi geçici dosyaya kaydet
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            image.save(temp_file.name, 'PNG')
            temp_file.close()
            
            logger.info(f"Image saved to temp file: {temp_file.name}")
            
            # PyMuPDF ile aç
            pixmap = fitz.Pixmap(temp_file.name)
            
            # Geçici dosyayı sil
            os.unlink(temp_file.name)
            
            logger.info(f"Pixmap created successfully, size: {pixmap.width}x{pixmap.height}")
            return pixmap
            
        except Exception as e:
            logger.error(f"Signature processing failed: {e}", exc_info=True)
            raise

    def create_text_signature(self, name: str, surname: str, width: int = 200, height: int = 80) -> fitz.Pixmap:
        """
        Metin tabanlı imza oluştur (fallback)
        """
        try:
            # PIL Image oluştur
            img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
            draw = ImageDraw.Draw(img)
            
            # Font ayarla (varsayılan font kullan)
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                font = ImageFont.load_default()
            
            # Metni çiz
            text = f"{name} {surname}"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            x = (width - text_width) // 2
            y = (height - text_height) // 2
            
            draw.text((x, y), text, fill=(0, 0, 0, 255), font=font)
            
            # Geçici dosyaya kaydet
            temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            img.save(temp_file.name, 'PNG')
            temp_file.close()
            
            # PyMuPDF ile aç
            pixmap = fitz.Pixmap(temp_file.name)
            
            # Geçici dosyayı sil
            os.unlink(temp_file.name)
            
            return pixmap
            
        except Exception as e:
            logger.error(f"Text signature creation failed: {e}")
            raise
