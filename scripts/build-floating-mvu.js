import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distHtmlPath = path.join(projectRoot, "dist/index.html");
const outputPath = path.join(projectRoot, "dist/daoyuan-floating-mvu.json");
const legacyOutputPath = path.join(
  projectRoot,
  "dist/daoyuan-floating-mvu.js",
);
const floatingPetAssetDir = path.join(
  projectRoot,
  "src/assets/floating-pet",
);
const floatingPetAssetFiles = {
  idle: "idle.webp",
  press: "press.webp",
  drag: "drag.webp",
  open: "open.webp",
  close: "close.webp",
  peekLeft: "peek-left.webp",
  peekRight: "peek-right.webp",
};

const floatingPetAssets = Object.fromEntries(
  Object.entries(floatingPetAssetFiles).map(([state, filename]) => {
    const assetPath = path.join(floatingPetAssetDir, filename);
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Floating pet asset not found at ${assetPath}`);
    }
    return [
      state,
      `data:image/webp;base64,${fs.readFileSync(assetPath).toString("base64")}`,
    ];
  }),
);

if (!fs.existsSync(distHtmlPath)) {
  throw new Error(
    `Build output not found at ${distHtmlPath}. Run the MVU Vite build first.`,
  );
}

const bootstrapSource = String.raw`
(() => {
  const bridge = window.frameElement && window.frameElement.__daoyuanFloatingBridge;
  if (!bridge) {
    throw new Error("[道渊悬浮状态栏] 未找到酒馆助手数据桥");
  }

  const hostJQuery = bridge.api.$;
  if (typeof hostJQuery !== "function") {
    throw new Error("[道渊悬浮状态栏] 酒馆助手未提供 jQuery");
  }

  function childJQuery(selector, context) {
    if (typeof selector === "function") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", selector, { once: true });
      } else {
        queueMicrotask(selector);
      }
      return hostJQuery(document);
    }
    if (typeof selector === "string" && context === undefined) {
      return hostJQuery(selector, document);
    }
    return hostJQuery(selector, context);
  }

  Object.setPrototypeOf(childJQuery, hostJQuery);
  Object.assign(childJQuery, hostJQuery);
  childJQuery.fn = hostJQuery.fn;

  window.$ = childJQuery;
  window.jQuery = childJQuery;
  window._ = bridge.api._;
  window.Mvu = bridge.Mvu;
  window.waitGlobalInitialized = bridge.waitGlobalInitialized;
  window.eventOn = bridge.eventOn;
  window.eventEmit = bridge.api.eventEmit;
  window.errorCatched = bridge.api.errorCatched;
  window.getAllVariables = bridge.getLatestMvuData;
  window.DaoyuanStatusStorage =
    bridge.storage &&
    typeof bridge.storage.getItem === "function" &&
    typeof bridge.storage.setItem === "function"
      ? bridge.storage
      : window.localStorage;

  [
    "getLastMessageId",
    "getChatMessages",
    "getVariables",
    "replaceVariables",
    "updateVariablesWith",
    "getLorebookEntries",
    "getOrCreateChatLorebook",
    "getCurrentCharPrimaryLorebook",
    "getCharLorebooks",
    "getPersonaAvatarPath",
    "generate",
  ].forEach(name => {
    if (typeof bridge.api[name] === "function") {
      window[name] = bridge.api[name];
    }
  });

  const scrollSelectors = [
    ".tab-content",
    "#wx-chat-messages",
    "#wx-list-view",
    "#dy-notice-content",
  ];

  function captureViewState() {
    const scroll = [];
    document.querySelectorAll(scrollSelectors.join(",")).forEach((element, index) => {
      scroll.push({
        selector: element.id ? "#" + CSS.escape(element.id) : null,
        index,
        top: element.scrollTop,
        left: element.scrollLeft,
      });
    });
    return { scroll };
  }

  function restoreViewState(state) {
    if (!state) return;
    const elements = Array.from(
      document.querySelectorAll(scrollSelectors.join(",")),
    );
    state.scroll.forEach(item => {
      const element =
        (item.selector && document.querySelector(item.selector)) ||
        elements[item.index];
      if (element) {
        element.scrollTop = item.top;
        element.scrollLeft = item.left;
      }
    });
  }

  window.__daoyuanInstallStableRefresh = function() {
    const original = window.populateCharacterData;
    if (
      typeof original !== "function" ||
      original.__daoyuanStableRefresh
    ) {
      return;
    }
    const wrapped = function(...args) {
      const state = captureViewState();
      const result = original.apply(this, args);
      requestAnimationFrame(() => restoreViewState(state));
      return result;
    };
    wrapped.__daoyuanStableRefresh = true;
    window.populateCharacterData = wrapped;
  };

  const notifySize = () => {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
    );
    bridge.resize(height);
  };

  window.addEventListener("load", () => {
    window.__daoyuanInstallStableRefresh();
    notifySize();
    requestAnimationFrame(() => {
      notifySize();
      bridge.ready();
    });
  });

  window.addEventListener("error", event => {
    const message =
      event.error?.message || event.message || "悬浮界面脚本执行失败";
    if (message.includes("ResizeObserver loop")) return;
    bridge.fail(message);
  });
  window.addEventListener("unhandledrejection", event => {
    bridge.fail(event.reason?.message || String(event.reason || "悬浮界面初始化失败"));
  });

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(notifySize);
    resizeObserver.observe(document.documentElement);
  }
})();
`;

function injectBootstrap(html) {
  const bootstrapTag = `<script>${bootstrapSource}<\/script>`;
  const floatingStyleTag = `<style>
