#!/usr/bin/env python3
"""
PDFislemleri.com — Tool page builder

Mevcut SEO landing page HTML'lerine ortak bileşenleri inject eder:
  - cardbgs decorative band (header altı)
  - tool interface (#toolInterface + drag overlay)
  - SortableJS + main.js + inline controller script
  - standardized footer (2026, Emin Kılıç LinkedIn)

Kullanım:
  python3 build.py              # tüm sayfaları güncelle
  python3 build.py pdf-ayir     # sadece belirli bir sayfa
"""

import json
import re
import sys
import os

SITE_DIR = os.path.join(os.path.dirname(__file__), "site")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "tools-config.json")

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    TOOLS = json.load(f)

# ── PARTIALS ──────────────────────────────────────────────────────────

CARDBGS_BAND = """
    <!-- Brand visual strip (cardbgs decorative band) -->
    <div class="relative h-20 md:h-28 overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50" aria-hidden="true">
        <img src="/cardbgs/{cardbg}"
             alt=""
             class="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-multiply"
             loading="eager"
             width="1600" height="200">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50"></div>
    </div>
""".strip()

DRAG_OVERLAY = """
        <!-- Full-page drag overlay -->
        <div id="dragOverlay" class="fixed inset-0 z-50 pointer-events-none opacity-0 transition-all duration-200" style="visibility:hidden">
            <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
            <div class="relative flex flex-col items-center justify-center h-full px-4">
                <div class="bg-white/10 border-2 border-dashed border-white/60 rounded-3xl p-12 md:p-20 flex flex-col items-center max-w-lg">
                    <i class="fas fa-cloud-upload-alt text-white text-5xl mb-4 animate-bounce"></i>
                    <p class="text-white text-2xl md:text-3xl font-bold text-center mb-6">{dropText}</p>
                    <img src="/cardbgs/{cardbg}" alt="" aria-hidden="true" class="w-36 md:w-48 opacity-40 rounded-xl" width="200" height="200">
                </div>
            </div>
        </div>
""".rstrip()

TOOL_UI = """
        <!-- Tool Interface (embed) -->
        <section id="toolInterface" class="mb-12 fade-in" data-auto-tool="{toolId}">
            <div class="bg-white rounded-xl shadow-md p-6">
                <!-- Hidden elements for toolManager compatibility -->
                <h3 id="toolTitle" class="sr-only">{title}</h3>
                <p id="toolDescription" class="sr-only"></p>
                <span id="funnyQuote" class="sr-only"></span>

                <!-- PHASE 1: Upload CTA (dosya yokken görünür) -->
                <div id="uploadPhase" class="py-8">
                    <div id="fileUploadArea" class="file-drop-area border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-2xl p-10 md:p-16 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300">
                        <div class="max-w-md mx-auto">
                            <i class="fas fa-cloud-upload-alt text-5xl text-blue-400 mb-5"></i>
                            <p class="text-gray-800 text-xl font-semibold mb-2">Dosyalarınızı buraya sürükleyin</p>
                            <p class="text-gray-500 text-sm mb-5">veya</p>
                            <label class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl cursor-pointer transition shadow-md hover:shadow-lg text-lg font-medium">
                                <i class="fas fa-folder-open mr-2"></i> Dosyaları seç
                                <input type="file" id="fileInput" class="hidden" multiple accept="{accept}">
                            </label>
                            <div class="text-gray-400 text-xs mt-5 flex flex-wrap justify-center gap-4">
                                <span><i class="fas fa-shield-alt text-green-400"></i> Güvenli & otomatik silme</span>
                                <span><i class="fas fa-layer-group text-blue-400"></i> Max 20 dosya, 100MB</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- PHASE 2: Split panel (dosya eklendikten sonra görünür) -->
                <div id="workPhase" class="hidden">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- LEFT: Dosya listesi (2/3) -->
                        <div class="lg:col-span-2">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-bold text-gray-800 text-lg"><i class="fas fa-layer-group text-blue-600 mr-2"></i>Dosyalar</h4>
                                <label class="inline-flex items-center text-blue-600 hover:text-blue-700 cursor-pointer text-sm font-medium transition">
                                    <i class="fas fa-plus mr-1"></i> Dosya Ekle
                                    <input type="file" class="hidden" multiple accept="{accept}" id="addMoreFiles">
                                </label>
                            </div>
                            <div id="selectedFiles">
                                <div id="filesList" class="space-y-2 mb-4"></div>
                            </div>
                        </div>

                        <!-- RIGHT: Ayarlar panel (1/3) -->
                        <div class="lg:col-span-1">
                            <div class="bg-gray-50 rounded-xl p-5 sticky top-4">
                                <h4 class="font-bold text-gray-800 text-lg mb-4"><i class="fas fa-cog text-gray-500 mr-2"></i>Ayarlar</h4>
                                <div id="toolOptions" class="mb-6"></div>

                                <button id="processButton" class="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none" disabled>
                                    <i class="fas {icon} mr-2"></i>
                                    <span id="processButtonText">{processText}</span>
                                </button>

                                <p class="text-xs text-gray-400 mt-3 text-center"><i class="fas fa-lock text-green-400 mr-1"></i> Dosyalar işlem sonrası otomatik silinir</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Progress -->
                <div id="progressContainer" class="hidden mt-6">
                    <div class="flex justify-between mb-1">
                        <span class="text-gray-700">İşleniyor...</span>
                        <span id="progressPercent" class="text-gray-700">0%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div id="progressBar" class="progress-bar bg-blue-600 h-2.5 rounded-full w-0"></div>
                    </div>
                </div>

                <!-- Result Area -->
                <div id="resultArea" class="hidden mt-6">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div class="flex items-center">
                            <i class="fas fa-check-circle text-green-500 text-xl mr-3"></i>
                            <p class="text-green-700 font-medium">İşlem başarıyla tamamlandı! Dosyanız otomatik olarak indirildi!</p>
                        </div>
                    </div>
                    <div class="flex justify-center">
                        <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                            <i class="fas fa-download mr-2"></i>Tekrar İndir
                        </button>
                    </div>
                </div>
            </div>
        </section>
""".rstrip()

