const CHART_COLORS = [
  "#D35D3D",
  "#2F6FED",
  "#2E8B57",
  "#B7791F",
  "#D53F8C",
  "#1F4E5F",
  "#6B46C1",
  "#DD6B20",
];

const EXTRA_FREQUENCIES = ["每日", "每周", "每月", "一次性"];
const STRATEGY_TYPES = [
  "BASELINE",
  "OPEN_ALL_NOW",
  "NO_BOX",
  "CUSTOM_GATE",
  "SMART_GATE",
  "OPEN_EVERY_MILESTONE",
  "SMART_VALUE_GATE",
];

const state = {
  params: {
    startLevel: 378,
    startProgress: 0,
    levelCost: 11000,
    startHourlyRate: 79,
    startBoxes: 1800,
    target102Rate: 102,
    simulateDays: 300,
    monthDays: 30,
    baseDailyHours: 24,
    freeSweeps: 1,
    paidSweeps: 2,
    hoursPerSweep: 2,
    firstBigLevel: 381,
    bigInterval: 20,
    bigRateBonus: 1.5,
  },
  mainlines: [
    { index: 1, day: 50, rateBonus: 2, gateLevel: null, enabled: true, note: "" },
    { index: 2, day: 100, rateBonus: 2, gateLevel: null, enabled: true, note: "" },
    { index: 3, day: 150, rateBonus: 2, gateLevel: 501, enabled: true, note: "" },
    { index: 4, day: 200, rateBonus: 2, gateLevel: 481, enabled: true, note: "" },
    { index: 5, day: 250, rateBonus: 2, gateLevel: 441, enabled: true, note: "" },
  ],
  events: [
    { name: "活动1", day: 14, boxes: 300, enabled: true, note: "" },
    { name: "活动2", day: 28, boxes: 300, enabled: true, note: "" },
    { name: "活动3", day: 42, boxes: 300, enabled: true, note: "" },
  ],
  extras: [
    { name: "每日补充", startDay: 0, endDay: 300, frequency: "每日", amount: 0, enabled: true, note: "" },
    { name: "每周补充", startDay: 0, endDay: 300, frequency: "每周", amount: 0, enabled: true, note: "" },
    { name: "每月补充", startDay: 0, endDay: 300, frequency: "每月", amount: 0, enabled: true, note: "" },
  ],
  strategies: [
    { name: "不开箱基线", type: "BASELINE", targetDay: null, targetLevel: null, enabled: true, note: "" },
    { name: "现在全开", type: "OPEN_ALL_NOW", targetDay: 0, targetLevel: null, enabled: true, note: "" },
    { name: "102后开", type: "NO_BOX", targetDay: null, targetLevel: null, enabled: true, note: "" },
    { name: "第4次冲481", type: "CUSTOM_GATE", targetDay: 200, targetLevel: 481, enabled: true, note: "" },
    { name: "价值判断按门槛冲", type: "SMART_VALUE_GATE", targetDay: null, targetLevel: null, enabled: true, note: "" },
  ],
  results: {},
  summaries: [],
  baselineStrategy: "",
  compareCandidate: "",
  compareStrategies: [],
  detailStrategy: "",
};

const lineChart = echarts.init(document.getElementById("line-chart"));
const barChart = echarts.init(document.getElementById("bar-chart"));
const statusText = document.getElementById("status-text");
const baselineSelect = document.getElementById("baseline-select");
const compareCandidateSelect = document.getElementById("compare-candidate-select");
const detailStrategySelect = document.getElementById("detail-strategy-select");

function dailyHours() {
  return state.params.baseDailyHours + (state.params.freeSweeps + state.params.paidSweeps) * state.params.hoursPerSweep;
}

