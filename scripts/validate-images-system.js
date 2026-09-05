import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseImageLibrary } from "../src/features/image-library/schema.js";
import {
  getCharacterEntity,
  getSectMapImages,
  groupCharacterImagesByTheme,
} from "../src/features/image-library/selectors.js";
import { setImageLibrary } from "../src/features/image-library/store.js";
import { canUsePortraitTheme } from "../src/features/portraits/rules.js";
import { parsePortraitDrawers } from "../src/features/portraits/drawers.js";
import {
  getThemeUi,
  resetThemeUiConfiguration,
  setThemeUiConfiguration,
} from "../src/features/portraits/theme-ui.js";

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

class LimitedStorage extends MemoryStorage {
  constructor(entries, limit) {
    super(entries);
    this.limit = limit;
  }

  setItem(key, value) {
    const normalizedValue = String(value);
    const next = new Map(this.values);
    next.set(key, normalizedValue);
    const size = Array.from(next.entries()).reduce(
      (total, [entryKey, entryValue]) =>
        total + String(entryKey).length + String(entryValue).length,
      0,
    );
    if (size > this.limit) {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    }
    this.values = next;
  }
}

const fixture = parseImageLibrary({
  schemaVersion: 2,
  data: {
    entities: {
      测试人物: {
        type: "character",
        images: [
          { url: "https://example.com/default-1.png", theme: "default" },
          { url: "https://example.com/special.png", theme: "special" },
          { url: "https://example.com/default-2.png", theme: "default" },
          { url: "https://example.com/tarot.png", theme: "tarot" },
          { url: "https://example.com/swimsuit.png", theme: "swimsuit" },
          { url: "https://example.com/nai.png", theme: "nai" },
        ],
      },
      测试婚纱人物: {
        type: "character",
        images: [
          { url: "https://example.com/default.png", theme: "default" },
          { url: "https://example.com/wedding.png", theme: "wedding" },
        ],
      },
      测试宗门: {
        type: "sect",
        images: [{ url: "https://example.com/map.png", theme: "map" }],
      },
    },
  },
});

setImageLibrary(fixture, "test");
assert.equal(getCharacterEntity("测试人物")?.type, "character");
assert.equal(getCharacterEntity("测试宗门"), null);
assert.deepEqual(
  Array.from(groupCharacterImagesByTheme("测试人物").keys()),
  ["default", "special", "tarot", "swimsuit", "nai"],
);
assert.equal(
  groupCharacterImagesByTheme("测试人物").has("wedding"),
  false,
);
assert.equal(
  groupCharacterImagesByTheme("测试婚纱人物").has("wedding"),
  true,
);
assert.equal(getSectMapImages("测试宗门")[0].url, "https://example.com/map.png");
assert.equal(
  canUsePortraitTheme("special", [{ url: "x" }], { 好感度: 90 }),
  false,
);
assert.equal(
  canUsePortraitTheme("special", [{ url: "x" }], { 好感度: 91 }),
  true,
);
assert.equal(canUsePortraitTheme("wedding", [], {}), false);
assert.equal(canUsePortraitTheme("nai", [], {}), false);
assert.equal(canUsePortraitTheme("nai", [{ url: "x" }], {}), true);
assert.deepEqual(getThemeUi("nai"), { name: "Nai", icon: "🥛" });
assert.deepEqual(getThemeUi("swimsuit"), { name: "泳装", icon: "👙" });

const drawerFixture = parsePortraitDrawers({
  schemaVersion: 1,
  pools: {
    normal: { name: "常服", icon: "🌿", order: 10 },
    Tarot: { name: "秘仪", icon: "🃏", order: 20 },
    festival: { name: "庆典", icon: "🎉", order: 30 },
  },
  aliases: { celebration: "festival" },
});
setThemeUiConfiguration(drawerFixture);
assert.deepEqual(getThemeUi("default"), {
  name: "常服",
  icon: "🌿",
  order: 10,
});
assert.deepEqual(getThemeUi("tarot"), {
  name: "秘仪",
  icon: "🃏",
  order: 20,
});
assert.deepEqual(getThemeUi("festival"), {
  name: "庆典",
  icon: "🎉",
  order: 30,
});
assert.deepEqual(getThemeUi("celebration"), getThemeUi("festival"));
resetThemeUiConfiguration();

