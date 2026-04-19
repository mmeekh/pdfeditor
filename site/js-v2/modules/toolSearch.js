/**
 * Tool Search — Header arama kutusu (desktop + mobile)
 *
 * Türkçe karakter toleranslı, fuzzy match, keyword eşleştirme.
 */

const TOOLS = [
    { slug: "pdf-birlestir", name: "PDF Birleştir", icon: "fa-object-group", color: "blue",
      keywords: ["birlestir", "birleştirme", "merge", "merge pdf", "combine", "combine pdf", "join", "join pdf", "bir arada", "tek dosya", "pdf ekle"] },
    { slug: "pdf-ayir", name: "PDF Ayır", icon: "fa-cut", color: "purple",
      keywords: ["ayir", "ayırma", "bol", "bolme", "böl", "split", "split pdf", "divide", "extract pages", "sayfa cikar", "parcala"] },
    { slug: "pdf-sikistir", name: "PDF Sıkıştır", icon: "fa-compress-arrows-alt", color: "green",
      keywords: ["sikistir", "sıkıştırma", "kucult", "küçültme", "boyut", "compress", "compress pdf", "reduce", "reduce pdf size", "shrink"] },
    { slug: "pdf-sirala", name: "PDF Sırala", icon: "fa-sort", color: "teal",
      keywords: ["sirala", "sıralama", "duzenle", "düzenle", "organize", "organize pdf", "reorder", "reorder pages", "arrange", "sort pages", "sayfa duzeni"] },
    { slug: "pdf-imzala", name: "PDF İmzala", icon: "fa-signature", color: "indigo",
      keywords: ["imzala", "imza", "sign", "sign pdf", "signature", "e-signature", "electronic signature", "digital signature", "elektronik imza", "dijital imza"] },
    { slug: "pdf-sifrele", name: "PDF Şifrele", icon: "fa-lock", color: "red",
      keywords: ["sifrele", "şifreleme", "parola", "protect", "protect pdf", "password", "encrypt", "encrypt pdf", "lock", "lock pdf", "guvenlik", "kilit"] },
    { slug: "pdf-sifre-kaldir", name: "PDF Şifre Kaldır", icon: "fa-unlock", color: "orange",
      keywords: ["sifre kaldir", "şifre kaldırma", "unlock", "unlock pdf", "remove password", "decrypt", "decrypt pdf", "parola sil", "kirma", "kırma", "kilit ac"] },
    { slug: "pdf-dondur", name: "PDF Döndür", icon: "fa-sync-alt", color: "blue",
      keywords: ["dondur", "döndürme", "cevir", "çevirme", "rotate", "rotate pdf", "flip", "turn", "sayfa dondur"] },
    { slug: "pdf-filigran", name: "PDF Filigran", icon: "fa-stamp", color: "purple",
      keywords: ["filigran", "watermark", "watermark pdf", "add watermark", "stamp", "damga", "logo ekle", "yazı ekle"] },
    { slug: "pdf-ocr", name: "PDF OCR", icon: "fa-eye", color: "cyan",
      keywords: ["ocr", "ocr pdf", "extract text", "scanned pdf", "searchable pdf", "pdf to text", "metin cikar", "metin çıkarma", "taranmis", "taranmış", "okuma", "aranabilir"] },
    { slug: "pdf-to-word", name: "PDF'den Word'e", icon: "fa-file-word", color: "blue",
      keywords: ["word", "docx", "doc", "pdf word", "pdf to word", "pdf to docx", "convert to word", "donustur", "dönüştür"] },
    { slug: "word-to-pdf", name: "Word'den PDF'e", icon: "fa-file-alt", color: "red",
      keywords: ["word to pdf", "docx to pdf", "docx pdf", "doc to pdf", "word pdf", "convert word"] },
    { slug: "pdf-to-ppt", name: "PDF'den PPT'ye", icon: "fa-file-powerpoint", color: "orange",
      keywords: ["powerpoint", "pdf to powerpoint", "pdf to ppt", "pdf to pptx", "convert to ppt", "sunum", "ppt", "pptx", "slayt"] },
    { slug: "pdf-to-excel", name: "PDF'den Excel'e", icon: "fa-file-excel", color: "emerald",
      keywords: ["excel", "xlsx", "pdf to excel", "pdf to xlsx", "convert to excel", "tablo", "csv", "veri"] },
    { slug: "pdf-to-jpg", name: "PDF'den JPG'ye", icon: "fa-file-image", color: "amber",
      keywords: ["jpg", "jpeg", "png", "pdf to jpg", "pdf to image", "pdf to png", "convert to jpg", "extract images", "resim", "gorsel", "görsel", "image", "foto"] },
    { slug: "pdf-to-txt", name: "PDF'den TXT'ye", icon: "fa-file-alt", color: "slate",
      keywords: ["txt", "text", "pdf to text", "pdf to txt", "extract text", "convert to text", "metin", "yazı", "düz metin"] },
];

