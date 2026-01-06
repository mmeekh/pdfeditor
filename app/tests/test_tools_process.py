import pytest


PROCESS_CASES = [
    {"name": "merge", "path": "/api/tools/merge/process/{session_id}"},
    {"name": "split", "path": "/api/tools/split/process/{session_id}"},
    {"name": "compress", "path": "/api/tools/compress/process/{session_id}"},
    {"name": "pdf-to-word", "path": "/api/tools/pdf-to-word/process/{session_id}"},
    {"name": "word-to-pdf", "path": "/api/tools/word-to-pdf/process/{session_id}"},
    {"name": "pdf-to-ppt", "path": "/api/tools/pdf-to-ppt/process/{session_id}"},
    {
        "name": "protect",
        "path": "/api/tools/protect/process/{session_id}",
        "data": {"user_password": "secret"},
    },
    {
        "name": "unlock",
        "path": "/api/tools/unlock/process/{session_id}",
        "data": {"password": "secret"},
    },
    {"name": "rotate", "path": "/api/tools/rotate/process/{session_id}"},
    {
        "name": "watermark",
        "path": "/api/tools/watermark/process/{session_id}",
        "params": {"text": "Test"},
    },
    {"name": "pdf-to-jpg", "path": "/api/tools/pdf-to-jpg/process/{session_id}"},
    {
        "name": "organize",
        "path": "/api/tools/organize/process/{session_id}",
        "json": {"pages": []},
    },
    {
        "name": "sign",
        "path": "/api/tools/sign/process/{session_id}",
        "data": {
            "name": "Ada",
            "surname": "Lovelace",
            "signature_data": "data:image/png;base64,AAA",
            "signature_type": "drawn",
            "opacity": "0.8",
            "selected_files": "[]",
            "signature_positions": "{}",
        },
    },
    {
        "name": "pdf-ocr",
        "path": "/api/tools/pdf-ocr/process/{session_id}",
        "data": {"language": "tur+eng"},
    },
    {"name": "pdf-to-excel", "path": "/api/tools/pdf-to-excel/process/{session_id}"},
    {"name": "pdf-to-txt", "path": "/api/tools/pdf-to-txt/process/{session_id}"},
]


@pytest.mark.parametrize(
    "case", PROCESS_CASES, ids=[case["name"] for case in PROCESS_CASES]
)
def test_process_endpoints_missing_session_return_404(client, case):
    session_id = "missing-session"
    response = client.post(
        case["path"].format(session_id=session_id),
        params=case.get("params"),
        data=case.get("data"),
        json=case.get("json"),
    )
    assert response.status_code == 404, response.text
