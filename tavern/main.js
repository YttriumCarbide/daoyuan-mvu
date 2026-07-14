const elements = {
  app: document.querySelector(".tavern"),
  chat: document.querySelector("#chat"),
  drawerTitle: document.querySelector("#drawer-title"),
  drawerCopy: document.querySelector("#drawer-copy"),
  form: document.querySelector("#send_form"),
  frame: document.querySelector("#status-frame"),
  input: document.querySelector("#send_textarea"),
  statusMessage: document.querySelector("#status-message"),
  toast: document.querySelector("#toast"),
};

const panelDescriptions = {
  参数: "模拟生成参数、采样与上下文设置。状态栏测试不依赖这些选项。",
  API: "模拟 SillyTavern API 连接面板。当前开发服务器始终显示为已连接。",
  格式: "模拟字体、消息布局与主题设置。页面会自动适配移动端和桌面端。",
  世界书: "模拟世界书入口，用于检查浮层是否会遮挡状态栏。",
  角色: "当前角色：萧曦月；当前聊天：《道渊》v5.2。",
  背景: "背景使用本地渐变，无需加载 SillyTavern 的主题资源。",
  扩展: "状态栏以真实 iframe 方式加载，可测试滚动、点击与弹窗层级。",
  表情: "模拟表情菜单入口。",
  资料: "模拟角色资料入口。",
};

let toastTimer;
let frameObserver;
let frameResizeFrame;

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1800);
}

function setPanel(name) {
  const isSamePanel =
    elements.app.dataset.panelOpen === "true" &&
    elements.drawerTitle.textContent === name;

  elements.app.dataset.panelOpen = String(!isSamePanel);
  elements.drawerTitle.textContent = name;
  elements.drawerCopy.textContent = panelDescriptions[name];

  document.querySelectorAll(".tool-button").forEach((button) => {
    button.classList.toggle("is-active", !isSamePanel && button.dataset.panel === name);
  });
}

function closePanel() {
  elements.app.dataset.panelOpen = "false";
  document.querySelectorAll(".tool-button").forEach((button) => {
    button.classList.remove("is-active");
  });
}

function resizeTextarea() {
  elements.input.style.height = "auto";
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 130)}px`;
}

function createUserMessage(text) {
  const message = document.createElement("article");
  message.className = "message message-user";

  const avatar = document.createElement("div");
  avatar.className = "avatar avatar-user";
  avatar.textContent = "萧";

  const main = document.createElement("div");
  main.className = "message-main mes_block";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  const name = document.createElement("strong");
  name.textContent = "User";
  const time = document.createElement("time");
  time.textContent = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  meta.append(name, time);

  const content = document.createElement("div");
  content.className = "mes_text";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  content.append(paragraph);
  main.append(meta, content);
  message.append(avatar, main);
  return message;
}

function syncFrameHeight() {
  const documentElement = elements.frame.contentDocument?.documentElement;
  const body = elements.frame.contentDocument?.body;
  if (!documentElement || !body) return;

  const height = Math.max(
    documentElement.scrollHeight,
    documentElement.offsetHeight,
    body.scrollHeight,
    body.offsetHeight,
  );
  elements.frame.style.height = `${height}px`;
}

function scheduleFrameHeightSync() {
  window.cancelAnimationFrame(frameResizeFrame);
  frameResizeFrame = window.requestAnimationFrame(syncFrameHeight);
}

function observeFrameSize() {
  frameObserver?.disconnect();
  syncFrameHeight();

  const frameBody = elements.frame.contentDocument?.body;
  if (!frameBody || typeof ResizeObserver === "undefined") return;

  frameObserver = new ResizeObserver(syncFrameHeight);
  frameObserver.observe(frameBody);
}

function prepareSrcdoc(html) {
  const baseUrl = new URL("/src/", window.location.origin).href;
  const frameHead = [
    /<base\s/i.test(html) ? "" : `<base href="${baseUrl}">`,
    /name=["']viewport["']/i.test(html)
      ? ""
      : '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<style>html, body { background: transparent !important; color-scheme: dark; }</style>",
  ].join("");

  return html.replace(/<head(.*?)>/i, `<head$1>${frameHead}`);
}

async function loadStatusSrcdoc() {
  const source = elements.frame.dataset.source;

  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    elements.frame.srcdoc = prepareSrcdoc(await response.text());
  } catch (error) {
    console.error("Unable to build the status srcdoc", error);
    elements.frame.srcdoc = `
      <!doctype html>
      <meta name="color-scheme" content="dark">
      <style>
        body { margin: 0; padding: 20px; color: #dcdcd2; background: #171719;
          font: 14px/1.6 system-ui, sans-serif; }
        strong { color: #ef8d96; }
      </style>
      <strong>状态栏载入失败</strong><br>
      请查看开发服务器终端中的错误信息。
    `;
  }
}

document.querySelectorAll(".tool-button").forEach((button) => {
  button.addEventListener("click", () => setPanel(button.dataset.panel));
});

document.querySelector(".drawer-close").addEventListener("click", closePanel);

document.querySelector('[data-action="scroll-status"]').addEventListener("click", () => {
  elements.statusMessage.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.input.addEventListener("input", resizeTextarea);
elements.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.form.requestSubmit();
  }
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.input.value.trim();
  if (!text) {
    showToast("请输入消息");
    return;
  }

  elements.chat.append(createUserMessage(text));
  elements.input.value = "";
  resizeTextarea();
  elements.chat.scrollTo({ top: elements.chat.scrollHeight, behavior: "smooth" });
  showToast("模拟消息已加入会话（不会调用模型）");
});

elements.frame.addEventListener("load", () => {
  observeFrameSize();
  window.setTimeout(syncFrameHeight, 250);
});

window.addEventListener("resize", scheduleFrameHeightSync);

loadStatusSrcdoc();
