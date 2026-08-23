<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, watch } from "vue";
import { renderDaoyuanApplause } from "./applause.js";
import {
  beautyForumState,
  applyBeautyForumPreset,
  DEFAULT_BEAUTY_FORUM_REPLY_INSTRUCTION,
  deleteBeautyForumPreset,
  refreshBeautyForumPresets,
  saveBeautyForumSettings,
  saveBeautyForumPreset,
  setBeautyForumStatus,
} from "./beauty-forum-store.js";

const portraitOpen = reactive({});
const deleteTimers = new Map();

const cards = computed(() => beautyForumState.cards);
const portraitRevision = computed(() => beautyForumState.portraitRevision);

function hasPortrait(card) {
  void portraitRevision.value;
  const name = String(card?.name || "");
  if (!name) return false;
  const gender = card?.data?.性别;
  return Boolean(window.getPortraitUrl?.(name, gender));
}

function portraitUrl(card) {
  void portraitRevision.value;
  const name = String(card?.name || "");
  const gender = card?.data?.性别;
  return window.getPortraitUrl?.(name, gender) || "";
}

function rankLabel(card, index) {
  return card?.data?.排名 || index + 1;
}

function threadFor(name) {
  const key = String(name || "");
  if (!beautyForumState.threads[key]) beautyForumState.threads[key] = [];
  return beautyForumState.threads[key];
}

function draftFor(name) {
  const key = String(name || "");
  if (beautyForumState.drafts[key] === undefined) beautyForumState.drafts[key] = "";
  return beautyForumState.drafts[key];
}

function isExpanded(name) {
  return beautyForumState.expanded[String(name || "")] !== false;
}

function isDeleteArmed(name) {
  return beautyForumState.deleteArmed[String(name || "")] === true;
}

function setDeleteArmed(name, value) {
  beautyForumState.deleteArmed[String(name || "")] = Boolean(value);
}

function setExpanded(name, value) {
  beautyForumState.expanded[String(name || "")] = Boolean(value);
}

function toggleThread(name) {
  setExpanded(name, !isExpanded(name));
}

function cardFloorCount(name) {
  return threadFor(name).length;
}