html,body{width:100%!important;height:100%!important;overflow:hidden!important;background:transparent!important;}
body{margin:0!important;padding:0!important;}
.terminal-container{box-sizing:border-box!important;width:100%!important;height:100%!important;max-width:none!important;min-height:0!important;border:0!important;border-radius:12px!important;}
.terminal-container>.top-bar,.terminal-container>.header{flex:0 0 auto!important;}
.terminal-container>.content-grid{flex:1 1 auto!important;min-width:0!important;min-height:0!important;}
.terminal-container>.content-grid>.status-panel,.terminal-container>.content-grid>.main-panel{min-width:0!important;}
@media (min-width:701px){
  .terminal-container>.content-grid{overflow:hidden!important;}
  .terminal-container>.content-grid>.status-panel{min-height:0!important;overflow-x:hidden!important;overflow-y:auto!important;}
  .terminal-container>.content-grid>.main-panel{min-height:0!important;overflow:hidden!important;}
  .terminal-container>.content-grid>.main-panel>.nav-tabs{flex:0 0 auto!important;}
  .terminal-container>.content-grid>.main-panel>.tab-content{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;}
}
@media (max-width:700px){
  .terminal-container>.content-grid{overflow-x:hidden!important;overflow-y:auto!important;}
  .terminal-container>.content-grid>.status-panel{overflow:visible!important;}
  .terminal-container>.content-grid>.main-panel{min-height:auto!important;overflow:visible!important;}
  .terminal-container>.content-grid>.main-panel>.tab-content{flex:none!important;max-height:none!important;overflow:visible!important;}
}
*{scrollbar-width:thin;scrollbar-color:rgba(220,177,75,.58) rgba(5,6,9,.2);}
*::-webkit-scrollbar{width:6px!important;height:6px!important;}
*::-webkit-scrollbar-track{background:rgba(5,6,9,.2)!important;border-radius:999px!important;}
*::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(241,205,111,.68),rgba(151,108,34,.6))!important;border:1px solid transparent!important;border-radius:999px!important;background-clip:padding-box!important;}
*::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,rgba(255,224,137,.92),rgba(188,137,41,.82))!important;background-clip:padding-box!important;}
*::-webkit-scrollbar-button{display:none!important;width:0!important;height:0!important;}
*::-webkit-scrollbar-corner{background:transparent!important;}
</style>`;
  if (!html.includes("</head>")) {
    throw new Error("MVU HTML build does not contain </head>");
  }
  return html.replace(
    "</head>",
    `${floatingStyleTag}\n${bootstrapTag}\n</head>`,
  );
}

function floatingMvuRuntime(uiHtml, petAssets) {
  "use strict";

  const ROOT_ID = "daoyuan-floating-mvu-root";
  const LAUNCHER_ID = "daoyuan-floating-mvu-launcher";
  const PET_STYLE_ID = "daoyuan-floating-mvu-pet-style";
  const CLEANUP_KEY = "__daoyuanFloatingMvuCleanup";
  const LAYOUT_KEY = "daoyuan-floating-mvu-layout-v4";
  const LEGACY_LAYOUT_KEY = "daoyuan-floating-mvu-layout-v3";
  const LAYOUT_SCHEMA_VERSION = 4;
  const MANUAL_UPDATE_EVENT = "daoyuan_mvu_manual_updated";
  const PET_CHARACTER_NAME = "南可熙";
  const DRAG_THRESHOLD = 5;
  const LAUNCHER_DOCK_TRIGGER = 18;
  const LAUNCHER_DOCK_HIDDEN_RATIO = 0.2;
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 192;
  const PET_BUBBLE_TEXT = Object.freeze({
    update: "哟，棋局又动了。",
    press: "嘶——别敲本姑娘！",
    open: "来，本姑娘给你瞧瞧。",
    close: "行啦，本姑娘歇会儿。",
    drag: "喂！别提本姑娘的腰！",
    peek: "嘘，本姑娘在这儿看着。",
    danger: "真是杂鱼……退后。",
  });
  const scriptWindow = window;
  const tavernWindow = window.parent || window;
  const tavernDocument = tavernWindow.document;
  const stopHandles = [];
  let disposed = false;
  let latestMvuData = null;
  let refreshTimer = null;
  let frame = null;
  let root = null;
  let status = null;
  let viewport = null;
  let launcher = null;
  let petImage = null;
  let petNoticeBubble = null;
  let panelDragHandle = null;
  let resizeHandles = [];
  let collapsed = false;
  let manualSize = false;
  let layoutState = null;
  let activeLayoutProfile = "desktop";
  let petStateTimer = null;
  let petTransitionTimer = null;
  let petBubbleTimer = null;
  let petPressStartedAt = 0;
  let panelVisibilityTimer = null;

  function bindHostFunction(name) {
    const candidate = scriptWindow[name];
    return typeof candidate === "function"
      ? Function.prototype.bind.call(candidate, scriptWindow)
      : undefined;
  }

  function rememberStopHandle(handle) {
    if (handle && typeof handle.stop === "function") {
      stopHandles.push(() => handle.stop());
    } else if (typeof handle === "function") {
      stopHandles.push(handle);
    }
    return handle;
  }

  const floatingStorageMemory = new Map();

  function getTavernStorage() {
    try {
      const storage = tavernWindow.localStorage;
      if (
        storage &&
        typeof storage.getItem === "function" &&
        typeof storage.setItem === "function"
      ) {
        return storage;
      }
    } catch (error) {}
    return null;
  }

  const sharedStatusStorage = {
    getItem(key) {
      const normalizedKey = String(key);
      const storage = getTavernStorage();
      if (storage) {
        try {
          const value = storage.getItem(normalizedKey);
          if (value !== null && value !== undefined) return value;
        } catch (error) {}
      }
      return floatingStorageMemory.has(normalizedKey)
        ? floatingStorageMemory.get(normalizedKey)
        : null;
    },
    setItem(key, value) {
      const normalizedKey = String(key);
      const normalizedValue = String(value);
      const storage = getTavernStorage();
      if (storage) {
        storage.setItem(normalizedKey, normalizedValue);
      }
      floatingStorageMemory.set(normalizedKey, normalizedValue);
    },
    removeItem(key) {
      const normalizedKey = String(key);
      const storage = getTavernStorage();
      if (storage) {
        storage.removeItem(normalizedKey);
      }
      floatingStorageMemory.delete(normalizedKey);
    },
  };

  function listen(target, eventType, listener, options) {
    target.addEventListener(eventType, listener, options);
    stopHandles.push(() =>
      target.removeEventListener(eventType, listener, options),
    );
  }

  function cleanup() {
    if (disposed) return;
    persistLayout();
    disposed = true;
    clearTimeout(refreshTimer);
    clearTimeout(petStateTimer);
    clearTimeout(petTransitionTimer);
    clearTimeout(petBubbleTimer);
    clearTimeout(panelVisibilityTimer);
    while (stopHandles.length > 0) {
      const stop = stopHandles.pop();
      try {
        stop();
      } catch (error) {
        console.warn("[道渊悬浮状态栏] 取消监听失败", error);
      }
    }
    if (root && root.isConnected) root.remove();
    if (launcher && launcher.isConnected) launcher.remove();
    tavernDocument.getElementById(PET_STYLE_ID)?.remove();
    if (tavernWindow[CLEANUP_KEY] === cleanup) {
      delete tavernWindow[CLEANUP_KEY];
    }
  }

  async function waitForTavernBody() {
    if (tavernDocument.body) return tavernDocument.body;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("等待酒馆页面加载超时")),
        10000,
      );
      tavernDocument.addEventListener(
        "DOMContentLoaded",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
    return tavernDocument.body;
  }

  function showStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#ffb4b4" : "#f7ead6";
    status.style.borderColor = isError
      ? "rgba(255,92,92,.65)"
      : "rgba(209,169,105,.48)";
    status.style.background = isError
      ? "rgba(72,18,18,.94)"
      : "rgba(26,20,16,.94)";
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
  }

  function getViewportSize() {
    return {
      width:
        tavernWindow.innerWidth ||
        tavernDocument.documentElement.clientWidth ||
        1024,
      height:
        tavernWindow.innerHeight ||
        tavernDocument.documentElement.clientHeight ||
        768,
    };
  }

  function getPreferredLauncherSize() {
    const viewportSize = getViewportSize();
    const coarsePointer =
      typeof tavernWindow.matchMedia === "function" &&
      tavernWindow.matchMedia("(pointer: coarse)").matches;
    return coarsePointer || viewportSize.width <= 640
      ? { width: 48.96, height: 65.28 }
      : { width: 78, height: 104 };
  }

  function getLauncherSize() {
    if (launcher?.isConnected) {
      const rect = launcher.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
    return getPreferredLauncherSize();
  }

  function applyLauncherSize() {
    if (!launcher) return;
    const size = getPreferredLauncherSize();
    launcher.style.width = `${size.width}px`;
    launcher.style.height = `${size.height}px`;
  }

  function getDockSide(side) {
    return side === "left" || side === "right" ? side : "";
  }

  function getDockPetState(side = launcher?.dataset.dockSide) {
    const dockSide = getDockSide(side);
    if (dockSide === "left") return "peekLeft";
    if (dockSide === "right") return "peekRight";
    return "idle";
  }

  function isCoarsePointer() {
    return (
      typeof tavernWindow.matchMedia === "function" &&
      tavernWindow.matchMedia("(pointer: coarse)").matches
    );
  }

  function getLauncherDockTrigger() {
    const viewportSize = getViewportSize();
    return isCoarsePointer() || viewportSize.width <= 640
      ? 34
      : LAUNCHER_DOCK_TRIGGER;
  }

  function getLauncherDockSideFromRect(rect = launcher?.getBoundingClientRect()) {
    if (!rect) return "";
    const viewportSize = getViewportSize();
    const trigger = getLauncherDockTrigger();
    const nearLeft = rect.left <= trigger;
    const nearRight =
      viewportSize.width - rect.right <= trigger;
    if (!nearLeft && !nearRight) return "";
    return rect.left <= viewportSize.width - rect.right ? "left" : "right";
  }

  function getDockedLauncherLeft(side, launcherSize) {
    const viewportSize = getViewportSize();
    const hiddenWidth = Math.round(
      launcherSize.width * LAUNCHER_DOCK_HIDDEN_RATIO,
    );
    return side === "left"
      ? -hiddenWidth
      : viewportSize.width - launcherSize.width + hiddenWidth;
  }

  function setLauncherDockSide(side, shouldSetPet = true) {
    if (!launcher || !layoutState) return;
    const dockSide = getDockSide(side);
    launcher.dataset.dockSide = dockSide;
    layoutState.launcherDockSide = dockSide;
    if (dockSide && shouldSetPet) {
      setPetState(getDockPetState(dockSide));
    }
  }

  function positionPetNoticeBubble() {
    if (!launcher || !petNoticeBubble) return;
    const viewportSize = getViewportSize();
    const rect = launcher.getBoundingClientRect();
    const bubbleWidth = Math.max(
      petNoticeBubble.getBoundingClientRect().width,
      80,
    );
    const hasRoomOnRight =
      rect.left + rect.width * 0.68 + bubbleWidth + 4 <= viewportSize.width;
    petNoticeBubble.style.left = hasRoomOnRight ? "68%" : "auto";
    petNoticeBubble.style.right = hasRoomOnRight ? "auto" : "68%";
    petNoticeBubble.style.borderRadius = hasRoomOnRight
      ? "9px 9px 9px 3px"
      : "9px 9px 3px 9px";
  }

  function positionLauncher() {
    if (!launcher || !layoutState) return;
    const viewportSize = getViewportSize();
    const launcherSize = getLauncherSize();
    const dockSide = getDockSide(
      layoutState.launcherDockSide || launcher.dataset.dockSide,
    );
    if (dockSide) {
      launcher.dataset.dockSide = dockSide;
      launcher.style.left = `${getDockedLauncherLeft(
        dockSide,
        launcherSize,
      )}px`;
      launcher.style.top = `${clamp(
        layoutState.launcherTop,
        4,
        viewportSize.height - launcherSize.height - 4,
      )}px`;
      positionPetNoticeBubble();
      return;
    }
    launcher.dataset.dockSide = "";
    launcher.style.left = `${clamp(
      layoutState.launcherLeft,
      4,
      viewportSize.width - launcherSize.width - 4,
    )}px`;
    launcher.style.top = `${clamp(
      layoutState.launcherTop,
      4,
      viewportSize.height - launcherSize.height - 4,
    )}px`;
    positionPetNoticeBubble();
  }

  function getLayoutProfileKey(viewportSize = getViewportSize()) {
    const mobile =
      viewportSize.width <= 720 ||
      (isCoarsePointer() && Math.min(viewportSize.width, viewportSize.height) <= 700);
    if (!mobile) return "desktop";
    return viewportSize.width >= viewportSize.height
      ? "mobile-landscape"
      : "mobile-portrait";
  }

  function readLayoutStore() {
    let normalized = { schemaVersion: LAYOUT_SCHEMA_VERSION, profiles: {} };
    try {
      const parsed = JSON.parse(
        tavernWindow.localStorage.getItem(LAYOUT_KEY) || "{}",
      );
      if (parsed && parsed.schemaVersion === LAYOUT_SCHEMA_VERSION) {
        normalized.profiles =
          parsed.profiles && typeof parsed.profiles === "object"
            ? parsed.profiles
            : {};
        return normalized;
      }
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 读取新版布局设置失败", error);
    }
    // 旧版只有一套布局，迁移为 PC 配置；手机首次进入仍使用手机默认值。
    try {
      const legacy = JSON.parse(
        tavernWindow.localStorage.getItem(LEGACY_LAYOUT_KEY) || "{}",
      );
      if (legacy && typeof legacy === "object" && Object.keys(legacy).length) {
        normalized.profiles.desktop = legacy;
      }
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 迁移旧版布局设置失败", error);
    }
    return normalized;
  }

  function readSavedLayout(profileKey) {
    const store = readLayoutStore();
    if (store.profiles[profileKey] && typeof store.profiles[profileKey] === "object") {
      return store.profiles[profileKey];
    }
    return {};
  }

  function getDefaultLayout(viewportSize, profileKey, launcherSize) {
    const isDesktop = profileKey === "desktop";
    const isPortrait = profileKey === "mobile-portrait";
    const defaultWidth = isDesktop
      ? Math.min(920, viewportSize.width - 32)
      : isPortrait
        ? viewportSize.width - 12
        : Math.min(viewportSize.width - 16, Math.max(520, Math.round(viewportSize.width * 0.88)));
    const defaultHeight = isDesktop
      ? Math.min(720, viewportSize.height - 32)
      : isPortrait
        ? Math.min(viewportSize.height - 16, Math.round(viewportSize.height * 0.78))
        : viewportSize.height - 16;
    const width = Math.max(1, defaultWidth);
    const height = Math.max(1, defaultHeight);
    return {
      width,
      height,
      left: isDesktop || isPortrait
        ? isPortrait
          ? (viewportSize.width - width) / 2
          : viewportSize.width - width - 16
        : 8,
      top: isPortrait
        ? viewportSize.height - height - 12
        : viewportSize.height - height - 16,
      launcherLeft: isDesktop ? 16 : 6,
      launcherTop: Math.round(viewportSize.height * 0.4),
      collapsed: false,
      manualSize: false,
      launcherDockSide: "",
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
      launcherSize,
    };
  }

  function loadLayout(profileKey = getLayoutProfileKey()) {
    const viewportSize = getViewportSize();
    const launcherSize = getPreferredLauncherSize();
    const saved = readSavedLayout(profileKey);
    const defaults = getDefaultLayout(viewportSize, profileKey, launcherSize);
    const minimumWidth = Math.min(MIN_WIDTH, viewportSize.width - 8);
    const minimumHeight = Math.min(MIN_HEIGHT, viewportSize.height - 8);
    const width = clamp(
      Number(saved.width) || defaults.width,
      minimumWidth,
      viewportSize.width - 8,
    );
    const height = clamp(
      Number(saved.height) || defaults.height,
      minimumHeight,
      viewportSize.height - 8,
    );
    const changedViewport =
      Number(saved.viewportWidth) !== viewportSize.width ||
      Number(saved.viewportHeight) !== viewportSize.height;
    const panelAvailableWidth = Math.max(1, viewportSize.width - width - 8);
    const panelAvailableHeight = Math.max(1, viewportSize.height - height - 8);
    const savedLeft = changedViewport && Number.isFinite(Number(saved.leftRatio))
      ? 4 + Number(saved.leftRatio) * panelAvailableWidth
      : Number.isFinite(Number(saved.left))
        ? Number(saved.left)
        : defaults.left;
    const savedTop = changedViewport && Number.isFinite(Number(saved.topRatio))
      ? 4 + Number(saved.topRatio) * panelAvailableHeight
      : Number.isFinite(Number(saved.top))
        ? Number(saved.top)
        : defaults.top;
    const launcherAvailableWidth = Math.max(1, viewportSize.width - launcherSize.width - 8);
    const launcherAvailableHeight = Math.max(1, viewportSize.height - launcherSize.height - 8);
    return {
      left: clamp(savedLeft, 4, viewportSize.width - width - 4),
      top: clamp(savedTop, 4, viewportSize.height - height - 4),
      width,
      height,
      launcherLeft: clamp(
        changedViewport && Number.isFinite(Number(saved.launcherLeftRatio))
          ? 4 + Number(saved.launcherLeftRatio) * launcherAvailableWidth
          : Number.isFinite(Number(saved.launcherLeft))
            ? Number(saved.launcherLeft)
            : defaults.launcherLeft,
        4,
        viewportSize.width - launcherSize.width - 4,
      ),
      launcherTop: clamp(
        changedViewport && Number.isFinite(Number(saved.launcherTopRatio))
          ? 4 + Number(saved.launcherTopRatio) * launcherAvailableHeight
          : Number.isFinite(Number(saved.launcherTop))
            ? Number(saved.launcherTop)
            : defaults.launcherTop,
        4,
        viewportSize.height - launcherSize.height - 4,
      ),
      collapsed: saved.collapsed === true,
      manualSize: saved.manualSize === true,
      launcherDockSide: getDockSide(saved.launcherDockSide),
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
    };
  }

  function persistLayout() {
    if (!root || !layoutState) return;
    const viewportSize = getViewportSize();
    const rect = root.getBoundingClientRect();
    const panelAvailableWidth = Math.max(1, viewportSize.width - rect.width - 8);
    const panelAvailableHeight = Math.max(1, viewportSize.height - rect.height - 8);
    layoutState.left = Math.round(rect.left);
    layoutState.top = Math.round(rect.top);
    layoutState.width = Math.round(rect.width);
    layoutState.height = Math.round(rect.height);
    layoutState.leftRatio = clamp((rect.left - 4) / panelAvailableWidth, 0, 1);
    layoutState.topRatio = clamp((rect.top - 4) / panelAvailableHeight, 0, 1);
    if (launcher) {
      const launcherRect = launcher.getBoundingClientRect();
      const launcherSize = getLauncherSize();
      const launcherAvailableWidth = Math.max(1, viewportSize.width - launcherSize.width - 8);
      const launcherAvailableHeight = Math.max(1, viewportSize.height - launcherSize.height - 8);
      layoutState.launcherLeft = Math.round(launcherRect.left);
      layoutState.launcherTop = Math.round(launcherRect.top);
      layoutState.launcherLeftRatio = clamp((launcherRect.left - 4) / launcherAvailableWidth, 0, 1);
      layoutState.launcherTopRatio = clamp((launcherRect.top - 4) / launcherAvailableHeight, 0, 1);
      layoutState.launcherDockSide = getDockSide(launcher.dataset.dockSide);
    }
    layoutState.collapsed = collapsed;
    layoutState.manualSize = manualSize;
    layoutState.viewportWidth = viewportSize.width;
    layoutState.viewportHeight = viewportSize.height;
    try {
      const store = readLayoutStore();
      store.profiles[activeLayoutProfile] = { ...layoutState };
      tavernWindow.localStorage.setItem(LAYOUT_KEY, JSON.stringify(store));
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 保存布局设置失败", error);
    }
  }

  function clampRootToViewport() {
    if (!root) return;
    const viewportSize = getViewportSize();
    const rect = root.getBoundingClientRect();
    const width = clamp(
      rect.width,
      Math.min(MIN_WIDTH, viewportSize.width - 8),
      viewportSize.width - 8,
    );
    const height = clamp(
      rect.height,
      Math.min(MIN_HEIGHT, viewportSize.height - 8),
      viewportSize.height - 8,
    );
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    root.style.left = `${clamp(
      rect.left,
      4,
      viewportSize.width - width - 4,
    )}px`;
    root.style.top = `${clamp(rect.top, 4, viewportSize.height - height - 4)}px`;
    positionLauncher();
  }

  function applyLoadedLayout() {
    if (!root || !layoutState) return;
    root.style.left = `${layoutState.left}px`;
    root.style.top = `${layoutState.top}px`;
    root.style.width = `${layoutState.width}px`;
    root.style.height = `${layoutState.height}px`;
    if (launcher) {
      launcher.dataset.dockSide = layoutState.launcherDockSide || "";
      applyLauncherSize();
    }
    clampRootToViewport();
    setCollapsed(layoutState.collapsed, false, false);
  }

  const petAnimations = {
    idle: "dy-pet-idle 4.8s ease-in-out infinite",
    press: "dy-pet-press .38s cubic-bezier(.2,.9,.25,1) both",
    drag: "dy-pet-drag .72s ease-in-out infinite",
    open: "dy-pet-open .68s cubic-bezier(.16,1,.3,1) both",
    close: "dy-pet-close .56s cubic-bezier(.4,0,.2,1) both",
    release: "dy-pet-release .58s cubic-bezier(.2,.9,.25,1) both",
    peekLeft: "dy-pet-peek 3.8s ease-in-out infinite",
    peekRight: "dy-pet-peek 3.8s ease-in-out infinite",
  };

  function setPetState(state, duration = 0) {
    if (!launcher || !petImage) return;
    clearTimeout(petStateTimer);
    const assetState = state === "release" ? "idle" : state;
    petImage.src = petAssets[assetState] || petAssets.idle;
    launcher.dataset.petState = state;
    petImage.style.animation = "none";
    void petImage.offsetWidth;
    petImage.style.animation = petAnimations[state] || petAnimations.idle;
    if (duration > 0) {
      petStateTimer = tavernWindow.setTimeout(() => {
        setPetState(getDockPetState());
      }, duration);
    }
  }

  function updateLauncherAccessibility() {
    if (!launcher) return;
    const hasUpdates = launcher.dataset.hasUpdates === "true";
    const hasDanger = launcher.dataset.hasDanger === "true";
    launcher.title = collapsed ? "显示道渊状态栏" : "隐藏道渊状态栏";
    launcher.setAttribute(
      "aria-label",
      hasDanger
        ? `${PET_CHARACTER_NAME}检测到危险，点击查看`
        : hasUpdates
          ? `${PET_CHARACTER_NAME}提醒状态有新变化，点击查看`
          : launcher.title,
    );
    launcher.setAttribute("aria-expanded", String(!collapsed));
  }

  function isDangerousMvuData(data) {
    const dangerLevel = String(
      data?.stat_data?.世界?.危机程度 ?? "",
    );
    return dangerLevel.includes("高") || dangerLevel.includes("致命");
  }

  function hidePetBubble() {
    if (!launcher || !petNoticeBubble) return;
    clearTimeout(petBubbleTimer);
    petBubbleTimer = null;
    launcher.dataset.bubbleVisible = "false";
    petNoticeBubble.setAttribute("aria-hidden", "true");
  }

  function restorePetBubbleAfterAction() {
    petBubbleTimer = null;
    if (launcher?.dataset.hasUpdates === "true") {
      petNoticeBubble.textContent =
        launcher.dataset.hasDanger === "true"
          ? PET_BUBBLE_TEXT.danger
          : PET_BUBBLE_TEXT.update;
      launcher.dataset.bubbleVisible = "true";
      petNoticeBubble.setAttribute("aria-hidden", "false");
      positionPetNoticeBubble();
    } else {
      hidePetBubble();
    }
  }

  function showPetBubble(text, duration = 0) {
    if (!launcher || !petNoticeBubble) return;
    clearTimeout(petBubbleTimer);
    petBubbleTimer = null;
    petNoticeBubble.textContent = text;
    launcher.dataset.bubbleVisible = "true";
    petNoticeBubble.setAttribute("aria-hidden", "false");
    positionPetNoticeBubble();
    if (duration > 0) {
      petBubbleTimer = tavernWindow.setTimeout(
        restorePetBubbleAfterAction,
        duration,
      );
    }
  }

  function setPetUpdateNotice(active, danger = false) {
    if (!launcher || !petNoticeBubble) return;
    launcher.dataset.hasUpdates = String(active);
    launcher.dataset.hasDanger = String(active && danger);
    launcher.style.filter =
      active && danger
        ? "drop-shadow(0 3px 4px rgba(0,0,0,.72)) drop-shadow(0 0 8px rgba(255,78,78,.8)) drop-shadow(0 0 15px rgba(232,180,58,.52))"
        : active
          ? "drop-shadow(0 3px 4px rgba(0,0,0,.72)) drop-shadow(0 0 8px rgba(92,196,255,.82)) drop-shadow(0 0 15px rgba(118,232,216,.48))"
          : "drop-shadow(0 3px 4px rgba(0,0,0,.72)) drop-shadow(0 0 5px rgba(218,171,60,.22))";
    if (active) {
      showPetBubble(
        danger ? PET_BUBBLE_TEXT.danger : PET_BUBBLE_TEXT.update,
      );
    } else {
      hidePetBubble();
    }
    updateLauncherAccessibility();
  }

  function setCollapsed(
    nextCollapsed,
    shouldPersist = true,
    shouldAnimate = true,
    petAnimationDelay = 0,
  ) {
    if (!root || !launcher) return;
    clearTimeout(panelVisibilityTimer);
    clearTimeout(petTransitionTimer);
    collapsed = nextCollapsed;
    if (collapsed) {
      root.style.pointerEvents = "none";
      root.style.opacity = "0";
      root.style.transform = "translateY(5px) scale(.975)";
      panelVisibilityTimer = tavernWindow.setTimeout(() => {
        if (collapsed && root) root.style.visibility = "hidden";
      }, shouldAnimate ? 220 : 0);
      if (shouldAnimate) {
        if (petAnimationDelay > 0) {
          petTransitionTimer = tavernWindow.setTimeout(
            () => setPetState("close", 620),
            petAnimationDelay,
          );
        } else {
          setPetState("close", 620);
        }
      }
    } else {
      setPetUpdateNotice(false);
      root.style.visibility = "visible";
      root.style.pointerEvents = "auto";
      if (shouldAnimate) {
        root.style.opacity = "0";
        root.style.transform = "translateY(5px) scale(.975)";
        tavernWindow.requestAnimationFrame(() => {
          if (!collapsed && root) {
            root.style.opacity = "1";
            root.style.transform = "translateY(0) scale(1)";
          }
        });
        if (petAnimationDelay > 0) {
          petTransitionTimer = tavernWindow.setTimeout(
            () => setPetState("open", 740),
            petAnimationDelay,
          );
        } else {
          setPetState("open", 740);
        }
      } else {
        root.style.opacity = "1";
        root.style.transform = "translateY(0) scale(1)";
        setPetState("idle");
      }
    }
    updateLauncherAccessibility();
    if (shouldPersist) persistLayout();
  }

  function togglePanel() {
    setCollapsed(!collapsed);
  }

  async function createHostShell() {
    const body = await waitForTavernBody();
    if (typeof tavernWindow[CLEANUP_KEY] === "function") {
      tavernWindow[CLEANUP_KEY]();
    }
    tavernDocument.getElementById(ROOT_ID)?.remove();
    tavernDocument.getElementById(LAUNCHER_ID)?.remove();
    tavernDocument.getElementById(PET_STYLE_ID)?.remove();
    tavernWindow[CLEANUP_KEY] = cleanup;
    activeLayoutProfile = getLayoutProfileKey();
    layoutState = loadLayout(activeLayoutProfile);
    manualSize = layoutState.manualSize;

    root = tavernDocument.createElement("div");
    root.id = ROOT_ID;
    root.style.cssText = [
      "position:fixed",
      `left:${layoutState.left}px`,
      `top:${layoutState.top}px`,
      `width:${layoutState.width}px`,
      `height:${layoutState.height}px`,
      `min-width:${MIN_WIDTH}px`,
      `min-height:${MIN_HEIGHT}px`,
      "box-sizing:border-box",
      "display:flex",
      "flex-direction:column",
      "z-index:2147483000",
      "overflow:visible",
      "border:0",
      "outline:0",
      "border-radius:12px",
      "background:transparent",
      "box-shadow:0 12px 34px rgba(0,0,0,.46),0 0 14px rgba(211,169,72,.055)",
      "pointer-events:auto",
      "opacity:1",
      "transform:translateY(0) scale(1)",
      "transform-origin:center center",
      "transition:opacity .22s ease,transform .22s ease",
    ].join(";");

    const petStyle = tavernDocument.createElement("style");
    petStyle.id = PET_STYLE_ID;
    petStyle.textContent = `
