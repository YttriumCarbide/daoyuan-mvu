// Mock SillyTavern Globals for Vite Dev Environment
window.waitGlobalInitialized = async function (name) {
  console.log(`[Mock] waitGlobalInitialized called for ${name}`);
  return Promise.resolve();
};

const events = {};
window.eventOn = function (name, callback) {
  if (!events[name]) events[name] = [];
  events[name].push(callback);
};
window.eventEmit = function (name, data) {
  if (events[name]) events[name].forEach(cb => cb(data));
};

window.errorCatched = function (fn) {
  return function (...args) {
    try {
      return fn(...args);
    } catch (e) {
      console.error("[Mock] errorCatched:", e);
    }
  };
};

// 构造的假 MVU 数据，可在此处根据需要自由修改以测试不同UI状态
const mockMvuData = {
  stat_data: {
    "主角": {
      "姓名": "林风",
      "性别": "男",
      "容貌": "俊朗",
      "身形": "修长",
      "衣着": "青衫",
      "生命": 100,
      "生命上限": 100,
      "精血": 100,
      "精血上限": 100,
      "灵力": 450,
      "灵力上限": 500,
      "修为": 990,
      "修为上限": 1000,
      "神识": 200,
      "神识上限": 200,
      "道心": 100,
      "道心上限": 100,
      "气运": "天命之子",
      "灵根": "天灵根",
      "宗门": "青云宗",
      "神念": "正常"
    },
    "功法": {
      "青木诀": { "type": "心法", "desc": "青木宗入门心法" },
      "御剑术": { "type": "法术", "desc": "基础御剑法术" }
    },
    "道侣": {
      "柳如烟": { "亲密": 100, "境界": "金丹期", "种族": "人族", "desc": "青梅竹马" }
    },
    "绝色榜": {
      "瑶汐": {
        "排名": 1,
        "头衔": "九天之主",
        "仙姿": "容颜绝世，不可方物，自带九天玄气",
        "群芳谱": "万界美人榜榜首，传闻其一眸可令星辰黯淡",
        "性别": "女",
        "好感度": 100
      },
      "林雪": {
        "排名": 2,
        "头衔": "月宫之主",
        "仙姿": "清冷如霜，孤高清绝",
        "群芳谱": "世间难得的冰山美人，只可远观",
        "性别": "女"
      }
    },
    "人物": {
      "李长老": { "境界": "元婴期", "门派": "青云宗", "desc": "严厉的长老" }
    },
    "灵宠": {
      "小黑": { "种族": "墨麒麟", "境界": "筑基期", "desc": "幼年期神兽" }
    }
  }
};

window.getAllVariables = function () {
  return mockMvuData;
};

window.getLastMessageId = function () {
  return 42;
};

window.getChatMessages = function () {
  return [{ message_id: 42, name: "system", mes: "这是一条测试玉简消息" }];
};

// 模拟 MVU 核心对象
window.Mvu = {
  events: {
    VARIABLE_UPDATE_ENDED: 'VARIABLE_UPDATE_ENDED'
  },
  getMvuData: function (options) {
    console.log('[Mock] Mvu.getMvuData', options);
    return JSON.parse(JSON.stringify(mockMvuData)); // 深度克隆，避免直接修改引用
  },
  replaceMvuData: async function (fullData, options) {
    console.log('[Mock] Mvu.replaceMvuData', fullData, options);
    Object.assign(mockMvuData, fullData);

    // 模拟数据保存后的 UI 更新触发
    setTimeout(() => {
      window.eventEmit(window.Mvu.events.VARIABLE_UPDATE_ENDED);
    }, 100);
    return Promise.resolve();
  }
};
