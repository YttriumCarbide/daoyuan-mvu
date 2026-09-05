import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { IMAGES_CACHE_KEY } from "../src/features/image-library/constants.js";
import { parseImageLibrary } from "../src/features/image-library/schema.js";
import * as store from "../src/features/image-library/store.js";
import { getCharacterEntity, getSectMapImages } from "../src/features/image-library/selectors.js";

const image = (url, theme = "default", tags = []) => ({ url, theme, tags });
const index = (entities) => ({ schemaVersion: 2, data: { entities } });
const main = index({
  林雪: { type: "character", images: [image("https://example.com/base.png")] },
});
const workshop = index({
  林雪: { type: "character", images: [image("https://example.com/mod.png", "festival")] },
  工坊角色: { type: "character", images: [image("https://example.com/character.png")] },
  工坊宗门: { type: "sect", images: [image("https://example.com/map.png", "map")] },
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const values = new Map();
const page = new EventTarget();
// Node 18 has EventTarget, but CustomEvent is only available behind a flag.
globalThis.CustomEvent ??= class CustomEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail ?? null;
  }
};
page.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
globalThis.window = page;
const library = await import("../src/features/image-library/index.js");
const originalFetch = globalThis.fetch;

beforeEach(() => {
  values.clear();
  page.parent = {};
  delete page.DaoyuanWorkshopAPI;
  delete page.waitGlobalInitialized;
  store.setWorkshopImageLibrary?.(null);
  store.setImageLibrary(main, "test");
});

afterEach(() => { globalThis.fetch = originalFetch; });

test("v2 preserves open themes, tags and comments and rejects legacy portraits", () => {
  const valid = index({ 人物: { type: "character", images: [{ ...image("https://example.com/a.png", "新主题", ["自定义标签"]), comment: "备注" }] } });
  assert.deepEqual(parseImageLibrary(valid), valid);
  assert.throws(() => parseImageLibrary({ normal: { 人物: "https://example.com/a.png" } }));
});

test("v2 rejects malformed boundary values without coercing them", () => {
  const bad = [
    { ...main, schemaVersion: "2" },
    index({ 人物: { type: "character", images: [{ url: "https://example.com/a.png", theme: "default" }] } }),
    index({ 人物: { type: "character", images: [image("http://example.com/a.png")] } }),
    index({ 人物: { type: "character", images: [image("https://example.com/a.png", " ")] } }),
    index({ 人物: { type: "character", images: [image("https://example.com/a.png", "default", [42])] } }),
  ];
  bad.forEach((value) => assert.throws(() => parseImageLibrary(value)));
});

test("merged selectors append Workshop images and retain main on cross-type conflicts", () => {
  const extra = structuredClone(workshop);
  extra.data.entities.林雪.images.unshift(image("https://example.com/base.png", "default", ["mod-tag"]));
  extra.data.entities.冲突 = { type: "sect", images: [image("https://example.com/conflict.png", "map")] };
  const base = index({ ...main.data.entities, 冲突: { type: "character", images: [] } });
  const original = JSON.stringify({ base, extra });
  function freeze(value) {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  }
  freeze(base); freeze(extra);
  store.setImageLibrary(base, "cache");
  store.setWorkshopImageLibrary(extra);
  assert.deepEqual(getCharacterEntity("林雪").images, [
    image("https://example.com/base.png", "default", ["mod-tag"]),
    image("https://example.com/mod.png", "festival"),
  ]);
  assert.ok(getCharacterEntity("工坊角色"));
  assert.equal(getSectMapImages("工坊宗门")[0].url, "https://example.com/map.png");
  assert.equal(getCharacterEntity("冲突").type, "character");
  assert.equal(JSON.stringify({ base, extra }), original);
  store.setWorkshopImageLibrary(null);
  assert.equal(getCharacterEntity("工坊角色"), null);
  assert.deepEqual(getCharacterEntity("林雪"), main.data.entities.林雪);
});

test("same URL in different themes remains available in both themes", () => {
  store.setWorkshopImageLibrary(index({ 林雪: { type: "character", images: [image("https://example.com/base.png", "female")] } }));
  assert.deepEqual(getCharacterEntity("林雪").images.map((item) => item.theme), ["default", "female"]);
});

test("entity names are own keys, including names shared with Object.prototype", () => {
  const parsed = parseImageLibrary(JSON.parse('{"schemaVersion":2,"data":{"entities":{"__proto__":{"type":"character","images":[]}}}}'));
  store.setImageLibrary(parsed, "test");
  assert.ok(getCharacterEntity("__proto__"));
  assert.equal(getCharacterEntity("constructor"), null);
});

test("reads current parent API after discovery, without relying on a child API copy", async () => {
  const obsolete = { getImages() { throw new Error("obsolete API"); } };
  page.parent = { DaoyuanWorkshopAPI: obsolete };
  page.DaoyuanWorkshopAPI = obsolete;
  page.waitGlobalInitialized = async () => {
    page.parent.DaoyuanWorkshopAPI = { getImages: async () => workshop };
  };
  assert.equal(await library.loadWorkshopImages(), true);
  assert.ok(getCharacterEntity("工坊角色"));
});