@keyframes dy-pet-idle {
  0%,100% { transform:translate3d(0,0,0) rotate(-.55deg) scale(1,1); }
  24% { transform:translate3d(0,-1px,0) rotate(.15deg) scale(1.004,1.008); }
  50% { transform:translate3d(0,-3px,0) rotate(.65deg) scale(.998,1.018); }
  76% { transform:translate3d(0,-1px,0) rotate(-.1deg) scale(1.003,1.009); }
}
@keyframes dy-pet-press {
  0% { transform:translate3d(0,0,0) scale(1); }
  22% { transform:translate3d(0,3px,0) scale(.88,1.08); }
  55% { transform:translate3d(0,-2px,0) scale(1.04,.96); }
  100% { transform:translate3d(0,1px,0) scale(.97); }
}
@keyframes dy-pet-drag {
  0%,100% { transform:translate3d(0,-5px,0) rotate(var(--dy-pet-drag-tilt,0deg)) scale(1.025); }
  50% { transform:translate3d(0,-2px,0) rotate(0deg) scale(1.018); }
}
@keyframes dy-pet-open {
  0% { transform:translate3d(0,5px,0) rotate(-5deg) scale(.82); opacity:.7; }
  44% { transform:translate3d(0,-9px,0) rotate(4deg) scale(1.08); opacity:1; }
  72% { transform:translate3d(0,1px,0) rotate(-1.5deg) scale(.98); }
  100% { transform:translate3d(0,0,0) rotate(0) scale(1); }
}
@keyframes dy-pet-close {
  0% { transform:translate3d(0,0,0) scale(1); opacity:1; }
  42% { transform:translate3d(0,3px,0) scale(.91,1.07); opacity:1; }
  100% { transform:translate3d(0,6px,0) rotate(-3deg) scale(.84); opacity:.78; }
}
@keyframes dy-pet-release {
  0% { transform:translate3d(0,-5px,0) scale(1.02,.98); }
  38% { transform:translate3d(0,2px,0) scale(.97,1.035); }
  70% { transform:translate3d(0,-1px,0) scale(1.015,.99); }
  100% { transform:translate3d(0,0,0) scale(1); }
}
@keyframes dy-pet-peek {
  0%,100% { transform:translate3d(0,0,0) rotate(-.25deg) scale(1); }
  44% { transform:translate3d(var(--dy-pet-peek-lean,3px),-1px,0) rotate(.45deg) scale(1.012); }
  70% { transform:translate3d(0,0,0) rotate(-.1deg) scale(1.004); }
}
@keyframes dy-pet-update-bubble {
  0%,100% { transform:translateY(0) scale(1); }
  45% { transform:translateY(-3px) scale(1.04); }
}
#${LAUNCHER_ID}[data-pet-state="idle"]:hover img {
  filter:drop-shadow(0 0 7px rgba(236,190,73,.62)) brightness(1.06);
}
#${LAUNCHER_ID}[data-pet-state="drag"] img {
  filter:drop-shadow(0 8px 6px rgba(0,0,0,.58)) drop-shadow(0 0 6px rgba(104,204,255,.2)) brightness(1.025);
  transform-origin:52% 20%;
}
#${LAUNCHER_ID}[data-pet-state="idle"] img,
#${LAUNCHER_ID}[data-pet-state="press"] img,
#${LAUNCHER_ID}[data-pet-state="open"] img,
#${LAUNCHER_ID}[data-pet-state="close"] img {
  transform-origin:50% 82%;
}
#${LAUNCHER_ID}[data-pet-state="peekLeft"] img,
#${LAUNCHER_ID}[data-pet-state="peekRight"] img {
  transform-origin:50% 55%;
}
#${LAUNCHER_ID}[data-dock-side="right"] img {
  --dy-pet-peek-lean:-3px;
}
#${LAUNCHER_ID} .dy-pet-update-bubble {
  opacity:0;
  transform:translateY(3px) scale(.9);
  transition:opacity .18s ease,transform .18s ease;
}
#${LAUNCHER_ID}[data-bubble-visible="true"] .dy-pet-update-bubble {
  opacity:1;
  transform:translateY(0) scale(1);
  animation:dy-pet-update-bubble 1.35s ease-in-out infinite;
}
#${LAUNCHER_ID}:focus-visible {
  outline:2px solid rgba(245,205,101,.9) !important;
  outline-offset:2px !important;
  border-radius:16px;
}
@media (pointer:coarse), (max-width:640px) {
  @keyframes dy-pet-idle {
    0%,100% { transform:translate3d(0,0,0) rotate(-.3deg) scale(1); }
    50% { transform:translate3d(0,-2px,0) rotate(.3deg) scale(.999,1.01); }
  }
}
@media (prefers-reduced-motion:reduce) {
  #${LAUNCHER_ID} img { animation-duration:.01ms !important; animation-iteration-count:1 !important; }
}
`;
    (tavernDocument.head || tavernDocument.documentElement).appendChild(
      petStyle,
    );

    launcher = tavernDocument.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.type = "button";
    launcher.dataset.petState = "idle";
    launcher.dataset.petCharacter = PET_CHARACTER_NAME;
    launcher.dataset.hasUpdates = "false";
    launcher.dataset.hasDanger = "false";
    launcher.dataset.bubbleVisible = "false";
    launcher.dataset.dockSide = "";
    launcher.style.cssText = [
      "position:fixed",
      "box-sizing:border-box",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "z-index:2147483002",
      "padding:0",
      "margin:0",
      "overflow:visible",
      "border:0",
      "outline:0",
      "border-radius:16px",
      "background:transparent",
      "filter:drop-shadow(0 3px 4px rgba(0,0,0,.72)) drop-shadow(0 0 5px rgba(218,171,60,.22))",
      "cursor:grab",
      "touch-action:none",
      "user-select:none",
      "-webkit-user-select:none",
      "-webkit-tap-highlight-color:transparent",
      "transition:left .26s cubic-bezier(.2,.9,.25,1),top .18s ease,filter .18s ease",
    ].join(";");
    applyLauncherSize();

    petImage = tavernDocument.createElement("img");
    petImage.src = petAssets.idle;
    petImage.alt = "";
    petImage.draggable = false;
    petImage.setAttribute("aria-hidden", "true");
    petImage.style.cssText = [
      "display:block",
      "width:100%",
      "height:100%",
      "object-fit:contain",
      "pointer-events:none",
      "user-select:none",
      "-webkit-user-select:none",
      "-webkit-user-drag:none",
      "transform-origin:50% 82%",
      "will-change:transform,opacity,filter",
      "animation:dy-pet-idle 4.8s ease-in-out infinite",
      "transition:filter .18s ease,transform-origin .18s ease",
    ].join(";");

    petNoticeBubble = tavernDocument.createElement("span");
    petNoticeBubble.className = "dy-pet-update-bubble";
    petNoticeBubble.textContent = PET_BUBBLE_TEXT.update;
    petNoticeBubble.setAttribute("aria-hidden", "true");
    petNoticeBubble.style.cssText = [
      "position:absolute",
      "top:-11px",
      "left:68%",
      "z-index:2",
      "box-sizing:border-box",
      "min-width:48px",
      "padding:2px 6px",
      "border:1px solid rgba(104,204,255,.78)",
      "border-radius:9px 9px 9px 3px",
      "background:linear-gradient(145deg,rgba(16,29,39,.97),rgba(11,15,22,.98))",
      "box-shadow:0 2px 8px rgba(0,0,0,.55),0 0 8px rgba(79,186,255,.28)",
      "color:#d8f5ff",
      "font:700 10px/1.25 sans-serif",
      "letter-spacing:-.5px",
      "white-space:nowrap",
      "pointer-events:none",
    ].join(";");
    launcher.append(petImage, petNoticeBubble);

    Object.values(petAssets).forEach(source => {
      const preload = new tavernWindow.Image();
      preload.src = source;
    });

    viewport = tavernDocument.createElement("div");
    viewport.id = "daoyuan-floating-mvu-viewport";
    viewport.style.cssText = [
      "position:relative",
      "display:flex",
      "flex:1",
      "min-width:0",
      "min-height:0",
      "overflow:hidden",
      "border:0",
      "border-radius:12px",
      "background:transparent",
    ].join(";");

    status = tavernDocument.createElement("div");
    status.id = "daoyuan-floating-mvu-status";
    status.style.cssText = [
      "box-sizing:border-box",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "width:100%",
      "height:100%",
      "padding:16px",
      "border:0",
      "border-radius:12px",
      "background:rgba(26,20,16,.94)",
      "color:#f7ead6",
      "font:14px/1.6 sans-serif",
      "text-align:center",
    ].join(";");
    status.textContent = "道渊 MVU 悬浮状态栏正在连接……";

    panelDragHandle = tavernDocument.createElement("div");
    panelDragHandle.id = "daoyuan-floating-mvu-panel-drag";
    panelDragHandle.title = "拖动状态栏";
    panelDragHandle.style.cssText = [
      "position:absolute",
      "left:28px",
      "right:28px",
      "top:0",
      "height:14px",
      "z-index:11",
      "cursor:move",
      "touch-action:none",
      "user-select:none",
      "display:flex",
      "align-items:flex-start",
      "justify-content:center",
    ].join(";");
    const panelDragIndicator = tavernDocument.createElement("div");
    panelDragIndicator.style.cssText = [
      "width:42px",
      "height:2px",
      "margin-top:3px",
      "border-radius:999px",
      "background:linear-gradient(90deg,transparent,rgba(231,194,100,.48),transparent)",
      "box-shadow:0 0 5px rgba(225,183,75,.12)",
      "opacity:.42",
      "transition:opacity .18s ease,transform .18s ease,box-shadow .18s ease",
      "pointer-events:none",
    ].join(";");
    panelDragHandle.appendChild(panelDragIndicator);
    listen(panelDragHandle, "pointerenter", () => {
      panelDragIndicator.style.opacity = ".82";
      panelDragIndicator.style.transform = "scaleX(1.12)";
      panelDragIndicator.style.boxShadow = "0 0 7px rgba(225,183,75,.3)";
    });
    listen(panelDragHandle, "pointerleave", () => {
      panelDragIndicator.style.opacity = ".42";
      panelDragIndicator.style.transform = "scaleX(1)";
      panelDragIndicator.style.boxShadow = "0 0 5px rgba(225,183,75,.12)";
    });

    const resizeHandleSettings = {
      nw: {
        inset: "left:0;top:0",
        cursor: "nwse-resize",
        markInset: "left:3px;top:3px",
        border: "border-left:1px solid rgba(232,196,108,.7);border-top:1px solid rgba(232,196,108,.7)",
        radius: "border-top-left-radius:7px",
        origin: "top left",
      },
      ne: {
        inset: "right:0;top:0",
        cursor: "nesw-resize",
        markInset: "right:3px;top:3px",
        border: "border-right:1px solid rgba(232,196,108,.7);border-top:1px solid rgba(232,196,108,.7)",
        radius: "border-top-right-radius:7px",
        origin: "top right",
      },
      sw: {
        inset: "left:0;bottom:0",
        cursor: "nesw-resize",
        markInset: "left:3px;bottom:3px",
        border: "border-left:1px solid rgba(232,196,108,.7);border-bottom:1px solid rgba(232,196,108,.7)",
        radius: "border-bottom-left-radius:7px",
        origin: "bottom left",
      },
      se: {
        inset: "right:0;bottom:0",
        cursor: "nwse-resize",
        markInset: "right:3px;bottom:3px",
        border: "border-right:1px solid rgba(232,196,108,.7);border-bottom:1px solid rgba(232,196,108,.7)",
        radius: "border-bottom-right-radius:7px",
        origin: "bottom right",
      },
    };
    resizeHandles = Object.entries(resizeHandleSettings).map(
      ([direction, settings]) => {
        const handle = tavernDocument.createElement("div");
        handle.id = `daoyuan-floating-mvu-resize-${direction}`;
        handle.dataset.direction = direction;
        handle.title = `拖动${direction.toUpperCase()}角调整状态栏大小`;
        handle.style.cssText = [
          "position:absolute",
          settings.inset,
          "width:26px",
          "height:26px",
          "box-sizing:border-box",
          "z-index:12",
          `cursor:${settings.cursor}`,
          "touch-action:none",
          "background:rgba(0,0,0,.01)",
        ].join(";");
        const mark = tavernDocument.createElement("div");
        mark.style.cssText = [
          "position:absolute",
          settings.markInset,
          "width:11px",
          "height:11px",
          "box-sizing:border-box",
          settings.border,
          settings.radius,
          `transform-origin:${settings.origin}`,
          "opacity:.46",
          "filter:drop-shadow(0 0 2px rgba(226,184,82,.16))",
          "transition:opacity .16s ease,transform .16s ease,filter .16s ease",
          "pointer-events:none",
        ].join(";");
        handle.appendChild(mark);
        listen(handle, "pointerenter", () => {
          mark.style.opacity = ".92";
          mark.style.transform = "scale(1.12)";
          mark.style.filter = "drop-shadow(0 0 4px rgba(226,184,82,.4))";
        });
        listen(handle, "pointerleave", () => {
          mark.style.opacity = ".46";
          mark.style.transform = "scale(1)";
          mark.style.filter = "drop-shadow(0 0 2px rgba(226,184,82,.16))";
        });
        return handle;
      },
    );

    viewport.append(status);
    root.append(viewport, panelDragHandle, ...resizeHandles);
    body.append(root, launcher);

    let dragSession = null;
    let panelDragSession = null;
    let resizeSession = null;
    let suppressLauncherClick = false;

    listen(launcher, "pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      launcher.style.transition = "none";
      const rect = launcher.getBoundingClientRect();
      dragSession = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        moved: false,
      };
      launcher.style.cursor = "grabbing";
      clearTimeout(petTransitionTimer);
      setPetState("press");
      petPressStartedAt =
        typeof tavernWindow.performance?.now === "function"
          ? tavernWindow.performance.now()
          : Date.now();
      showPetBubble(PET_BUBBLE_TEXT.press, 1100);
      launcher.setPointerCapture?.(event.pointerId);
    });

    listen(launcher, "click", event => {
      if (suppressLauncherClick) {
        suppressLauncherClick = false;
        event.preventDefault();
        return;
      }
      const now =
        typeof tavernWindow.performance?.now === "function"
          ? tavernWindow.performance.now()
          : Date.now();
      if (launcher.dataset.petState !== "press") {
        setPetState("press");
        petPressStartedAt = now;
        showPetBubble(PET_BUBBLE_TEXT.press, 1100);
      }
      const nextCollapsed = !collapsed;
      const pressTimeRemaining = Math.max(0, 380 - (now - petPressStartedAt));
      clearTimeout(petTransitionTimer);
      petTransitionTimer = tavernWindow.setTimeout(() => {
        petTransitionTimer = null;
        setCollapsed(nextCollapsed, true, true);
        showPetBubble(
          nextCollapsed ? PET_BUBBLE_TEXT.close : PET_BUBBLE_TEXT.open,
          1600,
        );
      }, pressTimeRemaining);
    });

    listen(panelDragHandle, "pointerdown", event => {
      if (event.button !== 0 || collapsed) return;
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      panelDragSession = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
      };
      panelDragIndicator.style.opacity = ".95";
      panelDragIndicator.style.transform = "scaleX(1.18)";
      panelDragIndicator.style.boxShadow = "0 0 8px rgba(225,183,75,.4)";
      panelDragHandle.setPointerCapture?.(event.pointerId);
    });

    resizeHandles.forEach(handle => {
      listen(handle, "pointerdown", event => {
        if (event.button !== 0 || collapsed) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = root.getBoundingClientRect();
        manualSize = true;
        resizeSession = {
          pointerId: event.pointerId,
          direction: handle.dataset.direction,
          startX: event.clientX,
          startY: event.clientY,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          mark: handle.firstElementChild,
        };
        if (resizeSession.mark) {
          resizeSession.mark.style.opacity = "1";
          resizeSession.mark.style.transform = "scale(1.14)";
          resizeSession.mark.style.filter =
            "drop-shadow(0 0 5px rgba(226,184,82,.48))";
        }
        handle.setPointerCapture?.(event.pointerId);
      });
    });

    listen(tavernWindow, "pointermove", event => {
      if (dragSession?.pointerId === event.pointerId) {
        const deltaX = event.clientX - dragSession.startX;
        const deltaY = event.clientY - dragSession.startY;
        if (
          Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD
        ) {
          if (!dragSession.moved) {
            setLauncherDockSide("", false);
            setPetState("drag");
            showPetBubble(PET_BUBBLE_TEXT.drag);
          }
          dragSession.moved = true;
        }
        const viewportSize = getViewportSize();
        const launcherSize = getLauncherSize();
        launcher.style.setProperty(
          "--dy-pet-drag-tilt",
          `${clamp(deltaX / 12, -7, 7)}deg`,
        );
        launcher.style.left = `${clamp(
          dragSession.left + deltaX,
          4,
          viewportSize.width - launcherSize.width - 4,
        )}px`;
        launcher.style.top = `${clamp(
          dragSession.top + deltaY,
          4,
          viewportSize.height - launcherSize.height - 4,
        )}px`;
        positionPetNoticeBubble();
      }
      if (panelDragSession?.pointerId === event.pointerId) {
        const viewportSize = getViewportSize();
        const rect = root.getBoundingClientRect();
        root.style.left = `${clamp(
          panelDragSession.left + event.clientX - panelDragSession.startX,
          4,
          viewportSize.width - rect.width - 4,
        )}px`;
        root.style.top = `${clamp(
          panelDragSession.top + event.clientY - panelDragSession.startY,
          4,
          viewportSize.height - rect.height - 4,
        )}px`;
      }
      if (resizeSession?.pointerId === event.pointerId) {
        const viewportSize = getViewportSize();
        const deltaX = event.clientX - resizeSession.startX;
        const deltaY = event.clientY - resizeSession.startY;
        const direction = resizeSession.direction;
        let nextLeft = resizeSession.left;
        let nextTop = resizeSession.top;
        let nextWidth = resizeSession.width;
        let nextHeight = resizeSession.height;

        if (direction.includes("e")) {
          nextWidth = clamp(
            resizeSession.width + deltaX,
            Math.min(MIN_WIDTH, viewportSize.width - resizeSession.left - 4),
            viewportSize.width - resizeSession.left - 4,
          );
        }
        if (direction.includes("w")) {
          nextWidth = clamp(
            resizeSession.width - deltaX,
            Math.min(
              MIN_WIDTH,
              resizeSession.right - 8,
            ),
            resizeSession.right - 4,
          );
          nextLeft = resizeSession.right - nextWidth;
        }
        if (direction.includes("s")) {
          nextHeight = clamp(
            resizeSession.height + deltaY,
            Math.min(MIN_HEIGHT, viewportSize.height - resizeSession.top - 4),
            viewportSize.height - resizeSession.top - 4,
          );
        }
        if (direction.includes("n")) {
          nextHeight = clamp(
            resizeSession.height - deltaY,
            Math.min(MIN_HEIGHT, resizeSession.bottom - 8),
            resizeSession.bottom - 4,
          );
          nextTop = resizeSession.bottom - nextHeight;
        }

        root.style.left = `${nextLeft}px`;
        root.style.top = `${nextTop}px`;
        root.style.width = `${nextWidth}px`;
        root.style.height = `${nextHeight}px`;
      }
    });

    const finishPointerAction = event => {
      if (dragSession?.pointerId === event.pointerId) {
        suppressLauncherClick = dragSession.moved;
        const didMove = dragSession.moved;
        dragSession = null;
        launcher.style.cursor = "grab";
        launcher.style.transition =
          "left .26s cubic-bezier(.2,.9,.25,1),top .18s ease,filter .18s ease";
        launcher.style.setProperty("--dy-pet-drag-tilt", "0deg");
        if (didMove) {
          const dockSide = getLauncherDockSideFromRect();
          if (dockSide) {
            setLauncherDockSide(dockSide);
            positionLauncher();
            showPetBubble(PET_BUBBLE_TEXT.peek, 1300);
          } else {
            setLauncherDockSide("", false);
            setPetState("release", 620);
            restorePetBubbleAfterAction();
          }
        } else if (event.type === "pointercancel") {
          setPetState(getDockPetState());
          restorePetBubbleAfterAction();
        }
        persistLayout();
      }
      if (panelDragSession?.pointerId === event.pointerId) {
        panelDragSession = null;
        panelDragIndicator.style.opacity = ".42";
        panelDragIndicator.style.transform = "scaleX(1)";
        panelDragIndicator.style.boxShadow =
          "0 0 5px rgba(225,183,75,.12)";
        persistLayout();
      }
      if (resizeSession?.pointerId === event.pointerId) {
        if (resizeSession.mark) {
          resizeSession.mark.style.opacity = ".46";
          resizeSession.mark.style.transform = "scale(1)";
          resizeSession.mark.style.filter =
            "drop-shadow(0 0 2px rgba(226,184,82,.16))";
        }
        resizeSession = null;
        persistLayout();
      }
    };
    listen(tavernWindow, "pointerup", finishPointerAction);
    listen(tavernWindow, "pointercancel", finishPointerAction);
    listen(tavernWindow, "resize", () => {
      const nextProfile = getLayoutProfileKey();
      activeLayoutProfile = nextProfile;
      layoutState = loadLayout(nextProfile);
      manualSize = layoutState.manualSize;
      applyLoadedLayout();
    });
    listen(scriptWindow, "pagehide", cleanup);

    collapsed = false;
    clampRootToViewport();
    setCollapsed(layoutState.collapsed, false, false);
  }

  function getLatestAssistantMessageId() {
    try {
      const getLastMessageId = bindHostFunction("getLastMessageId");
      const getChatMessages = bindHostFunction("getChatMessages");
      if (!getLastMessageId || !getChatMessages) return "latest";
      const lastMessageId = getLastMessageId();
      const messages = getChatMessages(`0-${lastMessageId}`, {
        role: "assistant",
      });
      return messages && messages.length > 0
        ? messages[messages.length - 1].message_id
        : "latest";
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 查找最新助手消息失败", error);
      return "latest";
    }
  }

  function readLatestMvuData() {
    try {
      const messageId = getLatestAssistantMessageId();
      const data = scriptWindow.Mvu.getMvuData({
        type: "message",
        message_id: messageId,
      });
      if (data && typeof data === "object") latestMvuData = data;
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 读取最新 MVU 数据失败", error);
    }
    return latestMvuData || { stat_data: {} };
  }

  function refreshVisibleState(data) {
    if (data && typeof data === "object") {
      latestMvuData = data;
    } else {
      readLatestMvuData();
    }
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (disposed || !frame || !frame.contentWindow) return;
      const frameWindow = frame.contentWindow;
      if (typeof frameWindow.__daoyuanInstallStableRefresh === "function") {
        frameWindow.__daoyuanInstallStableRefresh();
      }
      if (typeof frameWindow.populateCharacterData === "function") {
        frameWindow.populateCharacterData();
      }
    }, 0);
  }

  function subscribe(eventType, listener) {
    if (!eventType || typeof scriptWindow.eventOn !== "function") return null;
    return rememberStopHandle(scriptWindow.eventOn(eventType, listener));
  }

  async function start() {
    await createHostShell();

    if (typeof scriptWindow.waitGlobalInitialized !== "function") {
      throw new Error("酒馆助手未提供 waitGlobalInitialized");
    }
    await Promise.race([
      scriptWindow.waitGlobalInitialized("Mvu"),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("等待 MVU 初始化超时，请确认已启用 MVU 脚本")),
          20000,
        );
      }),
    ]);
    if (
      !scriptWindow.Mvu ||
      typeof scriptWindow.Mvu.getMvuData !== "function" ||
      typeof scriptWindow.Mvu.replaceMvuData !== "function"
    ) {
      throw new Error("MVU 未正确初始化，请确认已启用 MVU 脚本");
    }

    readLatestMvuData();

    frame = tavernDocument.createElement("iframe");
    frame.id = "daoyuan-floating-mvu-frame";
    frame.title = "道渊 MVU 悬浮状态栏";
    frame.style.cssText = [
      "display:none",
      "width:100%",
      "height:100%",
      "border:0",
      "outline:0",
      "border-radius:12px",
      "background:transparent",
      "color-scheme:dark",
    ].join(";");

    const mvuProxy = new Proxy(scriptWindow.Mvu, {
      get(target, property) {
        const value = Reflect.get(target, property);
        if (property === "replaceMvuData" && typeof value === "function") {
          return async (mvuData, options) => {
            const result = await value.call(target, mvuData, options);
            if (mvuData && typeof mvuData === "object") {
              latestMvuData = mvuData;
            }
            return result;
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    const apiNames = [
      "$",
      "_",
      "errorCatched",
      "eventEmit",
      "getLastMessageId",
      "getChatMessages",
      "getVariables",
      "replaceVariables",
      "updateVariablesWith",
      "getLorebookEntries",
      "getOrCreateChatLorebook",
      "getCurrentCharPrimaryLorebook",
      "getCharLorebooks",
      "getPersonaAvatarPath",
      "appendInexistentScriptButtons",
      "getButtonEvent",
      "generate",
    ];
    const api = Object.fromEntries(
      apiNames.map(name => [
        name,
        name === "$" || name === "_"
          ? scriptWindow[name]
          : typeof scriptWindow[name] === "function"
            ? Function.prototype.bind.call(scriptWindow[name], scriptWindow)
            : scriptWindow[name],
      ]),
    );

    frame.__daoyuanFloatingBridge = {
      Mvu: mvuProxy,
      api,
      storage: sharedStatusStorage,
      getLatestMvuData: () => latestMvuData || readLatestMvuData(),
      waitGlobalInitialized: async name => {
        if (name === "Mvu") return scriptWindow.Mvu;
        return scriptWindow.waitGlobalInitialized(name);
      },
      eventOn: (eventType, listener) => {
        const wrapped = (...args) => {
          if (
            eventType === scriptWindow.Mvu.events.VARIABLE_UPDATE_ENDED ||
            eventType === MANUAL_UPDATE_EVENT
          ) {
            if (args[0] && typeof args[0] === "object") {
              latestMvuData = args[0];
            }
            if (collapsed) {
              setPetUpdateNotice(
                true,
                isDangerousMvuData(args[0] || latestMvuData),
              );
            }
          }
          return listener(...args);
        };
        return subscribe(eventType, wrapped);
      },
      ready: () => {
        if (disposed || !root || !frame) return;
        status?.remove();
        status = null;
        frame.style.display = "block";
      },
      fail: message => {
        console.error("[道渊悬浮状态栏] 界面加载失败", message);
        showStatus(`道渊悬浮状态栏加载失败：${message}`, true);
      },
      resize: requestedHeight => {
        if (disposed || !root || collapsed || manualSize) return;
        const viewportHeight =
          tavernWindow.innerHeight || tavernDocument.documentElement.clientHeight;
        const rootTop = root.getBoundingClientRect().top;
        const maximum = Math.max(
          MIN_HEIGHT,
          viewportHeight - rootTop - 4,
        );
        const height = Math.max(
          MIN_HEIGHT,
          Math.min(
            maximum,
            Math.ceil(Number(requestedHeight) || MIN_HEIGHT),
          ),
        );
        if (height <= root.getBoundingClientRect().height + 1) return;
        root.style.height = `${height}px`;
        layoutState.height = height;
      },
    };

    frame.srcdoc = uiHtml;
    viewport.prepend(frame);

    const appendScriptButtons = bindHostFunction(
      "appendInexistentScriptButtons",
    );
    const getButtonEvent = bindHostFunction("getButtonEvent");
    if (appendScriptButtons) {
      appendScriptButtons([{ name: "切换悬浮窗", visible: true }]);
    }
    if (getButtonEvent) {
      subscribe(getButtonEvent("切换悬浮窗"), togglePanel);
    }

    subscribe(scriptWindow.Mvu.events.VARIABLE_INITIALIZED, variables => {
      refreshVisibleState(variables);
    });

    const tavernEvents = scriptWindow.tavern_events || {};
    [
      tavernEvents.CHAT_CHANGED,
      tavernEvents.MESSAGE_SWIPED,
      tavernEvents.MESSAGE_UPDATED,
      tavernEvents.MESSAGE_DELETED,
    ]
      .filter(Boolean)
      .forEach(eventType => {
        subscribe(eventType, () => {
          latestMvuData = null;
          setTimeout(() => refreshVisibleState(), 0);
        });
      });
  }

  start().catch(error => {
    console.error("[道渊悬浮状态栏] 启动失败", error);
    showStatus(`道渊悬浮状态栏启动失败：${error.message}`, true);
    if (typeof scriptWindow.toastr?.error === "function") {
      scriptWindow.toastr.error(
        `道渊悬浮状态栏启动失败：${error.message}`,
      );
    }
  });
}

const uiHtml = injectBootstrap(fs.readFileSync(distHtmlPath, "utf8"));
const serializedUiHtml = JSON.stringify(uiHtml).replace(
  /<\/script/gi,
  "<\\/script",
);
const serializedPetAssets = JSON.stringify(floatingPetAssets);
const scriptContent = `/*
 * 道渊 MVU 悬浮状态栏
 * 由 pnpm build:floating-mvu 自动生成，请勿直接修改此文件。
 */
(${floatingMvuRuntime.toString()})(${serializedUiHtml},${serializedPetAssets});
`;

const output = {
  type: "script",
  enabled: false,
  name: "道渊 MVU 悬浮状态栏",
  id: "daoyuan-floating-mvu",
  content: scriptContent,
  info: "在酒馆父页面显示道渊 MVU 状态栏；MVU 更新时刷新同一个悬浮窗口。",
  button: {
    enabled: true,
    buttons: [{ name: "切换悬浮窗", visible: true }],
  },
  data: {},
  export_with: {
    data: true,
    button: true,
  },
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
if (fs.existsSync(legacyOutputPath)) {
  fs.rmSync(legacyOutputPath);
}
console.log(`Generated importable Tavern Helper script at ${outputPath}`);
