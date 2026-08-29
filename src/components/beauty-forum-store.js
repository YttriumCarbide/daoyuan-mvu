import { reactive } from "vue";

export const BEAUTY_FORUM_SETTINGS_KEY = "daoyuan_beauty_forum_settings";
export const BEAUTY_FORUM_PRESETS_KEY = "daoyuan_beauty_forum_presets";
export const DEFAULT_BEAUTY_FORUM_REPLY_INSTRUCTION =
  "请你以另一位匿名道友的身份，针对上一条评论进行互喷/抬杠/吐槽，语气像修仙界坊市泼皮骂街。50字以内，禁止使用<!-- -->或任何思考标签。只输出纯评论内容，不要角色名、不要引号、不要任何格式标记。";

export const DEFAULT_BEAUTY_FORUM_SETTINGS = {
  apiBaseUrl: "",
  apiKey: "",
  apiModel: "",
  replyInstruction: DEFAULT_BEAUTY_FORUM_REPLY_INSTRUCTION,
  extraPrompt: "",
  temperature: 0.7,
};

function cloneSettings(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...DEFAULT_BEAUTY_FORUM_SETTINGS,
    ...source,
    temperature: Number.isFinite(Number(source.temperature))
      ? Number(source.temperature)
      : DEFAULT_BEAUTY_FORUM_SETTINGS.temperature,
  };
}

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(BEAUTY_FORUM_SETTINGS_KEY);
    if (!raw) return cloneSettings(DEFAULT_BEAUTY_FORUM_SETTINGS);
    return cloneSettings(JSON.parse(raw));
  } catch (error) {
    console.warn("[道渊] 读取绝色榜回帖设置失败，已使用默认值:", error);
    return cloneSettings(DEFAULT_BEAUTY_FORUM_SETTINGS);
  }
}

function persistSettings(settings) {
  try {
    localStorage.setItem(
      BEAUTY_FORUM_SETTINGS_KEY,
      JSON.stringify(cloneSettings(settings)),
    );
  } catch (error) {
    console.warn("[道渊] 保存绝色榜回帖设置失败:", error);
  }
}

function loadStoredPresets() {
  try {
    const raw = localStorage.getItem(BEAUTY_FORUM_PRESETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    console.warn("[道渊] 读取绝色榜回帖预设失败，已使用空预设:", error);
    return {};
  }
}

function persistPresets(presets) {
  try {
    localStorage.setItem(
      BEAUTY_FORUM_PRESETS_KEY,
      JSON.stringify(presets && typeof presets === "object" ? presets : {}),
    );
  } catch (error) {
    console.warn("[道渊] 保存绝色榜回帖预设失败:", error);
  }
}

function listPresetNames(presets) {
  return Object.keys(presets || {}).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

function cloneCard(card) {
  const source = card && typeof card === "object" ? card : {};
  return {
    name: String(source.name || ""),
    data:
      source.data && typeof source.data === "object" && !Array.isArray(source.data)
        ? { ...source.data }
        : {},
  };
}

export const beautyForumState = reactive({
  cards: [],
  threads: {},
  drafts: {},
  expanded: {},
  deleteArmed: {},
  settingsOpen: false,
  settingsPresetName: "",
  presetNames: listPresetNames(loadStoredPresets()),
  settings: loadStoredSettings(),
  modelOptions: [],
  statusMessage: "",
  statusTone: "info",
  generatingName: "",
  portraitRevision: 0,
});

export function setBeautyForumCards(cards) {
  beautyForumState.cards = Array.isArray(cards) ? cards.map(cloneCard) : [];
  beautyForumState.cards.forEach(({ name }) => {
    if (!name) return;
    if (!beautyForumState.threads[name]) beautyForumState.threads[name] = [];
    if (beautyForumState.drafts[name] === undefined) {
      beautyForumState.drafts[name] = "";
    }
    if (beautyForumState.expanded[name] === undefined) {
      beautyForumState.expanded[name] = false;
    }
    if (beautyForumState.deleteArmed[name] === undefined) {
      beautyForumState.deleteArmed[name] = false;
    }
  });
}

export function setBeautyForumStatus(message, tone = "info") {
  beautyForumState.statusMessage = message || "";
  beautyForumState.statusTone = tone || "info";
}

export function saveBeautyForumSettings(nextSettings) {
  beautyForumState.settings = cloneSettings(nextSettings);
  persistSettings(beautyForumState.settings);
}

export function refreshBeautyForumSettings() {
  beautyForumState.settings = loadStoredSettings();
  return beautyForumState.settings;
}

export function refreshBeautyForumPresets() {
  const presets = loadStoredPresets();
  beautyForumState.presetNames = listPresetNames(presets);
  if (
    beautyForumState.settingsPresetName &&
    !Object.prototype.hasOwnProperty.call(
      presets,
      beautyForumState.settingsPresetName,
    )
  ) {
    beautyForumState.settingsPresetName = "";
  }
  return beautyForumState.presetNames;
}

export function applyBeautyForumPreset(name) {
  const presetName = String(name || "").trim();
  if (!presetName) return null;
  const presets = loadStoredPresets();
  const preset = presets[presetName];
  if (!preset) return null;
  beautyForumState.settings = cloneSettings(preset);
  beautyForumState.settingsPresetName = presetName;
  return beautyForumState.settings;
}

export function saveBeautyForumPreset(name, settings = beautyForumState.settings) {
  const presetName = String(name || "").trim();
  if (!presetName) return false;
  const presets = loadStoredPresets();
  presets[presetName] = cloneSettings(settings);
  persistPresets(presets);
  beautyForumState.presetNames = listPresetNames(presets);
  beautyForumState.settingsPresetName = presetName;
  return true;
}

export function deleteBeautyForumPreset(name) {
  const presetName = String(name || "").trim();
  if (!presetName) return false;
  const presets = loadStoredPresets();
  if (!Object.prototype.hasOwnProperty.call(presets, presetName)) return false;
  delete presets[presetName];
  persistPresets(presets);
  beautyForumState.presetNames = listPresetNames(presets);
  if (beautyForumState.settingsPresetName === presetName) {
    beautyForumState.settingsPresetName = "";
  }
  return true;
}

beautyForumState.settings = cloneSettings(beautyForumState.settings);
persistSettings(beautyForumState.settings);
refreshBeautyForumPresets();

window.__beauty_forum_store__ = beautyForumState;
window.setBeautyForumCards = setBeautyForumCards;
window.getBeautyForumThreads = function (name) {
  return beautyForumState.threads[String(name || "")] || [];
};
window.openBeautyForumSettings = function () {
  beautyForumState.settingsOpen = true;
};
window.closeBeautyForumSettings = function () {
  beautyForumState.settingsOpen = false;
};
window.bumpBeautyForumPortraitRevision = function () {
  beautyForumState.portraitRevision += 1;
};
