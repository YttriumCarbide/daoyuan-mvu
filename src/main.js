/* 预设的人物立绘映射表 (已转为云端加载) */
var charPortraits = {};
var charPortraitsFemale = {};
window.specialPortraits = {};

window.loadRemotePortraits = async function () {
  const val = (obj) => {
    if (typeof obj !== "object" || obj === null) return {};
    let r = {};
    for (let k in obj) {
      if (typeof obj[k] === "string") {
        let vp = obj[k]
          .split("|")
          .filter(
            (p) =>
              p.trim().startsWith("http") || p.trim().startsWith("data:image"),
          );
        if (vp.length > 0) r[k] = vp.join("|");
      }
    }
    return r;
  };
  try {
    const url =
      "https://cdn.jsdelivr.net/gh/YttriumCarbide/Daoyuan@main/portraits.json";
    const response = await fetch(url + "?t=" + new Date().getTime());
    if (response.ok) {
      const data = await response.json();
      if (data.charPortraits) charPortraits = val(data.charPortraits);
      if (data.charPortraitsFemale)
        charPortraitsFemale = val(data.charPortraitsFemale);
      if (data.specialPortraits)
        window.specialPortraits = val(data.specialPortraits);
      console.log("[道渊状态栏] 云端立绘配置加载成功");
    }
  } catch (e) {
    console.error("[道渊状态栏] 获取云端立绘失败:", e);
  }
  try {
    const saved = localStorage.getItem("daoyuan_custom_portraits");
    if (saved) {
      Object.assign(charPortraits, val(JSON.parse(saved)));
    }
    const savedFem = localStorage.getItem("daoyuan_custom_portraits_female");
    if (savedFem) {
      Object.assign(charPortraitsFemale, val(JSON.parse(savedFem)));
    }
    const savedSpec = localStorage.getItem("daoyuan_custom_portraits_special");
    if (savedSpec) {
      Object.assign(window.specialPortraits, val(JSON.parse(savedSpec)));
    }
  } catch (e) {
    console.warn("[道渊] 加载自定义立绘失败:", e);
  }
};
window.preloadPortraits = function (name) {
  let urls = [];
  let cp = {};
  try {
    let s = localStorage.getItem("daoyuan_custom_portraits");
    if (s) cp = JSON.parse(s);
  } catch (e) {}
  let base =
    cp[name] ||
    (typeof charPortraits !== "undefined" ? charPortraits[name] : "");
  if (base) {
    base.split("|").forEach((u) => {
      if (u) urls.push(u);
    });
  }
  if (typeof charPortraitsFemale !== "undefined" && charPortraitsFemale[name])
    urls.push(charPortraitsFemale[name]);
  if (window.specialPortraits && window.specialPortraits[name])
    urls.push(window.specialPortraits[name]);
  urls.forEach((u) => {
    if (u && !window.dy_preloaded[u]) {
      let img = new Image();
      img.src = u;
      window.dy_preloaded[u] = true;
    }
  });
};
$(document).on(
  "click",
  ".partner-header, .npc-header, .portrait-toggle-btn",
  function () {
    let card = $(this).closest(
      "[data-partner], [data-npc], [data-pet], [data-beauty]",
    );
    if (card.length) {
      let n =
        card.attr("data-partner") ||
        card.attr("data-npc") ||
        card.attr("data-pet") ||
        card.attr("data-beauty");
      if (n) window.preloadPortraits(n);
    }
  },
);
window.updatePortraitView = function (name, newSrc) {
  document
    .querySelectorAll(
      `[data-partner='${name}'], [data-npc='${name}'], [data-pet='${name}'], [data-beauty='${name}']`,
    )
    .forEach((c) => {
      let img = c.querySelector(".large-portrait img");
      let p = c.querySelector(".large-portrait");
      let btn = c.querySelector(".portrait-toggle-btn");
      if (img) {
        if (p) {
          p.classList.remove("show");
          if (btn) btn.innerHTML = "查看立绘 ▼";
        }
        img.onload = () => {
          if (p) {
            p.classList.add("show");
            if (btn) btn.innerHTML = "收起立绘 ▲";
          }
          img.onload = null;
        };
        img.onerror = () => {
          if (p) {
            p.classList.add("show");
            if (btn) btn.innerHTML = "收起立绘 ▲";
          }
          img.src =
            "https://via.placeholder.com/400x600/1a181d/ff4d4d?text=加载失败";
          img.onerror = null;
        };
        img.src = newSrc;
        img.dataset.src = newSrc;
      }
    });
  let listItem = document.querySelector(
    `.wx-list-item[data-name='${name}'] img.portrait-img`,
  );
  if (listItem) {
    listItem.src = newSrc;
    listItem.dataset.src = newSrc;
  }
  if (window.currentActiveChat === name) {
    let bg = document.getElementById("wx-chat-bg");
    if (bg) bg.style.backgroundImage = `url('${newSrc}')`;
  }
};
window.showSpecialPortrait = function (name) {
  let special = window.specialPortraits ? window.specialPortraits[name] : "";
  if (!special) return;
  let arr = special.split("|");
  let c = document.querySelector(
    `[data-partner='${name}'], [data-npc='${name}'], [data-pet='${name}'], [data-beauty='${name}']`,
  );
  let img = c ? c.querySelector(".large-portrait img") : null;
  if (img && arr.includes(img.dataset.src)) {
    let cp = {};
    try {
      let s = localStorage.getItem("daoyuan_custom_portraits");
      if (s) cp = JSON.parse(s);
    } catch (e) {}
    let base =
      cp[name] ||
      (typeof charPortraits !== "undefined" ? charPortraits[name] : "");
    window.updatePortraitView(name, base ? base.split("|")[0] : "");
  } else {
    window.updatePortraitView(name, arr[0]);
  }
};
window.switchPortrait = function (name) {
  let c = document.querySelector(
    `[data-partner='${name}'], [data-npc='${name}'], [data-pet='${name}'], [data-beauty='${name}']`,
  );
  let img = c ? c.querySelector(".large-portrait img") : null;
  let cur = img ? img.dataset.src : "";
  let cp = {};
  try {
    let s = localStorage.getItem("daoyuan_custom_portraits");
    if (s) cp = JSON.parse(s);
  } catch (e) {}
  let norm =
    cp[name] ||
    (typeof charPortraits !== "undefined" ? charPortraits[name] : "");
  let cpf = {};
  try {
    let s = localStorage.getItem("daoyuan_custom_portraits_female");
    if (s) cpf = JSON.parse(s);
  } catch (e) {}
  let fem =
    cpf[name] ||
    (typeof charPortraitsFemale !== "undefined"
      ? charPortraitsFemale[name]
      : "");
  let cps = {};
  try {
    let s = localStorage.getItem("daoyuan_custom_portraits_special");
    if (s) cps = JSON.parse(s);
  } catch (e) {}
  let spec =
    cps[name] || (window.specialPortraits ? window.specialPortraits[name] : "");
  const cycle = (str, key, mem) => {
    if (!str || !str.includes("|")) return false;
    let arr = str.split("|");
    if (!arr.includes(cur)) return false;
    arr.push(arr.shift());
    let nStr = arr.join("|");
    let st = {};
    try {
      let s = localStorage.getItem(key);
      if (s) st = JSON.parse(s);
    } catch (e) {}
    st[name] = nStr;
    localStorage.setItem(key, JSON.stringify(st));
    if (mem) mem[name] = nStr;
    window.updatePortraitView(name, arr[0]);
    return true;
  };
  let done = false;
  if (fem && fem.split("|").includes(cur))
    done = cycle(
      fem,
      "daoyuan_custom_portraits_female",
      typeof charPortraitsFemale !== "undefined" ? charPortraitsFemale : null,
    );
  else if (spec && spec.split("|").includes(cur))
    done = cycle(
      spec,
      "daoyuan_custom_portraits_special",
      window.specialPortraits,
    );
  else done = cycle(norm, "daoyuan_custom_portraits", cp);
  if (!done) alert("当前立绘状态下没有配置多张图片，无法轮切！");
};
window.toggleFemalePortrait = function (name) {
  let femSrc =
    typeof charPortraitsFemale !== "undefined" ? charPortraitsFemale[name] : "";
  if (!femSrc) return;
  let arr = femSrc.split("|");
  let c = document.querySelector(
    `[data-partner='${name}'], [data-npc='${name}'], [data-pet='${name}'], [data-beauty='${name}']`,
  );
  let img = c ? c.querySelector(".large-portrait img") : null;
  if (img && arr.includes(img.dataset.src)) {
    let cp = {};
    try {
      let s = localStorage.getItem("daoyuan_custom_portraits");
      if (s) cp = JSON.parse(s);
    } catch (e) {}
    let base =
      cp[name] ||
      (typeof charPortraits !== "undefined" ? charPortraits[name] : "");
    window.updatePortraitView(name, base ? base.split("|")[0] : "");
  } else {
    window.updatePortraitView(name, arr[0]);
  }
};
window.executeShowLoreByName = async function (name) {
  let t = document.getElementById("faction-modal-title");
  let n = document.getElementById("faction-modal-note");
  let o = document.getElementById("faction-modal-overlay");
  if (!t || !n || !o) return;
  t.textContent = "🔮 正在探查【" + name + "】的天机...";
  n.innerHTML =
    '<div style="color:var(--accent-mana);text-align:center;padding:20px;">正在翻阅世界书，请稍候...</div>';
  o.style.display = "flex";
  try {
    if (typeof getLorebookEntries != "function") {
      n.innerHTML =
        '<span style="color:var(--accent-blood);">当前环境不支持世界书接口。</span>';
      return;
    }
    let lbs = new Set();
    if (typeof getOrCreateChatLorebook == "function") {
      try {
        let b = await getOrCreateChatLorebook();
        if (b) lbs.add(b);
      } catch (e) {}
    }
    if (typeof getCurrentCharPrimaryLorebook == "function") {
      try {
        let b = await getCurrentCharPrimaryLorebook();
        if (b) lbs.add(b);
      } catch (e) {}
    }
    if (typeof getCharLorebooks == "function") {
      try {
        let b = await getCharLorebooks({ name: name });
        if (b) b.forEach((x) => lbs.add(x));
      } catch (e) {}
    }
    let content = "";
    for (let lb of lbs) {
      try {
        let entries = await getLorebookEntries(lb, {
          fields: ["comment", "key", "content"],
        });
        if (entries) {
          let match = entries.find(
            (e) =>
              (e.key &&
                e.key.some((k) => k.toLowerCase() === name.toLowerCase())) ||
              (e.comment && e.comment.includes(name)),
          );
          if (match && match.content) {
            content = match.content;
            break;
          }
        }
      } catch (e) {}
    }
    if (content) {
      t.textContent = "✨【" + name + "】· 天机命理";
      n.innerHTML =
        '<div style="text-align:left;white-space:pre-wrap;line-height:1.6;color:#dcdde1;max-height:60vh;overflow-y:auto;padding-right:5px;">' +
        content
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;") +
        "</div>";
    } else {
      t.textContent = "❌【" + name + "】";
      n.innerHTML =
        '<div style="text-align:center;padding:20px;color:var(--text-dim);">天机迷雾遮掩，未能在世界书中探查到此人的命理。</div>';
    }
  } catch (err) {
    t.textContent = "❌ 探查失败";
    n.innerHTML = err.message;
  }
};
window.showLoreByName = function (name) {
  let stat = {};
  try {
    stat = getAllVariables().stat_data || {};
  } catch (e) {}
  let hn = stat.主角 && stat.主角.姓名 ? stat.主角.姓名 : "unknown";
  let wk = "dy_lore_warn_" + hn;
  if (localStorage.getItem(wk) === "1") {
    window.executeShowLoreByName(name);
    return;
  }
  let wm = document.getElementById("lore-warn-modal");
  if (!wm) {
    wm = document.createElement("div");
    wm.id = "lore-warn-modal";
    wm.style.cssText =
      "display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:100000;justify-content:center;align-items:center;backdrop-filter:blur(5px);";
    wm.innerHTML =
      '<div style="background:linear-gradient(145deg,rgba(30,10,10,0.95),rgba(15,5,5,0.98));border:1px solid var(--accent-blood);border-radius:12px;width:80%;max-width:320px;padding:25px;box-shadow:0 0 40px rgba(255,77,77,0.4);text-align:center;position:relative;animation:fadeIn 0.2s ease;"><div style="color:var(--accent-blood);font-size:1.3em;font-weight:bold;margin-bottom:15px;text-shadow:0 0 10px rgba(255,77,77,0.5);letter-spacing:2px;">⚠️ 查看角色设定</div><div style="color:var(--text-main);font-size:1em;line-height:1.6;margin-bottom:20px;">注意！查看此角色的设定可能会包含<span style="color:var(--accent-exp);font-weight:bold;text-shadow:0 0 5px rgba(255,159,67,0.5);">【剧透内容】</span>。<br>提前了解设定可能会降低剧情探索的乐趣。<br><br><span style="color:var(--text-dim);font-size:0.9em;">是否确定要查看？</span></div><label style="display:flex;align-items:center;justify-content:center;gap:8px;color:var(--text-dim);font-size:0.85em;cursor:pointer;margin-bottom:6px;"><input type="checkbox" id="lore-warn-cb" style="accent-color:var(--accent-blood);width:16px;height:16px;cursor:pointer;"><span>不再提示 (当前角色档案)</span></label><div style="font-size:0.75em;color:var(--accent-mana);margin-bottom:20px;opacity:0.8;">注：如果修改了主角姓名，此提示会重新出现。</div><div style="display:flex;gap:15px;justify-content:center;"><button id="lore-warn-no" style="flex:1;background:rgba(255,255,255,0.1);color:var(--text-dim);border:1px solid rgba(255,255,255,0.2);padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;transition:all 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.1)\'">取消</button><button id="lore-warn-yes" style="flex:1;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 2px 10px rgba(255,77,77,0.4);transition:all 0.2s;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\';">确定查看</button></div></div>';
    document.body.appendChild(wm);
  }
  wm.style.display = "flex";
  document.getElementById("lore-warn-cb").checked = false;
  document.getElementById("lore-warn-no").onclick = function () {
    wm.style.display = "none";
  };
  document.getElementById("lore-warn-yes").onclick = function () {
    if (document.getElementById("lore-warn-cb").checked) {
      localStorage.setItem(wk, "1");
    }
    wm.style.display = "none";
    window.executeShowLoreByName(name);
  };
};
window.injectLoreClicks = function () {
  document
    .querySelectorAll(".partner-card[data-partner] .partner-name")
    .forEach((el) => {
      if (el.dataset.loreBound) return;
      el.dataset.loreBound = "true";
      el.style.cursor = "pointer";
      el.style.color = "var(--accent-gold)";
      el.title = "点击探查天机";
      let n = el.closest("[data-partner]").dataset.partner;
      el.onclick = function (e) {
        e.stopPropagation();
        window.showLoreByName(n);
      };
    });
  document.querySelectorAll(".npc-card[data-npc] .npc-name").forEach((el) => {
    if (el.dataset.loreBound) return;
    el.dataset.loreBound = "true";
    el.style.cursor = "pointer";
    el.style.color = "var(--accent-gold)";
    el.title = "点击探查天机";
    let n = el.closest("[data-npc]").dataset.npc;
    el.onclick = function (e) {
      e.stopPropagation();
      window.showLoreByName(n);
    };
  });
  document
    .querySelectorAll(".partner-card[data-pet] .partner-name")
    .forEach((el) => {
      if (el.dataset.loreBound) return;
      el.dataset.loreBound = "true";
      el.style.cursor = "pointer";
      el.style.color = "var(--accent-gold)";
      el.title = "点击探查天机";
      let n = el.closest("[data-pet]").dataset.pet;
      el.onclick = function (e) {
        e.stopPropagation();
        window.showLoreByName(n);
      };
    });
  document.querySelectorAll(".info-card[data-beauty]").forEach((card) => {
    let el = card.querySelector(".info-title span:first-child");
    if (!el || el.dataset.loreBound) return;
    el.dataset.loreBound = "true";
    el.style.cursor = "pointer";
    el.title = "点击探查天机";
    let n = card.dataset.beauty;
    el.onclick = function (e) {
      e.stopPropagation();
      window.showLoreByName(n);
    };
  });
};
window.searchAndShowPortrait = function () {
  let k = document.getElementById("portrait-search-input").value.trim();
  let r = document.getElementById("portrait-search-result");
  if (!k) {
    r.style.display = "none";
    return;
  }
  let cp = {};
  try {
    let s = localStorage.getItem("daoyuan_custom_portraits");
    if (s) cp = JSON.parse(s);
  } catch (e) {}
  let all = new Set();
  Object.keys(cp).forEach((x) => all.add(x));
  if (typeof charPortraits !== "undefined")
    Object.keys(charPortraits).forEach((x) => all.add(x));
  if (typeof charPortraitsFemale !== "undefined")
    Object.keys(charPortraitsFemale).forEach((x) => all.add(x));
  if (window.specialPortraits)
    Object.keys(window.specialPortraits).forEach((x) => all.add(x));
  let allArr = Array.from(all);
  let matched =
    k === "随机"
      ? [allArr[Math.floor(Math.random() * allArr.length)]]
      : allArr.filter((x) => x.includes(k));
  if (matched.length === 0) {
    r.style.display = "block";
    r.innerHTML =
      '<div style="color:var(--accent-blood);text-align:center;padding:10px;">未找到包含【' +
      k +
      "】的立绘记录。</div>";
    return;
  }
  let stat = {};
  try {
    stat = getAllVariables().stat_data || {};
  } catch (e) {}
  let html = "";
  matched.forEach((n) => {
    let p =
      (stat.道侣 && stat.道侣[n]) ||
      (stat.人物 && stat.人物[n]) ||
      (stat.灵宠 && stat.灵宠[n]) ||
      (stat.绝色榜 && stat.绝色榜[n]) ||
      {};
    let pUrl = "";
    if (typeof getPortraitUrl === "function") pUrl = getPortraitUrl(n, p.性别);
    if (!pUrl) {
      let base =
        cp[n] || (typeof charPortraits !== "undefined" ? charPortraits[n] : "");
      pUrl = base ? base.split("|")[0] : "";
      if (
        !pUrl &&
        typeof charPortraitsFemale !== "undefined" &&
        charPortraitsFemale[n]
      )
        pUrl = charPortraitsFemale[n];
    }
    let safeN = String(n).replace(/"/g, "&quot;");
    html +=
      '<div class="info-card" data-beauty="' +
      safeN +
      '" style="border-color:rgba(217,128,250,0.5);background:rgba(0,0,0,0.4);margin-bottom:10px;box-shadow:inset 0 0 10px rgba(217,128,250,0.1);"><div class="info-title"><span style="color:var(--rare-text);cursor:pointer;text-decoration:none;" onclick="event.stopPropagation(); window.showLoreByName(\'' +
      safeN +
      '\');" title="点击探查天机">' +
      safeN +
      '</span><span style="font-size:0.8em;color:var(--text-dim)">查阅结果</span></div><div class="portrait-wrapper"><div style="display:flex;gap:6px;align-items:center;"><div class="portrait-toggle-btn" style="flex:1;" onclick="const px=this.parentElement.nextElementSibling;const img=px.querySelector(\'img\');if(!img.src){img.src=img.dataset.src;}px.classList.toggle(\'show\');this.innerHTML=px.classList.contains(\'show\')?\'收起立绘 ▲\':\'查看立绘 ▼\';">查看立绘 ▼</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog(\'' +
      safeN +
      '\');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait(\'' +
      safeN +
      '\');" title="切换立绘">🔄</div></div><div class="large-portrait"><img data-src="' +
      pUrl +
      '" alt="' +
      safeN +
      '"></div></div></div>';
  });
  r.innerHTML = html;
  r.style.display = "block";
  if (window.injectHeartButtons) window.injectHeartButtons();
};
window.injectHeartButtons = function () {
  let stat = {};
  try {
    stat = getAllVariables().stat_data || {};
  } catch (e) {}
  if (!document.getElementById("c-btn-anim")) {
    let s = document.createElement("style");
    s.id = "c-btn-anim";
    s.innerHTML =
      "@keyframes hBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}} @keyframes fFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}} .btn-heart{animation:hBeat 1.5s infinite} .btn-gender{animation:fFloat 2.5s infinite ease-in-out}";
    document.head.appendChild(s);
  }
  document.querySelectorAll(".portrait-wrapper").forEach((w) => {
    let c = w.closest("[data-partner], [data-npc], [data-pet], [data-beauty]");
    if (!c) return;
    let n =
      c.dataset.partner || c.dataset.npc || c.dataset.pet || c.dataset.beauty;
    let p =
      (stat.道侣 && stat.道侣[n]) ||
      (stat.人物 && stat.人物[n]) ||
      (stat.灵宠 && stat.灵宠[n]) ||
      (stat.绝色榜 && stat.绝色榜[n]) ||
      {};
    let bc = w.firstElementChild;
    if (!bc) return;
    if (window.specialPortraits && window.specialPortraits[n]) {
      let f = parseFloat(p.亲密 || p.好感 || p.亲密度 || p.好感度 || 0);
      if (f > 90 && !w.querySelector(".btn-heart")) {
        let hb = document.createElement("div");
        hb.className = "portrait-custom-btn btn-heart";
        hb.style.color = "#ff69b4";
        hb.style.borderColor = "#ff69b4";
        hb.title = "心动立绘";
        hb.innerHTML = "💖";
        hb.onclick = function (e) {
          e.stopPropagation();
          window.showSpecialPortrait(n);
        };
        bc.appendChild(hb);
      }
    }
    if (
      typeof charPortraitsFemale !== "undefined" &&
      charPortraitsFemale[n] &&
      !w.querySelector(".btn-gender")
    ) {
      let gb = document.createElement("div");
      gb.className = "portrait-custom-btn btn-gender";
      gb.style.color = "#d980fa";
      gb.style.borderColor = "#d980fa";
      gb.title = "性转立绘";
      gb.innerHTML = "♀️";
      gb.onclick = function (e) {
        e.stopPropagation();
        window.toggleFemalePortrait(n);
      };
      bc.appendChild(gb);
    }
  });
};

/* 获取立绘URL（支持多图切换和玉简同步） */
function getPortraitUrl(name, gender) {
  try {
    const saved = localStorage.getItem("daoyuan_custom_portraits");
    if (saved) {
      const cp = JSON.parse(saved);
      if (cp[name]) return cp[name].split("|")[0];
    }
  } catch (e) {}
  if (charPortraitsFemale[name] && gender && /^女/.test(gender)) {
    return String(charPortraitsFemale[name]).split("|")[0];
  }
  return charPortraits[name]
    ? String(charPortraits[name]).split("|")[0]
    : undefined;
}

/* 保存自定义立绘到 localStorage */
window.saveCustomPortrait = function (name, url) {
  try {
    let customPortraits = {};
    const saved = localStorage.getItem("daoyuan_custom_portraits");
    if (saved) {
      customPortraits = JSON.parse(saved);
    }
    customPortraits[name] = url;
    const dataStr = JSON.stringify(customPortraits);
    if (url && url.startsWith("data:") && url.length > 2 * 1024 * 1024) {
      console.warn(
        "[道渊] 单张立绘过大(" +
          (url.length / 1024 / 1024).toFixed(1) +
          "MB)，建议压缩图片或使用图床",
      );
    }
    if (dataStr.length > 3 * 1024 * 1024) {
      alert(
        "⚠️ 立绘数据过大（" +
          (dataStr.length / 1024 / 1024).toFixed(1) +
          "MB），已接近localStorage上限(5MB)。建议使用图床URL而非本地图片，或删除部分自定义立绘。",
      );
    }
    if (dataStr.length > 4.5 * 1024 * 1024) {
      alert(
        "⚠️ 立绘数据超过4.5MB，localStorage可能无法保存！请立即使用图床URL替代本地图片。",
      );
      return false;
    }
    localStorage.setItem("daoyuan_custom_portraits", dataStr);
    charPortraits[name] = url;
    if (typeof populateCharacterData === "function") {
      populateCharacterData();
    }
    return true;
  } catch (e) {
    console.warn("[道渊] 保存自定义立绘失败:", e);
    if (e.name === "QuotaExceededError") {
      alert(
        "⚠️ 存储空间不足！本地图片过多，请使用图床URL（如 catbox.moe）替代，或删除一些不需要的自定义立绘。",
      );
    } else {
      alert("保存失败：" + e.message);
    }
    return false;
  }
};

/* 处理本地图片上传 */
window.handlePortraitFileUpload = function (fileInput, charName) {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("图片文件过大，请选择小于5MB的图片（建议使用图床URL）");
    return;
  }
  if (!file.type.startsWith("image/")) {
    alert("请选择有效的图片文件");
    return;
  }
  const fileNameSpan = document.getElementById("portrait-file-name");
  if (fileNameSpan) {
    fileNameSpan.textContent =
      "📷 " + file.name + " (" + (file.size / 1024).toFixed(1) + "KB)";
    fileNameSpan.style.color = "#64ff8a";
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const base64 = e.target.result;
    const previewImg = document.getElementById("portrait-preview-img");
    if (previewImg) {
      previewImg.src = base64;
      previewImg.classList.add("show");
      previewImg.onerror = null;
    }
    const urlInput = document.getElementById("portrait-url-input");
    if (urlInput) {
      urlInput.value = base64;
    }
  };
  reader.readAsDataURL(file);
};