SCRIPTS = """
    <!-- SortableJS (drag-drop reorder) -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.3/Sortable.min.js"></script>

    <!-- Tool interface JS -->
    <script type="module" src="/js/main.js"></script>

    <script>
    window._sortableEnabled = true;

    document.addEventListener('DOMContentLoaded', () => {{
        const overlay = document.getElementById('dragOverlay');
        const uploadPhase = document.getElementById('uploadPhase');
        const workPhase = document.getElementById('workPhase');
        const addMoreFiles = document.getElementById('addMoreFiles');
        let dragCounter = 0;
        let sortableInstance = null;

        function showOverlay() {{
            overlay.style.visibility = 'visible';
            overlay.classList.remove('opacity-0', 'pointer-events-none');
            overlay.classList.add('opacity-100', 'pointer-events-auto');
        }}
        function hideOverlay() {{
            overlay.classList.remove('opacity-100', 'pointer-events-auto');
            overlay.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {{ overlay.style.visibility = 'hidden'; }}, 200);
        }}

        document.addEventListener('dragenter', (e) => {{
            if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
            dragCounter++;
            if (dragCounter === 1) showOverlay();
        }});
        document.addEventListener('dragleave', () => {{
            dragCounter--;
            if (dragCounter <= 0) {{ dragCounter = 0; hideOverlay(); }}
        }});
        document.addEventListener('dragover', (e) => {{
            if (e.dataTransfer && e.dataTransfer.types.includes('Files')) e.preventDefault();
        }});

        overlay.addEventListener('dragover', (e) => e.preventDefault());
        overlay.addEventListener('drop', (e) => {{
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0;
            hideOverlay();
            if (e.dataTransfer.files.length > 0 && window.fileHandler) {{
                window.fileHandler.handleFiles(e.dataTransfer.files, '{toolId}');
            }}
        }});
        document.addEventListener('drop', () => {{ dragCounter = 0; hideOverlay(); }});

        function initSortable() {{
            const filesList = document.getElementById('filesList');
            if (!filesList || typeof Sortable === 'undefined') return;
            if (sortableInstance) sortableInstance.destroy();
            sortableInstance = Sortable.create(filesList, {{
                animation: 250,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.file-item',
                draggable: '.file-item',
                filter: '.text-sm',
                onEnd: (evt) => {{
                    const from = evt.oldIndex;
                    const to = evt.newIndex;
                    if (from !== to && window.fileHandler) {{
                        const files = window.fileHandler.selectedFiles;
                        const moved = files.splice(from, 1)[0];
                        files.splice(to, 0, moved);
                        window.fileHandler.updateProcessButton();
                        filesList.querySelectorAll('.file-item').forEach((item, i) => {{
                            item.dataset.index = String(i);
                            const removeBtn = item.querySelector('.remove-file');
                            if (removeBtn) removeBtn.setAttribute('onclick', `fileHandler.removeFile(${{i}})`);
                        }});
                        document.dispatchEvent(new CustomEvent('filesUpdated', {{ detail: {{ files }} }}));
                    }}
                }}
            }});
        }}

        function switchToWorkPhase() {{
            if (uploadPhase) uploadPhase.classList.add('hidden');
            if (workPhase) workPhase.classList.remove('hidden');
            updateProcessButtonText();
        }}
        function switchToUploadPhase() {{
            if (uploadPhase) uploadPhase.classList.remove('hidden');
            if (workPhase) workPhase.classList.add('hidden');
        }}
        function updateProcessButtonText() {{
            const btn = document.getElementById('processButtonText');
            const count = window.fileHandler ? window.fileHandler.selectedFiles.length : 0;
            if (btn) btn.textContent = count > 0 ? `${{count}} {processText}` : '{processText}';
        }}

        document.addEventListener('filesUpdated', (e) => {{
            const files = e.detail?.files || [];
            if (files.length > 0) {{
                switchToWorkPhase();
                setTimeout(initSortable, 50);
            }} else {{
                switchToUploadPhase();
            }}
            updateProcessButtonText();
        }});

        if (addMoreFiles) {{
            addMoreFiles.addEventListener('change', (e) => {{
                if (window.fileHandler && e.target.files.length > 0) {{
                    window.fileHandler.handleFiles(e.target.files, '{toolId}');
                    e.target.value = '';
                }}
            }});
        }}
    }});
    </script>
""".rstrip()

