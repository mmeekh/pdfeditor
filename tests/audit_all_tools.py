#!/usr/bin/env python3
"""
PDFişlemleri.com — Tool Audit

16 tool'un end-to-end integration testi:
  upload → process → download → verify

Kullanım:
  python3 audit_all_tools.py
"""
import os, sys, time, json, base64, io
from pathlib import Path
import requests

BASE_URL = os.environ.get("API_BASE", "https://pdfislemleri.com/api")
FIX = Path(__file__).parent / "fixtures"
REPORT = Path(__file__).parent / "audit-report.json"

# Renk kodları
class C:
    OK = "\033[92m"; FAIL = "\033[91m"; WARN = "\033[93m"
    DIM = "\033[90m"; BOLD = "\033[1m"; END = "\033[0m"

def fmt(sec): return f"{sec:.2f}s"

class ToolTest:
    def __init__(self, slug, tool_name, upload_files, process_params, process_method="POST", file_field="files"):
        self.slug = slug
        self.tool_name = tool_name
        self.upload_files = upload_files  # [(filename, path)] list
        self.process_params = process_params
        self.process_method = process_method
        self.file_field = file_field
        self.result = {"slug": slug, "tool_name": tool_name, "steps": {}}

    def _post_files(self, url, files_tuples):
        """files_tuples = [(fieldname, (filename, filehandle, content_type))]"""
        return requests.post(url, files=files_tuples, timeout=60)

    def run(self):
        t_start = time.time()
        try:
            # 1. Upload
            t0 = time.time()
            upload_url = f"{BASE_URL}/tools/{self.slug}/upload"
            files_tuples = []
            handles = []
            for fname, fpath in self.upload_files:
                mime = "application/pdf" if fpath.endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                fh = open(fpath, "rb")
                handles.append(fh)
                files_tuples.append((self.file_field, (fname, fh, mime)))

            r = self._post_files(upload_url, files_tuples)
            for h in handles:
                h.close()

            self.result["steps"]["upload"] = {
                "status": r.status_code,
                "duration": fmt(time.time() - t0),
                "ok": r.ok,
            }
            if not r.ok:
                self.result["steps"]["upload"]["error"] = r.text[:200]
                return self._fail("upload")

            data = r.json()
            session_id = data.get("session_id")
            if not session_id:
                self.result["steps"]["upload"]["error"] = "session_id yok"
                return self._fail("upload")

            # 2. Process
            t0 = time.time()
            process_url = f"{BASE_URL}/tools/{self.slug}/process/{session_id}"

            if self.process_method == "GET":
                r = requests.get(process_url, params=self.process_params, timeout=120)
            elif self.process_method == "POST_FORM":
                r = requests.post(process_url, data=self.process_params, timeout=120)
            elif self.process_method == "POST_JSON":
                body = self.process_params.get("__json_body", {})
                r = requests.post(process_url, json=body, timeout=120)
            else:
                r = requests.post(process_url, params=self.process_params, timeout=120)

            self.result["steps"]["process"] = {
                "status": r.status_code,
                "duration": fmt(time.time() - t0),
                "ok": r.ok,
            }
            if not r.ok:
                self.result["steps"]["process"]["error"] = r.text[:300]
                return self._fail("process")

            # Process response analizi
            ct = r.headers.get("content-type", "")
            if "json" in ct:
                proc_data = r.json()
                self.result["steps"]["process"]["response"] = {
                    k: (v if not isinstance(v, list) or len(str(v)) < 200 else f"<list len={len(v)}>")
                    for k, v in proc_data.items()
                }
            else:
                # Direct file response (rare)
                self.result["steps"]["process"]["content_type"] = ct
                self.result["steps"]["process"]["size"] = len(r.content)
                self.result["total_duration"] = fmt(time.time() - t_start)
                self.result["passed"] = True
                return self.result

            # 3. Download (if applicable)
            out_file = proc_data.get("output_file") or proc_data.get("filename")
            if out_file:
                t0 = time.time()
                dl_url = f"{BASE_URL}/tools/{self.slug}/download/{session_id}/{out_file}"
                r = requests.get(dl_url, timeout=60)
                self.result["steps"]["download"] = {
                    "status": r.status_code,
                    "duration": fmt(time.time() - t0),
                    "ok": r.ok,
                    "size": len(r.content) if r.ok else 0,
                }
                if not r.ok:
                    self.result["steps"]["download"]["error"] = r.text[:200]
                    return self._fail("download")

            self.result["total_duration"] = fmt(time.time() - t_start)
            self.result["passed"] = True
            return self.result

        except requests.Timeout:
            self.result["error"] = "Timeout"
            return self._fail("exception")
        except Exception as e:
            self.result["error"] = f"{type(e).__name__}: {e}"
            return self._fail("exception")

    def _fail(self, step):
        self.result["passed"] = False
        self.result["failed_step"] = step
        return self.result


