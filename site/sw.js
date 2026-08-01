/**
 * PDFişlemleri.com Service Worker (2026-08-01)
 *
 * Görevleri:
 *  1) PWA kurulabilirliği (Android "uygulamayı yükle")
 *  2) Web Share Target: başka uygulamadan paylaşılan PDF'i POST /paylas ile alır,
 *     handoff IndexedDB'sine koyar ve ana sayfadaki araç seçiciye yönlendirir.
 *
 * BİLİNÇLİ TASARIM: fetch cache YOK — site canlı bind-mount ile anında güncellenir;
 * SW cache'i eski sürüm servis etme riski yaratırdı. SW yalnızca /paylas'ı ele alır.
 */

const HANDOFF_DB = 'pdfislemleri_handoff';
const STORE = 'files';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDOFF_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'token' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/paylas') {
    event.respondWith((async () => {
      try {
        const fd = await event.request.formData();
        const files = fd.getAll('files').filter(f => f && f.size > 0);
        if (!files.length) return Response.redirect('/', 303);
        const token = (self.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'h-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
          tx.objectStore(STORE).put({ token, files, createdAt: Date.now() });
        });
        db.close();
        return Response.redirect('/?handoff=' + token, 303);
      } catch (e) {
        return Response.redirect('/', 303);
      }
    })());
  }
  // diğer tüm istekler ağa gider (cache yok — bilinçli)
});
