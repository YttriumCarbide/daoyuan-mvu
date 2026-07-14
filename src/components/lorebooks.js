/* --- 动态渲染与搜索世界书条目 --- */
window.renderLorebooks = function (entries, filterText = "") {
  const listContainer = document.getElementById("wx-lorebook-list");
  if (!listContainer) return;

  let html = "";
  let savedLore = {};
  try {
    savedLore =
      JSON.parse(localStorage.getItem("daoyuan_wx_lore_selected")) || {};
  } catch (e) {}
  const charName = window.currentActiveChat;
  const selectedData = savedLore[charName] || [];
  // 【修复点】：渲染时也需要把 uid 转为字符串进行匹配
  const selectedUids = selectedData.map((d) => String(d.uid));

  entries.forEach((entry, index) => {
    const displayName =
      entry.comment || (entry.key && entry.key.join(", ")) || "未命名条目";

    if (filterText) {
      const ft = filterText.toLowerCase();
      if (
        !displayName.toLowerCase().includes(ft) &&
        !(entry.content && entry.content.toLowerCase().includes(ft))
      ) {
        return;
      }
    }

    // 【修复点】：判断是否 checked 时强制转字符串
    const isChecked = selectedUids.includes(String(entry.uid)) ? "checked" : "";
    const safeContent = String(entry.content || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"');

    // onchange="window.saveWxLoreSettings()" 保证点一下立刻自动存本地
    html += `
                <div style="background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; flex-shrink: 0;">
                    <label style="display: flex; gap: 8px; align-items: flex-start; cursor: pointer; color: var(--text-main); font-size: 0.85em; padding: 8px; transition: background 0.2s; margin: 0;">
                        <input type="checkbox" class="yujian-lore-checkbox" value="${entry.uid}" style="margin-top: 2px; cursor: pointer;" onchange="window.saveWxLoreSettings()" ${isChecked}>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <span style="word-break: break-all; font-weight: bold; color: var(--accent-gold);">${displayName}</span>
                            <span style="font-size: 0.85em; color: var(--text-dim); margin-top: 2px;">来源: ${entry.lbName}</span>
                        </div>
                        <div onclick="event.preventDefault(); window.toggleLoreContent(${index}, this)" style="color: var(--accent-mana); cursor: pointer; padding: 0 5px; font-size: 1.2em; line-height: 1;" title="展开/折叠内容">▼</div>
                    </label>
                    <div id="lore-content-${index}" style="display: none; padding: 10px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 0.85em; color: var(--text-dim); white-space: pre-wrap; background: rgba(0,0,0,0.5); line-height: 1.5;">${safeContent}</div>
                </div>
            `;
  });
  if (!html)
    html =
      '<div style="color: var(--text-dim); font-style: italic; font-size: 0.85em; padding: 5px;">未找到匹配的世界书条目。</div>';
  listContainer.innerHTML = html;
};

window.filterLorebooks = function (text) {
  if (window.currentLoreEntries) {
    window.renderLorebooks(window.currentLoreEntries, text);
  }
};

window.toggleLoreContent = function (index, btn) {
  const el = document.getElementById("lore-content-" + index);
  if (el) {
    if (el.style.display === "none") {
      el.style.display = "block";
      if (btn) btn.innerHTML = "▲";
    } else {
      el.style.display = "none";
      if (btn) btn.innerHTML = "▼";
    }
  }
};

/* --- 拉取全局及角色绑定的世界书条目 --- */
window.openWxPromptModal = async function () {
  const modal = document.getElementById("wx-prompt-modal");
  // 强制显示并保证基础结构立即可见
  modal.style.display = "flex";
  modal.style.zIndex = "99999";

  const charName = window.currentActiveChat;
  const listContainer = document.getElementById("wx-lorebook-list");

  if (!charName) {
    if (listContainer)
      listContainer.innerHTML =
        '<div style="color: var(--text-dim); font-style: italic; font-size: 0.85em;">请先在玉简中选择一个传讯对象并打开此面板。</div>';
    return;
  }

  if (listContainer)
    listContainer.innerHTML =
      '<div style="color: var(--accent-mana); font-style: italic; font-size: 0.85em;">正在拉取当前世界与角色的全部世界书设定...</div>';

  try {
    if (typeof getLorebookEntries !== "function") {
      if (listContainer)
        listContainer.innerHTML =
          '<div style="color: var(--accent-blood); font-size: 0.85em;">当前环境不支持拉取世界书接口。</div>';
      return;
    }

    let lorebookNames = new Set();

    // 1. 尝试获取当前聊天的世界书
    if (typeof getOrCreateChatLorebook === "function") {
      try {
        const chatBook = await getOrCreateChatLorebook();
        if (chatBook) lorebookNames.add(chatBook);
      } catch (e) {
        console.warn("获取聊天世界书失败", e);
      }
    }

    // 2. 尝试获取当前主角色绑定的主要世界书
    if (typeof getCurrentCharPrimaryLorebook === "function") {
      try {
        const primary = await getCurrentCharPrimaryLorebook();
        if (primary) lorebookNames.add(primary);
      } catch (e) {
        console.warn("获取主角色世界书失败", e);
      }
    }

    // 3. 尝试获取当前传讯对象绑定的世界书
    if (typeof getCharLorebooks === "function") {
      try {
        const charBooks = await getCharLorebooks({ name: charName });
        if (charBooks && charBooks.length > 0) {
          charBooks.forEach((b) => lorebookNames.add(b));
        }
      } catch (e) {
        console.warn("获取传讯对象世界书失败", e);
      }
    }

    if (lorebookNames.size === 0) {
      if (listContainer)
        listContainer.innerHTML =
          '<div style="color: var(--text-dim); font-style: italic; font-size: 0.85em;">当前聊天和角色均未绑定任何世界书。</div>';
      return;
    }

    let allEntries = [];
    for (const lbName of lorebookNames) {
      try {
        const entries = await getLorebookEntries(lbName, {
          fields: ["uid", "comment", "key", "content"],
        });
        if (entries && entries.length > 0) {
          allEntries = allEntries.concat(
            entries.map((e) => ({ ...e, lbName })),
          );
        }
      } catch (e) {
        console.warn(`拉取世界书 [${lbName}] 失败`, e);
      }
    }

    // 去重（按 content 去重，防止不同世界书里有重复条目）
    const uniqueEntries = [];
    const contentSet = new Set();
    allEntries.forEach((e) => {
      if (e.content && !contentSet.has(e.content)) {
        contentSet.add(e.content);
        uniqueEntries.push(e);
      }
    });

    if (uniqueEntries.length === 0) {
      if (listContainer)
        listContainer.innerHTML =
          '<div style="color: var(--text-dim); font-style: italic; font-size: 0.85em;">绑定的世界书中未找到任何有效条目。</div>';
      return;
    }

    window.currentLoreEntries = uniqueEntries;
    const searchInput = document.getElementById("wx-lore-search");
    if (searchInput) searchInput.value = "";
    window.renderLorebooks(uniqueEntries, "");
  } catch (err) {
    console.error("拉取世界书失败:", err);
    if (listContainer)
      listContainer.innerHTML =
        '<div style="color: var(--accent-blood); font-size: 0.85em;">拉取世界书失败，请检查控制台报错。</div>';
  }
};