function parseOptionalInt(value) {
  const text = String(value ?? "").trim();
  const lowered = text.toLowerCase();
  if (!text || lowered.includes("none") || ["null", "nil", "na", "n/a"].includes(lowered)) return null;
  const num = Number(text);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function normalizeFrequency(value) {
  const text = String(value ?? "").trim();
  const lowered = text.toLowerCase();
  if (text === "每日" || lowered === "daily") return "每日";
  if (text === "每周" || lowered === "weekly") return "每周";
  if (text === "每月" || lowered === "monthly") return "每月";
  if (text === "一次性" || lowered === "once" || lowered === "one-time") return "一次性";
  if (text.includes("日")) return "每日";
  if (text.includes("周")) return "每周";
  if (text.includes("月")) return "每月";
  if (text.includes("一次") || lowered.includes("one")) return "一次性";
  return text;
}

function milestoneCount(level) {
  if (level < state.params.firstBigLevel) return 0;
  return Math.floor((level - state.params.firstBigLevel) / state.params.bigInterval) + 1;
}

function levelFromTotalRed(totalRed) {
  const levelsGained = Math.floor(totalRed / state.params.levelCost);
  const progress = totalRed - levelsGained * state.params.levelCost;
  return { level: state.params.startLevel + levelsGained, progress };
}

function computeBaseHourlyRate(level, mainlineBonus, unlocked102) {
  const baseRate = state.params.startHourlyRate + mainlineBonus + milestoneCount(level) * state.params.bigRateBonus;
  return unlocked102 ? Math.max(baseRate, state.params.target102Rate) : baseRate;
}

function isExtraTriggered(extra, day) {
  const frequency = normalizeFrequency(extra.frequency);
  if (day < extra.startDay) return false;
  if (frequency !== "一次性" && day > extra.endDay) return false;
  if (frequency === "每日") return true;
  if (frequency === "每周") return (day - extra.startDay) % 7 === 0;
  if (frequency === "每月") return (day - extra.startDay) % state.params.monthDays === 0;
  if (frequency === "一次性") return day === extra.startDay;
  return false;
}

function redNeededForLevel(targetLevel, totalRed) {
  const current = levelFromTotalRed(totalRed);
  if (targetLevel <= current.level) return 0;
  const targetTotal = (targetLevel - state.params.startLevel) * state.params.levelCost;
  return Math.max(0, targetTotal - totalRed);
}

function boxesNeededForLevel(targetLevel, totalRed, boxRate) {
  const neededRed = redNeededForLevel(targetLevel, totalRed);
  if (neededRed <= 0 || boxRate <= 0) return 0;
  return Math.ceil(neededRed / boxRate);
}

function nextMilestoneLevel(level) {
  if (level < state.params.firstBigLevel) return state.params.firstBigLevel;
  return state.params.firstBigLevel + (Math.floor((level - state.params.firstBigLevel) / state.params.bigInterval) + 1) * state.params.bigInterval;
}

function findActiveGateLevel(mainlinesSeen) {
  let gateLevel = null;
  mainlinesSeen.forEach((update) => {
    if (update.gateLevel !== null && update.gateLevel !== undefined && update.gateLevel !== "") gateLevel = Number(update.gateLevel);
  });
  return gateLevel;
}

function shouldOpenFor102ByValue(currentDay, currentHourlyRate, boxesNeeded, currentGateLevel, futureGateDays) {
  if (currentGateLevel == null) return { shouldOpen: false, note: "当前无有效 102 门槛" };
  if (boxesNeeded <= 0) return { shouldOpen: true, note: "无需开箱即可达到门槛" };
  const nextGateDay = futureGateDays.find((day) => day > currentDay) ?? state.params.simulateDays;
  const advanceDays = Math.max(0, nextGateDay - currentDay);
  const gain = advanceDays * dailyHours() * Math.max(0, state.params.target102Rate - currentHourlyRate);
  const costPerBox = Math.max(0, state.params.target102Rate - currentHourlyRate);
  const cost = boxesNeeded * costPerBox;
  return {
    shouldOpen: gain > cost,
    note: `gain=${gain.toFixed(0)}, cost=${cost.toFixed(0)}, boxes=${boxesNeeded.toFixed(0)}, horizon=${advanceDays}d`,
  };
}

function openBoxes(totalRed, boxes, count, boxRate) {
  const actual = Math.min(Math.max(0, count), boxes);
  const gainedRed = actual * Math.max(0, boxRate);
  return { totalRed: totalRed + gainedRed, boxes: boxes - actual, gainedRed, actual };
}

function simulate(strategy) {
  const states = [];
  let totalRed = state.params.startProgress;
  let boxes = state.params.startBoxes;
  let mainlineBonus = 0;
  let unlocked102 = false;
  let unlockDay = null;

  const mainlineByDay = new Map();
  state.mainlines.filter((item) => item.enabled).forEach((update) => {
    if (!mainlineByDay.has(update.day)) mainlineByDay.set(update.day, []);
    mainlineByDay.get(update.day).push(update);
  });

  const eventsByDay = new Map();
  state.events.filter((item) => item.enabled).forEach((event) => {
    if (!eventsByDay.has(event.day)) eventsByDay.set(event.day, []);
    eventsByDay.get(event.day).push(event);
  });

  const activeExtras = state.extras.filter((item) => item.enabled);
  const futureGateDays = state.mainlines.filter((item) => item.enabled && item.gateLevel != null).map((item) => item.day);
  const seenUpdates = [];

  for (let day = 0; day <= state.params.simulateDays; day += 1) {
    let strategyNote = "";
    let openedBoxesToday = 0;
    let redFromBoxesToday = 0;

    const activityBoxes = (eventsByDay.get(day) || []).reduce((sum, event) => sum + Number(event.boxes || 0), 0);
    boxes += activityBoxes;

    (mainlineByDay.get(day) || []).forEach((update) => {
      mainlineBonus += Number(update.rateBonus || 0);
      seenUpdates.push(update);
    });

    let { level } = levelFromTotalRed(totalRed);
    let activeGateLevel = findActiveGateLevel(seenUpdates);
    let hourlyRate = computeBaseHourlyRate(level, mainlineBonus, unlocked102);
    const currentBoxRate = hourlyRate;
    const isGateDay = (mainlineByDay.get(day) || []).some((update) => update.gateLevel != null);

    if (strategy.type === "OPEN_ALL_NOW" && day === 0 && boxes > 0) {
      const result = openBoxes(totalRed, boxes, boxes, currentBoxRate);
      totalRed = result.totalRed;
      boxes = result.boxes;
      openedBoxesToday += result.actual;
      redFromBoxesToday += result.gainedRed;
      strategyNote = "第0天全开";
    } else if (strategy.type === "CUSTOM_GATE" && strategy.targetDay === day && strategy.targetLevel) {
      const needBoxes = boxesNeededForLevel(strategy.targetLevel, totalRed, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const result = openBoxes(totalRed, boxes, needBoxes, currentBoxRate);
        totalRed = result.totalRed;
        boxes = result.boxes;
        openedBoxesToday += result.actual;
        redFromBoxesToday += result.gainedRed;
        strategyNote = `精准补到 ${strategy.targetLevel}`;
      }
    } else if (strategy.type === "SMART_GATE" && isGateDay && activeGateLevel) {
      const needBoxes = boxesNeededForLevel(activeGateLevel, totalRed, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const result = openBoxes(totalRed, boxes, needBoxes, currentBoxRate);
        totalRed = result.totalRed;
        boxes = result.boxes;
        openedBoxesToday += result.actual;
        redFromBoxesToday += result.gainedRed;
        strategyNote = `主线日补到门槛 ${activeGateLevel}`;
      }
    } else if (strategy.type === "SMART_VALUE_GATE" && isGateDay && activeGateLevel) {
      const needBoxes = boxesNeededForLevel(activeGateLevel, totalRed, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const judge = shouldOpenFor102ByValue(day, hourlyRate, needBoxes, activeGateLevel, futureGateDays);
        strategyNote = judge.note;
        if (judge.shouldOpen) {
          const result = openBoxes(totalRed, boxes, needBoxes, currentBoxRate);
          totalRed = result.totalRed;
          boxes = result.boxes;
          openedBoxesToday += result.actual;
          redFromBoxesToday += result.gainedRed;
          strategyNote = `价值判断通过，补到门槛 ${activeGateLevel}; ${judge.note}`;
        }
      }
    } else if (strategy.type === "OPEN_EVERY_MILESTONE") {
      const milestoneLevel = nextMilestoneLevel(level);
      const needBoxes = boxesNeededForLevel(milestoneLevel, totalRed, currentBoxRate);
      if (needBoxes > 0 && needBoxes <= boxes) {
        const result = openBoxes(totalRed, boxes, needBoxes, currentBoxRate);
        totalRed = result.totalRed;
        boxes = result.boxes;
        openedBoxesToday += result.actual;
        redFromBoxesToday += result.gainedRed;
        strategyNote = `补到大档 ${milestoneLevel}`;
      }
    }

    level = levelFromTotalRed(totalRed).level;
    activeGateLevel = findActiveGateLevel(seenUpdates);
    if (!unlocked102 && activeGateLevel != null && level >= activeGateLevel) {
      unlocked102 = true;
      unlockDay = day;
      strategyNote = `${strategyNote} | 开启102`.replace(/^ \| /, "").trim();
    }

    hourlyRate = computeBaseHourlyRate(level, mainlineBonus, unlocked102);

    if (strategy.type === "NO_BOX" && unlocked102 && boxes > 0) {
      const result = openBoxes(totalRed, boxes, boxes, hourlyRate);
      totalRed = result.totalRed;
      boxes = result.boxes;
      openedBoxesToday += result.actual;
      redFromBoxesToday += result.gainedRed;
      strategyNote = "102后全开";
    }

    const dailyRedball = hourlyRate * dailyHours();
    const extraRedball = activeExtras.reduce((sum, extra) => sum + (isExtraTriggered(extra, day) ? Number(extra.amount || 0) : 0), 0);
    totalRed += dailyRedball + extraRedball;

    const current = levelFromTotalRed(totalRed);
    states.push({
      day,
      level: current.level,
      progress: current.progress,
      displayLevel: current.level + current.progress / state.params.levelCost,
      totalRed,
      hourlyRate,
      boxes,
      openedBoxesToday,
      redFromBoxesToday,
      dailyRedball,
      extraRedball,
      activityBoxes,
      mainlineBonus,
      activeGateLevel,
      updatesSeen: seenUpdates.length,
      unlocked102,
      unlockDay,
      strategyNote,
    });
  }

  return states;
}

function buildSummaries() {
  return Object.entries(state.results)
    .map(([name, rows]) => {
      const strategy = state.strategies.find((item) => item.name === name);
      const last = rows[rows.length - 1];
      return {
        name,
        strategyType: strategy?.type ?? "",
        finalDisplayLevel: last.displayLevel,
        finalBoxes: last.boxes,
        unlockDay: last.unlockDay,
        totalOpenedBoxes: rows.reduce((sum, row) => sum + row.openedBoxesToday, 0),
      };
    })
    .sort((a, b) => b.finalDisplayLevel - a.finalDisplayLevel);
}

function comparedStrategyNames() {
  const names = [];
  if (state.baselineStrategy) names.push(state.baselineStrategy);
  state.compareStrategies.forEach((name) => {
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

function renderParams() {
  const host = document.getElementById("params-form");
  host.innerHTML = "";
  const fields = [
    ["初始等级", "startLevel"],
    ["当前级内进度", "startProgress"],
    ["每级所需红球", "levelCost"],
    ["当前小时红球", "startHourlyRate"],
    ["初始红球箱", "startBoxes"],
    ["102目标小时量", "target102Rate"],
    ["模拟天数", "simulateDays"],
    ["每月周期天数", "monthDays"],
    ["基础日常小时", "baseDailyHours"],
    ["免费扫荡次数", "freeSweeps"],
    ["购买扫荡次数", "paidSweeps"],
    ["每次扫荡小时", "hoursPerSweep"],
  ];

  fields.forEach(([label, key]) => {
    const item = document.createElement("label");
    item.className = "field";
    item.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.value = state.params[key];
    input.addEventListener("input", (event) => {
      state.params[key] = Number(event.target.value || 0);
      renderParams();
      renderMetrics();
    });
    item.appendChild(input);
    host.appendChild(item);
  });

  [
    ["自动计算的每日小时数", dailyHours().toFixed(1)],
    ["首个大档等级", state.params.firstBigLevel],
    ["大档间隔", state.params.bigInterval],
  ].forEach(([label, value]) => {
    const item = document.createElement("label");
    item.className = "field";
    item.innerHTML = `<span>${label}</span><input value="${value}" disabled>`;
    host.appendChild(item);
  });
}

function createField(label, value, onChange, options = {}) {
  const wrap = document.createElement("label");
  wrap.className = `field ${options.long ? "long" : ""} ${options.fullSpan ? "full-span" : ""}`;
  wrap.innerHTML = `<span>${label}</span>`;

  if (options.type === "checkbox") {
    const row = document.createElement("div");
    row.className = "toggle-wrap";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    const text = document.createElement("span");
    text.textContent = input.checked ? "已启用" : "未启用";
    input.addEventListener("change", (event) => {
      text.textContent = event.target.checked ? "已启用" : "未启用";
      onChange(event.target.checked);
    });
    row.appendChild(input);
    row.appendChild(text);
    wrap.appendChild(row);
    return wrap;
  }

  const input = options.type === "select" ? document.createElement("select") : document.createElement("input");
  if (options.type === "select") {
    options.options.forEach((option) => {
      const el = document.createElement("option");
      el.value = option;
      el.textContent = option;
      if (String(option) === String(value ?? "")) el.selected = true;
      input.appendChild(el);
    });
  } else {
    input.type = options.type || "text";
    input.value = value ?? "";
  }

  input.addEventListener(options.type === "select" ? "change" : "input", (event) => {
    const raw = event.target.value;
    if (options.cast === "number") onChange(Number(raw || 0));
    else if (options.cast === "optionalInt") onChange(parseOptionalInt(raw));
    else onChange(raw);
  });
  wrap.appendChild(input);
  return wrap;
}

function renderGenericRows(listId, rows, schema, onDelete) {
  const host = document.getElementById(listId);
  host.innerHTML = "";
  rows.forEach((row, index) => {
    const card = document.createElement("div");
    card.className = "editor-row";
    const grid = document.createElement("div");
    grid.className = "editor-grid";
    schema.forEach((field) => {
      grid.appendChild(createField(field.label, row[field.key], (value) => { row[field.key] = value; }, field));
    });
    const del = document.createElement("button");
    del.className = "icon-btn";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => onDelete(index));
    grid.appendChild(del);
    card.appendChild(grid);
    host.appendChild(card);
  });
}

function renderTimelineRows(listId, rows, rowType, onDelete) {
  const host = document.getElementById(listId);
  host.innerHTML = "";
  rows.forEach((row, index) => {
    const card = document.createElement("div");
    card.className = `timeline-card ${rowType}`;

    const meta = document.createElement("div");
    meta.className = "timeline-meta";
    meta.innerHTML = `<div class="timeline-badge">${rowType === "event" ? "活动事件" : `主线 #${row.index}`}</div>`;
    const del = document.createElement("button");
    del.className = "icon-btn";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => onDelete(index));
    meta.appendChild(del);
    card.appendChild(meta);

    const grid = document.createElement("div");
    grid.className = "timeline-grid";

    if (rowType === "mainline") {
      grid.appendChild(createField("序号", row.index, (value) => { row.index = value; }, { type: "number", cast: "number" }));
      grid.appendChild(createField("天数", row.day, (value) => { row.day = value; }, { type: "number", cast: "number" }));
      grid.appendChild(createField("小时加成", row.rateBonus, (value) => { row.rateBonus = value; }, { type: "number", cast: "number" }));
      grid.appendChild(createField("102门槛", row.gateLevel, (value) => { row.gateLevel = value; }, { type: "text", cast: "optionalInt" }));
      grid.appendChild(createField("启用", row.enabled, (value) => { row.enabled = value; }, { type: "checkbox" }));
      grid.appendChild(createField("备注", row.note, (value) => { row.note = value; }, { type: "text", long: true }));
    } else {
      grid.appendChild(createField("名称", row.name, (value) => { row.name = value; }, { type: "text" }));
      grid.appendChild(createField("发生天数", row.day, (value) => { row.day = value; }, { type: "number", cast: "number" }));
      grid.appendChild(createField("获得箱子", row.boxes, (value) => { row.boxes = value; }, { type: "number", cast: "number" }));
      grid.appendChild(createField("启用", row.enabled, (value) => { row.enabled = value; }, { type: "checkbox" }));
      grid.appendChild(createField("备注", row.note, (value) => { row.note = value; }, { type: "text", long: true }));
    }

    card.appendChild(grid);
    host.appendChild(card);
  });
}

function renderEditors() {
  renderTimelineRows("mainlines-list", state.mainlines, "mainline", (index) => {
    state.mainlines.splice(index, 1);
    renderEditors();
  });

  renderTimelineRows("events-list", state.events, "event", (index) => {
    state.events.splice(index, 1);
    renderEditors();
  });

  renderGenericRows(
    "extras-list",
    state.extras,
    [
      { key: "name", label: "名称", type: "text" },
      { key: "startDay", label: "开始", type: "number", cast: "number" },
      { key: "endDay", label: "结束", type: "number", cast: "number" },
      { key: "frequency", label: "类型", type: "select", options: EXTRA_FREQUENCIES },
      { key: "amount", label: "红球", type: "number", cast: "number" },
      { key: "enabled", label: "启用", type: "checkbox" },
      { key: "note", label: "备注", type: "text", fullSpan: true },
    ],
    (index) => {
      state.extras.splice(index, 1);
      renderEditors();
    },
  );

  renderGenericRows(
    "strategies-list",
    state.strategies,
    [
      { key: "name", label: "名称", type: "text" },
      { key: "type", label: "类型", type: "select", options: STRATEGY_TYPES },
      { key: "targetDay", label: "目标天", type: "text", cast: "optionalInt" },
      { key: "targetLevel", label: "目标级", type: "text", cast: "optionalInt" },
      { key: "enabled", label: "启用", type: "checkbox" },
      { key: "note", label: "备注", type: "text", fullSpan: true },
    ],
    (index) => {
      state.strategies.splice(index, 1);
      renderEditors();
    },
  );
}

function renderMetrics() {
  const host = document.getElementById("metrics-grid");
  host.innerHTML = "";
  const best = state.summaries[0];
  const unlockDays = state.summaries.map((item) => item.unlockDay).filter((item) => item != null);
  const items = [
    ["当前最佳策略", best ? best.name : "--"],
    ["最高最终等级", best ? best.finalDisplayLevel.toFixed(2) : "--"],
    ["最快 102 开启", unlockDays.length ? `第 ${Math.min(...unlockDays)} 天` : "-"],
    ["策略数量", String(state.summaries.length)],
  ];
  items.forEach(([title, value]) => {
    const card = document.createElement("div");
    card.className = "metric-card";
    card.innerHTML = `<div class="metric-title">${title}</div><div class="metric-value">${value}</div>`;
    host.appendChild(card);
  });
}

function fillSelect(select, options, value, allowEmpty = false) {
  select.innerHTML = "";
  if (allowEmpty) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "请选择";
    select.appendChild(empty);
  }
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option;
    if (option === value) el.selected = true;
    select.appendChild(el);
  });
  if (!options.includes(value) && allowEmpty) select.value = "";
}