FOOTER = """
    <!-- Footer -->
    <footer class="site-footer mt-16 relative overflow-hidden">
        <div class="footer-big-text hidden lg:block">PDFislemleri</div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
            <div class="text-right text-sm absolute top-4 right-4 z-20">
                <p>&copy; 2026 PDFişlemleri.com. Tüm hakları saklıdır.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-12 -mt-40">
                <div class="transform -translate-x-[30%]">
                    <h3 class="text-lg font-semibold mb-4">PDFişlemleri.com</h3>
                    <p class="text-sm">PDF dosyalarınızı ücretsiz olarak işleyin. Birleştirin, ayırın, dönüştürün ve daha fazlasını yapın.</p>
                </div>
                <div class="text-center">
                    <h4 class="text-md font-semibold mb-4 border-b border-gray-600 pb-2">Biz</h4>
                    <div class="grid grid-cols-2 gap-x-2 gap-y-2 text-sm">
                        <a href="/about" class="transition">Hakkımızda</a>
                        <a href="/blog" class="transition">Blog</a>
                        <a href="/contact" class="transition">İletişim</a>
                    </div>
                </div>
                <div class="text-center">
                    <h4 class="text-md font-semibold mb-4 border-b border-gray-600 pb-2">Yasal</h4>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <a href="/terms" class="transition">Hizmet Şartları</a>
                        <a href="/privacy" class="transition">Gizlilik Politikası</a>
                        <a href="/cookies" class="transition">Çerez Politikası</a>
                        <a href="/kvkk" class="transition">KVKK</a>
                    </div>
                </div>
                <div class="text-right">
                    <h4 class="text-md font-semibold mb-4">Sosyal Medya</h4>
                    <div class="flex space-x-4 justify-end">
                        <a href="https://www.linkedin.com/in/emin-k%C4%B1l%C4%B1%C3%A7-250b14210/" target="_blank" rel="noopener" class="transition">
                            <i class="fab fa-linkedin text-xl"></i>
                        </a>
                        <a href="https://instagram.com/heremmkh" target="_blank" rel="noopener" class="transition">
                            <i class="fab fa-instagram text-xl"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </footer>
""".strip()


# ── BUILD LOGIC ──────────────────────────────────────────────────────

