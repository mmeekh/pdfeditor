import pytest


PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
DOCX_BYTES = b"PK\x03\x04DOCX"


UPLOAD_CASES = [
    {
        "name": "merge",
        "path": "/api/tools/merge/upload",
        "field": "files",
        "files": [
            ("first.pdf", PDF_BYTES, "application/pdf"),
            ("second.pdf", PDF_BYTES, "application/pdf"),
        ],
    },
    {
        "name": "split",
        "path": "/api/tools/split/upload",
        "field": "files",
        "files": [("split.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "compress",
        "path": "/api/tools/compress/upload",
        "field": "files",
        "files": [("compress.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "pdf-to-word",
        "path": "/api/tools/pdf-to-word/upload",
        "field": "files",
        "files": [("convert.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "word-to-pdf",
        "path": "/api/tools/word-to-pdf/upload",
        "field": "files",
        "files": [
            (
                "document.docx",
                DOCX_BYTES,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        ],
    },
    {
        "name": "pdf-to-ppt",
        "path": "/api/tools/pdf-to-ppt/upload",
        "field": "files",
        "files": [("slides.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "protect",
        "path": "/api/tools/protect/upload",
        "field": "files",
        "files": [("secure.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "unlock",
        "path": "/api/tools/unlock/upload",
        "field": "file",
        "files": [("locked.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "rotate",
        "path": "/api/tools/rotate/upload",
        "field": "files",
        "files": [("rotate.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "watermark",
        "path": "/api/tools/watermark/upload",
        "field": "files",
        "files": [("watermark.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "pdf-to-jpg",
        "path": "/api/tools/pdf-to-jpg/upload",
        "field": "files",
        "files": [("images.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "organize",
        "path": "/api/tools/organize/upload",
        "field": "files",
        "files": [("organize.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "sign",
        "path": "/api/tools/sign/upload",
        "field": "files",
        "files": [("sign.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "pdf-ocr",
        "path": "/api/tools/pdf-ocr/upload",
        "field": "files",
        "files": [("ocr.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "pdf-to-excel",
        "path": "/api/tools/pdf-to-excel/upload",
        "field": "files",
        "files": [("table.pdf", PDF_BYTES, "application/pdf")],
    },
    {
        "name": "pdf-to-txt",
        "path": "/api/tools/pdf-to-txt/upload",
        "field": "files",
        "files": [
            ("report.pdf", PDF_BYTES, "application/pdf"),
            (
                "report.docx",
                DOCX_BYTES,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
        ],
    },
]


@pytest.mark.parametrize("case", UPLOAD_CASES, ids=[case["name"] for case in UPLOAD_CASES])
def test_upload_endpoints_accept_files(client, case):
    files = [
        (case["field"], (filename, content, content_type))
        for filename, content, content_type in case["files"]
    ]
    response = client.post(case["path"], files=files)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "session_id" in payload
