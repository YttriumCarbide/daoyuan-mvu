import {
  PREFERENCES_KEY,
  readPortraitPreferences,
  useTransientPortraitPreferences,
  writePortraitPreferences,
} from "./preferences.js";
import { IMAGES_CACHE_KEY } from "../image-library/constants.js";
import {
  isStoredLocalPortraitRef,
  persistPortraitImageUrls,
  pruneLocalPortraitImages,
} from "./local-images.js";

const MIGRATION_VERSION_KEY = "daoyuan_portrait_preferences_migration_version";
const MIGRATION_VERSION = 3;
let migrationPromise = null;
const LEGACY_THEMES = ["normal", "female", "special", "wedding", "tarot"];
const LEGACY_CUSTOM_KEYS = {
  normal: "daoyuan_custom_portraits",
  female: "daoyuan_custom_portraits_female",
  special: "daoyuan_custom_portraits_special",
};
const LEGACY_KEYS = Array.from(
  new Set([
    "daoyuan_active_portrait_pools",
    "daoyuan_portrait_indices",
    ...LEGACY_THEMES.map(theme => `daoyuan_custom_portraits_pool_${theme}`),
    ...Object.values(LEGACY_CUSTOM_KEYS),
  ]),
);

function getStorage() {
  return window.DaoyuanStatusStorage || window.localStorage;
}

function readJson(key) {
  try {
    return JSON.parse(getStorage().getItem(key) || "{}");
  } catch {
    return {};
  }
}

function toTheme(theme) {
  return theme === "normal" ? "default" : theme;
}

function toUrlArray(value) {
  const values = Array.isArray(value) ? value : String(value || "").split("|");
  return values
    .map((url) => String(url).trim())
    .filter(
      url =>
        /^(https?:\/\/|data:image\/)/i.test(url) ||
        isStoredLocalPortraitRef(url),
    );
}

function isQuotaExceededError(error) {
  return (
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    error?.code === 1014
  );
}

async function moveLocalImagesToIndexedDb(preferences) {
  const customImages = preferences.customImages || {};
  for (const themes of Object.values(customImages)) {
    if (!themes || typeof themes !== "object") continue;
    for (const [theme, urls] of Object.entries(themes)) {
      themes[theme] = await persistPortraitImageUrls(toUrlArray(urls));
    }
  }
  return preferences;
}

function getAllCustomImageUrls(preferences) {
  return Object.values(preferences.customImages || {}).flatMap(themes =>
    themes && typeof themes === "object"
      ? Object.values(themes).flatMap(urls => (Array.isArray(urls) ? urls : []))
      : [],
  );
}

function writePreferencesWithCacheRecovery(preferences, storage) {
  try {
    writePortraitPreferences(preferences);
    return;
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;
    console.warn("[道渊] 立绘迁移空间不足，清理可重新下载的图片库缓存后重试");
  }

  try {
    storage.removeItem(IMAGES_CACHE_KEY);
  } catch (error) {
    console.warn("[道渊] 图片库缓存清理失败，继续重试立绘迁移:", error);
  }
  writePortraitPreferences(preferences);
}

async function runLegacyPortraitMigration() {
  const storage = getStorage();
  if (Number(storage.getItem(MIGRATION_VERSION_KEY)) >= MIGRATION_VERSION) {
    return false;
  }

  const preferences = readPortraitPreferences();
  const legacyActive = readJson("daoyuan_active_portrait_pools");
  Object.entries(legacyActive).forEach(([name, theme]) => {
    if (!preferences.activeThemes[name]) preferences.activeThemes[name] = toTheme(theme);
  });

  const legacyIndices = readJson("daoyuan_portrait_indices");
  Object.entries(legacyIndices).forEach(([theme, names]) => {
    if (!names || typeof names !== "object") return;
    const nextTheme = toTheme(theme);
    Object.entries(names).forEach(([name, index]) => {
      preferences.indices[name] ||= {};
      if (preferences.indices[name][nextTheme] === undefined) {
        preferences.indices[name][nextTheme] = Number(index) || 0;
      }
    });
  });

  LEGACY_THEMES.forEach((legacyTheme) => {
    const theme = toTheme(legacyTheme);
    const dynamic = readJson(`daoyuan_custom_portraits_pool_${legacyTheme}`);
    const fixed = LEGACY_CUSTOM_KEYS[legacyTheme]
      ? readJson(LEGACY_CUSTOM_KEYS[legacyTheme])
      : {};
    Object.entries({ ...fixed, ...dynamic }).forEach(([name, value]) => {
      const urls = toUrlArray(value);
      if (urls.length === 0) return;
      preferences.customImages[name] ||= {};
      if (!Array.isArray(preferences.customImages[name][theme])) {
        preferences.customImages[name][theme] = urls;
      }
    });
  });

  await moveLocalImagesToIndexedDb(preferences);

  try {
    writePreferencesWithCacheRecovery(preferences, storage);
    storage.setItem(MIGRATION_VERSION_KEY, String(MIGRATION_VERSION));
    if (
      storage.getItem(MIGRATION_VERSION_KEY) !== String(MIGRATION_VERSION) ||
      !storage.getItem(PREFERENCES_KEY)
    ) {
      throw new Error("立绘迁移结果未能持久化");
    }
  } catch (error) {
    useTransientPortraitPreferences(preferences);
    console.warn(
      "[道渊] 立绘偏好迁移未能持久化；已保留旧数据并仅在本次运行中加载:",
      error,
    );
    return false;
  }

  LEGACY_KEYS.forEach(key => {
    try {
      storage.removeItem(key);
    } catch (error) {
      console.warn(`[道渊] 旧立绘键 ${key} 清理失败:`, error);
    }
  });
  try {
    await pruneLocalPortraitImages(getAllCustomImageUrls(preferences));
  } catch (error) {
    console.warn("[道渊] 清理未使用的本地立绘失败:", error);
  }
  return true;
}

export function migrateLegacyPortraitPreferences() {
  if (!migrationPromise) {
    migrationPromise = runLegacyPortraitMigration().finally(() => {
      migrationPromise = null;
    });
  }
  return migrationPromise;
}
