/* --- 更新调试日志显示 --- */
window.updateDebugLog = function (logContent) {
  const logBox = document.getElementById("wx-debug-log");
  if (logBox) {
    const now = new Date();
    const timeStr =
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0") +
      ":" +
      now.getSeconds().toString().padStart(2, "0");
    logBox.value = `[${timeStr}] 原始返回:\n${logContent}\n\n` + logBox.value;
  }
};

/* --- 玉简设定及预设功能 --- */
window.loadPresets = function () {
  const select = document.getElementById("wx-preset-select");
  if (!select) return;
  select.innerHTML = '<option value="">-- 当前手动配置 --</option>';
  try {
    const saved = localStorage.getItem("daoyuan_wx_presets");
    if (saved) {
      const presets = JSON.parse(saved);
      for (const name in presets) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      }
    }
  } catch (e) {
    console.error("加载预设失败:", e);
  }
};

window.applyPreset = function (presetName) {
  if (!presetName) return;
  try {
    const saved = localStorage.getItem("daoyuan_wx_presets");
    if (saved) {
      const presets = JSON.parse(saved);
      const p = presets[presetName];
      if (p) {
        if (document.getElementById("wx-custom-prompt"))
          document.getElementById("wx-custom-prompt").value =
            p.customPrompt || "";
        if (document.getElementById("wx-api-url"))
          document.getElementById("wx-api-url").value = p.apiBaseUrl || "";
        if (document.getElementById("wx-api-key"))
          document.getElementById("wx-api-key").value = p.apiKey || "";
        if (document.getElementById("wx-api-model"))
          document.getElementById("wx-api-model").value = p.apiModel || "";
      }
    }
  } catch (e) {}
};

window.saveAsPreset = function () {
  const name = prompt("请输入预设名称：\n(若名称已存在将覆盖原预设)");
  if (!name) return;
  try {
    let presets = {};
    const saved = localStorage.getItem("daoyuan_wx_presets");
    if (saved) presets = JSON.parse(saved);

    presets[name] = {
      customPrompt: document.getElementById("wx-custom-prompt")
        ? document.getElementById("wx-custom-prompt").value
        : "",
      apiBaseUrl: document.getElementById("wx-api-url")
        ? document.getElementById("wx-api-url").value.trim()
        : "",
      apiKey: document.getElementById("wx-api-key")
        ? document.getElementById("wx-api-key").value.trim()
        : "",
      apiModel: document.getElementById("wx-api-model")
        ? document.getElementById("wx-api-model").value.trim()
        : "",
    };

    localStorage.setItem("daoyuan_wx_presets", JSON.stringify(presets));
    window.loadPresets();
    document.getElementById("wx-preset-select").value = name;
    alert(`预设 "${name}" 已保存！`);
  } catch (e) {
    alert("保存预设失败：" + e.message);
  }
};

window.deletePreset = function () {
  const select = document.getElementById("wx-preset-select");
  const name = select.value;
  if (!name) {
    alert("请先选择一个要删除的预设！");
    return;
  }
  if (!confirm(`确定要删除预设 "${name}" 吗？`)) return;
  try {
    let presets = {};
    const saved = localStorage.getItem("daoyuan_wx_presets");
    if (saved) presets = JSON.parse(saved);

    delete presets[name];
    localStorage.setItem("daoyuan_wx_presets", JSON.stringify(presets));
    window.loadPresets();
    alert(`预设 "${name}" 已删除！`);
  } catch (e) {
    alert("删除预设失败：" + e.message);
  }
};