function syncCompareSelectors() {
  const names = state.summaries.map((item) => item.name);
  if (!state.baselineStrategy && names.length) state.baselineStrategy = names[0];
  if (!names.includes(state.baselineStrategy)) state.baselineStrategy = names[0] || "";
  if (!state.detailStrategy && names.length) state.detailStrategy = names[0];
  if (!names.includes(state.detailStrategy)) state.detailStrategy = names[0] || "";
  state.compareStrategies = state.compareStrategies.filter((name) => names.includes(name) && name !== state.baselineStrategy);

  fillSelect(baselineSelect, names, state.baselineStrategy, true);
  fillSelect(compareCandidateSelect, names.filter((name) => name !== state.baselineStrategy && !state.compareStrategies.includes(name)), state.compareCandidate, true);
  fillSelect(detailStrategySelect, names, state.detailStrategy, true);

  const chips = document.getElementById("compare-chips");
  chips.innerHTML = "";
  state.compareStrategies.forEach((name) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${name}</span>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.addEventListener("click", () => {
      state.compareStrategies = state.compareStrategies.filter((item) => item !== name);
      syncCompareSelectors();
      renderCharts();
    });
    chip.appendChild(btn);
    chips.appendChild(chip);
  });
}

function comparedNames() {
  const names = [];
  if (state.baselineStrategy) names.push(state.baselineStrategy);
  state.compareStrategies.forEach((name) => {
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

function renderCharts() {
  const names = comparedNames();
  if (!names.length) {
    lineChart.setOption({ title: { text: "运行模拟后显示策略曲线", left: "center", top: "middle" }, series: [] }, true);
    barChart.setOption({ title: { text: "暂无对比数据", left: "center", top: "middle" }, series: [] }, true);
    return;
  }

  const lineSeries = names.map((name, index) => {
    const rows = state.results[name] || [];
    const unlockDay = rows.at(-1)?.unlockDay;
    return {
      name,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.5, color: CHART_COLORS[index % CHART_COLORS.length] },
      itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
      data: rows.map((row) => [row.day, Number(row.displayLevel.toFixed(4))]),
      markLine: unlockDay == null ? undefined : {
        symbol: "none",
        lineStyle: { type: "dashed", color: CHART_COLORS[index % CHART_COLORS.length], width: 1.1, opacity: 0.6 },
        label: { formatter: `102@${unlockDay}` },
        data: [{ xAxis: unlockDay }],
      },
    };
  });

  lineChart.setOption({
    animation: true,
    grid: { left: 56, right: 24, top: 56, bottom: 60 },
    legend: { top: 10 },
    toolbox: {
      right: 10,
      feature: { saveAsImage: { title: "导出 PNG" }, dataZoom: {}, restore: {} },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      backgroundColor: "rgba(17,24,39,0.92)",
      borderWidth: 0,
      textStyle: { color: "#ffffff" },
    },
    xAxis: { type: "value", name: "天数", nameLocation: "middle", nameGap: 30 },
    yAxis: { type: "value", name: "等级" },
    series: lineSeries,
  }, true);

  const barRows = state.summaries.filter((row) => names.includes(row.name));
  barChart.setOption({
    grid: { left: 56, right: 24, top: 26, bottom: 70 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category", data: barRows.map((row) => row.name), axisLabel: { rotate: 16 } },
    yAxis: { type: "value", name: "最终等级" },
    series: [{
      type: "bar",
      data: barRows.map((row, index) => ({
        value: Number(row.finalDisplayLevel.toFixed(4)),
        itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
      })),
    }],
  }, true);
}

function renderSummaryTable() {
  const body = document.getElementById("summary-body");
  body.innerHTML = "";
  state.summaries.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = `summary-clickable ${row.name === state.detailStrategy ? "active" : ""}`;
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.strategyType}</td>
      <td>${row.finalDisplayLevel.toFixed(2)}</td>
      <td>${row.finalBoxes.toFixed(0)}</td>
      <td>${row.totalOpenedBoxes.toFixed(0)}</td>
      <td>${row.unlockDay == null ? "-" : row.unlockDay}</td>
    `;
    tr.addEventListener("click", () => {
      state.detailStrategy = row.name;
      syncCompareSelectors();
      renderSummaryTable();
      renderDetailTable();
      renderCharts();
    });
    body.appendChild(tr);
  });
}

function renderDetailTable() {
  const body = document.getElementById("detail-body");
  body.innerHTML = "";
  const rows = state.results[state.detailStrategy] || [];
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.day}</td>
      <td>${row.displayLevel.toFixed(2)}</td>
      <td>${row.hourlyRate.toFixed(2)}</td>
      <td>${row.boxes.toFixed(0)}</td>
      <td>${row.openedBoxesToday.toFixed(0)}</td>
      <td>${row.dailyRedball.toFixed(0)}</td>
      <td>${row.extraRedball.toFixed(0)}</td>
      <td>${row.activeGateLevel == null ? "-" : row.activeGateLevel}</td>
      <td>${row.unlocked102 ? "是" : "否"}</td>
      <td>${row.strategyNote || ""}</td>
    `;
    body.appendChild(tr);
  });
}

