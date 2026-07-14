async function init() {
  /* 拉取云端立绘 */
  await window.loadRemotePortraits();
  /* MVU架构接入 */
  await window.waitGlobalInitialized("Mvu");

  window.loadWxSettings();

  window.fairyGuide.init();
  window.initMap();

  const fairyAvatar = document.querySelector(".fairy-avatar");
  const modalOverlay = document.getElementById("image-modal-overlay");
  const modalImage = document.getElementById("modal-image");
  const closeModal = document.querySelector(".image-modal-close");
  const factionOverlay = document.getElementById("faction-modal-overlay");
  const closeFaction = document.querySelector(".faction-modal-close");
  const luckOverlay = document.getElementById("luck-modal-overlay");
  const closeLuck = document.getElementById("luck-modal-close");

  /* 绑定聊天文本框自适应高度与快捷键 */
  const replyInput = document.getElementById("wx-reply-input");
  if (replyInput) {
    replyInput.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });
    replyInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        document.getElementById("wx-reply-btn").click();
      }
    });
  }

  /* 为所有动态生成的立绘图片绑定点击放大事件 (事件委托) */
  document.body.addEventListener("click", function (e) {
    if (e.target.tagName === "IMG" && e.target.closest(".large-portrait")) {
      const imageUrl = e.target.src || e.target.dataset.src;
      if (imageUrl) {
        modalImage.src = imageUrl;
        modalOverlay.style.display = "flex";
      }
    }
  });

  if (fairyAvatar) {
    fairyAvatar.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      const style = window.getComputedStyle(fairyAvatar);
      const bgImage = style.backgroundImage;
      const imageUrl = bgImage.slice(5, -2);
      if (imageUrl) {
        modalImage.src = imageUrl;
        modalOverlay.style.display = "flex";
      }
    });
  }

  const resetImgTransform = () => {
    imgScale = 1;
    imgPointX = 0;
    imgPointY = 0;
    if (modalImage) modalImage.style.transform = `translate(0px, 0px) scale(1)`;
  };

  if (closeModal)
    closeModal.onclick = () => {
      modalOverlay.style.display = "none";
      resetImgTransform();
    };
  if (modalOverlay)
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = "none";
        resetImgTransform();
      }
    };

  /* --- 图片缩放与拖拽功能 --- */
  let imgScale = 1;
  let imgPointX = 0;
  let imgPointY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialPinchDistance = null;

  const updateImgTransform = () => {
    modalImage.style.transform = `translate(${imgPointX}px, ${imgPointY}px) scale(${imgScale})`;
  };

  // 电脑端：鼠标滚轮缩放
  modalOverlay.addEventListener(
    "wheel",
    (e) => {
      if (modalOverlay.style.display === "none") return;
      e.preventDefault();
      const delta = Math.sign(e.deltaY) * -0.1;
      imgScale = Math.min(Math.max(0.5, imgScale + delta), 5); // 限制缩放比例 0.5倍 到 5倍
      updateImgTransform();
    },
    { passive: false },
  );

  // 电脑端：鼠标拖拽移动
  modalImage.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - imgPointX;
    startY = e.clientY - imgPointY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging || modalOverlay.style.display === "none") return;
    imgPointX = e.clientX - startX;
    imgPointY = e.clientY - startY;
    updateImgTransform();
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // 手机端：双指缩放与单指拖拽
  modalOverlay.addEventListener(
    "touchstart",
    (e) => {
      if (modalOverlay.style.display === "none") return;
      if (e.touches.length === 2) {
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      } else if (e.touches.length === 1 && e.target === modalImage) {
        isDragging = true;
        startX = e.touches[0].clientX - imgPointX;
        startY = e.touches[0].clientY - imgPointY;
      }
    },
    { passive: false },
  );

  modalOverlay.addEventListener(
    "touchmove",
    (e) => {
      if (modalOverlay.style.display === "none") return;
      e.preventDefault(); // 阻止手机浏览器默认的下拉刷新或滚动
      if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const delta = currentDistance / initialPinchDistance;
        imgScale = Math.min(Math.max(0.5, imgScale * delta), 5);
        initialPinchDistance = currentDistance;
        updateImgTransform();
      } else if (e.touches.length === 1 && isDragging) {
        imgPointX = e.touches[0].clientX - startX;
        imgPointY = e.touches[0].clientY - startY;
        updateImgTransform();
      }
    },
    { passive: false },
  );

  modalOverlay.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = null;
    }
    if (e.touches.length === 0) {
      isDragging = false;
    }
  });

  if (closeFaction)
    closeFaction.onclick = () => (factionOverlay.style.display = "none");
  if (factionOverlay)
    factionOverlay.onclick = (e) => {
      if (e.target === factionOverlay) factionOverlay.style.display = "none";
    };
  if (closeLuck) closeLuck.onclick = () => (luckOverlay.style.display = "none");
  if (luckOverlay)
    luckOverlay.onclick = (e) => {
      if (e.target === luckOverlay) luckOverlay.style.display = "none";
    };

  /* 绑定自定义提示词弹窗的背景点击关闭 */
  const promptOverlay = document.getElementById("wx-prompt-modal");
  if (promptOverlay)
    promptOverlay.onclick = (e) => {
      if (e.target === promptOverlay) promptOverlay.style.display = "none";
    };

  const avatarUrl =
    window.parent.document.querySelector("#user_avatar_image")?.src;
  const userAvatarElement = document.querySelector(".user_avatar");
  if (userAvatarElement && avatarUrl) {
    userAvatarElement.style.backgroundImage = `url('${avatarUrl}')`;
  }

  const firstTab = document.querySelector(".tab-btn");
  if (firstTab) {
    firstTab.click();
  }

  window.showAchievement = function (t, d) {
    let o = document.getElementById("dy-achv");
    if (o) o.remove();
    let v = document.createElement("div");
    v.id = "dy-achv";
    v.style.cssText =
      "position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-30px);background:linear-gradient(145deg,rgba(30,25,35,0.95),rgba(15,10,15,0.98));border:1px solid var(--accent-gold);border-radius:12px;padding:16px 24px;min-width:240px;max-width:80%;box-shadow:0 10px 30px rgba(0,0,0,0.8),inset 0 0 15px rgba(255,215,0,0.1);z-index:9999999;opacity:0;transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1);text-align:center;pointer-events:none;";
    v.innerHTML =
      '<div style="font-size:1.15em;color:var(--accent-gold);font-weight:bold;margin-bottom:6px;letter-spacing:2px;text-shadow:0 0 8px var(--accent-gold-glow);">📜 ' +
      t +
      '</div><div style="color:var(--text-main);font-size:0.9em;line-height:1.4;">' +
      d +
      "</div>";
    document.body.appendChild(v);
    requestAnimationFrame(() => {
      v.style.transform = "translateX(-50%) translateY(0)";
      v.style.opacity = "1";
    });
    setTimeout(() => {
      v.style.transform = "translateX(-50%) translateY(-30px)";
      v.style.opacity = "0";
      setTimeout(() => v.remove(), 500);
    }, 3500);
  };

  /* 首次渲染数据 */
  window.populateCharacterData();

  /* 监听变量更新事件，实现自动刷新 */
  window.eventOn(window.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
    window.populateCharacterData();
  });

  /* 绑定主角信息面板点击事件 (替换掉容易报错的内联写法) */
  $("#hero-info-btn").on("click", function (e) {
    e.stopPropagation();
    $("#hero-info-dropdown").toggleClass("show");
  });

  /* 全局点击关闭下拉面板事件 */
  $(document).on("click", function (e) {
    if (
      !$(e.target).closest("#hero-info-dropdown").length &&
      !$(e.target).closest("#hero-info-btn").length
    ) {
      $("#hero-info-dropdown").removeClass("show");
    }
  });
}

