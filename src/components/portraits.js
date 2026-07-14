import { renderDaoyuanApplause } from "./applause.js";

/* 预设的人物立绘映射表 (已转为云端加载) */
var charPortraits = window.charPortraits = {};
var charPortraitsFemale = window.charPortraitsFemale = {};
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
      if (data.charPortraits) { charPortraits = val(data.charPortraits); window.charPortraits = charPortraits; }
      if (data.charPortraitsFemale) {
        charPortraitsFemale = val(data.charPortraitsFemale);
        window.charPortraitsFemale = charPortraitsFemale;
      }
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
    if (typeof window.getLorebookEntries != "function") {
      n.innerHTML =
        '<span style="color:var(--accent-blood);">当前环境不支持世界书接口。</span>';
      return;
    }
    let lbs = new Set();
    if (typeof window.getOrCreateChatLorebook == "function") {
      try {
        let b = await window.getOrCreateChatLorebook();
        if (b) lbs.add(b);
      } catch (e) {}
    }
    if (typeof window.getCurrentCharPrimaryLorebook == "function") {
      try {
        let b = await window.getCurrentCharPrimaryLorebook();
        if (b) lbs.add(b);
      } catch (e) {}
    }
    if (typeof window.getCharLorebooks == "function") {
      try {
        let b = await window.getCharLorebooks({ name: name });
        if (b) b.forEach((x) => lbs.add(x));
      } catch (e) {}
    }
    let content = "";
    for (let lb of lbs) {
      try {
        let entries = await window.getLorebookEntries(lb, {
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
        content.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">") +
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
    stat = window.getAllVariables().stat_data || {};
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
    stat = window.getAllVariables().stat_data || {};
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
    if (typeof window.getPortraitUrl === "function")
      pUrl = window.getPortraitUrl(n, p.性别);
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
    let safeN = String(n).replace(/"/g, '"');
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
      '\');" title="切换立绘">🔄</div>' +
      renderDaoyuanApplause(n) +
      '</div><div class="large-portrait"><img data-src="' +
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
    stat = window.getAllVariables().stat_data || {};
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
window.getPortraitUrl = function(name, gender) {
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
    if (typeof window.populateCharacterData === "function") {
      window.populateCharacterData();
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
    if (typeof window.populateCharacterData === "function") {
      window.populateCharacterData();
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
    subBtnsHtml += `<button class="btn-rst-all" style="position:static;background:rgba(255,105,180,0.15);color:#ff69b4;border:1px solid #ff69b4;margin-right:6px;" onclick="event.stopPropagation();let stat={};try{stat=window.getAllVariables().stat_data||{};}catch(ex){}let p=(stat.道侣&&stat.道侣['${charName}'])||(stat.人物&&stat.人物['${charName}'])||(stat.灵宠&&stat.灵宠['${charName}'])||(stat.绝色榜&&stat.绝色榜['${charName}'])||{};let f=parseFloat(p.亲密||p.好感||p.亲密度||p.好感度||0);if(f<90){alert('好感度不足，无法解锁该立绘配置！');}else{window.openCustomPortraitDialog('${charName}','_keepspecial');}">💖 心动配置</button>`;
  }
  if (mode !== "normal") {
    subBtnsHtml += `<button class="btn-rst-all" style="position:static;background:rgba(100,180,255,0.15);color:#64b4ff;border:1px solid #64b4ff;margin-right:6px;" onclick="event.stopPropagation();window.openCustomPortraitDialog('${charName}','_keepnormal')">⬅️ 返回常规</button>`;
  }
  var titleText = `✨ 设定灵容 · ${charName}`;
  if (mode === "female") titleText = `♀️ 设定性转灵容 · ${charName}`;
  if (mode === "special") titleText = `💖 设定心动灵容 · ${charName}`;
  modal.innerHTML = `<div class="portrait-custom-dialog"><style>.portrait-custom-dialog{position:relative;background:linear-gradient(145deg,rgba(25,20,30,0.95),rgba(15,10,15,0.98))!important;border:1px solid var(--border-metal)!important;border-top:2px solid var(--accent-gold)!important;border-bottom:2px solid var(--accent-gold)!important;border-radius:12px!important;padding:25px!important;box-shadow:0 0 40px rgba(0,0,0,0.9),inset 0 0 20px rgba(255,215,0,0.05)!important;}.portrait-custom-dialog h3{color:var(--accent-gold)!important;letter-spacing:3px;text-shadow:0 0 8px var(--accent-gold-glow);border-bottom:1px dashed rgba(255,255,255,0.1);padding-bottom:12px;}.portrait-custom-dialog input{border:1px solid rgba(255,215,0,0.3)!important;background:rgba(0,0,0,0.5)!important;color:var(--text-main)!important;margin-bottom:0!important;flex:1;padding:10px;border-radius:6px;}.portrait-custom-dialog input:focus{border-color:var(--accent-gold)!important;box-shadow:0 0 10px var(--accent-gold-glow)!important;outline:none;}.btn-confirm{background:linear-gradient(135deg,#b8860b,#ffd700)!important;color:#1a0f0f!important;border:1px solid rgba(255,255,255,0.4)!important;font-weight:bold;box-shadow:0 4px 8px rgba(0,0,0,0.6);padding:8px 24px;border-radius:6px;cursor:pointer;}.btn-cancel{background:rgba(255,255,255,0.05)!important;color:var(--text-dim)!important;border:1px solid rgba(255,255,255,0.2)!important;padding:8px 24px;border-radius:6px;cursor:pointer;}.btn-reset{background:rgba(239,68,68,0.1)!important;color:var(--accent-blood)!important;border:1px solid rgba(239,68,68,0.3)!important;padding:8px 24px;border-radius:6px;cursor:pointer;}.portrait-preview-wrapper{width:100%;max-height:220px;min-height:120px;border:2px solid var(--border-metal);border-radius:8px;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;overflow:hidden;margin-bottom:15px;box-shadow:inset 0 0 20px rgba(0,0,0,0.8),0 0 15px var(--accent-gold-glow);position:relative;}.portrait-preview-wrapper::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent,rgba(255,215,0,0.05),transparent);animation:shine-rotate 6s infinite linear;pointer-events:none;z-index:1;}.portrait-custom-dialog:has(.portrait-preview.show) .portrait-preview-wrapper{display:flex;}.portrait-preview{max-width:100%;max-height:220px;object-fit:contain;z-index:2;position:relative;border-radius:4px;display:block!important;}.url-input-row{display:flex;gap:8px;margin-bottom:10px;}.btn-remove-url{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--accent-blood);border-radius:6px;padding:0 12px;cursor:pointer;font-weight:bold;}.btn-add-url{background:rgba(100,180,255,0.1);border:1px dashed rgba(100,180,255,0.4);color:#64b4ff;border-radius:6px;padding:8px;cursor:pointer;width:100%;text-align:center;margin-bottom:12px;font-size:0.9em;}.btn-rst-all{position:absolute;top:15px;right:15px;background:rgba(255,77,77,0.15);color:var(--accent-blood);border:1px solid var(--accent-blood);border-radius:4px;padding:4px 8px;font-size:0.75em;cursor:pointer;transition:all 0.2s;z-index:100;}.btn-rst-all:hover{background:var(--accent-blood);color:#fff;}</style><div style="position:absolute;top:15px;right:15px;display:flex;align-items:center;z-index:100;">${subBtnsHtml}<button class="btn-rst-all" id="btn-rst-all" style="position:static;">⚠️ 重置全员</button></div><h3>${titleText}</h3><div class="portrait-preview-wrapper"><img class="portrait-preview" id="portrait-preview-img" style="display:none;" onerror="this.classList.remove('show');this.style.display='none'"></div><div style="display:flex;gap:8px;align-items:stretch;margin-bottom:12px;"><label for="portrait-file-input" style="background:rgba(255,215,0,0.05);border:1px dashed var(--accent-gold);color:var(--accent-gold);padding:8px 16px;border-radius:6px;cursor:pointer;display:flex;align-items:center;">📁 本地图片</label><input type="file" id="portrait-file-input" accept="image/*" style="display:none;"><span id="portrait-file-name" style="flex:1;display:flex;align-items:center;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:0 10px;color:var(--text-dim);font-size:0.8em;overflow:hidden;white-space:nowrap;">未选择文件...</span></div><label style="color:var(--text-dim);font-size:0.9em;margin-bottom:5px;display:block;">图床URL地址</label><div id="url-inputs-container"></div>${mode === "normal" ? '<div class="btn-add-url" id="btn-add-url">➕ 添加多张立绘 (无缝切换)</div><div style="font-size:0.8em;color:var(--text-dim);font-style:italic;margin-bottom:12px;text-align:center;">💡 空白栏位将被自动忽略，系统会自动用竖线拼接。</div>' : ""}<div style="display:flex;gap:10px;justify-content:center;"><button class="btn-confirm" id="portrait-confirm-btn">✅ 确认保存</button>${isCustom ? '<button class="btn-reset" id="portrait-reset-btn">🔄 恢复默认</button>' : ""}<button class="btn-cancel" id="portrait-cancel-btn">取消</button></div></div>`;
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
    const lastMsgId = window.getLastMessageId();
    const messages = window.getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) {
      console.warn("找不到消息历史");
      return;
    }
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof window.Mvu.replaceMvuData === "function") {
      const fullData = window.Mvu.getMvuData({
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
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        if (typeof window.populateCharacterData === "function")
          window.populateCharacterData();
      }
    } else {
      console.warn("MVU 未初始化");
    }
  } catch (err) {
    console.error("[道渊状态栏] 更新玉简消息失败:", err);
  }
};
