const DATABASE_NAME = "daoyuan_status_assets";
const DATABASE_VERSION = 1;
const STORE_NAME = "portrait_images";
const REFERENCE_PREFIX = "idb:daoyuan-portrait:";

const resolvedImages = new Map();
let databasePromise = null;
let initializationPromise = null;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB 请求失败"));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB 事务已中止"));
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB 事务失败"));
  });
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("当前环境不支持 IndexedDB"));
      return;
    }
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("无法打开本地立绘数据库"));
  });
  return databasePromise;
}

function hashImage(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function toReference(id) {
  return `${REFERENCE_PREFIX}${id}`;
}

export function isStoredLocalPortraitRef(value) {
  return String(value || "").startsWith(REFERENCE_PREFIX);
}

export async function initializeLocalPortraitImages() {
  if (initializationPromise) return initializationPromise;
  initializationPromise = (async () => {
    try {
      const database = await openDatabase();
      const transaction = database.transaction(STORE_NAME, "readonly");
      const records = await requestResult(
        transaction.objectStore(STORE_NAME).getAll(),
      );
      records.forEach(record => {
        if (record?.id && typeof record.dataUrl === "string") {
          resolvedImages.set(toReference(record.id), record.dataUrl);
        }
      });
      return true;
    } catch (error) {
      console.warn("[道渊] IndexedDB 不可用，本地立绘将使用兼容存储:", error);
      return false;
    }
  })();
  return initializationPromise;
}

async function persistLocalImage(dataUrl) {
  const available = await initializeLocalPortraitImages();
  if (!available) return dataUrl;

  let id = `${dataUrl.length.toString(36)}-${hashImage(dataUrl)}`;
  let reference = toReference(id);
  let suffix = 0;
  while (
    resolvedImages.has(reference) &&
    resolvedImages.get(reference) !== dataUrl
  ) {
    suffix += 1;
    id = `${dataUrl.length.toString(36)}-${hashImage(dataUrl)}-${suffix}`;
    reference = toReference(id);
  }
  if (resolvedImages.get(reference) === dataUrl) return reference;

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({ id, dataUrl });
  await transactionDone(transaction);
  resolvedImages.set(reference, dataUrl);
  return reference;
}

export async function persistPortraitImageUrls(urls) {
  const result = [];
  for (const value of Array.isArray(urls) ? urls : []) {
    const url = String(value || "").trim();
    if (!url) continue;
    if (!/^data:image\//i.test(url)) {
      result.push(url);
      continue;
    }
    try {
      result.push(await persistLocalImage(url));
    } catch (error) {
      console.warn("[道渊] 本地立绘写入 IndexedDB 失败，保留兼容数据:", error);
      result.push(url);
    }
  }
  return result;
}

export function resolvePortraitImageUrls(urls) {
  return (Array.isArray(urls) ? urls : [])
    .map(value => {
      const url = String(value || "").trim();
      return isStoredLocalPortraitRef(url)
        ? resolvedImages.get(url) || ""
        : url;
    })
    .filter(Boolean);
}

export async function pruneLocalPortraitImages(usedUrls) {
  if (!(await initializeLocalPortraitImages())) return false;
  const usedReferences = new Set(
    (Array.isArray(usedUrls) ? usedUrls : []).filter(isStoredLocalPortraitRef),
  );
  const staleReferences = Array.from(resolvedImages.keys()).filter(
    reference => !usedReferences.has(reference),
  );
  if (staleReferences.length === 0) return true;

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  staleReferences.forEach(reference => {
    store.delete(reference.slice(REFERENCE_PREFIX.length));
  });
  await transactionDone(transaction);
  staleReferences.forEach(reference => resolvedImages.delete(reference));
  return true;
}

export { REFERENCE_PREFIX as LOCAL_PORTRAIT_REFERENCE_PREFIX };
