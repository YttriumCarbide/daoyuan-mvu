import { IMAGES_CACHE_KEY } from "./constants.js";

function getStorage() {
  return window.DaoyuanStatusStorage || window.localStorage;
}

export function readImageLibraryCache() {
  const saved = getStorage().getItem(IMAGES_CACHE_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function writeImageLibraryCache(data) {
  getStorage().setItem(IMAGES_CACHE_KEY, JSON.stringify(data));
}

export function clearImageLibraryCache() {
  getStorage().removeItem(IMAGES_CACHE_KEY);
}