def build_page(tool_key: str):
    cfg = TOOLS[tool_key]
    slug = cfg["slug"]
    html_path = os.path.join(SITE_DIR, f"{slug}.html")

    if not os.path.exists(html_path):
        print(f"  SKIP {slug}.html — dosya yok")
        return False

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    changed = False

    # 1) CARDBGS BAND — header </header> sonrası, breadcrumb öncesi
    if "cardbgs decorative band" not in html:
        band = CARDBGS_BAND.format(**cfg)
        html = html.replace("</header>", f"</header>\n\n    {band}", 1)
        changed = True
        print(f"  + cardbgs band")

    # 2) DRAG OVERLAY — <main> içinde ilk element olarak
    if "dragOverlay" not in html:
        overlay = DRAG_OVERLAY.format(**cfg)
        html = re.sub(
            r'(<main[^>]*>)',
            r'\1\n' + overlay,
            html, count=1
        )
        changed = True
        print(f"  + drag overlay")

    # 3) TOOL UI — hero section sonrası (ilk </section> sonrası)
    if "toolInterface" not in html:
        tool_ui = TOOL_UI.format(**cfg)
        # İlk </section> sonrasına ekle (hero section'ın sonu)
        first_section_end = html.find("</section>", html.find("<main"))
        if first_section_end != -1:
            insert_pos = first_section_end + len("</section>")
            html = html[:insert_pos] + "\n\n" + tool_ui + "\n" + html[insert_pos:]
            changed = True
            print(f"  + tool interface")

    # 4) SCRIPTS — </body> öncesi
    if 'src="/js/main.js"' not in html:
        scripts = SCRIPTS.format(**cfg)
        html = html.replace("</body>", f"{scripts}\n</body>", 1)
        changed = True
        print(f"  + scripts (SortableJS + main.js + controller)")

    # 5) FOOTER — replace existing
    footer_match = re.search(
        r'(    <!-- Footer -->.*?</footer>|<footer class="site-footer.*?</footer>)',
        html, re.DOTALL
    )
    if footer_match:
        old_footer = footer_match.group(0)
        if "2026" not in old_footer or "emin-k" not in old_footer:
            html = html.replace(old_footer, FOOTER)
            changed = True
            print(f"  + footer standardized")

    # 6) Hero CTA: /#toolId → #toolInterface
    old_cta = f'href="/{slug}"'
    if f'href="/#{cfg["toolId"]}"' in html:
        html = html.replace(f'href="/#{cfg["toolId"]}"', 'href="#toolInterface"')
        changed = True
        print(f"  + hero CTA updated")

    if changed:
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  ✓ {slug}.html updated")
    else:
        print(f"  = {slug}.html (no changes needed)")

    return changed


def update_index_data_urls():
    index_path = os.path.join(SITE_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    changed = False
    for tool_key, cfg in TOOLS.items():
        tool_id = cfg["toolId"]
        slug = cfg["slug"]
        # data-tool="X" varsa ama data-url yoksa ekle
        pattern = f'data-tool="{tool_id}"'
        if pattern in html and f'data-tool="{tool_id}" data-url="/{slug}"' not in html:
            html = html.replace(
                f'data-tool="{tool_id}"',
                f'data-tool="{tool_id}" data-url="/{slug}"',
                1
            )
            changed = True
            print(f"  + index.html: {tool_id} → data-url=/{slug}")

    if changed:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  ✓ index.html updated")
    else:
        print(f"  = index.html (no changes needed)")


def main():
    print("═══ PDFislemleri.com Build ═══\n")

    # Belirli sayfa mı yoksa tümü mü?
    targets = sys.argv[1:] if len(sys.argv) > 1 else None

    if targets:
        for slug in targets:
            found = False
            for key, cfg in TOOLS.items():
                if cfg["slug"] == slug or key == slug:
                    print(f"[{cfg['slug']}]")
                    build_page(key)
                    found = True
                    break
            if not found:
                print(f"  ! '{slug}' bulunamadı")
    else:
        for key, cfg in TOOLS.items():
            print(f"[{cfg['slug']}]")
            build_page(key)
            print()

        print("[index.html]")
        update_index_data_urls()

    print("\n═══ Build tamamlandı ═══")


if __name__ == "__main__":
    main()
