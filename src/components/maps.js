/* --- Xuantian Realm Map Logic --- */
window.xuantianLore = {
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
window.xianjieLore = {
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

function switchTab(event, tabId) {
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
}

export function initTabNavigation(root = document) {
  root.querySelectorAll(".tab-btn[data-tab-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      switchTab(event, button.dataset.tabId);
    });
  });
}

window.drawMap = function(loreData, containerId) {
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
      window.showLocationDetails(data);
    };
    mapContainer.appendChild(node);
  });
}

window.initMap = function() {
  window.drawMap(window.xuantianLore, "world-map-xuantian");
  window.drawMap(window.xianjieLore, "world-map-xianjie");
}

window.showLocationDetails = function(data) {
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

window.fairyGuide = {
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
      fairyAvatar.style.backgroundImage = `url('${window.fairyImages[window.currentFairyImageIndex]}')`;
      fairyAvatar.addEventListener("click", (e) => {
        if (e.button === 0) {
          window.currentFairyImageIndex =
            (window.currentFairyImageIndex + 1) % window.fairyImages.length;
          fairyAvatar.style.backgroundImage = `url('${window.fairyImages[window.currentFairyImageIndex]}')`;
          this.toggleAndShowMessage();
        }
      });
    }
  },
};
