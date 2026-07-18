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

(function installDaoyuanStatusDb() {
  'use strict';

  const roots = [];
  let localVariablesProxy = null;
  function addRoot(root) {
    try {
      if (root && !roots.includes(root)) roots.push(root);
    } catch (error) {}
  }
  addRoot(window);
  try { addRoot(window.parent); } catch (error) {}
  try { addRoot(window.top); } catch (error) {}

  function getApi() {
    for (const root of roots) {
      try {
        if (root.AutoCardUpdaterAPI) return root.AutoCardUpdaterAPI;
      } catch (error) {}
    }
    return null;
  }

  function getVariablesReader() {
    for (const root of roots) {
      try {
        if (typeof root.getAllVariables === 'function' && root.getAllVariables !== localVariablesProxy) {
          return root.getAllVariables.bind(root);
        }
      } catch (error) {}
    }
    return null;
  }

  function readVariables() {
    const reader = getVariablesReader();
    return reader ? reader() : { stat_data: {} };
  }

  localVariablesProxy = function daoyuanDelayedVariablesReader() {
    return readVariables();
  };
  if (typeof window.getAllVariables !== 'function') {
    window.getAllVariables = localVariablesProxy;
  }

  function exportTables() {
    const api = getApi();
    if (!api || typeof api.exportTableAsJson !== 'function') return {};
    return api.exportTableAsJson() || {};
  }

  function getSheet(tableName) {
    const tables = exportTables();
    for (const key of Object.keys(tables)) {
      const sheet = tables[key];
      if (sheet && sheet.name === tableName && Array.isArray(sheet.content)) return sheet;
    }
    return null;
  }

  function locateRow(tableName, keyColumn, keyValue) {
    const sheet = getSheet(tableName);
    if (!sheet || !Array.isArray(sheet.content[0])) return null;
    const headers = sheet.content[0];
    const keyIndex = headers.indexOf(keyColumn);
    if (keyIndex < 0) return null;
    for (let rowIndex = 1; rowIndex < sheet.content.length; rowIndex++) {
      const row = sheet.content[rowIndex];
      if (Array.isArray(row) && String(row[keyIndex] ?? '') === String(keyValue ?? '')) {
        return { sheet, headers, row, rowIndex };
      }
    }
    return null;
  }

  function resolvePath(path) {
    const parts = Array.isArray(path) ? path : [];
    const scope = parts[0];
    if (scope === '主角' && parts.length === 1) {
      return { table: '主角属性表', keyColumn: '角色名', keyValue: '主角', protected: true };
    }
    if (scope === '主角' && parts[1] === '功法') {
      return { table: '功法表', keyColumn: '功法名', keyValue: parts[2] };
    }
    if (scope === '主角' && parts[1] === '储物袋') {
      return { table: '储物袋表', keyColumn: '物品名', keyValue: parts[2] };
    }
    if (scope === '主角' && parts[1] === '器物') {
      return { table: '器物表', keyColumn: '器物名', keyValue: parts[2] };
    }
    if (scope === '主角' && parts[1] === '气运') {
      return { table: '气运表', keyColumn: '气运名', keyValue: parts[2] };
    }
    if (scope === '人物') return { table: 'NPC表', keyColumn: '姓名', keyValue: parts[1] };
    if (scope === '道侣') return { table: '道侣表', keyColumn: '姓名', keyValue: parts[1] };
    if (scope === '灵宠') return { table: '灵宠表', keyColumn: '姓名', keyValue: parts[1] };
    if (scope === '机遇') return { table: '机遇表', keyColumn: '任务名', keyValue: parts[1] };
    if (scope === '绝色榜') return { table: '绝色榜表', keyColumn: '仙子姓名', keyValue: parts[1] };
    if (scope === '玉简') return { table: '玉简好友表', keyColumn: '好友姓名', keyValue: parts[1] };
    if ((scope === '世界' && parts[1] === '动向') || scope === '动向') {
      return { table: '动向表', keyColumn: '动向名', keyValue: scope === '世界' ? parts[2] : parts[1] };
    }
    return null;
  }

  function filterWritableData(headers, keyColumn, values) {
    const allowed = new Set((headers || []).slice(1));
    allowed.delete(keyColumn);
    const result = {};
    Object.entries(values || {}).forEach(([key, value]) => {
      if (allowed.has(key) && value !== undefined) result[key] = value;
    });
    return result;
  }

  async function update(path, values) {
    const api = getApi();
    const target = resolvePath(path);
    if (!api || !target || typeof api.updateRow !== 'function') return false;
    const located = locateRow(target.table, target.keyColumn, target.keyValue);
    if (!located) return false;
    const data = filterWritableData(located.headers, target.keyColumn, values);
    if (!Object.keys(data).length) return false;
    return !!(await api.updateRow(target.table, located.rowIndex, data));
  }

  async function remove(path) {
    const api = getApi();
    const target = resolvePath(path);
    if (!api || !target || target.protected || typeof api.deleteRow !== 'function') return false;
    const located = locateRow(target.table, target.keyColumn, target.keyValue);
    if (!located) return false;
    return !!(await api.deleteRow(target.table, located.rowIndex));
  }

  function parseHistory(value) {
    let parsed = value;
    if (typeof parsed === 'string') {
      try { parsed = parsed ? JSON.parse(parsed) : {}; } catch (error) { parsed = {}; }
    }
    if (Array.isArray(parsed)) {
      const normalized = {};
      parsed.forEach((item, index) => { normalized['m' + String(index + 1).padStart(3, '0')] = item; });
      return normalized;
    }
    return parsed && typeof parsed === 'object' ? { ...parsed } : {};
  }

  function readJadeContact(name) {
    const located = locateRow('玉简好友表', '好友姓名', name);
    if (!located) return null;
    const historyIndex = located.headers.indexOf('历史记录');
    return {
      ...located,
      history: parseHistory(historyIndex >= 0 ? located.row[historyIndex] : '{}'),
    };
  }

  async function writeJadeHistory(name, history) {
    const api = getApi();
    if (!api) return false;
    let contact = readJadeContact(name);
    const serialized = JSON.stringify(history || {});
    if (!contact) {
      if (typeof api.insertRow !== 'function') return false;
      const rowIndex = await api.insertRow('玉简好友表', {
        '好友姓名': name,
        '性别': '未知',
        '境界': '未知',
        '关系': '陌生',
        '好感度': 0,
        '历史记录': serialized,
      });
      return rowIndex >= 1;
    }
    if (typeof api.updateCell !== 'function') return false;
    return !!(await api.updateCell('玉简好友表', contact.rowIndex, '历史记录', serialized));
  }

  async function appendJadeMessage(name, sender, content) {
    const contact = readJadeContact(name);
    const history = contact ? contact.history : {};
    const now = new Date();
    const messageId = 'm' + now.getTime() + Math.floor(Math.random() * 1000);
    history[messageId] = {
      '发送者': sender,
      '内容': content,
      '时间': now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
    };
    const success = await writeJadeHistory(name, history);
    return { success, history, messageId };
  }

  async function deleteJadeMessage(name, messageId) {
    const contact = readJadeContact(name);
    if (!contact) return {};
    const history = contact.history;
    delete history[messageId];
    const success = await writeJadeHistory(name, history);
    if (!success) throw new Error('玉简历史写入失败');
    return history;
  }

  async function ready(timeoutMs = 15000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const api = getApi();
      const reader = getVariablesReader();
      if (api && reader && typeof api.exportTableAsJson === 'function') {
        try {
          const variables = reader();
          if (variables && variables.stat_data) {
            if (typeof window.getAllVariables !== 'function') window.getAllVariables = reader;
            return true;
          }
        } catch (error) {}
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('等待shujuku数据桥就绪超时');
  }

  function subscribe(callback) {
    let timer = null;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback(), 50);
    };
    roots.forEach(root => {
      try { root.addEventListener('shujuku-table-updated', handler); } catch (error) {}
    });
    try {
      window.addEventListener('beforeunload', () => {
        roots.forEach(root => {
          try { root.removeEventListener('shujuku-table-updated', handler); } catch (error) {}
        });
      }, { once: true });
    } catch (error) {}
    return handler;
  }

  window.DaoyuanStatusDb = {
    getApi,
    readVariables,
    getSheet,
    locateRow,
    resolvePath,
    update,
    remove,
    readJadeContact,
    writeJadeHistory,
    appendJadeMessage,
    deleteJadeMessage,
    ready,
    subscribe,
  };
})();

