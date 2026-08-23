import { fetchImageLibrary } from "./api.js";
import {
  clearImageLibraryCache,
  readImageLibraryCache,
  writeImageLibraryCache,
} from "./cache.js";
import { parseImageLibrary } from "./schema.js";
import { getImageLibraryState, setImageLibrary } from "./store.js";

function notifyImageConsumers() {
  window.dispatchEvent(new CustomEvent("daoyuan_images_changed"));
}

export async function initializeImageLibrary(options = {}) {
  const { autoFetch = true } = options;
  try {
    const cached = readImageLibraryCache();
    if (cached) {
      setImageLibrary(parseImageLibrary(cached), "cache");
      window.dyImageCacheMissing = false;
      return true;
    }
  } catch (error) {
    console.warn("[道渊状态栏] 图片库缓存无效，准备重新同步:", error);
    clearImageLibraryCache();
  }

  window.dyImageCacheMissing = true;
  if (!autoFetch) return false;

  try {
    await refreshImageLibrary();
    return true;
  } catch (error) {
    console.warn("[道渊状态栏] 首次同步图片库失败:", error);
    return false;
  }
}

export async function refreshImageLibrary() {
  const parsed = parseImageLibrary(await fetchImageLibrary());
  try {
    writeImageLibraryCache(parsed);
  } catch (error) {
    console.warn(
      "[道渊状态栏] 图片库缓存写入失败，本次继续使用内存数据:",
      error,
    );
  }
  setImageLibrary(parsed, "remote");
  window.dyImageCacheMissing = false;
  notifyImageConsumers();
  return parsed;
}

export { getImageLibraryState } from "./store.js";
export * from "./selectors.js";

window.loadRemoteImages = initializeImageLibrary;
window.forceUpdateRemoteImages = refreshImageLibrary;
window.getImageLibraryState = getImageLibraryState;