test("waits for an initially absent parent API before reading Workshop images", async () => {
  const discovery = deferred();
  let discoveryCalls = 0;
  let readCalls = 0;
  page.waitGlobalInitialized = (name) => {
    assert.equal(name, "DaoyuanWorkshopAPI");
    discoveryCalls++;
    return discovery.promise;
  };
  const loading = library.loadWorkshopImages();
  assert.deepEqual(getCharacterEntity("林雪"), main.data.entities.林雪);
  page.parent.DaoyuanWorkshopAPI = {
    getImages: async () => { readCalls++; return workshop; },
  };
  discovery.resolve();
  assert.equal(await loading, true);
  assert.equal(discoveryCalls, 1);
  assert.equal(readCalls, 1);
  assert.ok(getCharacterEntity("工坊角色"));
});

test("a stalled API discovery times out and cannot publish late images", { timeout: 5000 }, async () => {
  const discovery = deferred();
  page.waitGlobalInitialized = () => discovery.promise;
  const started = Date.now();
  assert.equal(await library.loadWorkshopImages(), false);
  assert.ok(Date.now() - started >= 1900);
  page.parent.DaoyuanWorkshopAPI = { getImages: async () => workshop };
  discovery.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(getCharacterEntity("工坊角色"), null);
  assert.deepEqual(getCharacterEntity("林雪"), main.data.entities.林雪);
});

test("failed API discovery leaves the main library usable", async () => {
  page.waitGlobalInitialized = async () => { throw new Error("discovery failed"); };
  assert.equal(await library.loadWorkshopImages(), false);
  assert.deepEqual(getCharacterEntity("林雪"), main.data.entities.林雪);
});

test("absent or inaccessible parent API leaves the main library usable", async () => {
  page.DaoyuanWorkshopAPI = { getImages: async () => workshop };
  assert.equal(await library.loadWorkshopImages(), false);
  page.parent = new Proxy({}, { get() { throw new DOMException("Blocked", "SecurityError"); } });
  assert.equal(await library.loadWorkshopImages(), false);
  assert.deepEqual(getCharacterEntity("林雪"), main.data.entities.林雪);
});

test("Workshop sync throws, rejections and invalid indexes are isolated", async () => {
  const readers = [
    () => { throw new Error("sync failure"); },
    ...["WORKSHOP_IMAGES_EMPTY", "WORKSHOP_IMAGES_INVALID", "WORKSHOP_IMAGES_READ_FAILED", "WORKSHOP_API_STALE"].map((code) => async () => { throw { code }; }),
    async () => ({ schemaVersion: 1, data: {} }),
  ];
  for (const getImages of readers) {
    page.parent = { DaoyuanWorkshopAPI: { getImages } };
    assert.equal(await library.loadWorkshopImages(), false);
    assert.equal(getCharacterEntity("工坊角色"), null);
    assert.deepEqual(getCharacterEntity("林雪"), main.data.entities.林雪);
  }
});

test("a hung Workshop read cannot block primary cache initialization or refresh", async () => {
  const pending = deferred();
  page.parent = { DaoyuanWorkshopAPI: { getImages: () => pending.promise } };
  const optional = library.loadWorkshopImages();
  values.set(IMAGES_CACHE_KEY, JSON.stringify(main));
  assert.equal(await library.initializeImageLibrary({ autoFetch: false }), true);
  globalThis.fetch = async () => ({ ok: true, json: async () => main });
  await library.refreshImageLibrary();
  assert.deepEqual(getCharacterEntity("林雪"), main.data.entities.林雪);
  pending.resolve(workshop);
  await optional;
});

test("timeout discards a late Workshop result", { timeout: 5000 }, async () => {
  const pending = deferred();
  page.parent = { DaoyuanWorkshopAPI: { getImages: () => pending.promise } };
  const result = library.loadWorkshopImages();
  assert.equal(await result, false);
  pending.resolve(workshop);
  await Promise.resolve();
  assert.equal(getCharacterEntity("工坊角色"), null);
});

test("main refresh persists only main data and keeps the current Workshop projection", async () => {
  store.setWorkshopImageLibrary(workshop);
  globalThis.fetch = async () => ({ ok: true, json: async () => main });
  await library.refreshImageLibrary();
  assert.ok(getCharacterEntity("工坊角色"));
  assert.deepEqual(JSON.parse(values.get(IMAGES_CACHE_KEY)), main);
});

test("Workshop is usable without a main library", async () => {
  store.setImageLibrary(null, null);
  page.parent = { DaoyuanWorkshopAPI: { getImages: async () => workshop } };
  await library.loadWorkshopImages();
  assert.ok(getCharacterEntity("工坊角色"));
  assert.equal(values.has(IMAGES_CACHE_KEY), false);
});
