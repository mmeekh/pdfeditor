from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings


class FileSizeLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce global file size limits"""
    
    async def dispatch(self, request: Request, call_next):
        # Check content-length header for file uploads
        if request.method == "POST" and "upload" in str(request.url):
            content_length = request.headers.get("content-length")
            if content_length:
                content_length = int(content_length)
                if content_length > settings.MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Dosya boyutu çok büyük. Maksimum: {settings.MAX_FILE_SIZE/(1024*1024)}MB"
                    )
        
        response = await call_next(request)
        return response


def setup_cors(app: FastAPI) -> None:
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOW_ORIGINS,
        allow_credentials=settings.ALLOW_CREDENTIALS,
        allow_methods=settings.ALLOW_METHODS,
        allow_headers=settings.ALLOW_HEADERS,
        expose_headers=settings.EXPOSE_HEADERS,
    )
    
    # Add file size limit middleware
    app.add_middleware(FileSizeLimitMiddleware)


