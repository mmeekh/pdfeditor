from fastapi import FastAPI, Request, Response
import logging

from core.middleware import setup_cors
from core.lifespan import lifespan

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
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
from routers.organize import router as organize_router
from routers.sign import router as sign_router
from routers.pdf_ocr import router as pdf_ocr_router
from routers.pdf_to_excel import router as pdf_to_excel_router
from routers.pdf_to_txt import router as pdf_to_txt_router
from core.config import settings


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="PDFişlemleri.com API",
    description="PDF işlemleri için REST API",
    version="1.0.0",
    lifespan=lifespan,
    # Note: Global request body size limit is enforced via Content-Length
    # check in core.middleware (max_request_size kwarg is not supported by FastAPI).
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Middleware
setup_cors(app)


# Health and root endpoints
@app.get("/")
def root():
    return {"status": "API OK", "message": "PDFişlemleri.com API çalışıyor!"}


@app.api_route("/health", methods=["GET", "HEAD"])
def health(request: Request):
    if request.method == "HEAD":
        return Response(status_code=200)
    return {"status": "ok", "service": "pdfislemleri-api"}

@app.api_route("/api/health", methods=["GET", "HEAD"])
def api_health(request: Request):
    if request.method == "HEAD":
        return Response(status_code=200)
    return {"status": "ok", "service": "pdfislemleri-api"}


@app.get("/api/tools")
def get_tools():
    tools = [
        {"id": "merge", "name": "PDF Birleştir", "description": "Birden fazla PDF'i tek dosyada birleştir"},
        {"id": "compress", "name": "PDF Sıkıştır", "description": "PDF boyutunu küçült"},
        {"id": "pdf-to-word", "name": "PDF'den Word'e", "description": "PDF'i düzenlenebilir Word'e dönüştür"},
        {"id": "word-to-pdf", "name": "Word'den PDF'e", "description": "Word'ü PDF'e dönüştür"},
        {"id": "unlock", "name": "PDF Şifre Kaldır", "description": "PDF şifre korumasını kaldır"},
        {"id": "split", "name": "PDF Ayır", "description": "PDF sayfalarını ayır veya çıkar"},
        {"id": "pdf-to-jpg", "name": "PDF'den JPG'ye", "description": "PDF sayfalarını resme dönüştür"},
        {"id": "pdf-to-txt", "name": "PDF/Word'den TXT'ye", "description": "PDF ve Word dosyalarını TXT'ye dönüştürün"},
        {"id": "protect", "name": "PDF Şifrele", "description": "PDF'e şifre koruması ekle"},
        {"id": "rotate", "name": "PDF Döndür", "description": "PDF sayfalarını döndür"},
        {"id": "watermark", "name": "PDF Filigranla", "description": "PDF'e metin/resim filigranı ekle"},
        {"id": "organize", "name": "PDF Düzenle", "description": "PDF sayfalarını yeniden düzenle"},
        {"id": "sign", "name": "PDF İmzala", "description": "PDF dosyalarını dijital olarak imzalayın"},
        {"id": "pdf-ocr", "name": "PDF OCR", "description": "PDF'den metin çıkarın ve düzenlenebilir hale getirin"},
        {"id": "pdf-to-ppt", "name": "PDF'den PPT'ye", "description": "PDF'i PowerPoint'e dönüştür"},
        {"id": "pdf-to-excel", "name": "PDF'den Excel'e", "description": "PDF tablolarını Excel'e dönüştürün"},
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


@app.get("/api/config")
def get_config():
    """Get application configuration including file limits"""
    return {
        "max_files": settings.MAX_FILES,
        "max_file_size_mb": settings.MAX_FILE_SIZE // (1024 * 1024),
        "session_lifetime_minutes": settings.SESSION_LIFETIME_MINUTES,
        "file_cleanup_hours": settings.FILE_CLEANUP_HOURS,
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
app.include_router(organize_router)
app.include_router(sign_router)
app.include_router(pdf_ocr_router)
app.include_router(pdf_to_excel_router)
app.include_router(pdf_to_txt_router)