function floorTime(floor) {
  if (floor?.time) return floor.time;
  if (!floor?.createdAt) return "";
  const date = new Date(floor.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNowTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function nextForumFloor(thread) {
  return (
    thread.reduce((maxFloor, floor) => Math.max(maxFloor, Number(floor.floor) || 0), 0) +
    1
  );
}

function createForumFloor(content, floor, replyTo = null, status = "done") {
  return {
    id: `forum_${Date.now()}_${Math.floor(Math.random() * 1000)}_${floor}`,
    content,
    createdAt: Date.now(),
    time: formatNowTime(),
    replyTo,
    floor,
    likes: 0,
    liked: false,
    status,
    error: "",
  };
}

function escapeSelectorValue(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(String(value || ""));
  }
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function scrollThreadToBottom(name) {
  await nextTick();
  const selector = `[data-beauty="${escapeSelectorValue(name)}"]`;
  const card = document.querySelector(selector);
  const list = card?.querySelector(".forum-thread-list");
  if (list) {
    list.scrollTop = list.scrollHeight;
  }
}

function togglePortrait(name) {
  const key = String(name || "");
  portraitOpen[key] = !portraitOpen[key];
}

function syncPortraitState() {
  cards.value.forEach((card) => {
    const key = String(card.name || "");
    if (!key) return;
    if (portraitOpen[key] === undefined) {
      portraitOpen[key] = false;
    }
    if (!hasPortrait(card)) {
      portraitOpen[key] = false;
    }
    if (beautyForumState.deleteArmed[key] === undefined) {
      beautyForumState.deleteArmed[key] = false;
    }
    if (beautyForumState.expanded[key] === undefined) {
      beautyForumState.expanded[key] = false;
    }
  });
}

function refreshPortraitConsumers() {
  beautyForumState.portraitRevision += 1;
}

watch(
  () =>
    cards.value
      .map((card) => `${card.name}:${card.data?.排名 || ""}:${card.data?.性别 || ""}`)
      .join("|"),
  async () => {
    syncPortraitState();
    await nextTick();
    if (typeof window.injectPortraitDrawers === "function") {
      window.injectPortraitDrawers();
    }
  },
  { immediate: true },
);

watch(portraitRevision, async () => {
  syncPortraitState();
  await nextTick();
  if (typeof window.injectPortraitDrawers === "function") {
    window.injectPortraitDrawers();
  }
});

function normalizeApiRoot(url) {
  let root = String(url || "").trim();
  if (!root) return "";
  root = root.replace(/\/chat\/completions\/?$/i, "");
  root = root.replace(/\/models\/?$/i, "");
  if (root.endsWith("/")) root = root.slice(0, -1);
  return root;
}

function normalizeChatEndpoint(url) {
  const root = normalizeApiRoot(url);
  if (!root) return "";
  return `${root}/chat/completions`;
}

function buildThreadHistory(floors, skipId) {
  const lines = [];
  const visibleFloors = skipId
    ? floors.filter((floor) => floor.id !== skipId)
    : floors;
  visibleFloors.forEach((floor, index) => {
    const floorNo = floor.floor || index + 1;
    const content = floor.content || floor.userContent || floor.aiContent || "";
    if (content && floor.status !== "pending") {
      lines.push(`#${floorNo}楼 匿名道友: ${content}`);
    }
  });
  return lines.join("\n");
}

function buildForumCommentPrompt(card, userMessage, floors, skipId) {
  const settings = beautyForumState.settings || {};
  const replyInstruction =
    String(settings.replyInstruction || "").trim() ||
    DEFAULT_BEAUTY_FORUM_REPLY_INSTRUCTION;
  const extraPrompt = String(settings.extraPrompt || "").trim();
  const historyText = buildThreadHistory(floors, skipId);
  const data = card?.data || {};
  let prompt =
    `[绝色榜人物]\n` +
    `角色: ${card.name}\n` +
    `仙姿: ${data.仙姿 || ""}\n\n` +
    `[群芳谱原作]\n` +
    `${data.群芳谱 || ""}\n\n`;

  if (historyText) {
    prompt += `[历史回帖记录]\n${historyText}\n\n`;
  }

  prompt += `[上一条评论]\n匿名道友说: ${String(userMessage || "").trim()}\n\n`;

  if (extraPrompt) {
    prompt += `[回复指引]\n${extraPrompt}\n\n`;
  }

  prompt += `(${replyInstruction})`;
  return prompt;
}

function cleanForumReply(rawReply) {
  let extracted = String(rawReply || "");
  extracted = extracted.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const replyMatch =
    extracted.match(/\[REPLY\]([\s\S]*?)\[\/REPLY\]/i) ||
    extracted.match(/【回复】([\s\S]*?)【\/回复】/);
  if (replyMatch && replyMatch[1]) {
    extracted = replyMatch[1].trim();
  } else {
    extracted = extracted.replace(/^[<q>"'「”]|["</q>'」]$/g, "").trim();
  }
  return extracted || "这位道友敲了半天，最后只憋出一声冷笑。";
}

async function callForumGenerateReply(card, userMessage, floors, floorId) {
  const settings = beautyForumState.settings || {};
  const systemPrompt = buildForumCommentPrompt(
    card,
    userMessage,
    floors,
    floorId,
  );
  const customBase = normalizeApiRoot(settings.apiBaseUrl);
  const customModel = String(settings.apiModel || "").trim();

  if (customBase && customModel) {
    const endpoint = normalizeChatEndpoint(customBase);
    const payload = {
      model: customModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请发表一段评论" },
      ],
      temperature: Number.isFinite(Number(settings.temperature))
        ? Number(settings.temperature)
        : 0.85,
      max_tokens: 500,
    };
    const headers = { "Content-Type": "application/json" };
    if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${text}`);
    }
    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.reply ??
      data?.text ??
      "";
    return cleanForumReply(content);
  }

  if (typeof window.generate === "function") {
    const combinedPrompt = `${systemPrompt}\n\n请发表一段评论`;
    const rawReply = await window.generate({
      user_input: combinedPrompt,
      should_stream: false,
      max_chat_history: 15,
    });

    if (typeof rawReply === "string") return cleanForumReply(rawReply);
    if (rawReply && typeof rawReply === "object") {
      return cleanForumReply(
        rawReply.text || rawReply.reply || rawReply.content || "",
      );
    }
    return cleanForumReply(String(rawReply || ""));
  }

  throw new Error("未找到可用的回复生成接口");
}

async function fetchApiModels() {
  const base = normalizeApiRoot(beautyForumState.settings.apiBaseUrl);
  if (!base) {
    setBeautyForumStatus("请先填写基础 URL 再获取模型。", "warn");
    return;
  }
  try {
    setBeautyForumStatus("正在获取模型列表...", "info");
    const headers = {};
    if (beautyForumState.settings.apiKey) {
      headers.Authorization = `Bearer ${beautyForumState.settings.apiKey}`;
    }
    const response = await fetch(`${base}/models`, { headers });
    if (!response.ok) {
      throw new Error(`模型列表请求失败: ${response.status}`);
    }
    const data = await response.json();
    const models = Array.isArray(data?.data)
      ? data.data
          .map((item) => item?.id || item?.name)
          .filter((item) => typeof item === "string" && item.trim())
      : [];
    beautyForumState.modelOptions = models;
    if (models.length > 0 && !beautyForumState.settings.apiModel) {
      beautyForumState.settings.apiModel = models[0];
    }
    setBeautyForumStatus(
      models.length > 0 ? "模型列表已更新。" : "未获取到可用模型。",
      models.length > 0 ? "success" : "warn",
    );
  } catch (error) {
    console.error("[道渊] 获取绝色榜回帖模型失败:", error);
    setBeautyForumStatus(`获取模型失败：${error.message}`, "error");
  }
}

function saveSettings() {
  saveBeautyForumSettings(beautyForumState.settings);
  setBeautyForumStatus("绝色榜回帖设定已保存。", "success");
}

function openSettings() {
  refreshBeautyForumPresets();
  beautyForumState.settingsOpen = true;
}

function closeSettings() {
  beautyForumState.settingsOpen = false;
}

function applySelectedPreset() {
  const presetName = String(beautyForumState.settingsPresetName || "").trim();
  if (!presetName) {
    setBeautyForumStatus("请先选择一个绝色榜回帖预设。", "warn");
    return;
  }
  const applied = applyBeautyForumPreset(presetName);
  if (!applied) {
    setBeautyForumStatus(`预设【${presetName}】不存在。`, "error");
    return;
  }
  setBeautyForumStatus(`已应用预设【${presetName}】。`, "success");
}

function saveCurrentAsPreset() {
  const fallbackName = String(beautyForumState.settingsPresetName || "").trim();
  const presetName = window.prompt("请输入绝色榜回帖预设名称：", fallbackName || "");
  if (presetName === null) return;
  const trimmed = String(presetName || "").trim();
  if (!trimmed) {
    setBeautyForumStatus("预设名称不能为空。", "warn");
    return;
  }
  if (!saveBeautyForumPreset(trimmed, beautyForumState.settings)) {
    setBeautyForumStatus("保存预设失败。", "error");
    return;
  }
  refreshBeautyForumPresets();
  beautyForumState.settingsPresetName = trimmed;
  setBeautyForumStatus(`已保存预设【${trimmed}】。`, "success");
}

function deleteSelectedPreset() {
  const presetName = String(beautyForumState.settingsPresetName || "").trim();
  if (!presetName) {
    setBeautyForumStatus("请先选择一个要删除的绝色榜预设。", "warn");
    return;
  }
  if (!confirm(`确定要删除绝色榜预设【${presetName}】吗？`)) return;
  if (!deleteBeautyForumPreset(presetName)) {
    setBeautyForumStatus(`预设【${presetName}】不存在。`, "error");
    return;
  }
  refreshBeautyForumPresets();
  setBeautyForumStatus(`预设【${presetName}】已删除。`, "success");
}

function toggleLike(floor) {
  if (!floor) return;
  if (floor.liked) {
    floor.liked = false;
    floor.likes = Math.max(0, Number(floor.likes || 0) - 1);
  } else {
    floor.liked = true;
    floor.likes = Number(floor.likes || 0) + 1;
  }
}

function deleteFloor(cardName, floorId) {
  const thread = threadFor(cardName);
  const index = thread.findIndex((item) => item.id === floorId);
  if (index < 0) return;
  if (!confirm("确定删除这层回帖吗？")) return;
  thread.splice(index, 1);
}

async function retryFloor(card, floor) {
  if (!card || !floor) return;
  if (beautyForumState.generatingName) {
    setBeautyForumStatus("正在生成其他回帖，请稍后再试。", "warn");
    return;
  }

  beautyForumState.generatingName = card.name;
  floor.status = "pending";
  floor.error = "";
  try {
    const floors = threadFor(card.name);
    const sourceFloor =
      floors.find((item) => Number(item.floor) === Number(floor.replyTo)) ||
      floors[floors.indexOf(floor) - 1] ||
      floor;
    const reply = await callForumGenerateReply(
      card,
      sourceFloor.content || sourceFloor.userContent || "",
      floors,
      floor.id,
    );
    floor.content = reply || "这位道友敲了半天，最后只憋出一声冷笑。";
    floor.time = formatNowTime();
    floor.status = "done";
    await scrollThreadToBottom(card.name);
  } catch (error) {
    floor.status = "error";
    floor.error = error?.message || String(error);
    setBeautyForumStatus(`回帖生成失败：${floor.error}`, "error");
    await scrollThreadToBottom(card.name);
  } finally {
    beautyForumState.generatingName = "";
  }
}

async function submitReply(card) {
  if (!card?.name) return;
  if (beautyForumState.generatingName) {
    setBeautyForumStatus("正在生成其他回帖，请稍后再试。", "warn");
    return;
  }

  const key = String(card.name || "");
  const draft = String(draftFor(key) || "").trim();
  if (!draft) {
    window.alert?.("回帖内容不能为空！");
    return;
  }

  const thread = threadFor(key);
  const userFloorNo = nextForumFloor(thread);
  const previousFloor = thread[thread.length - 1];
  const previousFloorNo = previousFloor
    ? Number(previousFloor.floor) || userFloorNo - 1
    : null;
  const userFloor = createForumFloor(draft, userFloorNo, previousFloorNo);
  const aiFloor = createForumFloor(
    "另一位匿名道友正在回帖...",
    userFloorNo + 1,
    userFloorNo,
    "pending",
  );

  thread.push(userFloor, aiFloor);
  beautyForumState.drafts[key] = "";
  beautyForumState.generatingName = key;
  setBeautyForumStatus(`正在为【${key}】生成回帖...`, "info");

  try {
    const reply = await callForumGenerateReply(card, draft, thread, aiFloor.id);
    aiFloor.content = reply || "这位道友敲了半天，最后只憋出一声冷笑。";
    aiFloor.time = formatNowTime();
    aiFloor.status = "done";
    setBeautyForumStatus(`【${key}】回帖已生成。`, "success");
    await scrollThreadToBottom(key);
  } catch (error) {
    aiFloor.status = "error";
    aiFloor.error = error?.message || String(error);
    setBeautyForumStatus(`回帖生成失败：${aiFloor.error}`, "error");
    await scrollThreadToBottom(key);
  } finally {
    beautyForumState.generatingName = "";
  }
}

function onDraftKeydown(card, event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitReply(card);
  }
}

function resizeReplyInput(event) {
  const target = event?.target;
  if (!target) return;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
}

function armDeleteBeauty(card) {
  const name = String(card?.name || "");
  if (!name) return;
  if (!isDeleteArmed(name)) {
    setDeleteArmed(name, true);
    if (deleteTimers.has(name)) clearTimeout(deleteTimers.get(name));
    deleteTimers.set(
      name,
      setTimeout(() => {
        setDeleteArmed(name, false);
        deleteTimers.delete(name);
      }, 2000),
    );
    return;
  }
  setDeleteArmed(name, false);
  if (deleteTimers.has(name)) {
    clearTimeout(deleteTimers.get(name));
    deleteTimers.delete(name);
  }
  deleteBeautyEntry(card.name);
}

async function deleteBeautyEntry(name) {
  try {
    const lastMsgId = window.getLastMessageId?.();
    if (!lastMsgId) return;
    const messages = window.getChatMessages?.(`0-${lastMsgId}`, {
      role: "assistant",
    });
    if (!messages || messages.length === 0) return;
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof window.Mvu.replaceMvuData === "function") {
      const fullData = window.Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (fullData?.stat_data?.绝色榜?.[name]) {
        delete fullData.stat_data.绝色榜[name];
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        await window.notifyDaoyuanMvuChanged(fullData);
      }
    }
  } catch (error) {
    console.error("[道渊] 删除绝色榜条目失败:", name, error);
    window.alert?.(`删除失败：${error.message || error}`);
  }
}

function openThreadSettings() {
  openSettings();
}

function showLoreByName(name) {
  window.showLoreByName?.(name);
}

function showMissingPortraitDialog(name) {
  window.showMissingPortraitDialog?.(name);
}

function openCustomPortraitDialog(name) {
  window.openCustomPortraitDialog?.(name);
}

function switchPortrait(name) {
  window.switchPortrait?.(name);
}

function closeStatusMessage() {
  beautyForumState.statusMessage = "";
  beautyForumState.statusTone = "info";
}

onMounted(async () => {
  window.addEventListener("daoyuan_portraits_changed", refreshPortraitConsumers);
  await nextTick();
  refreshBeautyForumPresets();
  if (typeof window.injectPortraitDrawers === "function") {
    window.injectPortraitDrawers();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("daoyuan_portraits_changed", refreshPortraitConsumers);
  deleteTimers.forEach((timer) => clearTimeout(timer));
  deleteTimers.clear();
});

window.fetchBeautyForumModels = fetchApiModels;
</script>

<template>
  <div class="beauty-forum-root">
    <div class="forum-topbar">
      <div class="forum-topbar-copy">
        <div class="forum-topbar-head">
          <div class="forum-topbar-title">绝色榜回帖</div>
          <button class="forum-topbar-btn" type="button" title="回帖设定" @click="openThreadSettings">
            ⚙️
          </button>
        </div>
        <div class="forum-topbar-subtitle">匿名道友的回帖只保存在本页内存里</div>
      </div>
    </div>

    <div v-if="!cards.length" class="empty-state forum-empty">
      <strong>暂无相关记录。</strong>
      <span>等绝色榜数据刷新后，这里才会出现回帖区。</span>
    </div>

    <div v-else class="forum-card-list">
      <article
        v-for="(card, index) in cards"
        :key="card.name"
        class="info-card beauty-forum-card"
        :data-beauty="card.name"
      >
        <div class="info-title beauty-forum-head">
          <span
            class="beauty-forum-name"
            title="点击探查天机"
            @click.stop="showLoreByName(card.name)"
          >
            第{{ rankLabel(card, index) }}名：{{ card.name }}
          </span>
          <button
            class="beauty-forum-delete"
            type="button"
            :class="{ armed: isDeleteArmed(card.name) }"
            :title="isDeleteArmed(card.name) ? '再次点击确认删除' : '删除绝色榜条目'"
            @click.stop="armDeleteBeauty(card)"
          >
            {{ isDeleteArmed(card.name) ? "删除?" : "✕" }}
          </button>
          <span
            v-if="card.data?.头衔"
            class="beauty-forum-title-badge"
            :title="card.data.头衔"
          >
            {{ card.data.头衔 }}
          </span>
        </div>

        <div class="info-text beauty-forum-copy">
          <b>倾世仙姿：</b>
          <span style="color:#dcdde1">{{ card.data?.仙姿 || "暂无描述" }}</span>
          <br /><br />
          <b>坊间群芳谱：</b>
          <i style="font-size:0.9em; color:#bbb;">"{{ card.data?.群芳谱 || "暂无描述" }}"</i>
        </div>

        <div class="portrait-wrapper">
          <div class="portrait-actions">
            <div class="beauty-forum-primary-actions">
              <div
                v-if="hasPortrait(card)"
                class="portrait-toggle-btn"
                @click.stop="togglePortrait(card.name)"
              >
                {{ portraitOpen[card.name] ? "收起立绘 ▲" : "查看立绘 ▼" }}
              </div>
              <div
                v-else
                class="portrait-toggle-btn"
                style="opacity:0.75;"
                title="配置或获取角色立绘"
                @click.stop="showMissingPortraitDialog(card.name)"
              >
                暂无立绘
              </div>

              <div
                class="portrait-custom-btn"
                title="设置立绘"
                @click.stop="openCustomPortraitDialog(card.name)"
              >
                🎨
              </div>
              <div
                class="portrait-custom-btn"
                title="切换立绘"
                @click.stop="switchPortrait(card.name)"
              >
                🔄
              </div>
              <span class="forum-applause" v-html="renderDaoyuanApplause(card.name)"></span>
            </div>
            <div class="beauty-forum-secondary-actions">
              <button
                class="forum-thread-toggle"
                type="button"
                :title="isExpanded(card.name) ? '收起回帖' : '展开回帖'"
                @click.stop="toggleThread(card.name)"
              >
                <span class="forum-thread-icon">✎</span>
                <span>回帖</span>
                <span class="forum-thread-caret">{{ isExpanded(card.name) ? "▲" : "▼" }}</span>
              </button>
              <div class="beauty-forum-drawer-slot"></div>
            </div>
          </div>

          <div v-if="hasPortrait(card)" class="large-portrait" :class="{ show: portraitOpen[card.name] }">
            <img
              :src="portraitOpen[card.name] ? portraitUrl(card) : ''"
              :alt="card.name"
            />
          </div>
          <div
            v-else
            class="large-portrait"
            style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;"
          >
            点击「🎨 自定义」上传本地图片
          </div>
        </div>

          <div v-show="isExpanded(card.name)" class="forum-panel">
            <div class="forum-panel-head">
              <div class="forum-panel-title">
                <span>回帖</span>
                <span v-if="cardFloorCount(card.name)" class="forum-panel-count">{{ cardFloorCount(card.name) }}</span>
              </div>
              <div class="forum-panel-actions">
                <button class="forum-panel-btn compact" type="button" @click="retryFloor(card, threadFor(card.name)[threadFor(card.name).length - 1])" :disabled="!threadFor(card.name).length || !!beautyForumState.generatingName">
                ↻ 重写
              </button>
            </div>
          </div>

          <div v-if="!threadFor(card.name).length" class="forum-empty-thread">
            暂无回帖，发表首评
          </div>

          <div v-else class="forum-thread-list">
            <article
              v-for="(floor, floorIndex) in threadFor(card.name)"
              :key="floor.id"
              class="forum-floor"
              :class="{ error: floor.status === 'error', 'is-reply': floorIndex > 0 }"
            >
              <div class="forum-floor-meta">
                <span class="forum-floor-speaker">匿名道友</span>
                <span class="forum-floor-label">#{{ floor.floor }}</span>
                <span class="forum-floor-time">{{ floorTime(floor) }}</span>
                <button class="forum-floor-action fr-like" type="button" :class="{ liked: floor.liked }" @click="toggleLike(floor)">
                  ❤ {{ floor.likes || 0 }}
                </button>
                <button class="forum-floor-action fr-del" type="button" title="删除此回帖" @click="deleteFloor(card.name, floor.id)">
                  ⌫
                </button>
              </div>

              <div class="forum-floor-content" :class="{ pending: floor.status === 'pending' }">
                <template v-if="floor.status === 'pending'">
                  <span class="forum-loading-dot"></span>
                  <span>{{ floor.content }}</span>
                </template>
                <template v-else>
                  {{ floor.content || "这位道友敲了半天，最后只憋出一声冷笑。" }}
                </template>
              </div>

              <div v-if="floor.error" class="forum-floor-error">
                {{ floor.error }}
              </div>
            </article>
          </div>

          <div class="forum-input-box">
            <textarea
              v-model="beautyForumState.drafts[card.name]"
              class="reply-input forum-reply-input"
              rows="1"
              :placeholder="beautyForumState.generatingName && beautyForumState.generatingName !== card.name
                ? '正在生成其他回帖...'
                : '输入回帖内容...（Enter 发送）'"
              :disabled="!!beautyForumState.generatingName"
              @input="resizeReplyInput"
              @keydown="onDraftKeydown(card, $event)"
            />
            <button
              class="reply-button forum-send-btn"
              type="button"
              :disabled="!!beautyForumState.generatingName"
              @click="submitReply(card)"
            >
              {{ beautyForumState.generatingName === card.name ? "…" : "➤" }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <div
      v-if="beautyForumState.settingsOpen"
      class="forum-settings-overlay"
      @click.self="closeSettings"
    >
      <div class="forum-settings-modal">
        <div class="forum-settings-head">
          <div class="forum-settings-title">绝色榜回帖设定</div>
          <button class="forum-settings-close" type="button" @click="closeSettings">×</button>
        </div>

        <div class="forum-settings-body">
          <div class="forum-settings-section">
            <div class="forum-settings-section-title">预设配置方案</div>
            <div class="forum-preset-row">
              <select
                v-model="beautyForumState.settingsPresetName"
                class="reply-input forum-preset-select"
              >
                <option value="">-- 手动配置 --</option>
                <option
                  v-for="preset in beautyForumState.presetNames"
                  :key="preset"
                  :value="preset"
                >
                  {{ preset }}
                </option>
              </select>
              <button class="forum-panel-btn" type="button" @click="applySelectedPreset">
                应用
              </button>
              <button class="forum-panel-btn primary" type="button" @click="saveCurrentAsPreset">
                另存
              </button>
              <button class="forum-panel-btn danger" type="button" @click="deleteSelectedPreset">
                删除
              </button>
            </div>

            <div class="forum-settings-section-title">自定义 API</div>
            <div class="forum-settings-section-hint">
              填了基础 URL 和模型后，回帖会优先走自定义 API；否则回退到酒馆原生生成。
            </div>

            <label class="forum-field">
              <span>基础 URL</span>
              <input v-model="beautyForumState.settings.apiBaseUrl" type="text" placeholder="例如: https://api.xxx.com/v1" />
            </label>

            <label class="forum-field">
              <span>API 密钥</span>
              <input v-model="beautyForumState.settings.apiKey" type="password" placeholder="sk-..." />
            </label>

            <label class="forum-field">
              <span>模型名称</span>
              <input v-model="beautyForumState.settings.apiModel" type="text" placeholder="例如: gpt-4o-mini" />
            </label>

            <div class="forum-model-row">
              <button class="forum-panel-btn" type="button" @click="fetchApiModels">
                获取模型
              </button>
              <select
                v-if="beautyForumState.modelOptions.length"
                v-model="beautyForumState.settings.apiModel"
                class="reply-input forum-model-select"
              >
                <option v-for="model in beautyForumState.modelOptions" :key="model" :value="model">
                  {{ model }}
                </option>
              </select>
            </div>

            <label class="forum-field">
              <span>回复人设 / 规则</span>
              <textarea
                v-model="beautyForumState.settings.replyInstruction"
                rows="3"
                placeholder="设置另一位匿名道友要怎么回复..."
              />
            </label>

            <label class="forum-field">
              <span>附加设定 / 规则</span>
              <textarea
                v-model="beautyForumState.settings.extraPrompt"
                rows="4"
                placeholder="给匿名道友回复的额外指引，例如语气偏好、禁忌话题..."
              />
            </label>

            <label class="forum-field">
              <span>温度</span>
              <input v-model="beautyForumState.settings.temperature" type="number" min="0" max="2" step="0.1" />
            </label>
          </div>
        </div>

        <div class="forum-settings-foot">
          <div
            class="forum-settings-status"
            :data-tone="beautyForumState.statusTone"
          >
            {{ beautyForumState.statusMessage || "设定只保存在本地浏览器。" }}
          </div>
          <div class="forum-settings-actions">
            <button class="forum-panel-btn" type="button" @click="closeStatusMessage">清空提示</button>
            <button class="forum-panel-btn primary" type="button" @click="saveSettings">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.beauty-forum-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.forum-topbar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 2px 0;
}

.forum-topbar-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.forum-topbar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.forum-topbar-title {
  color: var(--rare-text);
  font-size: 1.02em;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.forum-topbar-subtitle {
  color: var(--text-dim);
  font-size: 0.78em;
  line-height: 1.4;
}

.forum-topbar-btn {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(255, 215, 0, 0.08), rgba(255, 215, 0, 0.02));
  color: var(--accent-gold);
  border: 1px solid rgba(255, 215, 0, 0.28);
  border-radius: 6px;
  cursor: pointer;
}

.forum-card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.beauty-forum-card {
  position: relative;
  overflow: hidden;
}

.beauty-forum-delete {
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-2px) scale(0.96);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.beauty-forum-card:hover .beauty-forum-delete,
.beauty-forum-card:focus-within .beauty-forum-delete,
.beauty-forum-delete.armed {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.beauty-forum-delete:hover {
  color: #ff6b6b;
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.42);
}

.beauty-forum-delete.armed {
  width: auto;
  padding: 0 8px;
  color: var(--accent-blood);
  border-color: rgba(255, 77, 77, 0.4);
  box-shadow: 0 0 0 1px rgba(255, 77, 77, 0.15);
}

.beauty-forum-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding-right: 0;
}

.beauty-forum-name {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.beauty-forum-title-badge {
  max-width: 220px;
  padding: 0;
  color: var(--accent-gold);
  background: transparent;
  border: 0;
  border-radius: 0;
  font-size: 0.88em;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  text-align: right;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.18);
}

.beauty-forum-copy {
  line-height: 1.65;
}

.forum-panel {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.forum-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  flex-wrap: nowrap;
}

.forum-panel-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex: 1;
  min-width: 0;
  color: var(--accent-gold);
  font-size: 0.92em;
  font-weight: 700;
  white-space: nowrap;
}

.forum-panel-count {
  color: var(--text-dim);
  font-size: 0.86em;
  font-weight: 400;
  white-space: nowrap;
}

.forum-panel-actions,
.forum-settings-actions,
.forum-model-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.forum-panel-actions {
  flex-shrink: 0;
  margin-left: auto;
  flex-wrap: nowrap;
}

.forum-preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.forum-preset-select {
  flex: 1;
  min-width: 180px;
}

.forum-panel-btn {
  padding: 6px 10px;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.forum-panel-btn.compact {
  padding: 4px 8px;
  font-size: 0.86em;
  white-space: nowrap;
}

.forum-panel-btn.primary {
  color: var(--accent-gold);
  background: rgba(255, 215, 0, 0.08);
  border-color: rgba(255, 215, 0, 0.25);
}

.forum-panel-btn.danger {
  color: var(--accent-blood);
  background: rgba(255, 77, 77, 0.08);
  border-color: rgba(255, 77, 77, 0.22);
}

.forum-panel-btn.danger:hover {
  background: rgba(255, 77, 77, 0.16);
  border-color: rgba(255, 77, 77, 0.4);
}

.forum-empty-thread {
  padding: 12px;
  color: var(--text-dim);
  font-size: 0.84em;
  font-style: italic;
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.12);
}

.forum-thread-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 340px;
  overflow: auto;
  padding-right: 2px;
}

.forum-floor {
  position: relative;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.18);
}

.forum-floor.error {
  border-color: rgba(255, 77, 77, 0.22);
}

.forum-floor.is-reply {
  padding-left: 46px;
  border-left-color: rgba(216, 193, 136, 0.18);
}

.forum-floor.is-reply::before {
  content: "↳";
  position: absolute;
  left: 14px;
  top: 14px;
  color: var(--accent-gold);
  font-size: 0.9em;
}

.forum-floor-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-dim);
  font-size: 0.68em;
  min-height: 16px;
}

.forum-floor-label {
  color: var(--accent-gold);
  font-weight: 700;
}

.forum-floor-speaker {
  color: var(--accent-gold);
  font-size: 1em;
  white-space: nowrap;
}

.forum-floor-time {
  margin-left: auto;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

.forum-floor-content {
  margin-top: 4px;
  color: var(--text-main);
  font-size: 0.84em;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.forum-floor-content.pending {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-dim);
}

.forum-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-gold);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  animation: pulse-dot 1.2s infinite ease-in-out;
}

.forum-floor-error {
  margin-top: 4px;
  color: var(--accent-blood);
  font-size: 0.76em;
}

.forum-floor-action {
  padding: 0 2px;
  color: rgba(166, 158, 138, 0.72);
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-size: 1em;
  line-height: 1;
}

.forum-floor-action.liked,
.forum-floor-action:hover {
  color: var(--accent-gold);
}

.fr-del:hover {
  color: var(--accent-blood);
}

.fr-del {
  font-size: 1.08em;
  transform: translateY(-1px);
}

.forum-input-box {
  display: flex;
  gap: 6px;
  align-items: center;
}

.forum-reply-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  height: 30px;
  min-height: 30px;
  max-height: 72px;
  padding: 5px 8px;
  font-size: 0.8em;
  line-height: 1.35;
  resize: none;
}

.forum-send-btn {
  flex: 0 0 34px;
  width: 34px;
  height: 30px;
  min-height: 30px;
  min-width: 0;
  padding: 0;
  font-size: 1em;
  border-radius: 4px;
  background: linear-gradient(135deg, rgba(138, 119, 72, 0.92), rgba(82, 71, 46, 0.92));
  box-shadow: 0 2px 8px rgba(216, 193, 136, 0.12);
  white-space: nowrap;
}

.forum-empty {
  color: var(--text-dim);
}

.forum-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
}

.forum-settings-modal {
  width: min(520px, 100%);
  max-height: min(88vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(216, 193, 136, 0.06), transparent 24%), var(--c-surface, #171c26);
  border: 1px solid rgba(255, 215, 0, 0.24);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}

.forum-settings-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.forum-settings-title {
  flex: 1;
  color: var(--accent-gold);
  font-size: 0.98em;
  font-weight: 700;
}

.forum-settings-close {
  width: 30px;
  height: 30px;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
}

.forum-settings-body {
  flex: 1;
  overflow: auto;
  padding: 14px;
}

.forum-settings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.forum-settings-section + .forum-settings-section {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.forum-settings-section-title {
  color: var(--accent-gold);
  font-size: 0.92em;
  font-weight: 700;
}

.forum-settings-section-hint {
  color: var(--text-dim);
  font-size: 0.8em;
  line-height: 1.5;
}

.forum-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-dim);
  font-size: 0.82em;
}

.forum-field input,
.forum-field textarea,
.forum-model-select {
  width: 100%;
  padding: 8px 10px;
  color: var(--text-main);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font: inherit;
  box-sizing: border-box;
}

.forum-field textarea {
  resize: vertical;
}

.forum-model-select {
  min-width: 180px;
}

.forum-settings-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.forum-settings-status {
  min-width: 0;
  color: var(--text-dim);
  font-size: 0.78em;
  line-height: 1.45;
}

.forum-settings-status[data-tone="success"] {
  color: var(--accent-san);
}

.forum-settings-status[data-tone="warn"] {
  color: var(--accent-gold);
}

.forum-settings-status[data-tone="error"] {
  color: var(--accent-blood);
}

.forum-applause {
  display: inline-flex;
}

.forum-thread-toggle {
  grid-column: auto / span 2;
  min-width: 0;
  min-height: var(--portrait-action-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 7px;
  color: var(--accent-gold);
  background: linear-gradient(to right, transparent, rgba(255, 215, 0, 0.07), transparent);
  border: 1px dashed rgba(255, 215, 0, 0.26);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.forum-thread-toggle:hover {
  background: linear-gradient(to right, transparent, rgba(255, 215, 0, 0.14), transparent);
  border-color: rgba(255, 215, 0, 0.42);
  box-shadow: 0 0 8px var(--accent-gold-glow);
  transform: translateY(-1px);
}

.forum-thread-icon,
.forum-thread-caret {
  flex-shrink: 0;
  font-size: 0.9em;
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .forum-settings-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .forum-settings-actions,
  .forum-model-row {
    width: 100%;
  }

  .forum-input-box {
    flex-direction: row;
    align-items: center;
  }

  .forum-send-btn {
    flex-basis: 34px;
    width: 34px;
  }
}
</style>