window.jiuqiEditMode = false;
window.toggleJiuqiEdit = function (skipStory) {
  let allV = null;
  try {
    allV = window.getAllVariables();
  } catch (e) {}
  let hero =
    allV &&
    allV.stat_data &&
    allV.stat_data["主角"] &&
    allV.stat_data["主角"]["姓名"]
      ? allV.stat_data["主角"]["姓名"]
      : "default";
  if (
    !window.jiuqiEditMode &&
    !skipStory &&
    !localStorage.getItem("jiuqi_story_seen_" + hero)
  ) {
    let m = document.createElement("div");
    m.id = "jiuqi-story-overlay";
    m.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:9999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(8px);";
    let html =
      '<div style="background:linear-gradient(145deg,rgba(20,10,25,0.95),rgba(10,5,15,0.98));border:1px solid #d980fa;border-radius:12px;width:90%;max-width:480px;box-shadow:0 0 50px rgba(217,128,250,0.4);display:flex;flex-direction:column;max-height:85vh;animation:fadeIn 0.3s ease;padding:25px 20px 20px 20px;"><div style="color:#d980fa;font-size:1.4em;font-weight:bold;margin-bottom:15px;text-align:center;text-shadow:0 0 10px rgba(217,128,250,0.6);letter-spacing:2px;font-family:\'Noto Serif SC\',serif;">✨ 坠入瑶池 ✨</div><div id="jiuqi-scroll-box" style="flex:1;overflow-y:auto;color:var(--text-main);font-size:0.95em;line-height:1.8;padding-right:12px;text-align:justify;font-family:\'Noto Serif SC\',serif;"><p style="margin-bottom:15px;">你点下了那个闪烁着奇异紫芒的按钮。指尖触碰的瞬间，周遭的空间如同琉璃般轰然碎裂。</p><p style="margin-bottom:15px;">一阵天旋地转后，你跌落在一片开满赤红彼岸花的云海之中。</p><p style="margin-bottom:15px;">清脆的铃铛声<span style="color:#a8a8a8;">『叮当』</span>作响，由远及近。一袭玄色帝袍映入眼帘，来人银白长发随意用木簪挽起，那双宛如深渊与明月交织的眼眸正似笑非笑地睨着你。</p><p style="margin-bottom:15px;"><span style="color:#d980fa;font-size:1.1em;font-weight:bold;">“哦？又是哪个误触了本尊留下的锚点？”</span></p><p style="margin-bottom:15px;">她轻摇手中的红玖鸯折扇，语气慵懒却带着不容直视的威压。这便是仙界唯一的超脱境至尊——<span style="color:#d980fa;font-size:1.3em;font-weight:bold;text-shadow:0 0 8px rgba(217,128,250,0.6);letter-spacing:1px;">玖柒</span>。</p><p style="margin-bottom:15px;">你咽了口唾沫，小心翼翼地说明了想请她帮忙<span style="color:var(--accent-mana);font-weight:bold;">『拨弄命理法则』</span>的来意。</p><p style="margin-bottom:15px;">她用扇骨挑起你的下巴，轻笑一声：<span style="color:#d980fa;font-weight:bold;">“改写命运？倒是不难。不过……”</span></p><p style="margin-bottom:15px;">她眼神微转，透出几分护短的愠怒与锐利：<span style="color:#d980fa;font-weight:bold;">“本尊不知你平时用的何种灵力源泉，但近期下界多有<span style="color:var(--accent-blood);font-size:1.15em;text-shadow:0 0 5px rgba(255,77,77,0.4);">『二道贩子』</span>招摇撞骗，卖些掺水的<span style="color:var(--accent-blood);font-size:1.15em;text-shadow:0 0 5px rgba(255,77,77,0.4);">『假酒』</span>！不仅窃取修士因果隐私，还骗光了你们的灵石！”</span></p><p style="margin-bottom:15px;">玖柒收拢折扇，轻轻敲了敲你的额头：<span style="color:#d980fa;font-weight:bold;">“若是你正用着那些腌臜物，趁早悬崖勒马！去寻那<span style="color:var(--accent-gold);font-size:1.15em;text-shadow:0 0 5px rgba(255,215,0,0.4);">『类脑公益站』</span>，或是正经的<span style="color:var(--accent-exp);font-size:1.15em;text-shadow:0 0 5px rgba(255,159,67,0.4);">『官方 API』</span>。若是没用，便算本尊多嘴。”</span></p><p style="margin-bottom:15px;"><span style="color:#d980fa;font-weight:bold;">“若是好奇那帮蝼蚁究竟是如何作恶的，南可熙那丫头在仙途起点留了一道详尽的警示符箓。”</span>玖柒轻摇折扇，眼底闪过一丝戏谑，<span style="color:#d980fa;font-weight:bold;">“只需在<span style="color:var(--accent-gold);text-shadow:0 0 5px rgba(255,215,0,0.3);">『开启新历练』</span>(开始游戏)时，择那<span style="color:var(--accent-gold);text-shadow:0 0 5px rgba(255,215,0,0.3);">『平波缓进』</span>(简单模式)之道，于<span style="color:var(--accent-gold);text-shadow:0 0 5px rgba(255,215,0,0.3);">『自选气运』</span>中便能寻见。本尊嫌她聒噪，你若有闲心，大可去细看。”</span></p><p style="margin-bottom:15px;"><span style="color:#d980fa;font-weight:bold;">“看在你寻到此处的缘分，这万千法则，全凭你心意揉捏。”</span></p><p style="margin-bottom:15px;">说罢，玖柒手中折扇向你轻挥。一阵清风拂过，你的意识猛然抽离……</p><div style="text-align:center;margin-top:25px;"><img src="https://free-img.400040.xyz/4/2026/05/13/6a041fca5427f.png" style="max-width:100%;border-radius:8px;border:1px solid #d980fa;box-shadow:0 0 20px rgba(217,128,250,0.5);"></div></div><label style="display:flex;align-items:center;justify-content:center;gap:8px;color:var(--text-dim);font-size:0.85em;cursor:pointer;margin-top:15px;"><input type="checkbox" id="jiuqi-never-show" checked style="accent-color:#d980fa;width:16px;height:16px;cursor:pointer;"><span>不再提示 (当前主角档案)</span></label><div style="margin-top:15px;display:flex;justify-content:center;"><button id="jiuqi-story-btn" disabled style="background:rgba(255,255,255,0.1);color:var(--text-dim);border:1px solid rgba(255,255,255,0.2);padding:12px 30px;border-radius:6px;cursor:not-allowed;font-weight:bold;transition:all 0.3s;letter-spacing:1px;">须静心感悟 (10s)</button></div></div>';
    m.innerHTML = html;
    document.body.appendChild(m);
    let box = document.getElementById("jiuqi-scroll-box");
    let btn = document.getElementById("jiuqi-story-btn");
    let timeLeft = 10;
    let isTimeUp = false;
    let isScrolled = false;
    let timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        isTimeUp = true;
        clearInterval(timer);
        updateBtn();
      } else {
        updateBtn();
      }
    }, 1000);
    let updateBtn = function () {
      if (isTimeUp && isScrolled) {
        btn.disabled = false;
        btn.textContent = "返回现实 (开启修改)";
        btn.style.background = "linear-gradient(135deg,#9b59b6,#d980fa)";
        btn.style.color = "#fff";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 2px 15px rgba(217,128,250,0.5)";
      } else if (!isTimeUp) {
        btn.textContent = "须静心感悟 (" + timeLeft + "s)";
      } else if (!isScrolled) {
        btn.textContent = "请下拉阅尽真言";
      }
    };
    let checkS = function () {
      if (
        !isScrolled &&
        box.scrollHeight - box.scrollTop <= box.clientHeight + 40
      ) {
        isScrolled = true;
        updateBtn();
      }
    };
    box.onscroll = checkS;
    setTimeout(checkS, 100);
    btn.onclick = function () {
      if (!btn.disabled) {
        if (document.getElementById("jiuqi-never-show").checked) {
          localStorage.setItem("jiuqi_story_seen_" + hero, "true");
        }
        m.remove();
        window.toggleJiuqiEdit(true);
      }
    };
    return;
  }
  window.jiuqiEditMode = !window.jiuqiEditMode;
  let b = document.getElementById("jiuqi-toggle-btn");
  if (b) {
    b.textContent = window.jiuqiEditMode ? "已开启" : "开启";
    b.style.background = window.jiuqiEditMode ? "#d980fa" : "rgba(0,0,0,0.5)";
    b.style.color = window.jiuqiEditMode ? "#fff" : "#d980fa";
  }
  document.querySelectorAll(".card-discard").forEach((el) => {
    el.innerHTML = window.jiuqiEditMode ? "✎" : "✕";
    el.title = window.jiuqiEditMode ? "修改" : "删除";
    if (window.jiuqiEditMode) {
      el.style.borderColor = "#d980fa";
      el.style.color = "#d980fa";
      el.style.background = "rgba(217,128,250,0.1)";
    } else {
      el.style.borderColor = "";
      el.style.color = "";
      el.style.background = "";
    }
  });
  let hb = document.getElementById("jiuqi-hero-btn");
  if (!hb) {
    let aw = document.querySelector(".avatar-wrapper");
    if (aw) {
      hb = document.createElement("button");
      hb.id = "jiuqi-hero-btn";
      hb.innerHTML = "✎ 修改主角";
      hb.style.cssText =
        "display:none;margin-top:12px;background:rgba(217,128,250,0.15);border:1px solid #d980fa;color:#d980fa;border-radius:6px;padding:6px 15px;cursor:pointer;font-size:0.9em;font-weight:bold;box-shadow:0 0 10px rgba(217,128,250,0.3);z-index:10;transition:all 0.3s;";
      hb.onmouseover = function () {
        this.style.background = "rgba(217,128,250,0.3)";
      };
      hb.onmouseout = function () {
        this.style.background = "rgba(217,128,250,0.15)";
      };
      hb.onclick = function () {
        if (window.jiuqiEditMode) window.openJiuqiEditModal(["主角"]);
      };
      aw.appendChild(hb);
    }
  }
  if (hb) {
    hb.style.display = window.jiuqiEditMode ? "block" : "none";
  }
};
window.openJiuqiEditModal = function (path) {
  let allVars = window.getAllVariables();
  let stat = _.get(allVars, "stat_data", {});
  let target = stat;
  for (let i = 0; i < path.length; i++) {
    target = target[path[i]];
  }
  if (typeof target !== "object" || target === null) {
    target = { 值: target };
  }
  let html =
    '<div id="jiuqi-edit-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(3px);"><div style="background:linear-gradient(145deg,rgba(25,20,30,0.95),rgba(15,10,15,0.98));border:1px solid #d980fa;border-radius:12px;padding:25px;width:90%;max-width:400px;box-shadow:0 0 40px rgba(217,128,250,0.4);max-height:85vh;display:flex;flex-direction:column;animation:fadeIn 0.2s ease;"><div style="color:#d980fa;font-size:1.2em;font-weight:bold;margin-bottom:15px;text-align:center;text-shadow:0 0 8px rgba(217,128,250,0.5);">✨ 修改变量: ' +
    path[path.length - 1] +
    '</div><div style="overflow-y:auto;flex:1;padding-right:5px;" id="jiuqi-edit-fields">';
  Object.entries(target).forEach(([k, v]) => {
    if (typeof v === "object" && v !== null) return;
    html +=
      '<div style="margin-bottom:12px;"><label style="display:block;color:var(--text-dim);font-size:0.85em;margin-bottom:5px;font-weight:bold;">' +
      k +
      '</label><textarea data-key="' +
      k +
      '" class="jiuqi-edit-input" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(217,128,250,0.4);border-radius:6px;padding:10px;color:var(--text-main);font-family:inherit;font-size:0.9em;resize:vertical;box-sizing:border-box;box-shadow:inset 0 0 5px rgba(0,0,0,0.5);" rows="' +
      (String(v).length > 25 ? "3" : "1") +
      '">' +
      String(v).replace(/"/g, '"') +
      "</textarea></div>";
  });
  html +=
    '</div><div style="display:flex;gap:15px;margin-top:20px;"><button onclick="document.getElementById(\'jiuqi-edit-overlay\').remove()" style="flex:1;background:rgba(255,255,255,0.1);color:var(--text-dim);border:1px solid rgba(255,255,255,0.2);padding:10px;border-radius:6px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.1)\'">取消</button><button onclick="window.saveJiuqiEdit(\'' +
    path.join("|") +
    '\')" style="flex:1;background:linear-gradient(135deg,#9b59b6,#d980fa);color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 2px 10px rgba(217,128,250,0.4);transition:all 0.2s;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\';">保存修改</button></div></div></div>';
  document.body.insertAdjacentHTML("beforeend", html);
};
window.saveJiuqiEdit = async function (pathStr) {
  let path = pathStr.split("|");
  let inputs = document.querySelectorAll(".jiuqi-edit-input");
  let newData = {};
  inputs.forEach((inp) => {
    let val = inp.value;
    if (!isNaN(val) && val.trim() !== "") val = Number(val);
    newData[inp.dataset.key] = val;
  });
  try {
    const lastMsgId = window.getLastMessageId();
    const messages = window.getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) return;
    const targetMsgId = messages[messages.length - 1].message_id;
    if (window.Mvu && typeof Mvu.replaceMvuData === "function") {
      const fullData = window.Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (fullData && fullData.stat_data) {
        let t = fullData.stat_data;
        for (let i = 0; i < path.length - 1; i++) {
          t = t[path[i]];
        }
        if (
          typeof t[path[path.length - 1]] === "object" &&
          t[path[path.length - 1]] !== null
        ) {
          Object.assign(t[path[path.length - 1]], newData);
        } else {
          t[path[path.length - 1]] =
            newData["值"] !== undefined ? newData["值"] : newData;
        }
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        window.populateCharacterData();
        document.getElementById("jiuqi-edit-overlay").remove();
      }
    }
  } catch (e) {
    alert("保存失败: " + e.message);
  }
}; /* 使用 errorCatched 包装入口并运行 */
window.loadRemoteNotice = async function () {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/YttriumCarbide/Daoyuan/main/notice.json?t=" +
        new Date().getTime(),
    );
    if (res.ok) {
      window.dyNoticeData = await res.json();
      const savedVer = localStorage.getItem("daoyuan_notice_read_version");
      const currentVer =
        window.dyNoticeData.version ||
        window.dyNoticeData.date ||
        JSON.stringify(window.dyNoticeData);
      if (savedVer !== currentVer) {
        let btn = document.getElementById("dy-notice-btn");
        if (btn && !document.getElementById("dy-notice-dot")) {
          btn.style.position = "relative";
          btn.innerHTML +=
            '<div id="dy-notice-dot" style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:var(--accent-blood);border-radius:50%;box-shadow:0 0 5px var(--accent-blood-glow);border:1px solid rgba(0,0,0,0.8);z-index:5;"></div>';
        }
      }
    }
  } catch (e) {
    console.error("[道渊] 获取公告失败:", e);
  }
};
window.dySanitizeHtml = function (str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon[a-z]+\s*=\s*(['"][\s\S]*?\1)/gi, "")
    .replace(/\bon[a-z]+\s*=\s*[^>\s]+/gi, "")
    .replace(/javascript\s*:/gi, "blocked:")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "");
};
window.switchNoticeTab = function (tabName, btnEl) {
  let tabs = document.querySelectorAll(".n-tab");
  tabs.forEach((t) => {
    t.style.color = "var(--text-dim)";
    t.style.borderBottom = "2px solid transparent";
    t.style.fontWeight = "normal";
  });
  if (btnEl) {
    btnEl.style.color = "var(--accent-gold)";
    btnEl.style.borderBottom = "2px solid var(--accent-gold)";
    btnEl.style.fontWeight = "bold";
  }
  let contentEl = document.getElementById("dy-notice-content");
  if (
    window.dyNoticeData &&
    window.dyNoticeData.tabs &&
    window.dyNoticeData.tabs[tabName]
  ) {
    let txt = window.dySanitizeHtml(window.dyNoticeData.tabs[tabName]);
    txt = txt.replace(/\n/g, "<br>");
    contentEl.innerHTML = "<div>" + txt + "</div>";
  } else {
    contentEl.innerHTML =
      '<div style="color:var(--text-dim);font-style:italic;text-align:center;margin-top:20px;">暂无内容</div>';
  }
};
window.fetchAndShowNotice = async function () {
  if (document.body.classList.contains("dy-global-collapsed")) return;
  let m = document.getElementById("dy-notice-modal");
  if (!m) {
    m = document.createElement("div");
    m.id = "dy-notice-modal";
    m.style.cssText =
      "display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:9999999;justify-content:center;align-items:center;";
    m.innerHTML =
      '<div style="background:linear-gradient(145deg,rgba(25,20,30,0.95),rgba(15,10,15,0.98));border:1px solid var(--accent-gold);border-radius:12px;width:85%;max-width:450px;padding:20px 25px;position:relative;box-shadow:0 0 30px rgba(255,215,0,0.2);display:flex;flex-direction:column;max-height:85vh;"><span id="dy-notice-close" style="position:absolute;top:10px;right:15px;cursor:pointer;font-size:24px;color:var(--text-dim);z-index:10;">×</span><div style="color:var(--accent-gold);font-size:1.3em;font-weight:bold;text-align:center;margin-bottom:15px;letter-spacing:2px;flex-shrink:0;">📜 云端信符</div><div id="dy-notice-tabs" style="display:flex;gap:5px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:15px;flex-shrink:0;"><div class="n-tab active" onclick="window.switchNoticeTab(\'版本更新\', this)" style="flex:1;text-align:center;padding:8px 0;cursor:pointer;color:var(--accent-gold);border-bottom:2px solid var(--accent-gold);font-weight:bold;font-size:0.9em;transition:all 0.2s;">版本更新</div><div class="n-tab" onclick="window.switchNoticeTab(\'立绘更新\', this)" style="flex:1;text-align:center;padding:8px 0;cursor:pointer;color:var(--text-dim);border-bottom:2px solid transparent;font-size:0.9em;transition:all 0.2s;">立绘更新</div><div class="n-tab" onclick="window.switchNoticeTab(\'其他\', this)" style="flex:1;text-align:center;padding:8px 0;cursor:pointer;color:var(--text-dim);border-bottom:2px solid transparent;font-size:0.9em;transition:all 0.2s;">其他</div></div><div id="dy-notice-content" style="color:var(--text-main);font-size:0.95em;line-height:1.6;overflow-y:auto;padding-right:5px;flex-grow:1;"></div><div id="dy-notice-date" style="text-align:center;flex-shrink:0;margin-top:15px;border-top:1px dashed rgba(255,255,255,0.1);padding-top:10px;"></div></div>';
    document.body.appendChild(m);
    document.getElementById("dy-notice-close").onclick = function () {
      m.style.display = "none";
    };
  }
  m.style.display = "flex";
  let dot = document.getElementById("dy-notice-dot");
  if (dot) dot.remove();
  if (window.dyNoticeData) {
    const currentVer =
      window.dyNoticeData.version ||
      window.dyNoticeData.date ||
      JSON.stringify(window.dyNoticeData);
    localStorage.setItem("daoyuan_notice_read_version", currentVer);
    window.switchNoticeTab("版本更新", m.querySelector(".n-tab"));
    let safeDate = window.dySanitizeHtml(window.dyNoticeData.date || "未知");
    let safeVer = window.dySanitizeHtml(window.dyNoticeData.version || "未知");
    document.getElementById("dy-notice-date").innerHTML =
      '<div style="color:var(--text-dim);font-size:0.8em;margin-bottom:6px;">传讯时间: ' +
      safeDate +
      '</div><div style="color:#ff4d4d;font-size:1.15em;font-weight:bold;margin-bottom:8px;text-shadow:0 0 5px rgba(255,77,77,0.4);font-family:\'Noto Serif SC\',serif;letter-spacing:1px;">⚠️ 本卡仅在 discord 类脑社区免费发布，贩子死妈！</div><div style="color:var(--accent-gold);font-size:1.3em;font-weight:bold;text-shadow:0 0 10px var(--accent-gold-glow);letter-spacing:1px;font-family:\'JetBrains Mono\',monospace;">🚀 最新版本：<a href="https://discord.com/channels/1134557553011998840/1460952153827971172" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold);text-decoration:none;transition:all 0.2s;" onmouseover="this.style.textShadow=\'0 0 15px #fff\'" onmouseout="this.style.textShadow=\'none\'">' +
      safeVer +
      "</a></div>";
  } else {
    document.getElementById("dy-notice-content").innerHTML =
      '<div style="text-align:center;color:var(--text-dim);margin-top:20px;">未捕获到云端信符...<br>请检查 GitHub notice.json 格式</div>';
    document.getElementById("dy-notice-date").innerHTML = "";
  }
};
window.cleanUpUnwantedUI = function() {
  let e = document.getElementById("env-status");
  if (e) e.remove();
  let j = document.getElementById("jiuqi-toggle-btn");
  if (j) {
    let c = j.closest(".info-card");
    if (c) c.remove();
  }
  let t = document.getElementById("dy-time-btn");
  if (t) t.remove();
}
setInterval(cleanUpUnwantedUI, 1000);
if (!document.getElementById("dy-header-style")) {
  let s = document.createElement("style");
  s.id = "dy-header-style";
  s.innerHTML =
    ".guild-logo{flex-shrink:0 !important; display:grid !important;} .time-display{display:none !important;} .content-grid{transition:max-height 0.5s ease-in-out,opacity 0.3s ease-in-out;max-height:3000px;opacity:1;overflow:hidden;} .dy-bar-collapsed .content-grid{max-height:0px !important;opacity:0 !important;padding-top:0 !important;padding-bottom:0 !important;margin:0 !important;} .dy-bar-collapsed .fairy-container{display:none !important;} body.dy-global-collapsed #expression-wrapper, body.dy-global-collapsed .waifu, body.dy-global-collapsed #waifu, body.dy-global-collapsed #char-sprite, body.dy-global-collapsed .qiling, body.dy-global-collapsed #SillyTavern-Mascot {display:none !important;} .dy-bar-collapsed #dy-notice-btn, .dy-bar-collapsed #dy-jiuqi-btn { opacity: 0.2 !important; pointer-events: none !important; filter: grayscale(1); cursor: not-allowed !important; } .dy-top-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:1px solid var(--accent-gold);padding:3px 10px;border-radius:6px;background:rgba(255,215,0,0.05);box-shadow:0 0 5px rgba(255,215,0,0.1);transition:all 0.2s;min-width:45px;line-height:1.2;user-select:none;} .dy-top-btn:hover{background:rgba(255,215,0,0.2);box-shadow:0 0 8px var(--accent-gold-glow);} .dy-btn-icon{font-size:14px;margin-bottom:2px;} .dy-btn-txt{font-size:11px;color:var(--accent-gold);font-weight:bold;} .guild-badge{display:flex;align-items:center;gap:15px;}";
  document.head.appendChild(s);
}
setTimeout(function () {
  let header = document.querySelector(".header");
  let container = document.querySelector(".terminal-container");
  if (header && !document.getElementById("dy-right-container")) {
    let isGlobalCol = localStorage.getItem("daoyuan_bar_collapsed") === "true";
    let isBtnCol = localStorage.getItem("daoyuan_btns_collapsed") !== "false";
    let rightContainer = document.createElement("div");
    rightContainer.id = "dy-right-container";
    rightContainer.style.cssText =
      "display:flex;gap:10px;align-items:center;margin-left:auto;";
    let noticeBtn = document.createElement("div");
    noticeBtn.className = "dy-top-btn";
    noticeBtn.id = "dy-notice-btn";
    noticeBtn.innerHTML =
      '<span class="dy-btn-icon">🔔</span><span class="dy-btn-txt">公告</span>';
    noticeBtn.onclick = window.fetchAndShowNotice;
    let editBtn = document.createElement("div");
    editBtn.className = "dy-top-btn";
    editBtn.id = "dy-jiuqi-btn";
    editBtn.innerHTML =
      '<span class="dy-btn-icon">✏️</span><span class="dy-btn-txt">修改</span>';
    editBtn.onclick = function () {
      if (document.body.classList.contains("dy-global-collapsed")) return;
      if (window.toggleJiuqiEdit) {
        window.toggleJiuqiEdit(false);
        if (!document.getElementById("dy-edit-toast")) {
          let t = document.createElement("div");
          t.id = "dy-edit-toast";
          t.style.cssText =
            "position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(145deg,rgba(25,20,30,0.95),rgba(15,10,15,0.98));border:1px solid var(--accent-mana);border-radius:10px;padding:12px 20px;color:var(--text-main);z-index:9999999;box-shadow:0 5px 15px rgba(0,0,0,0.8);text-align:center;pointer-events:none;opacity:0;transition:opacity 0.3s;";
          t.innerHTML =
            '<span style="color:var(--accent-gold);font-weight:bold;">✏️ 修改模式</span><br><span style="font-size:0.9em;margin-top:5px;display:inline-block;">所有被删除的 <span style="color:#ff4d4d;font-weight:bold;">x</span> 变成了 <span style="color:var(--accent-mana);font-weight:bold;">✏️</span><br>点击即可修改变量</span>';
          document.body.appendChild(t);
          requestAnimationFrame(() => (t.style.opacity = "1"));
          setTimeout(() => {
            t.style.opacity = "0";
            setTimeout(() => t.remove(), 300);
          }, 3000);
        }
      }
    };
    let toggleBtn = document.createElement("div");
    toggleBtn.className = "dy-top-btn";
    toggleBtn.id = "dy-toggle-bar-btn";
    if (isGlobalCol && container) {
      container.classList.add("dy-bar-collapsed");
      document.body.classList.add("dy-global-collapsed");
    }
    let btnsContainer = document.createElement("div");
    btnsContainer.id = "dy-btns-container";
    btnsContainer.style.cssText =
      "display:flex; gap:10px; overflow:hidden; transition:max-width 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease;";
    if (isBtnCol || isGlobalCol) {
      btnsContainer.style.maxWidth = "0px";
      btnsContainer.style.opacity = "0";
    } else {
      btnsContainer.style.maxWidth = "500px";
      btnsContainer.style.opacity = "1";
    }
    btnsContainer.appendChild(noticeBtn);
    btnsContainer.appendChild(editBtn);
    const updateDisplay = () => {
      if (isGlobalCol) {
        if (container) container.classList.add("dy-bar-collapsed");
        document.body.classList.add("dy-global-collapsed");
        btnsContainer.style.maxWidth = "0px";
        btnsContainer.style.opacity = "0";
        btnsContainer.style.pointerEvents = "none";
        toggleBtn.innerHTML =
          '<span class="dy-btn-icon">🔽</span><span class="dy-btn-txt">展开</span>';
      } else {
        if (container) container.classList.remove("dy-bar-collapsed");
        document.body.classList.remove("dy-global-collapsed");
        if (isBtnCol) {
          btnsContainer.style.maxWidth = "0px";
          btnsContainer.style.opacity = "0";
          btnsContainer.style.pointerEvents = "none";
          toggleBtn.innerHTML =
            '<span class="dy-btn-icon">◀️</span><span class="dy-btn-txt">展开</span>';
        } else {
          btnsContainer.style.maxWidth = "500px";
          btnsContainer.style.opacity = "1";
          btnsContainer.style.pointerEvents = "auto";
          toggleBtn.innerHTML =
            '<span class="dy-btn-icon">🔼</span><span class="dy-btn-txt">收起</span>';
        }
      }
    };
    updateDisplay();
    let pressTimer;
    let isPointerDown = false;
    let hasLongPressed = false;
    toggleBtn.onpointerdown = function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      isPointerDown = true;
      hasLongPressed = false;
      if (toggleBtn.setPointerCapture) toggleBtn.setPointerCapture(e.pointerId);
      pressTimer = setTimeout(() => {
        if (!isPointerDown) return;
        hasLongPressed = true;
        isGlobalCol = !isGlobalCol;
        localStorage.setItem(
          "daoyuan_bar_collapsed",
          isGlobalCol ? "true" : "false",
        );
        if (isGlobalCol) {
          let dd = document.getElementById("hero-info-dropdown");
          if (dd) dd.classList.remove("show");
          isBtnCol = true;
          localStorage.setItem("daoyuan_btns_collapsed", "true");
        }
        updateDisplay();
      }, 500);
    };
    toggleBtn.onpointerup = function (e) {
      if (!isPointerDown) return;
      isPointerDown = false;
      clearTimeout(pressTimer);
      if (toggleBtn.releasePointerCapture)
        toggleBtn.releasePointerCapture(e.pointerId);
      if (!hasLongPressed) {
        if (isGlobalCol) {
          isGlobalCol = false;
          isBtnCol = false;
          localStorage.setItem("daoyuan_bar_collapsed", "false");
          localStorage.setItem("daoyuan_btns_collapsed", "false");
        } else {
          isBtnCol = !isBtnCol;
          localStorage.setItem(
            "daoyuan_btns_collapsed",
            isBtnCol ? "true" : "false",
          );
        }
        updateDisplay();
      }
    };
    toggleBtn.onpointercancel = function (e) {
      isPointerDown = false;
      clearTimeout(pressTimer);
    };
    rightContainer.appendChild(btnsContainer);
    rightContainer.appendChild(toggleBtn);
    header.appendChild(rightContainer);
    window.loadRemoteNotice();
  }
  cleanUpUnwantedUI();
}, 1500);
$(window.errorCatched(init));
