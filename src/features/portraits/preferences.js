import {
  pruneLocalPortraitImages,
  resolvePortraitImageUrls,
} from "./local-images.js";

const PREFERENCES_KEY = "daoyuan_portrait_preferences_v2";
let transientPreferences = null;

function getStorage() {
  return window.DaoyuanStatusStorage || window.localStorage;
}

function createEmptyPreferences() {
  return { activeThemes: {}, indices: {}, customImages: {} };
}

export function readPortraitPreferences() {
  try {
    const saved = transientPreferences || getStorage().getItem(PREFERENCES_KEY);
    if (!saved) return createEmptyPreferences();
    const parsed = JSON.parse(saved);
    return {
      activeThemes: parsed?.activeThemes || {},
      indices: parsed?.indices || {},
      customImages: parsed?.customImages || {},
    };
  } catch (error) {
    console.warn("[道渊] 读取立绘偏好失败:", error);
    return createEmptyPreferences();
  }
}

export function writePortraitPreferences(preferences) {
  const storage = getStorage();
  const serialized = JSON.stringify(preferences);
  storage.setItem(PREFERENCES_KEY, serialized);
  if (storage.getItem(PREFERENCES_KEY) !== serialized) {
    throw new Error("立绘偏好未能持久化到浏览器存储");
  }
  transientPreferences = null;
  return true;
}

function getStoredCustomImageUrls(preferences) {
  return Object.values(preferences.customImages || {}).flatMap(themes =>
    themes && typeof themes === "object"
      ? Object.values(themes).flatMap(urls => (Array.isArray(urls) ? urls : []))
      : [],
  );
}

function pruneUnusedLocalImages(preferences) {
  void pruneLocalPortraitImages(getStoredCustomImageUrls(preferences)).catch(
    error => console.warn("[道渊] 清理未使用的本地立绘失败:", error),
  );
}

export function useTransientPortraitPreferences(preferences) {
  transientPreferences = JSON.stringify(preferences);
}

export function getActiveTheme(name) {
  return readPortraitPreferences().activeThemes[name] || "";
}

export function setActiveTheme(name, theme) {
  const preferences = readPortraitPreferences();
  preferences.activeThemes[name] = theme;
  writePortraitPreferences(preferences);
}

export function getPortraitIndex(name, theme, length) {
  if (length <= 0) return 0;
  const stored = Number(readPortraitPreferences().indices[name]?.[theme]);
  return Number.isInteger(stored) && stored >= 0 ? stored % length : 0;
}

export function setPortraitIndex(name, theme, index) {
  const preferences = readPortraitPreferences();
  preferences.indices[name] ||= {};
  preferences.indices[name][theme] = index;
  writePortraitPreferences(preferences);
}

export function getCustomImages(name, theme) {
  const images = readPortraitPreferences().customImages[name]?.[theme];
  return resolvePortraitImageUrls(images);
}

export function setCustomImages(name, theme, urls) {
  const preferences = readPortraitPreferences();
  preferences.customImages[name] ||= {};
  preferences.customImages[name][theme] = urls.slice();
  writePortraitPreferences(preferences);
}

export function removeCustomImages(name, theme) {
  const preferences = readPortraitPreferences();
  if (preferences.customImages[name]) {
    delete preferences.customImages[name][theme];
    if (Object.keys(preferences.customImages[name]).length === 0) {
      delete preferences.customImages[name];
    }
    writePortraitPreferences(preferences);
    pruneUnusedLocalImages(preferences);
  }
}

export function resetPortraitPreferences() {
  writePortraitPreferences(createEmptyPreferences());
  pruneUnusedLocalImages(createEmptyPreferences());
}

export { PREFERENCES_KEY };
