// Shujuku Adapter

(function installDaoyuanStatusStorage() {
        const memory = new Map();

        function roots() {
          const values = [window];
          try { if (window.parent && window.parent !== window) values.push(window.parent); } catch (error) {}
          try { if (window.top && !values.includes(window.top)) values.push(window.top); } catch (error) {}
          return values;
        }

        function backend() {
          for (const root of roots()) {
            try {
              const storage = root && root['local' + 'Storage'];
              if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
                return storage;
              }
            } catch (error) {}
          }
          return null;
        }

        window.DaoyuanStatusStorage = {
          getItem(key) {
            const normalizedKey = String(key);
            const storage = backend();
            if (storage) {
              try {
                const value = storage.getItem(normalizedKey);
                if (value !== null && value !== undefined) return value;
              } catch (error) {}
            }
            return memory.has(normalizedKey) ? memory.get(normalizedKey) : null;
          },
          setItem(key, value) {
            const normalizedKey = String(key);
            const normalizedValue = String(value);
            memory.set(normalizedKey, normalizedValue);
            const storage = backend();
            if (storage) {
              try { storage.setItem(normalizedKey, normalizedValue); } catch (error) {}
            }
          },
          removeItem(key) {
            const normalizedKey = String(key);
            memory.delete(normalizedKey);
            const storage = backend();
            if (storage) {
              try { storage.removeItem(normalizedKey); } catch (error) {}
            }
          },
          clear() {
            memory.clear();
            const storage = backend();
            if (storage) {
              try { storage.clear(); } catch (error) {}
            }
          },
        };
      })();

