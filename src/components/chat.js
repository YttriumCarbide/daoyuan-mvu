/* --- 核心生成请求提取 (防空回 + 兼容API + 解决截断) --- */
window.callGenerateReply = async function (
  injectContent,
  userMessage,
  charName,
) {
  let finalReply = "";
  let settings = {};
  try {
    const saved = localStorage.getItem("daoyuan_wx_settings");
    if (saved) settings = JSON.parse(saved);
  } catch (e) {}

  const systemPrompt =
    injectContent +
    `\n\n(请以【${charName}】的身份回复，严格只输出纯对话内容，绝对不要带角色名、引号、动作描写或[]符号。)`;

  if (settings.apiBaseUrl && settings.apiModel) {
    // 使用自定义 API
    let endpoint = settings.apiBaseUrl;
    if (
      !endpoint.endsWith("/chat/completions") &&
      !endpoint.endsWith("/chat/completions/")
    ) {
      endpoint = endpoint.endsWith("/")
        ? endpoint + "chat/completions"
        : endpoint + "/chat/completions";
    }

    // 增加 max_tokens 防止被截断，针对部分模型增加 temperature
    const payload = {
      model: settings.apiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    const headers = { "Content-Type": "application/json" };
    if (settings.apiKey) headers["Authorization"] = `Bearer ${settings.apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${errText}`);
      }
      const data = await response.json();
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        finalReply = data.choices[0].message.content;
      } else {
        throw new Error(`API 返回格式异常: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.error("自定义API调用失败:", e);
      window.updateDebugLog(`❌ 请求报错:\n${e.message}`);
      alert("自定义API调用失败，请查看「玉简设定」中的日志排查问题。");
      throw e;
    }
  } else {
    // 使用酒馆原生 generate
    if (typeof generate === "function") {
      try {
        const combinedPrompt = systemPrompt + "\n\n" + userMessage;
        const rawReply = await window.generate({
          user_input: combinedPrompt,
          should_stream: false,
          max_chat_history: 15,
        });

        if (typeof rawReply === "string") {
          finalReply = rawReply;
        } else if (rawReply && rawReply.text) {
          finalReply = rawReply.text;
        } else if (rawReply && rawReply.reply) {
          finalReply = rawReply.reply;
        } else {
          finalReply = String(rawReply || "");
        }
      } catch (e) {
        console.error("调用酒馆生成失败:", e);
        window.updateDebugLog(`❌ 酒馆原生生成报错:\n${e.message}`);
        alert("调用酒馆生成失败，请检查助手配置。");
        throw e;
      }
    } else {
      alert("⚠️ 未检测到酒馆 generate 函数，且未配置自定义 API。");
      throw new Error("无可用生成接口");
    }
  }

  console.log("[玉简] AI返回的原始内容:", finalReply);
  // 把真实返回内容写进 UI 日志里
  window.updateDebugLog(finalReply || "(空返回)");

  // --- 防空回及提取逻辑 ---
  if (!finalReply || finalReply.trim() === "") {
    return "对方似乎没有想好怎么回复...";
  }

  let extracted = finalReply;

  // 1. 彻底剔除 <think> 思考过程 (匹配包含换行的所有内容)
  extracted = extracted.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. 尝试提取 [REPLY] 标签
  const replyMatch =
    extracted.match(/\[REPLY\]([\s\S]*?)\[\/REPLY\]/i) ||
    extracted.match(/【回复】([\s\S]*?)【\/回复】/);

  if (replyMatch && replyMatch[1]) {
    extracted = replyMatch[1].trim();
  } else {
    // 3. 增强的清洗逻辑：没有标签时，保留过滤 think 后的完整内容
    // 去除角色名前缀 (例如 "瑶汐:", "【瑶汐】:", "瑶汐说：")
    const prefixRegex = new RegExp(
      `^(?:【?${charName}】?\\s*(?:说)?\\s*[:：\\n])`,
      "i",
    );
    extracted = extracted.replace(prefixRegex, "").trim();
    // 去除最外层的引号
    extracted = extracted.replace(/^[<q>"'「”]|["</q>'」]$/g, "").trim();
  }

  if (!extracted) {
    extracted = "对方传来了模糊不清的神念...";
  }

  return extracted;
};

window.handleReply = async function (buttonElement, charName) {
  const all_variables = window.getAllVariables();
  const container = buttonElement.parentElement;
  const inputElement = container.querySelector(".reply-input");
  const replyText = inputElement.value.trim();

  if (!replyText) {
    alert("回复内容不能为空！");
    return;
  }

  /* 写入"我"的消息 */
  inputElement.value = "";
  inputElement.style.height = "auto";
  buttonElement.disabled = true;
  buttonElement.textContent = "发送中...";

  await window.appendChatMessage(charName, "我", replyText);

  const fullData = _.get(all_variables, "stat_data", {});
  const historyObj =
    (fullData.玉简 &&
      fullData.玉简[charName] &&
      fullData.玉简[charName].历史记录) ||
    {};

  let historyText = "";
  Object.values(historyObj).forEach((msg) => {
    historyText += `[${msg.发送者}]: ${msg.内容}\n`;
  });
  const customPrompt = document.getElementById("wx-custom-prompt")
    ? document.getElementById("wx-custom-prompt").value.trim()
    : "";

  // ++ 从最新的独立存储中提取勾选的世界书知识 ++
  let activeLoreContext = "";
  let savedLore = {};
  try {
    savedLore =
      JSON.parse(localStorage.getItem("daoyuan_wx_lore_selected")) || {};
  } catch (e) {}
  const selectedData = savedLore[charName] || [];
  selectedData.forEach((data) => {
    if (data.content) activeLoreContext += data.content + "\n\n";
  });

  // --- 新增：提取主角与对方的状态变量 ---
  const stat = _.get(all_variables, "stat_data", {});
  const hero = stat.主角 || {};
  const world = stat.世界 || {};

  let heroInfo = `[主角当前状态]\n境界: ${hero.境界 || "未知"}\n所在界域: ${hero.所在界 || "未知"}\n当前地点: ${world.当前地点 || "未知"}\n当前时间: ${world.当前时间 || "未知"}\n灵根: ${hero.灵根 || "无"}\n`;
  const skills = hero.功法 || {};
  const skillNames = Object.entries(skills)
    .map(([k, v]) => `${k}(${v.境界 || "未知"})`)
    .join("、");
  heroInfo += `功法: ${skillNames || "无"}`;

  let charSelfInfo = "\n\n[你的当前状态/面板设定]\n";
  const partnerData = (stat.道侣 || {})[charName];
  const npcData = (stat.人物 || {})[charName];
  const petData = (stat.灵宠 || {})[charName];
  const targetData = partnerData || npcData || petData || {};

  const yujianData = (stat.玉简 || {})[charName] || {};
  const mergedData = { ...targetData };

  if (yujianData.境界) mergedData["境界"] = yujianData.境界;
  if (yujianData.性别) mergedData["性别"] = yujianData.性别;
  if (yujianData.关系) mergedData["关系"] = yujianData.关系;
  if (yujianData.好感度) mergedData["好感度"] = yujianData.好感度;

  let hasData = false;
  Object.entries(mergedData).forEach(([k, v]) => {
    if (typeof v !== "object" && v !== undefined && v !== null) {
      charSelfInfo += `${k}: ${v}\n`;
      hasData = true;
    }
  });

  if (!hasData) {
    charSelfInfo = "";
  }
  // ------------------------------------

  let injectContent = `[玉简传讯历史记录]\n${historyText}`;
  if (customPrompt) {
    injectContent += `\n\n【附加设定/规则】\n${customPrompt}`;
  }
  if (activeLoreContext) {
    injectContent += `\n\n【角色已知世界书背景】\n${activeLoreContext}`;
  }

  // 注入主角面板与对方自身面板数据
  injectContent += `\n\n${heroInfo}${charSelfInfo}`;

  buttonElement.textContent = "对方输入中";

  try {
    const finalReply = await window.callGenerateReply(
      injectContent,
      `[玉简传讯系统] 主角发来最新传讯：\n"${replyText}"`,
      charName,
    );
    await window.appendChatMessage(charName, charName, finalReply);
  } catch (e) {
    // 错误已经在 callGenerateReply 内部抛出并提示
  }

  buttonElement.textContent = "发送";
  buttonElement.disabled = false;
};

/* ===== 单条消息操作: 删除 与 重试 ===== */
window.deleteSingleMessage = async function (charName, msgId) {
  if (!confirm("确定删除这条传讯吗？")) return;
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
      if (
        fullData &&
        fullData.stat_data &&
        fullData.stat_data.玉简 &&
        fullData.stat_data.玉简[charName] &&
        fullData.stat_data.玉简[charName].历史记录
      ) {
        delete fullData.stat_data.玉简[charName].历史记录[msgId];
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });

        window.currentMessagesData[charName].历史记录 =
          fullData.stat_data.玉简[charName].历史记录;
        window.openChatView(charName);
      }
    }
  } catch (err) {
    console.error("删除单条消息失败:", err);
  }
};

window.retrySingleMessage = async function (charName, msgId) {
  if (
    !confirm(
      "确定要重试生成这条回复吗？（该条记录将被删除，并重新请求附在最后）",
    )
  )
    return;
  try {
    const lastMsgId = window.getLastMessageId();
    const messages = window.getChatMessages("0-" + lastMsgId, { role: "assistant" });
    const targetMsgId = messages[messages.length - 1].message_id;

    let historyObj = {};
    if (window.Mvu && typeof window.Mvu.replaceMvuData === "function") {
      const fullData = window.Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (
        fullData &&
        fullData.stat_data &&
        fullData.stat_data.玉简 &&
        fullData.stat_data.玉简[charName] &&
        fullData.stat_data.玉简[charName].历史记录
      ) {
        historyObj = { ...fullData.stat_data.玉简[charName].历史记录 };
        delete historyObj[msgId];
        fullData.stat_data.玉简[charName].历史记录 = historyObj;
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });

        window.currentMessagesData[charName].历史记录 = historyObj;
        window.openChatView(charName);
      }
    }

    const btn = document.getElementById("wx-reply-btn");
    if (btn) {
      btn.textContent = "正在重写...";
      btn.disabled = true;
    }

    let historyText = "";
    Object.values(historyObj).forEach((msg) => {
      historyText += `[${msg.发送者}]: ${msg.内容}\n`;
    });
    const customPrompt = document.getElementById("wx-custom-prompt")
      ? document.getElementById("wx-custom-prompt").value.trim()
      : "";

    // ++ 重试时同样提取最新的独立世界书数据 ++
    let activeLoreContext = "";
    let savedLore = {};
    try {
      savedLore =
        JSON.parse(localStorage.getItem("daoyuan_wx_lore_selected")) || {};
    } catch (e) {}
    const selectedData = savedLore[charName] || [];
    selectedData.forEach((data) => {
      if (data.content) activeLoreContext += data.content + "\n\n";
    });

    // --- 新增：提取主角与对方的状态变量 ---
    const all_variables = window.getAllVariables();
    const stat = _.get(all_variables, "stat_data", {});
    const hero = stat.主角 || {};
    const world = stat.世界 || {};

    let heroInfo = `[主角当前状态]\n境界: ${hero.境界 || "未知"}\n所在界域: ${hero.所在界 || "未知"}\n当前地点: ${world.当前地点 || "未知"}\n当前时间: ${world.当前时间 || "未知"}\n灵根: ${hero.灵根 || "无"}\n`;
    const skills = hero.功法 || {};
    const skillNames = Object.entries(skills)
      .map(([k, v]) => `${k}(${v.境界 || "未知"})`)
      .join("、");
    heroInfo += `功法: ${skillNames || "无"}`;

    let charSelfInfo = "\n\n[你的当前状态/面板设定]\n";
    const partnerData = (stat.道侣 || {})[charName];
    const npcData = (stat.人物 || {})[charName];
    const petData = (stat.灵宠 || {})[charName];
    const targetData = partnerData || npcData || petData || {};

    const yujianData = (stat.玉简 || {})[charName] || {};
    const mergedData = { ...targetData };

    if (yujianData.境界) mergedData["境界"] = yujianData.境界;
    if (yujianData.性别) mergedData["性别"] = yujianData.性别;
    if (yujianData.关系) mergedData["关系"] = yujianData.关系;
    if (yujianData.好感度) mergedData["好感度"] = yujianData.好感度;

    let hasData = false;
    Object.entries(mergedData).forEach(([k, v]) => {
      if (typeof v !== "object" && v !== undefined && v !== null) {
        charSelfInfo += `${k}: ${v}\n`;
        hasData = true;
      }
    });

    if (!hasData) {
      charSelfInfo = "";
    }
    // ------------------------------------

    let injectContent = `[玉简传讯历史记录]\n${historyText}`;
    if (customPrompt) {
      injectContent += `\n\n【附加设定/规则】\n${customPrompt}`;
    }
    if (activeLoreContext) {
      injectContent += `\n\n【角色已知世界书背景】\n${activeLoreContext}`;
    }

    // 注入主角面板与对方自身面板数据
    injectContent += `\n\n${heroInfo}${charSelfInfo}`;

    const finalReply = await window.callGenerateReply(
      injectContent,
      `[玉简传讯系统] 请继续通过玉简传讯回复主角的上一条消息。`,
      charName,
    );
    await window.appendChatMessage(charName, charName, finalReply);

    if (btn) {
      btn.textContent = "发送";
      btn.disabled = false;
    }
  } catch (err) {
    console.error("重试失败:", err);
    const btn = document.getElementById("wx-reply-btn");
    if (btn) {
      btn.textContent = "发送";
      btn.disabled = false;
    }
  }
};

window.fairyImages = [
  "https://i.postimg.cc/rpz2PCrZ/Image-1765540443504.jpg",
  "https://i.postimg.cc/B6bsPC8Q/Image-1765540442059.jpg",
];
window.currentFairyImageIndex = 0;

