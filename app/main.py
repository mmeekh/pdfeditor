from fastapi import FastAPI
import logging

from core.middleware import setup_cors
from core.lifespan import lifespan
from routers.merge import router as merge_router
from routers.split import router as split_router
from routers.compress import router as compress_router
from routers.session import router as session_router
from routers.pdf_to_word import router as pdf_to_word_router
from routers.word_to_pdf import router as word_to_pdf_router
from routers.pdf_to_ppt import router as pdf_to_ppt_router
from routers.protect import router as protect_router
from routers.unlock import router as unlock_router
from routers.rotate import router as rotate_router
from routers.watermark import router as watermark_router
from routers.pdf_to_jpg import router as pdf_to_jpg_router


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="PDFişlemleri.com API",
    description="PDF işlemleri için REST API",
    version="1.0.0",
    lifespan=lifespan,
)


# Middleware
setup_cors(app)


# Health and root endpoints
@app.get("/")
def root():
    return {"status": "API OK", "message": "PDFişlemleri.com API çalışıyor!"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "pdfislemleri-api"}


@app.get("/api/tools")
def get_tools():
    tools = [
        {"id": "merge", "name": "PDF Birleştir", "description": "Birden fazla PDF'i tek dosyada birleştir"},
        {"id": "split", "name": "PDF Ayır", "description": "PDF sayfalarını ayır veya çıkar"},
        {"id": "compress", "name": "PDF Sıkıştır", "description": "PDF boyutunu küçült"},
        {"id": "pdf-to-word", "name": "PDF'den Word'e", "description": "PDF'i düzenlenebilir Word'e dönüştür"},
        {"id": "word-to-pdf", "name": "Word'den PDF'e", "description": "Word'ü PDF'e dönüştür"},
        {"id": "pdf-to-ppt", "name": "PDF'den PPT'ye", "description": "PDF'i PowerPoint'e dönüştür"},
        {"id": "unlock", "name": "PDF Şifre Kaldır", "description": "PDF şifre korumasını kaldır"},
        {"id": "protect", "name": "PDF Şifrele", "description": "PDF'e şifre koruması ekle"},
        {"id": "rotate", "name": "PDF Döndür", "description": "PDF sayfalarını döndür"},
        {"id": "watermark", "name": "PDF Filigranla", "description": "PDF'e metin/resim filigranı ekle"},
        {"id": "pdf-to-jpg", "name": "PDF'den JPG'ye", "description": "PDF sayfalarını resme dönüştür"},
        {"id": "organize", "name": "PDF Düzenle", "description": "PDF sayfalarını yeniden düzenle"},
    ]
    return {"tools": tools, "count": len(tools)}


@app.get("/api/status")
def get_status():
    return {
        "status": "operational",
        "uptime": "99.9%",
        "version": "1.0.0",
        "environment": "production",
    }


# Routers
app.include_router(merge_router)
app.include_router(split_router)
app.include_router(compress_router)
app.include_router(session_router)
app.include_router(pdf_to_word_router)
app.include_router(word_to_pdf_router)
app.include_router(pdf_to_ppt_router)
app.include_router(protect_router)
app.include_router(unlock_router)
app.include_router(rotate_router)
app.include_router(watermark_router)
app.include_router(pdf_to_jpg_router)