window.loadWxSettings = function () {
  try {
    const saved = localStorage.getItem("daoyuan_wx_settings");
    if (saved) {
      const settings = JSON.parse(saved);
      const promptEl = document.getElementById("wx-custom-prompt");
      if (promptEl && settings.customPrompt !== undefined)
        promptEl.value = settings.customPrompt;

      if (settings.apiBaseUrl !== undefined)
        document.getElementById("wx-api-url").value = settings.apiBaseUrl;
      if (settings.apiKey !== undefined)
        document.getElementById("wx-api-key").value = settings.apiKey;
      if (settings.apiModel !== undefined)
        document.getElementById("wx-api-model").value = settings.apiModel;
    }
    window.loadPresets(); // 初始化预设列表
  } catch (e) {
    console.error("加载玉简设定失败:", e);
  }
};

/* 独立的世界书勾选保存逻辑 (只要 checkbox 变动或点按钮就触发) */
window.saveWxLoreSettings = function () {
  const charName = window.currentActiveChat;
  if (!charName) return;

  let savedLore = {};
  try {
    savedLore =
      JSON.parse(localStorage.getItem("daoyuan_wx_lore_selected")) || {};
  } catch (e) {}

  const listContainer = document.getElementById("wx-lorebook-list");
  // 如果当前弹窗里没有渲染 checkbox，说明根本没加载出世界书，此时千万不要保存，以免误清空数据！
  if (
    !listContainer ||
    !listContainer.innerHTML.includes("yujian-lore-checkbox")
  ) {
    return;
  }

  const selectedCheckboxes = document.querySelectorAll(
    ".yujian-lore-checkbox:checked",
  );
  const selectedData = [];
  selectedCheckboxes.forEach((cb) => {
    const uid = cb.value;
    if (window.currentLoreEntries) {
      // 【修复点】：使用 String() 强制转换对比，解决原来因类型不匹配（数字 vs 字符串）导致存入空数组的Bug
      const entry = window.currentLoreEntries.find(
        (e) => String(e.uid) === String(uid),
      );
      if (entry) {
        selectedData.push({ uid: uid, content: entry.content });
      }
    }
  });

  savedLore[charName] = selectedData;
  localStorage.setItem("daoyuan_wx_lore_selected", JSON.stringify(savedLore));
};

/* 基础设定保存逻辑 */
window.saveWxSettings = function () {
  try {
    // 顺带再调用一次世界书保存，确保万无一失
    window.saveWxLoreSettings();

    const promptVal = document.getElementById("wx-custom-prompt").value;
    let savedSettings = {};
    try {
      savedSettings =
        JSON.parse(localStorage.getItem("daoyuan_wx_settings")) || {};
    } catch (e) {}

    savedSettings.customPrompt = promptVal;
    savedSettings.apiBaseUrl = document
      .getElementById("wx-api-url")
      .value.trim();
    savedSettings.apiKey = document.getElementById("wx-api-key").value.trim();
    savedSettings.apiModel = document
      .getElementById("wx-api-model")
      .value.trim();

    localStorage.setItem("daoyuan_wx_settings", JSON.stringify(savedSettings));
    document.getElementById("wx-prompt-modal").style.display = "none";
  } catch (e) {
    alert("保存失败: " + e.message);
  }
};

/* --- 获取可用模型列表 --- */
window.fetchApiModels = async function () {
  const baseUrl = document.getElementById("wx-api-url").value.trim();
  const apiKey = document.getElementById("wx-api-key").value.trim();

  if (!baseUrl) {
    alert("请先填写基础 URL (Endpoint)！");
    return;
  }

  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = "获取中...";
  btn.disabled = true;

  try {
    let url = baseUrl;
    if (url.endsWith("/chat/completions")) {
      url = url.replace("/chat/completions", "/models");
    } else {
      url = url.endsWith("/") ? url + "models" : url + "/models";
    }

    const headers = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const select = document.getElementById("wx-api-model-select");
    select.innerHTML = '<option value="">-- 选择模型 --</option>';

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.id;
        select.appendChild(opt);
      });
      select.style.display = "block";
    } else {
      alert("获取失败：返回的数据格式异常，不是标准的 OpenAI models 格式。");
    }
  } catch (err) {
    alert("获取模型列表失败: " + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