function _dy_findApi() {
  var wins = [window];
  try { if (window.parent && window.parent !== window) wins.push(window.parent); } catch(e) {}
  try { if (window.top && window.top !== window) wins.push(window.top); } catch(e) {}
  for (var i = 0; i < wins.length; i++) {
    try { if (wins[i].AutoCardUpdaterAPI) return wins[i].AutoCardUpdaterAPI; } catch(e) {}
  }
  return null;
}

function getSheetByName(tableName) {
  var api = _dy_findApi(); if (!api) return null;
  var all = api.exportTableAsJson();
  for (var key in all) { if (key.indexOf('sheet_') === 0 && all[key].name === tableName) return all[key]; }
  for (var key in all) { if (key.indexOf('sheet_') === 0) { var ddl = (all[key].sourceData && all[key].sourceData.ddl) || ''; var m = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i); if (m && m[1] === tableName) return all[key]; } }
  return null;
}

function getCellByHeader(tableName, rowIndex, colName) {
  var sheet = getSheetByName(tableName); if (!sheet || !sheet.content) return null;
  var headers = sheet.content[0]; var colIdx = headers.indexOf(colName);
  if (colIdx === -1) return null;
  return sheet.content[rowIndex] ? sheet.content[rowIndex][colIdx] : null;
}

function findRowByColumn(tableName, colName, value) {
  var sheet = getSheetByName(tableName); if (!sheet || !sheet.content) return -1;
  var headers = sheet.content[0]; var colIdx = headers.indexOf(colName);
  if (colIdx === -1) return -1;
  for (var i = 1; i < sheet.content.length; i++) { if (sheet.content[i] && String(sheet.content[i][colIdx]) === String(value)) return i; }
  return -1;
}

function safeJsonParse(str) { try { return JSON.parse(str); } catch(e) { return {}; } }

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
