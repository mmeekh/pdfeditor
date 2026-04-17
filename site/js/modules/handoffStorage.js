/**
 * Handoff Storage — Ana sayfadan tool sayfasına dosya aktarımı
 *
 * Kullanım:
 *   const token = await handoffStorage.put(files);
 *   window.location.href = `/pdf-birlestir?handoff=${token}`;
 *
 *   // Tool sayfasında:
 *   const files = await handoffStorage.take(token);
 *   toolManager.openToolWithFiles('merge', files);
 *
 * IndexedDB kullanır çünkü File/Blob navigation arasında yaşayabilsin.
 */

const DB_NAME = 'pdfislemleri_handoff';
const STORE = 'files';
const DB_VERSION = 1;
const TTL_MS = 5 * 60 * 1000; // 5 dakika

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'token' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function genToken() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'h-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function put(files) {
  const token = genToken();
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put({
      token,
      files: Array.from(files), // File nesneleri IDB'de blob olarak saklanır
      createdAt: Date.now(),
    });
  });
  db.close();
  return token;
}

async function take(token) {
  if (!token) return null;
  const db = await openDb();
  try {
    const entry = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).get(token);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!entry) return null;
    // TTL kontrol
    if (Date.now() - entry.createdAt > TTL_MS) {
      await del(token);
      return null;
    }
    await del(token);
    return entry.files;
  } finally {
    db.close();
  }
}

async function del(token) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(token);
  });
  db.close();
}

// Opportunistic cleanup: her açılışta TTL geçmişleri sil
async function gc() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      const now = Date.now();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          if (now - cur.value.createdAt > TTL_MS) cur.delete();
          cur.continue();
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    // sessizce geç
  }
}

const handoffStorage = { put, take, del, gc };
export default handoffStorage;