/* 删除自定义立绘（恢复默认） */
window.removeCustomPortrait = function (name) {
  try {
    let customPortraits = {};
    const saved = localStorage.getItem("daoyuan_custom_portraits");
    if (saved) {
      customPortraits = JSON.parse(saved);
    }
    delete customPortraits[name];
    localStorage.setItem(
      "daoyuan_custom_portraits",
      JSON.stringify(customPortraits),
    );
    if (typeof populateCharacterData === "function") {
      populateCharacterData();
    }
    return true;
  } catch (e) {
    console.warn("[道渊] 删除自定义立绘失败:", e);
    return false;
  }
};

/* 打开自定义立绘弹窗 */
window.openCustomPortraitDialog = function (charName, mode) {
  mode = mode || "normal";
  var existing = document.getElementById("portrait-custom-modal");
  if (existing && !mode.startsWith("_keep")) existing.remove();
  if (mode.startsWith("_keep")) mode = mode.replace("_keep", "");
  var currentUrl = charPortraits[charName] || "";
  if (mode === "female") currentUrl = charPortraitsFemale[charName] || "";
  if (mode === "special") currentUrl = window.specialPortraits[charName] || "";
  var isCustom = false;
  try {
    var key = "daoyuan_custom_portraits";
    if (mode === "female") key = "daoyuan_custom_portraits_female";
    if (mode === "special") key = "daoyuan_custom_portraits_special";
    var saved = localStorage.getItem(key);
    if (saved) {
      var cp = JSON.parse(saved);
      isCustom = cp.hasOwnProperty(charName);
    }
  } catch (e) {}
  var modal =
    document.getElementById("portrait-custom-modal") ||
    document.createElement("div");
  modal.id = "portrait-custom-modal";
  modal.className = "portrait-custom-modal show";
  var subBtnsHtml = "";
  if (charName in charPortraitsFemale && mode !== "female") {
    subBtnsHtml += `<button class="btn-rst-all" style="position:static;background:rgba(217,128,250,0.15);color:var(--rare-text);border:1px solid var(--rare-text);margin-right:6px;" onclick="event.stopPropagation();window.openCustomPortraitDialog('${charName}','_keepfemale')">♀️ 性转配置</button>`;
  }
  if (
    window.specialPortraits &&
    charName in window.specialPortraits &&
    mode !== "special"
  ) {
    subBtnsHtml += `<button class="btn-rst-all" style="position:static;background:rgba(255,105,180,0.15);color:#ff69b4;border:1px solid #ff69b4;margin-right:6px;" onclick="event.stopPropagation();let stat={};try{stat=getAllVariables().stat_data||{};}catch(ex){}let p=(stat.道侣&&stat.道侣['${charName}'])||(stat.人物&&stat.人物['${charName}'])||(stat.灵宠&&stat.灵宠['${charName}'])||(stat.绝色榜&&stat.绝色榜['${charName}'])||{};let f=parseFloat(p.亲密||p.好感||p.亲密度||p.好感度||0);if(f<90){alert('好感度不足，无法解锁该立绘配置！');}else{window.openCustomPortraitDialog('${charName}','_keepspecial');}">💖 心动配置</button>`;
  }
  if (mode !== "normal") {
    subBtnsHtml += `<button class="btn-rst-all" style="position:static;background:rgba(100,180,255,0.15);color:#64b4ff;border:1px solid #64b4ff;margin-right:6px;" onclick="event.stopPropagation();window.openCustomPortraitDialog('${charName}','_keepnormal')">⬅️ 返回常规</button>`;
  }
  var titleText = `✨ 设定灵容 · ${charName}`;
  if (mode === "female") titleText = `♀️ 设定性转灵容 · ${charName}`;
  if (mode === "special") titleText = `💖 设定心动灵容 · ${charName}`;
  modal.innerHTML = `<div class="portrait-custom-dialog"><div style="position:absolute;top:15px;right:15px;display:flex;align-items:center;z-index:100;">${subBtnsHtml}<button class="btn-rst-all" id="btn-rst-all" style="position:static;">⚠️ 重置全员</button></div><h3>${titleText}</h3><div class="portrait-preview-wrapper"><img class="portrait-preview" id="portrait-preview-img" style="display:none;" onerror="this.classList.remove('show');this.style.display='none'"></div><div style="display:flex;gap:8px;align-items:stretch;margin-bottom:12px;"><label for="portrait-file-input" style="background:rgba(255,215,0,0.05);border:1px dashed var(--accent-gold);color:var(--accent-gold);padding:8px 16px;border-radius:6px;cursor:pointer;display:flex;align-items:center;">📁 本地图片</label><input type="file" id="portrait-file-input" accept="image/*" style="display:none;"><span id="portrait-file-name" style="flex:1;display:flex;align-items:center;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:0 10px;color:var(--text-dim);font-size:0.8em;overflow:hidden;white-space:nowrap;">未选择文件...</span></div><label style="color:var(--text-dim);font-size:0.9em;margin-bottom:5px;display:block;">图床URL地址</label><div id="url-inputs-container"></div>${mode === "normal" ? '<div class="btn-add-url" id="btn-add-url">➕ 添加多张立绘 (无缝切换)</div><div style="font-size:0.8em;color:var(--text-dim);font-style:italic;margin-bottom:12px;text-align:center;">💡 空白栏位将被自动忽略，系统会自动用竖线拼接。</div>' : ""}<div style="display:flex;gap:10px;justify-content:center;"><button class="btn-confirm" id="portrait-confirm-btn">✅ 确认保存</button>${isCustom ? '<button class="btn-reset" id="portrait-reset-btn">🔄 恢复默认</button>' : ""}<button class="btn-cancel" id="portrait-cancel-btn">取消</button></div></div>`;
  if (!document.getElementById("portrait-custom-modal"))
    document.body.appendChild(modal);
  var container = modal.querySelector("#url-inputs-container");
  var previewImgEl = modal.querySelector("#portrait-preview-img");
  var urls = currentUrl ? currentUrl.split("|") : [""];
  if (mode !== "normal" && urls.length > 1) urls = [urls[0]];
  if (urls.length === 0) urls = [""];
  function renderInputs() {
    container.innerHTML = "";
    urls.forEach(function (u, idx) {
      var row = document.createElement("div");
      row.className = "url-input-row";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = "粘贴图床链接...";
      inp.value = u;
      inp.addEventListener("input", function () {
        var val = this.value.trim();
        if (val) {
          previewImgEl.src = val;
          previewImgEl.classList.add("show");
          previewImgEl.style.display = "block";
        } else {
          previewImgEl.classList.remove("show");
          previewImgEl.style.display = "none";
        }
      });
      row.appendChild(inp);
      if (urls.length > 1) {
        var delBtn = document.createElement("button");
        delBtn.className = "btn-remove-url";
        delBtn.innerHTML = "✖";
        delBtn.onclick = function () {
          var inputs = container.querySelectorAll("input");
          urls = [];
          inputs.forEach(function (item, i) {
            if (i !== idx) urls.push(item.value);
          });
          if (urls.length === 0) urls = [""];
          renderInputs();
        };
        row.appendChild(delBtn);
      }
      container.appendChild(row);
    });
  }
  renderInputs();
  if (urls[0]) {
    previewImgEl.src = urls[0];
    previewImgEl.classList.add("show");
    previewImgEl.style.display = "block";
  }
  var _addBtn = modal.querySelector("#btn-add-url");
  if (_addBtn) {
    _addBtn.addEventListener("click", function () {
      var inputs = container.querySelectorAll("input");
      urls = [];
      inputs.forEach(function (i) {
        urls.push(i.value);
      });
      urls.push("");
      renderInputs();
    });
  }
  var fileInput = modal.querySelector("#portrait-file-input");
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("图片文件过大");
        return;
      }
      var fn = modal.querySelector("#portrait-file-name");
      if (fn) {
        fn.textContent = "📷 " + file.name;
        fn.style.color = "#64ff8a";
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var b = e.target.result;
        previewImgEl.src = b;
        previewImgEl.classList.add("show");
        previewImgEl.style.display = "block";
        var firstInp = container.querySelector("input");
        if (firstInp) firstInp.value = b;
      };
      reader.readAsDataURL(file);
    });
  }
  modal
    .querySelector("#portrait-confirm-btn")
    .addEventListener("click", function () {
      var inputs = container.querySelectorAll("input");
      var validUrls = [];
      inputs.forEach(function (i) {
        var v = i.value.trim();
        if (v !== "") validUrls.push(v);
      });
      if (validUrls.length === 0) {
        alert("请输入至少一个有效的图片URL");
        return;
      }
      var finalUrl =
        mode === "normal" ? validUrls.join("|") : validUrls[0].split("|")[0];
      if (mode === "normal") {
        if (window.saveCustomPortrait(charName, finalUrl)) {
          modal.remove();
        } else {
          alert("保存失败，请重试");
        }
      } else {
        try {
          var k =
            mode === "female"
              ? "daoyuan_custom_portraits_female"
              : "daoyuan_custom_portraits_special";
          let cp = {};
          const s = localStorage.getItem(k);
          if (s) cp = JSON.parse(s);
          cp[charName] = finalUrl;
          localStorage.setItem(k, JSON.stringify(cp));
          if (mode === "female") charPortraitsFemale[charName] = finalUrl;
          else window.specialPortraits[charName] = finalUrl;
          window.updatePortraitView(charName, validUrls[0]);
          modal.remove();
        } catch (ex) {
          alert("保存失败：" + ex.message);
        }
      }
    });
  modal
    .querySelector("#portrait-cancel-btn")
    .addEventListener("click", function () {
      modal.remove();
    });
  var resetBtn = modal.querySelector("#portrait-reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (confirm("确定要恢复默认立绘吗？")) {
        if (mode === "normal") {
          window.removeCustomPortrait(charName);
        } else {
          var k =
            mode === "female"
              ? "daoyuan_custom_portraits_female"
              : "daoyuan_custom_portraits_special";
          try {
            let cp = {};
            const s = localStorage.getItem(k);
            if (s) cp = JSON.parse(s);
            delete cp[charName];
            localStorage.setItem(k, JSON.stringify(cp));
          } catch (ex) {}
        }
        modal.remove();
        if (confirm("是否立即刷新页面以生效？")) location.reload();
      }
    });
  }
  modal.querySelector("#btn-rst-all").addEventListener("click", function (e) {
    e.stopPropagation();
    let cm = document.createElement("div");
    cm.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(3px);";
    cm.innerHTML =
      '<div style="background:var(--bg-dark);border:1px solid var(--accent-blood);padding:25px;border-radius:10px;text-align:center;width:80%;max-width:300px;box-shadow:0 0 20px rgba(255,77,77,0.3);"><div style="color:var(--accent-blood);font-size:1.2em;font-weight:bold;margin-bottom:15px;">⚠️ 确认重置全员立绘？</div><div style="color:var(--text-main);font-size:0.9em;margin-bottom:20px;line-height:1.5;">此操作将清除<span style="color:var(--accent-blood);">所有角色</span>的常规、性转及心动自定义立绘设置，恢复为默认状态。<br><br><span style="color:var(--text-dim);font-size:0.9em;">操作后无法撤销，是否继续？</span></div><div style="display:flex;gap:15px;"><button id="c-no" style="flex:1;background:rgba(255,255,255,0.1);color:var(--text-main);border:1px solid rgba(255,255,255,0.2);padding:8px;border-radius:5px;cursor:pointer;">取消</button><button id="c-yes" style="flex:1;background:var(--accent-blood);color:#fff;border:none;padding:8px;border-radius:5px;cursor:pointer;box-shadow:0 0 10px rgba(255,77,77,0.4);">确定重置</button></div></div>';
    document.body.appendChild(cm);
    document.getElementById("c-no").onclick = function () {
      document.body.removeChild(cm);
    };
    document.getElementById("c-yes").onclick = function () {
      localStorage.removeItem("daoyuan_custom_portraits");
      localStorage.removeItem("daoyuan_custom_portraits_female");
      localStorage.removeItem("daoyuan_custom_portraits_special");
      document.body.removeChild(cm);
      modal.remove();
      alert("所有自定义立绘已重置！请刷新页面生效。");
    };
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.remove();
  });
};
window.appendChatMessage = async function (charName, sender, content) {
  try {
    const lastMsgId = getLastMessageId();
    const messages = getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) {
      console.warn("找不到消息历史");
      return;
    }
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof Mvu.replaceMvuData === "function") {
      const fullData = Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (fullData && fullData.stat_data && fullData.stat_data.玉简) {
        if (!fullData.stat_data.玉简[charName]) {
          fullData.stat_data.玉简[charName] = { 历史记录: {} };
        }
        const history = fullData.stat_data.玉简[charName].历史记录 || {};
        const newMsgId = "msg_" + Date.now() + Math.floor(Math.random() * 1000);
        const now = new Date();
        const timeStr =
          now.getHours().toString().padStart(2, "0") +
          ":" +
          now.getMinutes().toString().padStart(2, "0");

        history[newMsgId] = {
          发送者: sender,
          内容: content,
          时间: timeStr,
        };

        fullData.stat_data.玉简[charName].历史记录 = history;
        await Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        if (typeof populateCharacterData === "function")
          populateCharacterData();
      }
    } else {
      console.warn("MVU 未初始化");
    }
  } catch (err) {
    console.error("[道渊状态栏] 更新玉简消息失败:", err);
  }
};

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
        const rawReply = await generate({
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
  const all_variables = getAllVariables();
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
    const lastMsgId = getLastMessageId();
    const messages = getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) return;
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof Mvu.replaceMvuData === "function") {
      const fullData = Mvu.getMvuData({
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
        await Mvu.replaceMvuData(fullData, {
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
    const lastMsgId = getLastMessageId();
    const messages = getChatMessages("0-" + lastMsgId, { role: "assistant" });
    const targetMsgId = messages[messages.length - 1].message_id;

    let historyObj = {};
    if (window.Mvu && typeof Mvu.replaceMvuData === "function") {
      const fullData = Mvu.getMvuData({
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
        await Mvu.replaceMvuData(fullData, {
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
    const all_variables = getAllVariables();
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

const fairyImages = [
  "https://i.postimg.cc/rpz2PCrZ/Image-1765540443504.jpg",
  "https://i.postimg.cc/B6bsPC8Q/Image-1765540442059.jpg",
];
let currentFairyImageIndex = 0;

/* --- Xuantian Realm Map Logic --- */
const xuantianLore = {
  center: {
    name: "中央神州",
    realm: "人族疆域",
    type: "human",
    desc: "人族文明的核心，边长三千亿里正方形。宫阙浮空，金道横空，秩序森严。这里是舞台的中心，宗门林立，王朝更迭。",
    factions: [
      {
        name: "大周仙朝",
        type: "human",
        note: "神都洛阳。皇族姬氏底蕴深厚，十万元婴神策军，掌控四成灵石矿。",
      },
      {
        name: "南梁古国",
        type: "human",
        note: "中州东南部凡人王朝，受合欢宗与湮丹宗共控，种植紫灵米，表面繁华奢靡，暗藏斩仙盟反抗势力。",
      },
      {
        name: "蜀山剑门",
        type: "human",
        note: "西部蜀山群峰。天下剑修朝圣地，万剑归宗大阵。",
      },
      {
        name: "昆仑道门",
        type: "human",
        note: "极西昆仑神山。历史悠久的道门正宗，讲究清静无为。",
      },
      {
        name: "桃花宗",
        type: "human",
        note: "中央神州情道宗门，以情入道，结三生之缘，与合欢宗为绝对死敌。",
      },
      {
        name: "万法宗",
        type: "human",
        note: "东南方半空万法天仪。海纳百川，解析万法本源。",
      },
      {
        name: "合欢宗",
        type: "neutral",
        note: "明线百花谷，暗线极极宫。采补炉鼎的邪派。",
      },
      {
        name: "天机阁",
        type: "neutral",
        note: "总阁蜃楼飞阁游移不定。贩卖情报，推演因果。",
      },
      {
        name: "星道宗",
        type: "neutral",
        note: "极北三十亿里高空摘星悬岛。融合星道智道，推演天机。",
      },
      {
        name: "湮丹宗",
        type: "neutral",
        note: "南部杏临谷。以天地灵物入药，丹道通神。",
      },
      {
        name: "灵墟宗",
        type: "neutral",
        note: "东部无尽山脉边缘灵兽原。借妖兽气血反哺己身。",
      },
      {
        name: "青玉宗",
        type: "neutral",
        note: "西南部青音湖湖心岛。以音入道，只收女弟子。",
      },
      {
        name: "符韵门",
        type: "neutral",
        note: "北部云符山。虚空成符，斗法狂掷符箓。",
      },
      {
        name: "阵天宗",
        type: "neutral",
        note: "中部千阵岭迷雾石林。借天地大势，困杀万物。",
      },
    ],
    color: "--accent-gold",
    x: 50,
    y: 50,
  },
  north: {
    name: "北冥雪原",
    realm: "北冥禁地",
    type: "demon",
    desc: "终年被冰雪覆盖的北方冻土，东西跨度三千五百亿里。无日月星辰，唯见幽蓝磷光。阴冷死寂。",
    factions: [
      {
        name: "广寒宫",
        type: "neutral",
        note: "深处广寒玉宫。修太阴之道，断绝凡尘情爱，只收女弟子。",
      },
      {
        name: "蛟龙一族",
        type: "monster",
        note: "北冥之下黑渊。吞噬掠夺，提纯真龙血脉。",
      },
    ],
    color: "--accent-mana",
    x: 50,
    y: 15,
  },
  south: {
    name: "南离火洲",
    realm: "混乱魔域",
    type: "demon",
    desc: "火山密布，东西跨度四千亿里。空气中满是硫磺气息，混乱与杀伐并存，弱肉强食。",
    factions: [
      {
        name: "太阳神宫",
        type: "human",
        note: "万丈火山之巅太阳火殿。崇拜太阳之力，体修至尊。",
      },
      {
        name: "尸魔宗",
        type: "demon",
        note: "与中央神州交界处葬仙坡。炼化尸身，腐朽中求永生。",
      },
      {
        name: "黑金阁",
        type: "demon",
        note: "无固定驻地地下黑市，统辖暗杀走私与情报渗透，重弱肉强食执掌地下混乱。",
      },
      {
        name: "万魂殿",
        type: "demon",
        note: "阴风山脉万鬼窟。抽魂炼魄，炼化怨鬼壮大神识。",
      },
    ],
    color: "--accent-blood",
    x: 50,
    y: 85,
  },
  east: {
    name: "东极青木域",
    realm: "万妖森林",
    type: "monster",
    desc: "古木参天，南北跨度四千五百亿里的妖族世居之地。多方势力维持着微妙的平衡。",
    factions: [
      {
        name: "神猿族",
        type: "monster",
        note: "西部万妖山脉。力量至上，以力破法。",
      },
      {
        name: "九尾天狐族",
        type: "monster",
        note: "东部沂云森林。修习幻术法则，操纵神魂欲念。",
      },
      {
        name: "五色孔雀族",
        type: "monster",
        note: "南部落凤坡五色谷。提纯五行血脉，衍化五色神光。",
      },
      {
        name: "柳蛇族",
        type: "monster",
        note: "北部碧玉温泉。雌尊雄卑，交配繁衍。",
      },
    ],
    color: "--accent-san",
    x: 85,
    y: 50,
  },
  west: {
    name: "西漠佛国",
    realm: "佛修净土",
    type: "human",
    desc: "广袤的西部沙漠，南北跨度三千五百亿里。佛光普照，致力于普度众生与镇压妖魔。",
    factions: [
      {
        name: "大雷音寺",
        type: "human",
        note: "须弥山须弥金顶。度化众生，镇压邪魔，修罗汉金身。",
      },
    ],
    color: "#eccc68",
    x: 15,
    y: 50,
  },
  special_east: {
    name: "蓬莱仙岛",
    realm: "上古秘境",
    type: "neutral",
    desc: "【极东尽头归墟之眼深处】每六十年现世三十天的上古仙界碎片。核心物品：澪之果。",
    factions: [{ name: "冥煞玄蛇", type: "monster", note: "守护者。" }],
    color: "--rare-text",
    x: 92,
    y: 50,
  },
  s_youlin: {
    name: "幽林血沼",
    realm: "低阶秘境",
    type: "blood",
    desc: "【南离火洲十万大山古战场外围】炼气期修士试炼场与坟场。核心物品：蒲灵果、玉髓芝。",
    factions: [{ name: "嗜血鬼藤", type: "monster", note: "守护者。" }],
    color: "--accent-blood",
    x: 35,
    y: 75,
  },
  s_gengjin: {
    name: "庚金剑冢",
    realm: "低阶秘境",
    type: "human",
    desc: "【西漠佛国叹息沙海地下千丈】上古剑宗遗址，充满庚金剑气。进入限制：元婴以下。核心物品：金灵玉髓。",
    factions: [{ name: "残缺剑傀", type: "monster", note: "守护者。" }],
    color: "#eccc68",
    x: 25,
    y: 35,
  },
  s_liuli: {
    name: "琉璃净月宫",
    realm: "高阶秘境",
    type: "neutral",
    desc: "【北冥雪原北冥黑渊极境海眼】中古大能折叠行宫，极寒幻境。进入限制：化神以下。核心物品：九曲灵参、造化青莲莲子。",
    factions: [{ name: "霜骨冰蛟", type: "monster", note: "守护者。" }],
    color: "--accent-mana",
    x: 35,
    y: 15,
  },
  s_wuxing: {
    name: "五行碎层",
    realm: "高阶绝地",
    type: "neutral",
    desc: "【中央神州天陨坑上空万丈虚空夹缝】不稳定空间裂缝，存在法则碾压。进入限制：炼虚以下。核心物品：五行灵髓、虚空花。",
    factions: [{ name: "亚种虚空兽", type: "monster", note: "守护者。" }],
    color: "--rare-text",
    x: 65,
    y: 35,
  },
  s_shahai: {
    name: "无垠沙海镜像",
    realm: "大能禁区",
    type: "neutral",
    desc: "【依附西漠佛国叹息沙海背面】高维镜像空间，方向与因果皆反。进入限制：合体以下。核心物品：空灵晶液。",
    factions: [{ name: "蜃灵皇残魂", type: "monster", note: "守护者。" }],
    color: "--rare-text",
    x: 10,
    y: 70,
  },
  s_yunsheng: {
    name: "陨圣乱墟",
    realm: "大能禁区",
    type: "demon",
    desc: "【东极青木域极东九天罡风层深处】远古大能战场残块。进入限制：大乘以下。核心物品：三元归一果。",
    factions: [{ name: "怨念尸魔", type: "demon", note: "守护者。" }],
    color: "--accent-blood",
    x: 85,
    y: 15,
  },
  s_huangquan: {
    name: "黄泉冥河引",
    realm: "大能禁区",
    type: "demon",
    desc: "【南离火洲阴冥河死脉尽头】阴阳交汇处，生人禁区。核心物品：九转还魂草根须。",
    factions: [{ name: "渡魂诡灵", type: "demon", note: "守护者。" }],
    color: "--accent-blood",
    x: 65,
    y: 90,
  },
  s_tianyuan: {
    name: "天渊起源地",
    realm: "世界本源",
    type: "neutral",
    desc: "【玄天界界壁护罩最深层夹缝】天道直辖，大乘期伐天之地。核心物品：玄黄之气。",
    factions: [{ name: "天道灾兽化身", type: "neutral", note: "守护者。" }],
    color: "--accent-gold",
    x: 50,
    y: 5,
  },
};

/* --- Immortal Realm Map Logic --- */
const xianjieLore = {
  center: {
    name: "钧天仙域",
    realm: "仙界之心",
    type: "human",
    desc: "此地仙气浓郁到凝为七彩祥云，宫阙浮空，金道横空，龙凤仙鹤往来其间。天地法则最为稳固清晰，甚至可显化为肉眼可见的符文锁链。核心基调：秩序、威严、天道至上。",
    factions: [
      {
        name: "天庭",
        type: "human",
        note: "明面上最高权力机构，执掌天规，统御万仙。重要地标：凌霄仙阙、天规神碑。",
      },
      {
        name: "云上瑶池",
        type: "neutral",
        note: "真正的顶层决策与至高战力所在之地。",
      },
    ],
    color: "--accent-gold",
    x: 50,
    y: 50,
  },
  north: {
    name: "玄冥仙域",
    realm: "幽冥轮回",
    type: "blood",
    desc: "无日月星辰，唯见幽蓝磷光与弱水河光。白骨山脉连绵，魂力、阴煞、死气弥漫。核心基调：死亡、轮回、无序。",
    factions: [
      { name: "阴煞宗", type: "demon", note: "明面上势力最强，驻地为灵冥渊。" },
      {
        name: "散仙秘境",
        type: "neutral",
        note: "大量散仙强者隐居的独立空间。",
      },
      {
        name: "地府入口",
        type: "neutral",
        note: "传说中掌管仙神魂灵轮回的神秘之地。",
      },
    ],
    color: "--accent-mana",
    x: 50,
    y: 15,
  },
  south: {
    name: "炎极仙域",
    realm: "不灭火海",
    type: "demon",
    desc: "天空悬有三轮烈日，大地之上仙火熔岩长流不息。空气中满是狂暴火元与硫磺气息。核心基调：混乱、力量、弱肉强食。",
    factions: [
      {
        name: "太古王族",
        type: "demon",
        note: "盘踞的核心浮空神都「太古神都」。",
      },
      {
        name: "极乐宗",
        type: "demon",
        note: "在火海幻境中开宗立派的顶级宗门，内有极乐玉溪。",
      },
    ],
    color: "--accent-blood",
    x: 50,
    y: 85,
  },
  east: {
    name: "青华仙域",
    realm: "万木之乡",
    type: "monster",
    desc: "域内尽是原始仙林与参天古木，更有建木、扶桑等开天神木，空气中充斥乙木灵气与生命气息。核心基调：原始、共存、血脉至上。",
    factions: [
      {
        name: "玉灵宫",
        type: "neutral",
        note: "顶级仙门之一，山门所在为玉灵仙山。",
      },
      { name: "万妖古界", type: "monster", note: "妖族的核心势力范围。" },
      {
        name: "先天仙灵域",
        type: "neutral",
        note: "先天仙灵的聚居地，传说中种植着无数仙药的万药仙圃亦在此。",
      },
    ],
    color: "--accent-san",
    x: 85,
    y: 50,
  },
  west: {
    name: "太白仙域",
    realm: "万剑之墟",
    type: "human",
    desc: "天地间充斥锋锐庚金之气。大地如铸，山峰如利剑倒插天穹。肃杀锐利，铁血不屈。核心基调：战斗、守护、以剑为尊。",
    factions: [
      {
        name: "剑修联盟",
        type: "human",
        note: "以剑为尊的主流联盟，强者当道。",
      },
      {
        name: "真灵世家",
        type: "monster",
        note: "真灵血脉世家，权势极重，祖地在真灵古穴。",
      },
      {
        name: "天庭前线",
        type: "human",
        note: "界碑古关由天庭重兵镇守，抵御时空乱流海。还有陨仙古战场，杀机与机缘并存。",
      },
    ],
    color: "#eccc68",
    x: 15,
    y: 50,
  },
};

window.switchTab = function (event, tabId) {
  const button = event.currentTarget;
  const panel = button.closest(".main-panel");
  if (!panel) return;
  panel
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  panel
    .querySelectorAll(".tab-content")
    .forEach((p) => (p.style.display = "none"));
  const tabToShow = document.getElementById("tab-" + tabId);
  if (tabToShow) {
    tabToShow.style.display = tabId === "messages" ? "flex" : "block";
  }
  button.classList.add("active");
};

function drawMap(loreData, containerId) {
  const mapContainer = document.getElementById(containerId);
  if (!mapContainer) return;

  const connections = [
    ["center", "north"],
    ["center", "south"],
    ["center", "east"],
    ["center", "west"],
  ];

  if (loreData["special_east"]) {
    connections.push(["east", "special_east"]);
  }
  if (loreData["s_youlin"]) {
    connections.push(["south", "s_youlin"]);
    connections.push(["west", "s_gengjin"]);
    connections.push(["north", "s_liuli"]);
    connections.push(["center", "s_wuxing"]);
    connections.push(["west", "s_shahai"]);
    connections.push(["east", "s_yunsheng"]);
    connections.push(["south", "s_huangquan"]);
    connections.push(["center", "s_tianyuan"]);
  }

  connections.forEach(([k1, k2]) => {
    if (!loreData[k1] || !loreData[k2]) return;
    const n1 = loreData[k1];
    const n2 = loreData[k2];
    const line = document.createElement("div");
    line.className = "map-line";

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    line.style.width = `calc(${dist}% - 10px)`;
    line.style.left = `${n1.x}%`;
    line.style.top = `${n1.y}%`;
    line.style.transform = `rotate(${angle}deg)`;
    mapContainer.appendChild(line);
  });

  Object.entries(loreData).forEach(([key, data]) => {
    const node = document.createElement("div");
    let nodeClass = "map-node";
    if (key === "center") nodeClass += " node-center";
    else if (key === "north") nodeClass += " node-north";
    else if (key === "south") nodeClass += " node-south";
    else if (key === "east") nodeClass += " node-east";
    else if (key === "west") nodeClass += " node-west";
    else nodeClass += " node-special";

    node.className = nodeClass;
    node.style.left = `${data.x}%`;
    node.style.top = `${data.y}%`;
    node.innerHTML = `<div class="map-node-label">${data.name}</div>`;

    node.onclick = () => {
      document
        .querySelectorAll(`.map-node`)
        .forEach((n) => n.classList.remove("active-node"));
      node.classList.add("active-node");
      showLocationDetails(data);
    };
    mapContainer.appendChild(node);
  });
}

function initMap() {
  drawMap(xuantianLore, "world-map-xuantian");
  drawMap(xianjieLore, "world-map-xianjie");
}

function showLocationDetails(data) {
  const panel = document.getElementById("map-details");
  panel.classList.add("active");
  const titleEl = document.getElementById("map-loc-name");

  const colorVar = data.color.startsWith("#")
    ? data.color
    : `var(${data.color})`;
  titleEl.textContent = data.name;
  titleEl.style.color = colorVar;
  titleEl.parentElement.style.color = colorVar;

  const infoCard = panel.querySelector(".info-card");
  infoCard.style.borderColor = colorVar;

  if (!window.mapPortraits) {
    window.mapPortraits = {
      中央神州:
        "https://i.postimg.cc/ZRsNB0GJ/file-00000000530c71fb8318e70cba79f051.png",
      南离火洲:
        "https://i.postimg.cc/YqYJ3Fb3/file-00000000dbf071f9b154d385edddaf59.png",
      西漠佛国:
        "https://i.postimg.cc/Hn5P6G4j/file-000000005d2071faa17cf1da25fa8370.png",
      东极青木域:
        "https://i.postimg.cc/qRDmJJQz/file-0000000008f071faa98ae08365b8a7ee.png",
      北冥雪原:
        "https://i.postimg.cc/7Lsc6nZL/file-00000000ddb471fd89b3a466de6ccfc3.png",
    };
  }
  let oldImg = infoCard.querySelector(".map-loc-img-wrapper");
  if (oldImg) oldImg.remove();
  if (
    ["中央神州", "北冥雪原", "南离火洲", "东极青木域", "西漠佛国"].includes(
      data.name,
    )
  ) {
    let mapImgUrl = window.mapPortraits[data.name] || "";
    let imgWrapper = document.createElement("div");
    imgWrapper.className = "map-loc-img-wrapper";
    imgWrapper.style.cssText = "margin-top:12px; text-align:center;";
    if (mapImgUrl) {
      imgWrapper.innerHTML =
        '<img src="' +
        mapImgUrl +
        '" style="max-width:100%; border-radius:6px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 4px 10px rgba(0,0,0,0.5); margin:0 auto; cursor:zoom-in;" alt="' +
        data.name +
        "\" onclick=\"document.getElementById('modal-image').src=this.src; document.getElementById('image-modal-overlay').style.display='flex';\">";
    } else {
      imgWrapper.innerHTML =
        '<div style="border:1px dashed var(--accent-gold); padding:15px; border-radius:6px; color:var(--text-dim); font-size:0.85em; background:rgba(0,0,0,0.2);">🔮 暂无舆图立绘 (请在代码 mapPortraits 中配置此处图片链接)</div>';
    }
    let factionsContainer = document.getElementById("map-loc-factions");
    if (factionsContainer)
      factionsContainer.parentNode.insertBefore(imgWrapper, factionsContainer);
  }

  document.getElementById("map-loc-type").textContent = data.realm;
  document.getElementById("map-loc-desc").innerHTML = data.desc;

  const factionsContainer = document.getElementById("map-loc-factions");
  factionsContainer.innerHTML = "";
  if (data.factions && data.factions.length > 0) {
    data.factions.forEach((fac) => {
      const tag = document.createElement("span");
      let tagClass = "faction-tag";
      if (fac.type === "human") tagClass += " tag-human";
      else if (fac.type === "demon") tagClass += " tag-demon";
      else if (fac.type === "monster") tagClass += " tag-monster";
      else tagClass += " tag-neutral";

      tag.className = tagClass;
      tag.textContent = fac.name;
      tag.title = fac.note || "";

      tag.onclick = function () {
        document.getElementById("faction-modal-title").textContent =
          "【" + fac.name + "】";
        document.getElementById("faction-modal-note").textContent =
          fac.note || "暂无详细信息";
        document.getElementById("faction-modal-overlay").style.display = "flex";
      };

      factionsContainer.appendChild(tag);
    });
  } else {
    factionsContainer.innerHTML =
      '<span style="color:var(--text-dim);font-size:0.8em;">此处尚无势力记载</span>';
  }

  setTimeout(() => {
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 50);
}

const fairyGuide = {
  element: document.getElementById("fairy-guide"),
  textElement: document.getElementById("fairy-text"),
  lines: [],
  stats: {},
  updateData(lines, hp, san, mp) {
    this.lines = lines || [];
    this.stats = {
      hp: parseFloat(hp) || 100,
      san: parseFloat(san) || 100,
      mp: parseFloat(mp) || 100,
    };
  },
  toggleAndShowMessage() {
    const bubble = this.element.querySelector(".fairy-bubble");
    const isVisible = bubble.style.opacity === "1";

    if (isVisible) {
      bubble.style.opacity = "0";
      bubble.style.transform = "translateY(10px)";
      bubble.style.pointerEvents = "none";
    } else {
      let msg = "道友，此地天机混沌，竟无一言可示...";
      if (this.lines.length > 0) {
        msg = this.lines[Math.floor(Math.random() * this.lines.length)];
      }

      this.textElement.textContent = msg;
      bubble.style.opacity = "1";
      bubble.style.transform = "translateY(0)";
      bubble.style.pointerEvents = "auto";
    }
  },
  init() {
    const fairyAvatar = this.element.querySelector(".fairy-avatar");
    if (fairyAvatar) {
      fairyAvatar.style.backgroundImage = `url('${fairyImages[currentFairyImageIndex]}')`;
      fairyAvatar.addEventListener("click", (e) => {
        if (e.button === 0) {
          currentFairyImageIndex =
            (currentFairyImageIndex + 1) % fairyImages.length;
          fairyAvatar.style.backgroundImage = `url('${fairyImages[currentFairyImageIndex]}')`;
          this.toggleAndShowMessage();
        }
      });
    }
  },
};

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
  openChatView(charName);
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

  const hasPortrait = !!getPortraitUrl(name, data.性别);
  const portraitUrl = hasPortrait ? getPortraitUrl(name, data.性别) : "";
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

function populateCharacterData() {
  const all_variables = getAllVariables();
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
    const hasPortrait = !!getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="card-collapse-body"><div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;padding:2px 5px;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
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
    const hasPortrait = !!getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="card-collapse-body"><div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;padding:2px 5px;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
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
    const hasPortrait = !!getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="card-collapse-body"><div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;padding:2px 5px;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
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
    '<div class="info-card" style="border-color:var(--rare-text); margin-bottom:15px; overflow:visible;"><div class="info-title" style="color:var(--rare-text);"><span>仙姿寻影 (全图鉴立绘检索)</span><span>🔍</span></div><div style="display:flex; gap:8px;"><input type="text" id="portrait-search-input" class="reply-input" placeholder="搜名字，或输“随机”抽卡..." value="' +
    prevSearch +
    '" onkeydown="if(event.key===&quot;Enter&quot;){event.preventDefault();event.stopPropagation();window.searchAndShowPortrait();}" style="flex:1; height:35px; padding:5px 10px; box-sizing:border-box;"><button class="reply-button" onclick="window.searchAndShowPortrait()" style="height:35px; min-width:60px; padding:0 15px;">搜索</button></div><div id="portrait-search-result" style="margin-top:15px; display:' +
    (isResVis ? "block" : "none") +
    ';">' +
    prevResult +
    "</div></div>";
  const sortedBeauties = Object.entries(beauties).sort(
    (a, b) => (a[1].排名 || 999) - (b[1].排名 || 999),
  );
  sortedBeauties.slice(0, 2).forEach(([name, data]) => {
    const hasPortrait = !!getPortraitUrl(name, data.性别);
    const portraitSection = `
                <div class="portrait-wrapper">
                    <div style="display:flex;gap:6px;align-items:center;">
                    ${hasPortrait ? `<div class="portrait-toggle-btn" style="flex:1;" onclick="const p = this.parentElement.nextElementSibling; const img = p.querySelector('img'); if(!img.src) { img.src = img.dataset.src; } p.classList.toggle('show'); this.innerHTML = p.classList.contains('show') ? '收起立绘 ▲' : '查看立绘 ▼';">查看立绘 ▼</div>` : `<div class="portrait-toggle-btn" style="flex:1;opacity:0.5;cursor:default;" onclick="event.stopPropagation();">暂无立绘</div>`}
                    <div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog('${name}');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait('${name}');" title="切换立绘">🔄</div>
                </div>
                    ${hasPortrait ? `<div class="large-portrait"><img data-src="${getPortraitUrl(name, data.性别)}" alt="${name}"></div>` : `<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>`}
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
    const hasPortrait = !!getPortraitUrl(name, data.性别);
    const portraitUrl = hasPortrait
      ? getPortraitUrl(name, data.性别)
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
  fairyGuide.updateData(stat.$器灵台词 || [], hero.生命, hero.神识, hero.灵力);

  /* 绑定删除按钮事件 (其他页面的正常删除逻辑保留) */
  bindDiscardButtons();
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
    const lastMsgId = getLastMessageId();
    const messages = getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) return;
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof Mvu.replaceMvuData === "function") {
      const fullData = Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (fullData && fullData.stat_data) {
        _.unset(fullData.stat_data, dataPath);
        await Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        populateCharacterData();
      }
    }
  } catch (err) {
    console.error("[道渊状态栏] 删除失败:", dataPath, err);
    if (cardElement) cardElement.classList.remove("discarding");
  }
}

/* 点击删除按钮 — 两段确认模式 */
function bindDiscardButtons() {
  document.querySelectorAll(".card-discard").forEach((btn) => {
    btn.removeEventListener("click", handleDiscardClick);
    btn.addEventListener("click", handleDiscardClick);
  });
}

function handleDiscardClick(e) {
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

async function init() {
  /* 拉取云端立绘 */
  await window.loadRemotePortraits();
  /* MVU架构接入 */
  await waitGlobalInitialized("Mvu");

  window.loadWxSettings();

  fairyGuide.init();
  initMap();

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
  populateCharacterData();

  /* 监听变量更新事件，实现自动刷新 */
  eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
    populateCharacterData();
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
    allV = getAllVariables();
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
  let allVars = getAllVariables();
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
      String(v).replace(/"/g, "&quot;") +
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
    const lastMsgId = getLastMessageId();
    const messages = getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) return;
    const targetMsgId = messages[messages.length - 1].message_id;
    if (window.Mvu && typeof Mvu.replaceMvuData === "function") {
      const fullData = Mvu.getMvuData({
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
        await Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        populateCharacterData();
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
function cleanUpUnwantedUI() {
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
$(errorCatched(init));