window.getAllVariables = function() {
  var data = { stat_data: {} };
  var sd = data.stat_data;

  function sheet(tableName) {
    try {
      if (typeof getSheetByName === 'function') return getSheetByName(tableName);
    } catch (e) {}
    try {
      if (window.getSheetByName) return window.getSheetByName(tableName);
    } catch (e) {}
    return null;
  }

  function eachRow(tableName, callback) {
    var s = sheet(tableName);
    if (!s || !Array.isArray(s.content)) return;
    for (var i = 1; i < s.content.length; i++) {
      var row = s.content[i];
      if (Array.isArray(row)) callback(row, i, s.content[0] || []);
    }
  }

  function text(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback === undefined ? '' : fallback;
    return String(value);
  }

  function number(value, fallback) {
    var n = parseFloat(value);
    return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
  }

  function parseObject(value) {
    try {
      if (!value) return {};
      if (typeof value === 'object') return value;
      return JSON.parse(String(value));
    } catch (e) {
      return {};
    }
  }

  function rankSortValue(value) {
    var raw = text(value, '').trim();
    var numeric = parseInt(raw, 10);
    if (!isNaN(numeric)) return numeric;
    var digitMap = { '零':0, '一':1, '二':2, '两':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9 };
    if (digitMap.hasOwnProperty(raw)) return digitMap[raw];
    var total = 0;
    var rest = raw;
    var hundredIndex = rest.indexOf('百');
    if (hundredIndex > -1) {
      var hundredText = rest.slice(0, hundredIndex) || '一';
      total += (digitMap[hundredText] || 1) * 100;
      rest = rest.slice(hundredIndex + 1);
    }
    var tenIndex = rest.indexOf('十');
    if (tenIndex > -1) {
      var tenText = rest.slice(0, tenIndex) || '一';
      total += (digitMap[tenText] || 1) * 10;
      rest = rest.slice(tenIndex + 1);
    }
    if (rest && digitMap.hasOwnProperty(rest)) total += digitMap[rest];
    return total > 0 ? total : 999;
  }

  function normalizeMessageHistory(value) {
    var parsed = parseObject(value);
    var normalized = {};
    function addRecord(record, index) {
      var key = 'm' + String(index + 1).padStart(3, '0');
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        normalized[key] = { '发送者': '未知', '内容': text(record, ''), '时间': '' };
        return;
      }
      normalized[key] = {
        '发送者': text(record['发送者'] || record.sender || record.from, '未知'),
        '内容': text(record['内容'] || record.content || record.text || record.message, ''),
        '时间': text(record['时间'] || record.time || record.at, '')
      };
    }
    if (Array.isArray(parsed)) {
      parsed.forEach(addRecord);
      return normalized;
    }
    if (parsed && Array.isArray(parsed.messages)) {
      parsed.messages.forEach(addRecord);
      return normalized;
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  try {
    var heroRow = -1;
    try {
      if (typeof findRowByColumn === 'function') heroRow = findRowByColumn('主角属性表', '角色名', '主角');
      else if (window.findRowByColumn) heroRow = window.findRowByColumn('主角属性表', '角色名', '主角');
    } catch (e) {}

    sd.主角 = {
      姓名: '主角', 性别: '未知', 种族: '人族', 容貌: '未知', 出身: '散修', 境界: '凡人（DC:0）', 宗门: '无', 宗门贡献: 0,
      所在界: '玄天界', 生命: 100, 精血: 100, 灵力: 100, 修为: 0, 神识: 100, 道心: 50, 神念: '无', 灵根: '未知', 状态: '无异常',
      身形: '未知', 衣着: '未知', 储物袋: {}, 功法: {}, 器物: {}, 气运: {},
      炼丹: { 阶级: '未入门', 熟练度: 0, 成功率: 0, 次数: 0 },
      炼器: { 阶级: '未入门', 熟练度: 0, 成功率: 0, 次数: 0 }
    };

    if (heroRow !== -1) {
      var h = function(c) {
        try {
          if (typeof getCellByHeader === 'function') return getCellByHeader('主角属性表', heroRow, c);
          if (window.getCellByHeader) return window.getCellByHeader('主角属性表', heroRow, c);
        } catch (e) {}
        return null;
      };
      sd.主角.姓名 = text(h('姓名'), '主角');
      sd.主角.性别 = text(h('性别'), '未知');
      sd.主角.种族 = text(h('种族'), '人族');
      sd.主角.容貌 = text(h('容貌'), '未知');
      sd.主角.出身 = text(h('出身'), '散修');
      sd.主角.境界 = text(h('境界'), '凡人（DC:0）');
      sd.主角.宗门 = text(h('宗门'), '无');
      sd.主角.宗门贡献 = number(h('宗门贡献'), 0);
      sd.主角.所在界 = text(h('所在界'), '玄天界');
      sd.主角.生命 = number(h('生命'), 100);
      sd.主角.精血 = number(h('精血'), 100);
      sd.主角.灵力 = number(h('灵力'), 100);
      sd.主角.修为 = number(h('修为'), 0);
      sd.主角.神识 = number(h('神识'), 100);
      sd.主角.道心 = number(h('道心'), 50);
      sd.主角.神念 = text(h('神念'), '无');
      sd.主角.灵根 = text(h('灵根'), '未知');
      sd.主角.状态 = text(h('状态'), '无异常');
      sd.主角.身形 = text(h('身形'), '未知');
      sd.主角.衣着 = text(h('衣着'), '未知');
      sd.主角.炼丹 = { 阶级: text(h('炼丹阶级'), '未入门'), 熟练度: number(h('炼丹熟练度'), 0), 成功率: number(h('炼丹成功率'), 0), 次数: number(h('炼丹次数'), 0) };
      sd.主角.炼器 = { 阶级: text(h('炼器阶级'), '未入门'), 熟练度: number(h('炼器熟练度'), 0), 成功率: number(h('炼器成功率'), 0), 次数: number(h('炼器次数'), 0) };
    }

    eachRow('储物袋表', function(r) {
      if (!r[1]) return;
      sd.主角.储物袋[text(r[1])] = { 描述: text(r[2]), 数量: number(r[3], 0) };
    });

    eachRow('功法表', function(r) {
      if (!r[1]) return;
      sd.主角.功法[text(r[1])] = { 类型: text(r[2], '未知'), 境界: text(r[3], '未入门'), 熟练度: number(r[4], 0), 描述: text(r[5]) };
    });

    eachRow('器物表', function(r) {
      if (!r[1]) return;
      sd.主角.器物[text(r[1])] = { 等级: text(r[2], '未知'), 类型: text(r[3], '未知'), 损耗度: number(r[4], 0), 状态: text(r[5], '正常'), 描述: text(r[6]) };
    });

    eachRow('气运表', function(r) {
      if (!r[1]) return;
      sd.主角.气运[text(r[1])] = { 类型: text(r[2], '被动'), 效果: text(r[3]), 使用状态: text(r[4], '常驻'), 剩余次数: r[5] === '' || r[5] == null ? null : text(r[5]), 压制状态: text(r[6], '正常') };
    });

    sd.世界 = { 当前时间: '未知', 当前地点: '未知', 危机程度: '无', 动向: {} };
    var worldRows = [];
    eachRow('世界状态表', function(r) { if (r[1] === '全局') worldRows.push(r); });
    if (worldRows.length) {
      var wr = worldRows[0];
      sd.世界 = { 当前时间: text(wr[2], '未知'), 当前地点: text(wr[3], '未知'), 危机程度: text(wr[4], '无'), 动向: parseObject(wr[5]) };
    }

    // 独立动向表是详细事件的唯一数据源；世界状态表的动向仅作旧数据兼容。
    sd.动向 = {};
    eachRow('动向表', function(r) {
      if (!r[1]) return;
      sd.动向[text(r[1])] = {
        类型: text(r[2], '事件'),
        地点: text(r[3], '未知'),
        状态: text(r[4], '起'),
        描述: text(r[5]),
        最近更新: text(r[6])
      };
    });
    if (Object.keys(sd.动向).length > 0) sd.世界.动向 = sd.动向;

    sd.道侣 = {};
    eachRow('道侣表', function(r) {
      if (!r[1]) return;
      sd.道侣[text(r[1])] = {
        种族: text(r[2], '未知'), 状态: text(r[3], '正常'), 境界: text(r[4], '未知'), 亲密: number(r[5], 0),
        生命: number(r[6], 0), 灵力: number(r[7], 0), 修为: number(r[8], 0), 道心: number(r[9], 0),
        性格: text(r[10], '未知'), 外观: text(r[11], '未知'), 身高: text(r[12], '未知'), 背景: text(r[13], '未知'), 神通: text(r[14], '无'), 心声: text(r[15], '无')
      };
    });

    sd.灵宠 = {};
    eachRow('灵宠表', function(r) {
      if (!r[1]) return;
      sd.灵宠[text(r[1])] = {
        性别: text(r[2], '未知'), 种族: text(r[3], '未知'), 境界: text(r[4], '未知'),
        生命: number(r[5], 0), 灵力: number(r[6], 0), 修为: number(r[7], 0), 亲密度: number(r[8], 0),
        性格: text(r[9], '未知'), 容貌外观: text(r[10], '未知'), 神通: text(r[11], '无'), 状态: text(r[12], '正常'), 心声: text(r[13], '无')
      };
    });

    sd.人物 = {};
    eachRow('NPC表', function(r) {
      if (!r[1]) return;
      sd.人物[text(r[1])] = {
        头衔: text(r[2]), 境界: text(r[3], '未知'), 好感: number(r[4], 0), 关系阶段: text(r[5], '陌生'),
        生命: number(r[6], 0), 灵力: number(r[7], 0), 修为: number(r[8], 0), 道心: number(r[9], 0), 性格: text(r[10], '未知'), 描述: text(r[11])
      };
    });

    sd.机遇 = {};
    eachRow('机遇表', function(r) {
      if (!r[1]) return;
      sd.机遇[text(r[1])] = { 难度: text(r[2], '未知'), 目标: text(r[3]), 机缘: text(r[4]), 引言: text(r[5]) };
    });

    sd.绝色榜 = {};
    eachRow('绝色榜表', function(r) {
      if (!r[1]) return;
      sd.绝色榜[text(r[1])] = { 排名: text(r[2], '未知'), 排名序: rankSortValue(r[2]), 头衔: text(r[3]), 仙姿: text(r[4]), 群芳谱: text(r[5]) };
    });

    sd.玉简 = {};
    eachRow('玉简好友表', function(r) {
      if (!r[1]) return;
      sd.玉简[text(r[1])] = { 性别: text(r[2], '未知'), 境界: text(r[3], '未知'), 关系: text(r[4], '陌生'), 好感度: number(r[5], 0), 历史记录: normalizeMessageHistory(r[6]) };
    });

    var lineKey = '$器灵台词';
    sd[lineKey] = [];
    eachRow('器灵台词表', function(r) { if (r[1]) sd[lineKey].push(text(r[1])); });
  } catch(e) {
    console.error('[道渊状态栏] getAllVariables 出错:', e);
  }
  return data;
}
