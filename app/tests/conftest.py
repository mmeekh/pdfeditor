import os

import pytest
from fastapi.testclient import TestClient

from core.config import settings
from main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "TEMP_DIR", str(tmp_path))
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    return TestClient(app)