// Türkçe karakter normalize
function normalize(str) {
    return (str || "")
        .toLocaleLowerCase("tr")
        .replace(/ı/g, "i").replace(/İ/g, "i")
        .replace(/ğ/g, "g").replace(/ü/g, "u")
        .replace(/ş/g, "s").replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/\s+/g, " ")
        .trim();
}

function search(query) {
    const q = normalize(query);
    if (!q) return [];

    const results = TOOLS.map(tool => {
        const nName = normalize(tool.name);
        const nKeywords = tool.keywords.map(normalize);

        let score = 0;
        if (nName.startsWith(q)) score += 10;
        else if (nName.includes(q)) score += 5;

        for (const kw of nKeywords) {
            if (kw === q) score += 8;
            else if (kw.startsWith(q)) score += 4;
            else if (kw.includes(q)) score += 2;
        }

        // Her kelimeyi ayrı ayrı kontrol
        const qWords = q.split(" ");
        for (const w of qWords) {
            if (w.length >= 2) {
                if (nName.includes(w)) score += 1;
                if (nKeywords.some(kw => kw.includes(w))) score += 1;
            }
        }

        return { tool, score };
    }).filter(r => r.score > 0);

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 8);
}

function renderResults(container, results, query) {
    if (!results.length) {
        container.innerHTML = `
            <div class="p-4 text-center text-gray-500 text-sm">
                <i class="fas fa-search text-gray-300 text-2xl mb-2 block"></i>
                "<strong>${escapeHtml(query)}</strong>" için sonuç bulunamadı
            </div>`;
        container.classList.remove("hidden");
        return;
    }
    container.innerHTML = results.map(r => {
        const t = r.tool;
        return `
            <a href="/${t.slug}" class="flex items-center gap-3 p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition">
                <div class="w-9 h-9 rounded-lg bg-${t.color}-100 flex items-center justify-center text-${t.color}-600 flex-shrink-0">
                    <i class="fas ${t.icon}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 text-sm">${t.name}</p>
                    <p class="text-xs text-gray-500 truncate">/${t.slug}</p>
                </div>
                <i class="fas fa-arrow-right text-gray-400 text-xs"></i>
            </a>`;
    }).join("");
    container.classList.remove("hidden");
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function attachSearch(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    if (!input || !results) return;

    let debounce;
    input.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            const q = input.value;
            if (!q.trim()) {
                results.classList.add("hidden");
                return;
            }
            const found = search(q);
            renderResults(results, found, q);
        }, 150);
    });

    input.addEventListener("focus", () => {
        if (input.value.trim()) {
            const found = search(input.value);
            renderResults(results, found, input.value);
        }
    });

    // Click dışında kapat
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.add("hidden");
        }
    });

    // Enter → ilk sonuca git
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const first = results.querySelector("a");
            if (first) window.location.href = first.href;
        } else if (e.key === "Escape") {
            results.classList.add("hidden");
            input.blur();
        }
    });
}

function attachMobileToggle() {
    const toggleBtn = document.getElementById("mobile-search-toggle");
    const bar = document.getElementById("mobile-search-bar");
    const input = document.getElementById("tool-search-mobile");
    const results = document.getElementById("tool-search-results-mobile");
    if (!toggleBtn || !bar) return;

    const openBar = () => {
        bar.classList.remove("hidden");
        toggleBtn.setAttribute("aria-expanded", "true");
        setTimeout(() => input && input.focus(), 50);
    };
    const closeBar = () => {
        bar.classList.add("hidden");
        toggleBtn.setAttribute("aria-expanded", "false");
        if (input) input.value = "";
        if (results) results.classList.add("hidden");
    };

    toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (bar.classList.contains("hidden")) openBar();
        else closeBar();
    });

    document.addEventListener("click", (e) => {
        if (bar.classList.contains("hidden")) return;
        if (!bar.contains(e.target) && !toggleBtn.contains(e.target)) {
            closeBar();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !bar.classList.contains("hidden")) closeBar();
    });
}

export function initToolSearch() {
    attachSearch("tool-search-desktop", "tool-search-results-desktop");
    attachSearch("tool-search-mobile", "tool-search-results-mobile");
    attachSearch("tool-search-hero", "tool-search-results-hero");
    attachMobileToggle();
}

export default { initToolSearch, search };
