import { renderDaoyuanApplause } from "./applause.js";

/* ===== 长按删除玉简事件逻辑 ===== */
window.pressTimer = null;
window.isPressing = false;
window.startPress = function (charName) {
  window.isPressing = false;
  window.pressTimer = setTimeout(() => {
    window.isPressing = true;
    if (confirm("是否要销毁与【" + charName + "】的玉简传讯记录？")) {
      const card = document.querySelector(
        `.wx-list-item[data-name="${charName}"]`,
      );
      deleteStatEntry(["玉简", charName], card);
    }
  }, 800);
};
window.endPress = function () {
  if (window.pressTimer) {
    clearTimeout(window.pressTimer);
    window.pressTimer = null;
  }
};
window.handleListItemClick = function (charName) {
  if (window.isPressing) {
    window.isPressing = false;
    return;
  }
  window.openChatView(charName);
};

/* ===== 打开聊天视图的全局函数 ===== */
window.currentActiveChat = null;
window.openChatView = function (name) {
  window.currentActiveChat = name;
  const data = window.currentMessagesData[name];
  if (!data) return;

  /* 更新已读记录并隐藏红点 */
  const readStates = JSON.parse(
    localStorage.getItem("daoyuan_wx_read_states") || "{}",
  );
  const historyKeys = Object.keys(data.历史记录 || {});
  if (historyKeys.length > 0) {
    readStates[name] = historyKeys[historyKeys.length - 1];
    localStorage.setItem("daoyuan_wx_read_states", JSON.stringify(readStates));
  }
  const dot = document.getElementById("unread-dot-" + name);
  if (dot) dot.classList.remove("show");

  document.getElementById("wx-list-view").style.display = "none";
  document.getElementById("wx-chat-view").style.display = "flex";

  document.getElementById("wx-chat-title").textContent = name;
  document.getElementById("wx-detail-level").textContent = data.境界 || "未知";
  document.getElementById("wx-detail-gender").textContent = data.性别 || "未知";
  document.getElementById("wx-detail-relation").textContent =
    data.关系 || "陌生";
  document.getElementById("wx-detail-favor").textContent = data.好感度 || "0";

  document.getElementById("wx-detail-modal").classList.remove("show");
  document.getElementById("wx-reply-input").placeholder =
    `输入传讯给 ${name}... (Enter发送, Shift+Enter换行)`;
  document.getElementById("wx-reply-input").value = "";
  document.getElementById("wx-reply-input").style.height = "auto";

  const hasPortrait = !!window.getPortraitUrl(name, data.性别);
  const portraitUrl = hasPortrait ? window.getPortraitUrl(name, data.性别) : "";
  if (portraitUrl) {
    document.getElementById("wx-chat-bg").style.backgroundImage =
      `url('${portraitUrl}')`;
  } else {
    document.getElementById("wx-chat-bg").style.backgroundImage = "none";
    document.getElementById("wx-chat-bg").style.backgroundColor = "#0a0a0f";
  }

  let chatHtml = "";
  const history = data.历史记录 || {};
  Object.entries(history).forEach(([msgId, record]) => {
    const sender = record.发送者 || "未知";
    const isSelf = sender === "我";
    const alignClass = isSelf ? "wx-msg-right" : "wx-msg-left";
    const safeName = String(name).replace(/"/g, '"');

    let actionsHtml = `<div class="wx-msg-actions">`;
    actionsHtml += `<span class="wx-msg-action-btn" onclick="window.deleteSingleMessage('${safeName}', '${msgId}')" title="删除此条">🗑️删除</span>`;
    if (!isSelf) {
      actionsHtml += `<span class="wx-msg-action-btn" onclick="window.retrySingleMessage('${safeName}', '${msgId}')" title="重新生成">🔄重试</span>`;
    }
    actionsHtml += `</div>`;

    chatHtml += `
                <div class="wx-msg-row ${alignClass}">
                    <div class="wx-msg-sender">${sender} <span style="font-size:0.8em;opacity:0.6;margin-left:5px;">${record.时间 || ""}</span></div>
                    <div class="wx-msg-bubble">${record.内容 || ""}</div>
                    ${actionsHtml}
                </div>
            `;
  });

  const msgContainer = document.getElementById("wx-chat-messages");
  msgContainer.innerHTML =
    chatHtml ||
    '<div style="text-align:center; color:var(--text-dim); font-size:0.85em; margin-top:20px; z-index:2; position:relative; text-shadow: 0 1px 2px #000;">暂无传讯记录</div>';

  /* 滚动到底部 */
  setTimeout(() => {
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }, 50);
};

window.populateCharacterData = function() {
  const all_variables = window.getAllVariables();
  const stat = _.get(all_variables, "stat_data", {});

  const world = stat.世界 || {};
  const hero = stat.主角 || {};
  const partners = stat.道侣 || {};
  const npcs = stat.人物 || {};
  const pets = stat.灵宠 || {};
  const quests = stat.机遇 || {};
  const beauties = stat.绝色榜 || {};
  const messages = stat.玉简 || {};
  if (typeof window._pP !== "undefined") {
    Object.keys(partners).forEach((p) => {
      if (!window._pP.includes(p))
        window.showAchievement(
          "结为道侣",
          '天道见证，你与【<span style="color:var(--rare-text);font-weight:bold;">' +
            p +
            "</span>】结为修仙道侣，长生路远，大道同行。",
        );
    });
  }
  window._pP = Object.keys(partners);
  if (typeof window._pM !== "undefined") {
    Object.keys(messages).forEach((m) => {
      if (!window._pM.includes(m))
        window.showAchievement(
          "获得玉简",
          '你获取了与【<span style="color:var(--accent-mana);font-weight:bold;">' +
            m +
            "</span>】的传讯玉简，可通过神念随时交流。",
        );
    });
  }
  window._pM = Object.keys(messages);

  const updateStat = (name, current) => {
    current = parseFloat(current) || 0;
    const percentage = Math.max(0, Math.min(100, current));
    $(`#${name}-value`).text(`${Math.round(current)}/100`);
    $(`#${name}-bar`).css("width", `${percentage}%`);
  };

  // 新增：渲染主角信息
  $("#name-value").text(hero.姓名 || "未知");
  $("#gender-value").text(hero.性别 || "未知");
  $("#appearance-value").text(hero.容貌 || "未知");
  $("#body-value").text(hero.身形 || "未知");
  $("#clothing-value").text(hero.衣着 || "未知");

  updateStat("hp", hero.生命);
  updateStat("blood", hero.精血);
  updateStat("mp", hero.灵力);
  updateStat("exp", hero.修为);
  updateStat("san", hero.神识);
  updateStat("daoxin", hero.道心);

  $(".rank-tag").text(hero.境界 || "凡人");
  $("#san-status").text(hero.神念 || "无");

  /* 气运处理 - 侧边栏显示名称提示，点击弹窗展示 */
  const lucks = hero.气运 || {};
  const luckNames = Object.keys(lucks).join("、") || "无";
  $("#luck-value").text(luckNames);

  $("#spirit-root-value").text(hero.灵根 || "无");

  /* === 宗门显示与宗门贡献点击事件 === */
  const clanName = hero.宗门 || "无";
  const clanContribute = hero.宗门贡献 || 0;
  $("#clan-value").text(clanName);
  $("#clan-row")
    .off("click")
    .on("click", function () {
      document.getElementById("faction-modal-title").textContent =
        "【宗门信息】";
      document.getElementById("faction-modal-note").innerHTML =
        `所属宗门：<span style="color:var(--accent-gold)">${clanName}</span><br><br>宗门贡献：<span style="color:var(--rare-text)">${clanContribute}</span>`;
      document.getElementById("faction-modal-overlay").style.display = "flex";
    });

  $("#status-effects").html(hero.状态 || "无异常");
  $("#env-status").text(` ⚜️ ${world.当前时间 || "未知"}`);

  /* 概览页 - 包含带描述的储物袋、及所在界域 */
  const inventory = hero.储物袋 || {};
  let inventoryHtml = "";
  Object.entries(inventory).forEach(([name, data]) => {
    const safeItemName = String(name).replace(/"/g, '"');
    inventoryHtml += `
                <div class="inventory-item" data-item="${safeItemName}" style="position: relative; margin-bottom: 4px; padding-right: 35px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 4px; border-radius: 4px;">
                    <button class="card-discard" title="删除" data-item="${safeItemName}" style="top: -2px; right: 0; width: 24px; height: 24px; font-size: 14px;">✕</button>
                    <span style="color:var(--text-main);">${name}</span> <span style="color:var(--text-dim);font-size:0.9em;">x${data.数量}</span>${data.描述 ? `<span style="font-size:0.8em; color:var(--text-dim); margin-left:8px;">- ${data.描述}</span>` : ""}
                </div>`;
  });
  if (!inventoryHtml) inventoryHtml = "空空如也";

  /* 提取器物数据并生成HTML */
  const artifacts = hero.器物 || {};
  let artifactsHtml = "";
  Object.entries(artifacts).forEach(([name, data]) => {
    const damage = parseFloat(data.损耗度) || 0;
    const safeArtifactName = String(name).replace(/"/g, '"');
    artifactsHtml += `
                <div class="artifact-item" data-artifact="${safeArtifactName}" style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed rgba(255,255,255,0.1); position: relative;">
                    <button class="card-discard" title="删除" data-artifact="${safeArtifactName}" style="top: -2px; right: 0; width: 24px; height: 24px; font-size: 14px;">✕</button>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; padding-right: 25px;">
                        <span style="color: var(--accent-gold); font-weight: bold;">${name}</span>
                        <span style="font-size: 0.8em; color: var(--rare-text);">${data.等级 || "未知"} · ${data.类型 || "未知"}</span>
                    </div>
                    ${data.描述 ? `<div style="font-size: 0.85em; color: var(--text-dim); margin-bottom: 6px;">${data.描述}</div>` : ""}
                    <div style="display: flex; gap: 15px; font-size: 0.8em; align-items: center;">
                        <span style="color: ${data.状态 === "正常" ? "var(--accent-san)" : "var(--accent-blood)"};">状态: ${data.状态 || "正常"}</span>
                        <div style="display: flex; align-items: center; gap: 5px; flex: 1;">
                            <span>损耗:</span>
                            <div class="progress-bg" style="flex: 1; height: 6px;"><div class="progress-fill fill-hp" style="width: ${damage}%;"></div></div>
                            <span>${damage}%</span>
                        </div>
                    </div>
                </div>`;
  });
  if (!artifactsHtml) artifactsHtml = "空空如也";

  /* 提取炼丹数据并生成HTML */
  const alchemy = hero.炼丹 || {};
  const alchemyHtml = `
            <div style="margin-bottom: 10px; padding-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--accent-gold); font-weight: bold;">炼丹造诣</span>
                    <span style="font-size: 0.8em; color: var(--rare-text);">${alchemy.阶级 || "未入门"}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85em;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 50px;">熟练度:</span>
                        <div class="progress-bg" style="flex: 1; height: 6px;"><div class="progress-fill fill-exp" style="width: ${parseFloat(alchemy.熟练度) || 0}%;"></div></div>
                        <span style="width: 35px; text-align: right;">${parseFloat(alchemy.熟练度) || 0}%</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 50px;">成功率:</span>
                        <div class="progress-bg" style="flex: 1; height: 6px;"><div class="progress-fill fill-san" style="width: ${parseFloat(alchemy.成功率) || 0}%;"></div></div>
                        <span style="width: 35px; text-align: right;">${parseFloat(alchemy.成功率) || 0}%</span>
                    </div>
                    <div style="color: var(--text-dim);">炼制次数: <span style="color: var(--text-main);">${alchemy.次数 || 0}</span> 次</div>
                </div>
            </div>`;

  /* 提取炼器数据并生成HTML */
  const forge = hero.炼器 || {};
  const forgeHtml = `
            <div style="margin-bottom: 10px; padding-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--accent-gold); font-weight: bold;">炼器造诣</span>
                    <span style="font-size: 0.8em; color: var(--rare-text);">${forge.阶级 || "未入门"}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85em;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 50px;">熟练度:</span>
                        <div class="progress-bg" style="flex: 1; height: 6px;"><div class="progress-fill fill-exp" style="width: ${parseFloat(forge.熟练度) || 0}%;"></div></div>
                        <span style="width: 35px; text-align: right;">${parseFloat(forge.熟练度) || 0}%</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 50px;">成功率:</span>
                        <div class="progress-bg" style="flex: 1; height: 6px;"><div class="progress-fill fill-san" style="width: ${parseFloat(forge.成功率) || 0}%;"></div></div>
                        <span style="width: 35px; text-align: right;">${parseFloat(forge.成功率) || 0}%</span>
                    </div>
                    <div style="color: var(--text-dim);">炼制次数: <span style="color: var(--text-main);">${forge.次数 || 0}</span> 次</div>
                </div>
            </div>`;

  let lucksHtml = "";
  Object.entries(lucks).forEach(([name, data]) => {
    let statusColor = "var(--accent-san)";
    if (data.使用状态 === "冷却中") statusColor = "var(--accent-exp)";
    if (data.使用状态 === "已耗尽") statusColor = "var(--text-dim)";

    const safeLuckName = String(name).replace(/"/g, '"');
    lucksHtml += `
                <div class="luck-item" data-luck="${safeLuckName}" style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed rgba(255,215,0,0.2); position: relative;">
                    <button class="card-discard" title="删除" data-luck="${safeLuckName}" style="top: 0; right: 0; width: 24px; height: 24px; font-size: 14px;">✕</button>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; padding-right: 25px;">
                        <span style="color: var(--accent-gold); font-weight: bold; font-size: 1.05em; text-shadow: 0 0 5px rgba(255,215,0,0.3);">${name}</span>
                        <span style="font-size: 0.8em; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);">${data.类型 || "未知"}</span>
                    </div>
                    <div style="font-size: 0.9em; color: #dcdde1; line-height: 1.5; margin-bottom: 6px;">${data.效果 || "未知效果"}</div>
                    <div style="font-size: 0.85em; display: flex; gap: 10px; flex-wrap: wrap;">
                        <span style="color: ${statusColor};">状态: ${data.使用状态 || "未知"}</span>
                        <span style="color: ${data.压制状态 === "被压制" ? "var(--accent-blood)" : "var(--text-dim)"};">压制: ${data.压制状态 || "正常"}</span>
                    </div>
                </div>
            `;
  });
  if (!lucksHtml)
    lucksHtml =
      '<div style="color: var(--text-dim); font-style: italic; text-align: center;">凡夫俗子，暂无气运加身。</div>';

  /* 将气运HTML填充到专属弹窗内 */
  $("#luck-modal-body").html(lucksHtml);

  let cLvl = world.危机程度 || "无";
  let cCol = "var(--accent-san)";
  let cAnim = "";
  let cBg = "";
  let cBor = "var(--accent-san)";
  let cIco = "🍃";
  let iAnim = "";
  if (cLvl.includes("低")) {
    cCol = "var(--accent-mana)";
    cBor = "var(--accent-mana)";
    cIco = "💧";
  } else if (cLvl.includes("中")) {
    cCol = "var(--accent-exp)";
    cBor = "var(--accent-exp)";
    cIco = "⚠️";
  } else if (cLvl.includes("高")) {
    cCol = "var(--accent-blood)";
    cBor = "var(--accent-blood)";
    cIco = "🚨";
    cAnim = "animation: danger-breathe 2.5s infinite ease-in-out;";
    iAnim = "animation: danger-breathe 2.5s infinite;";
  } else if (cLvl.includes("致命")) {
    cCol = "#ff1a1a";
    cBor = "#ff1a1a";
    cIco = "☠️";
    cAnim = "animation: fatal-pulse 1.5s infinite ease-out;";
    cBg =
      "background: linear-gradient(145deg, rgba(100,0,0,0.7), rgba(40,0,0,0.9));";
    iAnim = "animation: icon-glitch 1.5s infinite;";
  }
  $("#tab-dashboard").html(`
            <style>@keyframes danger-breathe { 0% { transform: translateY(0); box-shadow: 0 0 5px rgba(255,77,77,0.1); border-color: rgba(255,77,77,0.3); } 50% { transform: translateY(-4px); box-shadow: 0 8px 15px rgba(255,77,77,0.4); border-color: rgba(255,77,77,0.8); } 100% { transform: translateY(0); box-shadow: 0 0 5px rgba(255,77,77,0.1); border-color: rgba(255,77,77,0.3); } } @keyframes fatal-pulse { 0% { transform: scale(1); box-shadow: 0 0 15px rgba(255,0,0,0.4), inset 0 0 10px rgba(255,0,0,0.2); } 5% { transform: scale(1.02); box-shadow: 0 0 35px rgba(255,0,0,0.8), inset 0 0 25px rgba(255,0,0,0.5); border-color:#ff4d4d; } 15% { transform: scale(1); box-shadow: 0 0 15px rgba(255,0,0,0.4), inset 0 0 10px rgba(255,0,0,0.2); } 25% { transform: scale(1.01); box-shadow: 0 0 25px rgba(255,0,0,0.6), inset 0 0 15px rgba(255,0,0,0.3); border-color:#ff4d4d; } 100% { transform: scale(1); box-shadow: 0 0 15px rgba(255,0,0,0.4), inset 0 0 10px rgba(255,0,0,0.2); } } @keyframes icon-glitch { 0% { transform: scale(1); filter: drop-shadow(0 0 2px red); } 5% { transform: scale(1.3) rotate(-15deg); filter: drop-shadow(0 0 15px #ff1a1a); } 15% { transform: scale(0.9) rotate(10deg); filter: drop-shadow(0 0 5px red); } 25% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 2px red); } 100% { transform: scale(1); filter: drop-shadow(0 0 2px red); } }</style>
            <div class="info-card">
                <div class="info-title"><span>当前所在</span><span>📍</span></div>
                <div class="info-text">${hero.所在界 || "玄天界"} · ${world.当前地点 || "未知"}</div>
            </div>
            <div class="info-card" style="border-color: ${cBor}; ${cBg} ${cAnim} transition: all 0.3s;">
                <div class="info-title" style="color: ${cCol};"><span>天机推演</span><span style="display:inline-block; transform-origin:center; ${iAnim}">${cIco}</span></div>
                <div class="info-text">
                    当前时间: ${world.当前时间 || "未知"}<br>
                    危机程度: <span style="color:${cCol}; font-weight:bold; font-size:1.1em; text-shadow: 0 0 10px ${cCol};">${cLvl}</span>
                </div>
            </div>
            <div class="info-card" style="border-color: var(--accent-mana);">
                <div class="info-title" style="cursor: pointer; color: var(--accent-mana); user-select: none;" data-idx="0" onclick="const panels = ['inventory-content', 'artifact-content', 'alchemy-content', 'forge-content']; const titles = ['储物袋', '器物', '炼丹', '炼器']; const icons = ['🎒', '⚔️', '💊', '🔨']; let idx = parseInt(this.dataset.idx || '0'); idx = (idx + 1) % 4; this.dataset.idx = idx; panels.forEach((id, i) => document.getElementById(id).style.display = (i === idx ? 'block' : 'none')); this.querySelector('.switch-title').textContent = titles[idx]; this.querySelector('.switch-icon').textContent = icons[idx];">
                    <span class="switch-title">储物袋</span>
                    <span title="点击切换" style="transition: transform 0.3s; display: inline-block;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><span class="switch-icon">🎒</span> 🔄</span>
                </div>
                <div class="info-text" id="inventory-content" style="display: block;">${inventoryHtml}</div>
                <div class="info-text" id="artifact-content" style="display: none;">${artifactsHtml}</div>
                <div class="info-text" id="alchemy-content" style="display: none;">${alchemyHtml}</div>
                <div class="info-text" id="forge-content" style="display: none;">${forgeHtml}</div></div><div class="info-card" style="border-color:#d980fa; margin-top:15px;"><div class="info-title" style="color:#d980fa;"><span>玖柒助我！(变量修改)</span><span>✨</span></div><div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;"><span style="font-size:0.85em; color:var(--text-dim); flex:1; margin-right:10px;">开启后，面板各处的删除(✕)按钮将变为修改(✎)按钮，点击即可修改底层变量。</span><button id="jiuqi-toggle-btn" onclick="window.toggleJiuqiEdit()" style="min-width:60px; height:30px; padding:0 10px; font-size:0.85em; background:${window.jiuqiEditMode ? "#d980fa" : "rgba(0,0,0,0.5)"}; border:1px solid #d980fa; color:${window.jiuqiEditMode ? "#fff" : "#d980fa"}; border-radius:4px; cursor:pointer; transition:all 0.3s;">${window.jiuqiEditMode ? "已开启" : "开启"}</button></div>
            </div>
        `);

  /* 功法页 */
  const skills = hero.功法 || {};
  let skillsHtml = "";
  if (!document.getElementById("skill-anim-style")) {
    let s = document.createElement("style");
    s.id = "skill-anim-style";
    s.innerHTML =
      "@keyframes tian-glow { 0%, 100% { border-color: #ffd700; box-shadow: 0 0 6px rgba(255,215,0,0.2); } 50% { border-color: #ff9f43; box-shadow: 0 0 20px rgba(255,215,0,0.5); } }";
    document.head.appendChild(s);
  }
  Object.entries(skills).forEach(([name, data]) => {
    const mastery = parseFloat(data.熟练度) || 0;
    const safeSkillName = String(name).replace(/"/g, '"');
    let tStr = data.类型 || "";
    let jStr = data.境界 || "";
    let rank = "";
    if (tStr.includes("天")) rank = "天";
    else if (tStr.includes("地")) rank = "地";
    else if (tStr.includes("玄")) rank = "玄";
    else if (tStr.includes("黄")) rank = "黄";
    else if (tStr.includes("凡")) rank = "凡";
    else {
      let fStr = name + jStr;
      if (fStr.includes("天阶") || fStr.includes("天品")) rank = "天";
      else if (fStr.includes("地阶") || fStr.includes("地品")) rank = "地";
      else if (fStr.includes("玄阶") || fStr.includes("玄品")) rank = "玄";
      else if (fStr.includes("黄阶") || fStr.includes("黄品")) rank = "黄";
      else if (fStr.includes("凡阶") || fStr.includes("凡品")) rank = "凡";
      else if (name.includes("天")) rank = "天";
      else if (name.includes("地")) rank = "地";
      else if (name.includes("玄")) rank = "玄";
      else if (name.includes("黄")) rank = "黄";
    }
    let sBox = "";
    let sNamC = "var(--text-main)";
    if (rank === "天") {
      sBox =
        "border-color: var(--accent-gold); animation: tian-glow 3s infinite ease-in-out; background: linear-gradient(145deg, rgba(40,35,20,0.5), rgba(20,15,10,0.7));";
      sNamC =
        "var(--accent-gold); text-shadow: 0 0 6px var(--accent-gold-glow); font-weight: bold;";
    } else if (rank === "地") {
      sBox =
        "border-color: var(--accent-exp); background: linear-gradient(145deg, rgba(35,25,15,0.4), rgba(20,15,15,0.6)); box-shadow: 0 0 8px rgba(255,159,67,0.2);";
      sNamC = "var(--accent-exp); text-shadow: 0 0 4px rgba(255,159,67,0.3);";
    } else if (rank === "玄") {
      sBox =
        "border-color: var(--accent-mana); box-shadow: 0 0 6px rgba(77,166,255,0.15);";
      sNamC = "var(--accent-mana);";
    } else if (rank === "黄") {
      sBox = "border-color: var(--accent-san);";
      sNamC = "var(--accent-san);";
    } else {
      sBox = "border-color: rgba(255,255,255,0.08);";
    }
    skillsHtml += `
                <div class="skill-card" data-skill="${safeSkillName}" style="${sBox}">
                    <button class="card-discard" title="删除" data-skill="${safeSkillName}">✕</button>
                    <div class="skill-info">
                        <div class="skill-header"><span class="skill-name" style="color: ${sNamC}">${name}</span><span class="skill-type">${data.类型 || "未知"}</span></div>
                        <div class="card-stats-grid">
                            <span class="stat-label">境界/层数</span><span>${data.境界 || "未入门"}</span>
                            <span class="stat-label">熟练度</span>
                            <div class="progress-bg"><div class="progress-fill fill-exp" style="width: ${mastery}%;"></div></div>
                        </div>
                        <div class="skill-description">${data.描述 || ""}</div>
                    </div>
                </div>`;
  });
  $("#tab-skills").html(
    skillsHtml ||
      '<p style="color: var(--text-dim); font-style: italic;">暂无相关记录。</p>',
  );

  /* 道侣页 */
  let colStP = {};
  try {
    let ss = localStorage.getItem("dy_collapse");
    if (ss) colStP = JSON.parse(ss);
  } catch (e) {}
  let partnersHtml = "";
  if (!document.getElementById("card-collapse-style")) {
    let s = document.createElement("style");
    s.id = "card-collapse-style";
    s.innerHTML =
      ".partner-card, .npc-card { transition: all 0.3s ease; } .card-collapse-body { max-height: 1200px; opacity: 1; overflow: hidden; transition: max-height 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease; margin-top: 2px; }.is-collapsed .card-collapse-body { max-height: 0px !important; opacity: 0 !important; pointer-events: none; margin-top: 0 !important; } .is-collapsed .collapse-toggle-indicator { transform: rotate(-90deg); } .partner-header, .npc-header { padding-right: 35px; align-items: center !important; margin-bottom: 0 !important; } .partner-header > div, .npc-header > div { display: flex; align-items: flex-end; white-space: nowrap; } .partner-species, .npc-title { margin-left: 10px !important; margin-bottom: 1px; }";
    document.head.appendChild(s);
  }
  Object.entries(partners).forEach(([name, data]) => {
    const hp = parseFloat(data.生命) || 0;
    const mp = parseFloat(data.灵力) || 0;
    const exp = parseFloat(data.修为) || 0;
    const daoxin = parseFloat(data.道心) || 0;
    const loyalty = parseFloat(data.亲密) || 0;
    const hasPortrait = !!window.getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="card-collapse-body"><div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;padding:2px 5px;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>${renderDaoyuanApplause(name)}
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${window.getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
                </div></div>`;

    const safePartnerName = String(name).replace(/"/g, '"');
    partnersHtml += `
                <div class="partner-card ${colStP[safePartnerName] ? "is-collapsed" : ""}" data-partner="${safePartnerName}">
                    <button class="card-discard" title="删除" data-partner="${safePartnerName}">✕</button>
                    <div class="partner-info">
                        <div class="partner-header" onclick="let c=this.closest('.partner-card');c.classList.toggle('is-collapsed');let s=localStorage.getItem('dy_collapse');let o={};if(s)try{o=JSON.parse(s);}catch(e){}o['${safePartnerName}']=c.classList.contains('is-collapsed');localStorage.setItem('dy_collapse',JSON.stringify(o));" style="cursor:pointer; user-select:none;">
                            <div style="display:flex;align-items:center;"><span class="partner-name" style="margin-top:2px;">${name}</span><span class="partner-species" style="margin-top:2px;">${data.种族 || "未知"} · ${data.性别 || "未知"}</span></div>
                        </div>
                        <div class="card-collapse-body"><div class="card-stats-grid" style="margin-top:10px;">
                            <span class="stat-label">境界</span><span class="rare-text">${data.境界 || "未知"}</span>
                            <span class="stat-label">生命</span><div class="progress-bg"><div class="progress-fill fill-hp" style="width:${hp}%;"></div></div>
                            <span class="stat-label">灵力</span><div class="progress-bg"><div class="progress-fill fill-mp" style="width:${mp}%;"></div></div>
                            <span class="stat-label">修为</span><div class="progress-bg"><div class="progress-fill fill-exp" style="width:${exp}%;"></div></div>
                            <span class="stat-label">道心</span><div class="progress-bg"><div class="progress-fill fill-daoxin" style="width:${daoxin}%;"></div></div>
                            ${loyalty > 0 ? `<span class="stat-label">亲密</span><div class="progress-bg"><div class="progress-fill fill-san" style="width:${loyalty}%;"></div></div>` : ""}
                            <span class="stat-label">性格</span><div>${data.性格 || "未知"}</div>
                            <span class="stat-label">外观</span><div>${data.外观 || "未知"}</div>
                            <span class="stat-label">身高</span><div>${data.身高 || "未知"}</div>
                            <span class="stat-label">背景</span><div>${data.背景 || "未知"}</div>
                            <span class="stat-label">神通</span><div>${data.神通 || "无"}</div>
                            <span class="stat-label">状态</span><div>${data.状态 || "正常"}</div>
                            <span class="stat-label">心声</span><div>${data.心声 || "无"}</div>
                        </div></div>
                    </div>
                    ${portraitSection}
                </div>`;
  });
  $("#tab-partners").html(
    partnersHtml ||
      '<p style="color: var(--text-dim); font-style: italic;">暂无相关记录。</p>',
  );

  /* 人物页 */
  let colStN = {};
  try {
    let ss = localStorage.getItem("dy_collapse");
    if (ss) colStN = JSON.parse(ss);
  } catch (e) {}
  let npcsHtml = "";
  Object.entries(npcs).forEach(([name, data]) => {
    const hp = parseFloat(data.生命) || 0;
    const mp = parseFloat(data.灵力) || 0;
    const exp = parseFloat(data.修为) || 0;
    const daoxin = parseFloat(data.道心) || 0;
    const relation = parseFloat(data.好感) || 0;
    const hasPortrait = !!window.getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="card-collapse-body"><div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;padding:2px 5px;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>${renderDaoyuanApplause(name)}
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${window.getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
                </div></div>`;

    const safeNpcName = String(name).replace(/"/g, '"');
    npcsHtml += `
                <div class="npc-card ${colStN[safeNpcName] ? "is-collapsed" : ""}" data-npc="${safeNpcName}">
                    <button class="card-discard" title="删除" data-npc="${safeNpcName}">✕</button>
                    <div class="npc-info">
                        <div class="npc-header" onclick="let c=this.closest('.npc-card');c.classList.toggle('is-collapsed');let s=localStorage.getItem('dy_collapse');let o={};if(s)try{o=JSON.parse(s);}catch(e){}o['${safeNpcName}']=c.classList.contains('is-collapsed');localStorage.setItem('dy_collapse',JSON.stringify(o));" style="cursor:pointer; user-select:none;">
                            <div style="display:flex;align-items:center;"><span class="npc-name" style="margin-top:2px;">${name}</span><span class="npc-title" style="margin-top:2px;">${data.头衔 || ""}</span></div>
                        </div>
                        <div class="card-collapse-body">
                        <div class="card-stats-grid" style="margin-top:10px;">
                            <span class="stat-label">境界</span><span class="rare-text">${data.境界 || "未知"}</span>
                            <span class="stat-label">生命</span><div class="progress-bg"><div class="progress-fill fill-hp" style="width:${hp}%;"></div></div>
                            <span class="stat-label">灵力</span><div class="progress-bg"><div class="progress-fill fill-mp" style="width:${mp}%;"></div></div>
                            <span class="stat-label">修为</span><div class="progress-bg"><div class="progress-fill fill-exp" style="width:${exp}%;"></div></div>
                            <span class="stat-label">道心</span><div class="progress-bg"><div class="progress-fill fill-daoxin" style="width:${daoxin}%;"></div></div>
                            <span class="stat-label">好感</span><div class="progress-bg"><div class="progress-fill ${relation > 50 ? "fill-san" : "fill-hp"}" style="width:${relation}%;"></div></div>
                            <span class="stat-label">性别</span><span class="rare-text">${data.性别 || "未知"}</span>
                            <span class="stat-label">性格</span><div>${data.性格 || "未知"}</div>
                            <span class="stat-label">关系阶段</span><span class="rare-text">${data.关系阶段 || "陌生"}</span>
                        </div>
                        <div class="npc-description">${data.描述 || ""}</div>
                        </div>
                    </div>
                    ${portraitSection}
                </div>`;
  });
  $("#tab-npcs").html(
    npcsHtml ||
      '<p style="color: var(--text-dim); font-style: italic;">暂无相关记录。</p>',
  );

  /* 灵宠页 */
  let colStPet = {};
  try {
    let ss = localStorage.getItem("dy_collapse");
    if (ss) colStPet = JSON.parse(ss);
  } catch (e) {}
  let petsHtml = "";
  Object.entries(pets).forEach(([name, data]) => {
    const hp = parseFloat(data.生命) || 0;
    const mp = parseFloat(data.灵力) || 0;
    const exp = parseFloat(data.修为) || 0;
    const loyalty = parseFloat(data.亲密度) || 0;
    const hasPortrait = !!window.getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="card-collapse-body"><div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;padding:2px 5px;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${window.getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
                </div></div>`;

    const safePetName = String(name).replace(/"/g, '"');
    petsHtml += `
                <div class="partner-card ${colStPet[safePetName] ? "is-collapsed" : ""}" data-pet="${safePetName}">
                    <button class="card-discard" title="删除" data-pet="${safePetName}">✕</button>
                    <div class="partner-info">
                        <div class="partner-header" onclick="let c=this.closest('.partner-card');c.classList.toggle('is-collapsed');let s=localStorage.getItem('dy_collapse');let o={};if(s)try{o=JSON.parse(s);}catch(e){}o['${safePetName}']=c.classList.contains('is-collapsed');localStorage.setItem('dy_collapse',JSON.stringify(o));" style="cursor:pointer; user-select:none;">
                            <div style="display:flex;align-items:center;"><span class="partner-name" style="margin-top:2px;">${name}</span><span class="partner-species" style="margin-top:2px;">${data.种族 || "未知"} · ${data.性别 || "未知"}</span></div>
                        </div>
                        <div class="card-collapse-body"><div class="card-stats-grid" style="margin-top:10px;">
                            <span class="stat-label">境界</span><span class="rare-text">${data.境界 || "未知"}</span>
                            <span class="stat-label">生命</span><div class="progress-bg"><div class="progress-fill fill-hp" style="width:${hp}%;"></div></div>
                            <span class="stat-label">灵力</span><div class="progress-bg"><div class="progress-fill fill-mp" style="width:${mp}%;"></div></div>
                            <span class="stat-label">修为</span><div class="progress-bg"><div class="progress-fill fill-exp" style="width:${exp}%;"></div></div>
                            <span class="stat-label">亲密度</span><div class="progress-bg"><div class="progress-fill fill-san" style="width:${loyalty}%;"></div></div>
                            <span class="stat-label">性格</span><div>${data.性格 || "未知"}</div>
                            <span class="stat-label">容貌外观</span><div>${data.容貌外观 || "未知"}</div>
                            <span class="stat-label">神通</span><div>${data.神通 || "无"}</div>
                            <span class="stat-label">状态</span><div>${data.状态 || "正常"}</div>
                            <span class="stat-label">心声</span><div>${data.心声 || "无"}</div>
                        </div></div>
                    </div>
                    ${portraitSection}
                </div>`;
  });
  $("#tab-pets").html(
    petsHtml ||
      '<p style="color: var(--text-dim); font-style: italic;">暂无相关记录。</p>',
  );
  if (!document.getElementById("tip-hover-style")) {
    let s = document.createElement("style");
    s.id = "tip-hover-style";
    s.innerHTML =
      ".tip-hover{position:relative;width:100%;cursor:pointer}.tip-hover::after{content:attr(data-tip);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);color:#fff;text-shadow:0 1px 3px #000,0 0 3px #000;font-size:10px;font-weight:bold;font-family:JetBrains Mono,monospace;opacity:0;pointer-events:none;transition:all 0.25s cubic-bezier(0.25,1,0.5,1);z-index:10;letter-spacing:0.5px}.tip-hover:hover::after,.tip-hover:active::after{opacity:1;transform:translate(-50%,-50%) scale(1)}";
    document.head.appendChild(s);
  }
  $(
    "#tab-partners .progress-bg, #tab-npcs .progress-bg, #tab-pets .progress-bg",
  ).each(function () {
    let f = $(this).find(".progress-fill");
    if (f.length) {
      let w = f[0].style.width;
      let v = parseFloat(w) || 0;
      if (!$(this).parent().hasClass("tip-hover")) {
        $(this).wrap(
          '<div class="tip-hover" data-tip="' +
            (v % 1 === 0 ? v : v.toFixed(1)) +
            '%"></div>',
        );
      }
    }
  });

  /* 机遇页 */
  let questsHtml = "";
  Object.entries(quests).forEach(([name, data]) => {
    const safeQuestName = String(name).replace(/"/g, '"');
    questsHtml += `
                <div class="quest-item" data-quest="${safeQuestName}">
                    <button class="card-discard" title="删除" data-quest="${safeQuestName}">✕</button>
                    <div class="info-title">
                        <span style="color:var(--text-main)">${name}</span>
                        <span class="danger-text" style="font-size:0.8em">难度: ${data.难度 || "未知"}</span>
                    </div>
                    <div class="info-text">
                        <b>目标:</b> ${data.目标 || ""}<br>
                        <b>机缘:</b> <span style="color:var(--accent-gold)">${data.机缘 || ""}</span><br>
                        <i style="font-size:0.8em; color:#999;">"${data.引言 || ""}"</i>
                    </div>
                </div>`;
  });
  $("#tab-quests").html(
    questsHtml ||
      '<p style="color: var(--text-dim); font-style: italic;">暂无相关记录。</p>',
  );

  /* 绝色榜页 */
  let prevSearch = $("#portrait-search-input").val() || "";
  let prevResult = $("#portrait-search-result").html() || "";
  let isResVis = $("#portrait-search-result").is(":visible");
  let beautiesHtml =
    '<div class="info-card" style="border-color:var(--rare-text); margin-bottom:15px; overflow:visible;"><div class="info-title" style="color:var(--rare-text);"><span>仙姿寻影 (全图鉴立绘检索)</span><span>🔍</span></div><div class="portrait-search-row" style="display:flex; gap:8px;"><input type="text" id="portrait-search-input" class="reply-input" placeholder="搜名字，或输“随机”抽卡..." value="' +
    prevSearch +
    '" onkeydown="if(event.key==="Enter"){event.preventDefault();event.stopPropagation();window.searchAndShowPortrait();}" style="flex:1; height:35px; padding:5px 10px; box-sizing:border-box;"><button class="reply-button" onclick="window.searchAndShowPortrait()" style="height:35px; min-width:60px; padding:0 15px;">搜索</button></div><div id="portrait-search-result" style="margin-top:15px; display:' +
    (isResVis ? "block" : "none") +
    ';">' +
    prevResult +
    "</div></div>";
  const sortedBeauties = Object.entries(beauties).sort(
    (a, b) => (a[1].排名 || 999) - (b[1].排名 || 999),
  );
  sortedBeauties.slice(0, 2).forEach(([name, data]) => {
    const hasPortrait = !!window.getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>${renderDaoyuanApplause(name)}
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${window.getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
                </div>`;

    const safeBeautyName = String(name).replace(/"/g, '"');
    beautiesHtml += `
                <div class="info-card" data-beauty="${safeBeautyName}" style="border-color: rgba(217, 128, 250, 0.3);">
                    <button class="card-discard" title="删除" data-beauty="${safeBeautyName}">✕</button>
                    <div class="info-title">
                        <span style="color:var(--rare-text)">第${data.排名 || 0}名：${name}</span>
                        <span style="font-size:0.8em; color:var(--text-dim)">${data.头衔 || ""}</span>
                    </div>
                    <div class="info-text">
                        <b>倾世仙姿：</b> <span style="color:#dcdde1">${data.仙姿 || ""}</span><br><br>
                        <b>坊间群芳谱：</b> <i style="font-size:0.9em; color:#bbb;">"${data.群芳谱 || ""}"</i>
                    </div>
                    ${portraitSection}
                </div>`;
  });
  $("#tab-database").html(
    beautiesHtml ||
      '<p style="color: var(--text-dim); font-style: italic;">暂无相关记录。</p>',
  );

  /* 动向页 */
  const events = world.动向 || {};
  let eventsHtml = "";
  Object.entries(events).forEach(([title, data]) => {
    const safeEventTitle = String(title).replace(/"/g, '"');
    eventsHtml += `
                <div class="quest-item" data-event="${safeEventTitle}" style="border-left-color: var(--accent-blood);">
                    <button class="card-discard" title="删除" data-event="${safeEventTitle}">✕</button>
                    <div class="info-title">
                        <span style="color:var(--accent-blood)">【${data.类型 || "未知"} · ${data.阶段 || "起"}】 ${title}</span>
                        <span style="font-size:0.8em; color:var(--text-dim)">📍${data.地点 || "未知"}</span>
                    </div>
                    <div class="info-text">
                        ${data.描述 || ""}
                    </div>
                </div>`;
  });
  $("#tab-world_events").html(
    eventsHtml ||
      '<p style="color: var(--text-dim); font-style: italic;">暂无相关记录。</p>',
  );

  /* 玉简页 (微信风) */
  let messagesListHtml = "";
  window.currentMessagesData = messages; /* 保存数据供聊天视图使用 */
  const readStates = JSON.parse(
    localStorage.getItem("daoyuan_wx_read_states") || "{}",
  );

  Object.entries(messages).forEach(([name, data]) => {
    const hasPortrait = !!window.getPortraitUrl(name, data.性别);
    const portraitUrl = hasPortrait
      ? window.getPortraitUrl(name, data.性别)
      : "https://via.placeholder.com/50/000000/FFFFFF/?text=?";

    /* 获取最后一条消息预览并判断未读红点 */
    const historyKeys = Object.keys(data.历史记录 || {});
    let lastMsg = "暂无传讯记录";
    let lastTime = "";
    let hasUnread = false;

    if (historyKeys.length > 0) {
      const lastMsgId = historyKeys[historyKeys.length - 1];
      const lastRecord = data.历史记录[lastMsgId];
      lastTime = lastRecord.时间 || "";

      if (readStates[name] !== lastMsgId) {
        hasUnread = true;
        lastMsg = "[收到新传讯]";
      } else {
        lastMsg = "[没有新传讯]";
      }
    }

    const safeName = String(name).replace(/"/g, '"');

    messagesListHtml += `
                <div class="wx-list-item" data-name="${safeName}" onpointerdown="window.startPress('${safeName}')" onpointerup="window.endPress()" onpointerleave="window.endPress()" onclick="window.handleListItemClick('${safeName}')">
                    <div class="wx-unread-dot ${hasUnread ? "show" : ""}" id="unread-dot-${safeName}"></div>
                    <div class="wx-avatar-container" onclick="event.stopPropagation();">
                        <img src="${portraitUrl}" data-src="${portraitUrl}" class="portrait-img" alt="${name}" onclick="document.getElementById('modal-image').src=this.dataset.src; document.getElementById('image-modal-overlay').style.display='flex';">
                        <div class="wx-avatar-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${safeName}');" title="自定义头像">🎨设置</div>
                    </div>
                    <div class="wx-list-info">
                        <div style="display:flex; justify-content:space-between; align-items:baseline;">
                            <div class="wx-list-name">${name}</div>
                            <div style="font-size:0.75em; color:var(--text-dim);">${lastTime}</div>
                        </div>
                        <div class="wx-list-preview" style="color: ${hasUnread ? "var(--accent-mana)" : "var(--text-dim)"}">${lastMsg}</div>
                    </div>
                </div>`;
  });
  $("#wx-list-view").html(
    messagesListHtml ||
      '<p style="color: var(--text-dim); font-style: italic; padding: 20px; text-align: center;">暂无玉简传讯记录。</p>',
  );

  /* 刷新正在打开的聊天视图(如果处于激活状态) */
  if (
    window.currentActiveChat &&
    document.getElementById("wx-chat-view").style.display !== "none"
  ) {
    if (window.currentMessagesData[window.currentActiveChat]) {
      window.openChatView(window.currentActiveChat);
    } else {
      /* 好友可能被删除了 */
      document.getElementById("wx-chat-view").style.display = "none";
      document.getElementById("wx-list-view").style.display = "flex";
      window.currentActiveChat = null;
    }
  }

  /* 更新器灵数据 */
  window.fairyGuide.updateData(stat.$器灵台词 || [], hero.生命, hero.神识, hero.灵力);

  /* 绑定删除按钮事件 (其他页面的正常删除逻辑保留) */
  window.bindDiscardButtons();
  if (window.injectHeartButtons) window.injectHeartButtons();
  if (window.injectLoreClicks) window.injectLoreClicks();
  if (window.jiuqiEditMode && window.toggleJiuqiEdit) {
    window.jiuqiEditMode = false;
    window.toggleJiuqiEdit(true);
  }
}

/* ===== MVU 删除函数 ===== */
async function deleteStatEntry(dataPath, cardElement) {
  try {
    const lastMsgId = window.getLastMessageId();
    const messages = window.getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) return;
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof window.Mvu.replaceMvuData === "function") {
      const fullData = window.Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (fullData && fullData.stat_data) {
        _.unset(fullData.stat_data, dataPath);
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        window.populateCharacterData();
      }
    }
  } catch (err) {
    console.error("[道渊状态栏] 删除失败:", dataPath, err);
    if (cardElement) cardElement.classList.remove("discarding");
  }
}

/* 点击删除按钮 — 两段确认模式 */
window.bindDiscardButtons = function() {
  document.querySelectorAll(".card-discard").forEach((btn) => {
    btn.removeEventListener("click", window.handleDiscardClick);
    btn.addEventListener("click", window.handleDiscardClick);
  });
}

window.handleDiscardClick = function(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const card = btn.closest(
    ".info-card, .partner-card, .npc-card, .skill-card, .quest-item, .inventory-item, .wx-list-item, .artifact-item, .luck-item",
  );
  if (!card) return;
  let jPath = null;
  if (btn.dataset.npc) jPath = ["人物", btn.dataset.npc];
  else if (btn.dataset.partner) jPath = ["道侣", btn.dataset.partner];
  else if (btn.dataset.pet) jPath = ["灵宠", btn.dataset.pet];
  else if (btn.dataset.skill) jPath = ["主角", "功法", btn.dataset.skill];
  else if (btn.dataset.quest) jPath = ["机遇", btn.dataset.quest];
  else if (btn.dataset.event) jPath = ["世界", "动向", btn.dataset.event];
  else if (btn.dataset.beauty) jPath = ["绝色榜", btn.dataset.beauty];
  else if (btn.dataset.item) jPath = ["主角", "储物袋", btn.dataset.item];
  else if (btn.dataset.artifact) jPath = ["主角", "器物", btn.dataset.artifact];
  else if (btn.dataset.luck) jPath = ["主角", "气运", btn.dataset.luck];
  if (window.jiuqiEditMode && jPath) {
    window.openJiuqiEditModal(jPath);
    return;
  }

  if (card.classList.contains("discard-confirm")) {
    /* 二次点击 → 确认删除 */
    card.classList.remove("discard-confirm");
    card.classList.add("discarding");

    let dataPath = null;
    if (btn.dataset.npc) dataPath = ["人物", btn.dataset.npc];
    else if (btn.dataset.partner) dataPath = ["道侣", btn.dataset.partner];
    else if (btn.dataset.pet) dataPath = ["灵宠", btn.dataset.pet];
    else if (btn.dataset.skill) dataPath = ["主角", "功法", btn.dataset.skill];
    else if (btn.dataset.quest) dataPath = ["机遇", btn.dataset.quest];
    else if (btn.dataset.event) dataPath = ["世界", "动向", btn.dataset.event];
    else if (btn.dataset.beauty) dataPath = ["绝色榜", btn.dataset.beauty];
    else if (btn.dataset.item) dataPath = ["主角", "储物袋", btn.dataset.item];
    else if (btn.dataset.artifact)
      dataPath = ["主角", "器物", btn.dataset.artifact];
    else if (btn.dataset.luck) dataPath = ["主角", "气运", btn.dataset.luck];

    if (dataPath) {
      deleteStatEntry(dataPath, card);
    }
  } else {
    /* 首次点击 → 确认态 */
    card.classList.add("discard-confirm");
    btn.textContent = "删除?";
    setTimeout(() => {
      card.classList.remove("discard-confirm");
      btn.textContent = "✕";
    }, 2000);
  }
}
