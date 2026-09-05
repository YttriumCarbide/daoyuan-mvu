import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { escapeHtmlAttribute } from "../src/utils/html.js";

// Exercise the actual UI handlers with a small DOM fixture. Only the two
// display helpers are supplied here; applause's JSON import is bundled by Vite.
const source = readFileSync(new URL("../src/components/ui.js", import.meta.url), "utf8")
  .replace(/^import[^\n]*\n/gm, "");

function createChatPage() {
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, {
        style: {}, value: "", innerHTML: "",
        classList: {
          add: (name) => classes.add(name),
          remove: (name) => classes.delete(name),
          contains: (name) => classes.has(name),
        },
      });
    }
    return nodes.get(id);
  }
  const document = { getElementById: element, querySelectorAll: () => [] };
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  const variables = { stat_data: { 玉简: {
    林雪: { 性别: "女", 历史记录: {} },
    瑶汐: { 性别: "女", 历史记录: {} },
  } } };
  const window = {
    getAllVariables: () => variables,
    getPortraitUrl: () => "https://example.com/base.png",
    fairyGuide: { updateData() {} },
  };
  const jquery = {
    text() { return this; }, css() { return this; }, html() { return this; },
    addClass() { return this; }, removeClass() { return this; },
    off() { return this; }, on() { return this; }, each() { return this; },
  };
  vm.runInNewContext(source, {
    window, document, localStorage, console, escapeHtmlAttribute,
    renderDaoyuanApplause: () => "",
    $: () => jquery,
    _: { get: (object, key, fallback) => object[key] ?? fallback },
    setTimeout: () => 0,
  }, { filename: "src/components/ui.js" });
  window.populateCharacterData();
  return { window, element, variables };
}

test("refreshing an open chat updates images and messages without resetting its composer", () => {
  const { window, element, variables } = createChatPage();
  window.openChatView("林雪");
  const input = element("wx-reply-input");
  input.value = "尚未发送的传讯\n第二行";
  input.style.height = "96px";
  element("wx-detail-modal").classList.add("show");
  window.getPortraitUrl = () => "https://example.com/workshop.png";
  variables.stat_data.玉简.林雪.历史记录.新消息 = { 发送者: "林雪", 内容: "新的传讯" };

  // The image-library notification uses the same refresh as MVU updates.
  window.populateCharacterData();

  assert.equal(input.value, "尚未发送的传讯\n第二行");
  assert.equal(input.style.height, "96px");
  assert.equal(element("wx-detail-modal").classList.contains("show"), true);
  assert.equal(element("wx-chat-bg").style.backgroundImage, 'url("https://example.com/workshop.png")');
  assert.match(element("wx-chat-messages").innerHTML, /新的传讯/);
});

test("opening another chat still initializes a fresh composer", () => {
  const { window, element } = createChatPage();
  window.openChatView("林雪");
  element("wx-reply-input").value = "林雪的草稿";
  element("wx-reply-input").style.height = "96px";
  element("wx-detail-modal").classList.add("show");

  window.openChatView("瑶汐");

  assert.equal(window.currentActiveChat, "瑶汐");
  assert.equal(element("wx-reply-input").value, "");
  assert.equal(element("wx-reply-input").style.height, "auto");
  assert.equal(element("wx-detail-modal").classList.contains("show"), false);
  assert.match(element("wx-reply-input").placeholder, /瑶汐/);
});