function runSimulation() {
  try {
    const enabledStrategies = state.strategies.filter((strategy) => strategy.enabled);
    if (!enabledStrategies.length) {
      statusText.textContent = "至少启用一个策略";
      return;
    }
    state.results = {};
    enabledStrategies.forEach((strategy) => {
      state.results[strategy.name] = simulate(strategy);
    });
    state.summaries = buildSummaries();
    syncCompareSelectors();
    renderMetrics();
    renderCharts();
    renderSummaryTable();
    renderDetailTable();
    statusText.textContent = `计算完成，共 ${state.summaries.length} 个策略`;
  } catch (error) {
    console.error(error);
    statusText.textContent = `计算失败：${error.message}`;
  }
}

function exportCurrentCSV() {
  const rows = state.results[state.detailStrategy];
  if (!rows || !rows.length) {
    statusText.textContent = "请先计算并选择一个明细策略";
    return;
  }
  const data = [
    ["day", "level", "progress", "display_level", "hourly_rate", "boxes", "opened_boxes_today", "daily_redball", "extra_redball", "activity_boxes", "mainline_bonus", "active_gate_level", "updates_seen", "unlocked_102", "unlock_day", "strategy_note"],
    ...rows.map((row) => [
      row.day,
      row.level,
      row.progress.toFixed(2),
      row.displayLevel.toFixed(4),
      row.hourlyRate.toFixed(2),
      row.boxes.toFixed(0),
      row.openedBoxesToday.toFixed(0),
      row.dailyRedball.toFixed(2),
      row.extraRedball.toFixed(2),
      row.activityBoxes.toFixed(2),
      row.mainlineBonus.toFixed(2),
      row.activeGateLevel ?? "",
      row.updatesSeen,
      row.unlocked102 ? 1 : 0,
      row.unlockDay ?? "",
      row.strategyNote ?? "",
    ]),
  ];
  const csv = data.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.detailStrategy}_daily_detail.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportChartPNG() {
  const url = lineChart.getDataURL({ pixelRatio: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.href = url;
  link.download = "nikke_strategy_chart.png";
  link.click();
}

function bindCollapsible() {
  document.querySelectorAll(".collapsible").forEach((section) => {
    const toggle = section.querySelector(".collapse-toggle");
    toggle.addEventListener("click", () => {
      section.classList.toggle("is-open");
      const icon = section.querySelector(".collapse-icon");
      icon.textContent = section.classList.contains("is-open") ? "−" : "+";
    });
  });
}

function bindEvents() {
  document.getElementById("run-btn").addEventListener("click", runSimulation);
  document.getElementById("export-csv-btn").addEventListener("click", exportCurrentCSV);
  document.getElementById("export-png-btn").addEventListener("click", exportChartPNG);

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.add;
      if (type === "mainlines") state.mainlines.push({ index: state.mainlines.length + 1, day: 0, rateBonus: 2, gateLevel: null, enabled: true, note: "" });
      if (type === "events") state.events.push({ name: "新活动", day: 0, boxes: 300, enabled: true, note: "" });
      if (type === "extras") state.extras.push({ name: "新来源", startDay: 0, endDay: state.params.simulateDays, frequency: "每日", amount: 0, enabled: true, note: "" });
      if (type === "strategies") state.strategies.push({ name: "新策略", type: "BASELINE", targetDay: null, targetLevel: null, enabled: true, note: "" });
      renderEditors();
    });
  });

  baselineSelect.addEventListener("change", (event) => {
    state.baselineStrategy = event.target.value;
    state.compareStrategies = state.compareStrategies.filter((name) => name !== state.baselineStrategy);
    syncCompareSelectors();
    renderCharts();
  });

  compareCandidateSelect.addEventListener("change", (event) => {
    state.compareCandidate = event.target.value;
  });

  detailStrategySelect.addEventListener("change", (event) => {
    state.detailStrategy = event.target.value;
    renderSummaryTable();
    renderDetailTable();
    renderCharts();
  });

  document.getElementById("add-compare-btn").addEventListener("click", () => {
    if (!state.compareCandidate) return;
    if (state.compareCandidate === state.baselineStrategy) return;
    if (state.compareStrategies.includes(state.compareCandidate)) return;
    state.compareStrategies.push(state.compareCandidate);
    state.compareCandidate = "";
    syncCompareSelectors();
    renderCharts();
  });

  window.addEventListener("resize", () => {
    lineChart.resize();
    barChart.resize();
  });
}

bindCollapsible();
bindEvents();
renderParams();
renderEditors();
runSimulation();
