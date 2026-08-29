import {
  resetThemeUiConfiguration,
  setThemeUiConfiguration,
} from "./theme-ui.js";

export const PORTRAIT_DRAWERS_URL =
  "https://raw.githubusercontent.com/YttriumCarbide/Daoyuan/main/portrait-drawers.json";
export const PORTRAIT_DRAWERS_CACHE_KEY = "daoyuan_portrait_drawers_cache_v1";
export const SUPPORTED_PORTRAIT_DRAWERS_SCHEMA_VERSION = 1;

function getStorage() {
  return window.DaoyuanStatusStorage || window.localStorage;
}

function normalizePoolId(poolId) {
  const normalized = String(poolId || "").trim().toLowerCase();
  return normalized === "normal" ? "default" : normalized;
}

export function parsePortraitDrawers(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("立绘抽屉配置不是有效对象");
  }
  if (
    Number(data.schemaVersion) !== SUPPORTED_PORTRAIT_DRAWERS_SCHEMA_VERSION
  ) {
    throw new Error(
      `不支持的立绘抽屉配置版本：${data.schemaVersion ?? "缺失"}`,
    );
  }
  if (!data.pools || typeof data.pools !== "object" || Array.isArray(data.pools)) {
    throw new Error("立绘抽屉配置缺少 pools");
  }

  const pools = {};
  for (const [rawPoolId, rawPool] of Object.entries(data.pools)) {
    const poolId = normalizePoolId(rawPoolId);
    if (!poolId || !rawPool || typeof rawPool !== "object" || Array.isArray(rawPool)) {
      throw new Error(`立绘抽屉“${rawPoolId}”配置无效`);
    }
    if (pools[poolId]) {
      throw new Error(`立绘抽屉 ID 重复：${rawPoolId}`);
    }

    const name = String(rawPool.name || "").trim();
    const icon = String(rawPool.icon || "").trim();
    if (!name || !icon) {
      throw new Error(`立绘抽屉“${rawPoolId}”缺少 name 或 icon`);
    }

    const order = Number(rawPool.order);
    pools[poolId] = {
      name,
      icon,
      ...(Number.isFinite(order) ? { order } : {}),
    };
  }

  if (Object.keys(pools).length === 0) {
    throw new Error("立绘抽屉配置没有卡池数据");
  }

  const aliases = {};
  if (data.aliases !== undefined) {
    if (
      !data.aliases ||
      typeof data.aliases !== "object" ||
      Array.isArray(data.aliases)
    ) {
      throw new Error("立绘抽屉 aliases 配置无效");
    }
    for (const [rawAlias, rawTarget] of Object.entries(data.aliases)) {
      const alias = normalizePoolId(rawAlias);
      const target = normalizePoolId(rawTarget);
      if (!alias || !target) {
        throw new Error("立绘抽屉 aliases 包含空 ID");
      }
      aliases[alias] = target;
    }
  }

  return {
    schemaVersion: SUPPORTED_PORTRAIT_DRAWERS_SCHEMA_VERSION,
    pools,
    aliases,
  };
}

function readPortraitDrawersCache() {
  const saved = getStorage().getItem(PORTRAIT_DRAWERS_CACHE_KEY);
  return saved ? JSON.parse(saved) : null;
}

function writePortraitDrawersCache(data) {
  getStorage().setItem(PORTRAIT_DRAWERS_CACHE_KEY, JSON.stringify(data));
}

function clearPortraitDrawersCache() {
  getStorage().removeItem(PORTRAIT_DRAWERS_CACHE_KEY);
}

async function fetchPortraitDrawers() {
  const separator = PORTRAIT_DRAWERS_URL.includes("?") ? "&" : "?";
  const response = await fetch(
    `${PORTRAIT_DRAWERS_URL}${separator}t=${Date.now()}`,
  );
  if (!response.ok) {
    throw new Error(`立绘抽屉配置请求异常：${response.status}`);
  }
  return response.json();
}

export async function refreshPortraitDrawers() {
  const parsed = parsePortraitDrawers(await fetchPortraitDrawers());
  try {
    writePortraitDrawersCache(parsed);
  } catch (error) {
    console.warn("[道渊状态栏] 立绘抽屉配置缓存写入失败，本次继续使用内存数据:", error);
  }
  setThemeUiConfiguration(parsed);
  return parsed;
}

export async function initializePortraitDrawers(options = {}) {
  const { autoFetch = true } = options;
  try {
    const cached = readPortraitDrawersCache();
    if (cached) {
      const parsed = parsePortraitDrawers(cached);
      setThemeUiConfiguration(parsed);
      return true;
    }
  } catch (error) {
    console.warn("[道渊状态栏] 立绘抽屉配置缓存无效，准备重新同步:", error);
    clearPortraitDrawersCache();
  }

  resetThemeUiConfiguration();
  if (!autoFetch) return false;

  try {
    await refreshPortraitDrawers();
    return true;
  } catch (error) {
    console.warn("[道渊状态栏] 立绘抽屉配置同步失败，继续使用内置名称和图标:", error);
    return false;
  }
}