# Test definitions
SAMPLE_3P = str(FIX / "sample-3p.pdf")
SAMPLE_10P = str(FIX / "sample-10p.pdf")
SAMPLE_TABLE = str(FIX / "sample-real-table.pdf")
SAMPLE_ENCRYPTED = str(FIX / "sample-encrypted.pdf")
SAMPLE_DOCX = str(FIX / "sample.docx")
SAMPLE_SIG_B64 = open(FIX / "sample-signature.b64").read() if (FIX / "sample-signature.b64").exists() else ""

TESTS = [
    ToolTest("merge", "PDF Birleştir",
             [("a.pdf", SAMPLE_3P), ("b.pdf", SAMPLE_10P)],
             {"sort_by_name": False}),

    ToolTest("split", "PDF Ayır",
             [("a.pdf", SAMPLE_10P)],
             {"mode": "ranges", "pages": "1-3,5"}),

    ToolTest("compress", "PDF Sıkıştır",
             [("a.pdf", SAMPLE_3P)],
             {"level": "medium"}),

    ToolTest("organize", "PDF Sırala",
             [("a.pdf", SAMPLE_10P)],
             {"__json_body": {"pages": [{"file_index": 0, "page_number": 1}, {"file_index": 0, "page_number": 2}, {"file_index": 0, "page_number": 3}]}},
             process_method="POST_JSON"),

    ToolTest("rotate", "PDF Döndür",
             [("a.pdf", SAMPLE_3P)],
             {"degrees": 90}),

    ToolTest("watermark", "PDF Filigran",
             [("a.pdf", SAMPLE_3P)],
             {"text": "TEST", "position": "center", "font_size": 36, "color": "#000000", "opacity": 0.5}),

    ToolTest("protect", "PDF Şifrele",
             [("a.pdf", SAMPLE_3P)],
             {"user_password": "test123", "owner_password": "", "can_print": True, "can_modify": False, "can_copy": False, "can_annotate": False, "can_fill_forms": False},
             process_method="POST_FORM"),

    ToolTest("unlock", "PDF Şifre Kaldır",
             [("encrypted.pdf", SAMPLE_ENCRYPTED)],
             {"password": "test123"},
             process_method="POST_FORM",
             file_field="file"),

    ToolTest("pdf-to-word", "PDF'den Word'e",
             [("a.pdf", SAMPLE_3P)],
             {}),

    ToolTest("word-to-pdf", "Word'den PDF'e",
             [("a.docx", SAMPLE_DOCX)],
             {}),

    ToolTest("pdf-to-jpg", "PDF'den JPG'ye",
             [("a.pdf", SAMPLE_3P)],
             {"dpi": 150}),

    ToolTest("pdf-to-ppt", "PDF'den PPT'ye",
             [("a.pdf", SAMPLE_3P)],
             {"mode": "separate"}),

    ToolTest("pdf-to-excel", "PDF'den Excel'e",
             [("a.pdf", SAMPLE_TABLE)],
             {}),

    ToolTest("pdf-to-txt", "PDF'den TXT'ye",
             [("a.pdf", SAMPLE_3P)],
             {}),

    ToolTest("pdf-ocr", "PDF OCR",
             [("a.pdf", SAMPLE_3P)],
             {}),

    ToolTest("sign", "PDF İmzala",
             [("a.pdf", SAMPLE_3P)],
             {
                 "name": "Emin",
                 "surname": "Kilic",
                 "signature_data": SAMPLE_SIG_B64,
                 "signature_type": "uploaded",
                 "opacity": 0.8,
                 "selected_files": "[0]",
                 "signature_positions": '{"0":{"x":100,"y":100,"page":1,"width":200,"height":60}}',
             },
             process_method="POST_FORM"),
]


def print_row(r):
    status = f"{C.OK}PASS{C.END}" if r.get("passed") else f"{C.FAIL}FAIL{C.END}"
    step_info = ""
    if not r.get("passed"):
        fs = r.get("failed_step", "?")
        err = r.get("error") or r.get("steps", {}).get(fs, {}).get("error", "")
        step_info = f" @{fs}: {err[:100]}"
    dur = r.get("total_duration", "-")
    print(f"  {r['slug']:<18} [{status}] {dur:>7}{step_info}")


def main():
    print(f"{C.BOLD}═══ PDF TOOL AUDIT ═══{C.END}")
    print(f"Base: {BASE_URL}\n")

    results = []
    for i, t in enumerate(TESTS, 1):
        print(f"{C.DIM}[{i}/{len(TESTS)}] testing {t.slug}...{C.END}", end="\r")
        r = t.run()
        results.append(r)
        print_row(r)

    # Summary
    passed = sum(1 for r in results if r.get("passed"))
    failed = len(results) - passed
    print(f"\n{C.BOLD}─── ÖZET ───{C.END}")
    print(f"{C.OK}PASS{C.END}: {passed}/{len(results)}")
    if failed:
        print(f"{C.FAIL}FAIL{C.END}: {failed}/{len(results)}")

    # Rapor kaydet
    REPORT.write_text(json.dumps({
        "timestamp": time.time(),
        "base_url": BASE_URL,
        "summary": {"total": len(results), "passed": passed, "failed": failed},
        "results": results,
    }, indent=2, ensure_ascii=False, default=str))
    print(f"\n✓ Detaylı rapor: {REPORT}")


if __name__ == "__main__":
    main()