globalThis.window = {
  localStorage: new MemoryStorage({
    daoyuan_active_portrait_pools: JSON.stringify({ 测试人物: "normal" }),
    daoyuan_portrait_indices: JSON.stringify({ normal: { 测试人物: 1 } }),
    daoyuan_custom_portraits_pool_normal: JSON.stringify({
      测试人物: "https://example.com/a.png|https://example.com/b.png",
    }),
  }),
};

const { migrateLegacyPortraitPreferences } = await import(
  "../src/features/portraits/migration.js"
);
const { readPortraitPreferences } = await import(
  "../src/features/portraits/preferences.js"
);

assert.equal(await migrateLegacyPortraitPreferences(), true);
const preferences = readPortraitPreferences();
assert.equal(preferences.activeThemes.测试人物, "default");
assert.equal(preferences.indices.测试人物.default, 1);
assert.deepEqual(preferences.customImages.测试人物.default, [
  "https://example.com/a.png",
  "https://example.com/b.png",
]);
assert.equal(await migrateLegacyPortraitPreferences(), false);
assert.equal(
  window.localStorage.getItem("daoyuan_portrait_preferences_migration_version"),
  "3",
);
assert.equal(
  window.localStorage.getItem("daoyuan_custom_portraits_pool_normal"),
  null,
);

window.localStorage = new LimitedStorage(
  {
    daoyuan_images_cache_v2: "x".repeat(350),
    daoyuan_active_portrait_pools: JSON.stringify({ 缓存恢复人物: "normal" }),
    daoyuan_custom_portraits_pool_normal: JSON.stringify({
      缓存恢复人物: "https://example.com/recovered.png",
    }),
  },
  600,
);
assert.equal(await migrateLegacyPortraitPreferences(), true);
assert.equal(window.localStorage.getItem("daoyuan_images_cache_v2"), null);
assert.equal(
  readPortraitPreferences().customImages.缓存恢复人物.default[0],
  "https://example.com/recovered.png",
);

const largeLegacyUrls = Array.from(
  { length: 18 },
  (_, index) => `https://example.com/large-${index}-${"x".repeat(35)}.png`,
);
window.localStorage = new LimitedStorage(
  {
    daoyuan_custom_portraits_pool_normal: JSON.stringify({
      保留旧数据人物: largeLegacyUrls,
    }),
  },
  1400,
);
assert.equal(await migrateLegacyPortraitPreferences(), false);
assert.equal(
  window.localStorage.getItem("daoyuan_portrait_preferences_migration_version"),
  null,
);
assert.notEqual(
  window.localStorage.getItem("daoyuan_custom_portraits_pool_normal"),
  null,
);
assert.deepEqual(
  readPortraitPreferences().customImages.保留旧数据人物.default,
  largeLegacyUrls,
);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtimeFiles = [
  path.join(projectRoot, "src/components/portraits.js"),
  path.join(projectRoot, "src/components/maps.js"),
  path.join(projectRoot, "src/components/init.js"),
  path.join(projectRoot, "src/features/image-library/constants.js"),
  path.join(projectRoot, "src/features/portraits/drawers.js"),
];
const runtimeSource = runtimeFiles
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const portraitsSource = fs.readFileSync(runtimeFiles[0], "utf8");
for (const legacyFile of [
  "portraits.json",
  "sect-maps.json",
]) {
  assert.equal(runtimeSource.includes(legacyFile), false, legacyFile);
}
assert.equal(runtimeSource.includes("images.json"), true);
assert.equal(runtimeSource.includes("portrait-drawers.json"), true);
assert.equal(runtimeSource.includes("daoyuan_portrait_drawers_cache_v1"), true);
assert.equal(runtimeSource.includes("notice.json"), true);
assert.equal(portraitsSource.includes("...Object.keys(THEME_UI)"), false);
assert.equal(
  portraitsSource.includes("if (!value || urls.length === 0)"),
  true,
);

console.log(
  "IMAGES_SYSTEM_OK schema, entity routing, remote drawer metadata, theme order, drawer visibility, Nai UI, special rule, quota recovery, and safe local migration",
);
