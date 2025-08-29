from contextlib import asynccontextmanager
from fastapi import FastAPI

from .utils import cleanup_old_files


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_old_files()
    yield


