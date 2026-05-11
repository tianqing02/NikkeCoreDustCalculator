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
const EXTRA_RESOURCE_TYPES = ["芯尘", "芯尘箱"];
const STRATEGY_TYPES = [
  "获得即开",
  "完全不开",
  "主线后开",
  "最后一天全开",
];

const ACTIVITY_MODES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  ONCE: "once",
};

const ACTIVITY_EDITOR_MODES = {
  CUSTOM: "自定义",
  PRESET: "预设",
};

const FIXED_BASE_DAILY_HOURS = 24;
const FIXED_FREE_SWEEPS = 1;
const FIXED_HOURS_PER_SWEEP = 2;
const DEFAULT_START_DATE = formatDateInput(new Date());
const NIKKE_REMOTE_BASE = "https://nikkeoutpost.netlify.app";
const FALLBACK_NIKKE_DATA = window.NIKKE_DATA_SNAPSHOT || null;
const ESTIMATE_RECENT_CHAPTERS = 20;
const ESTIMATE_FUTURE_CHAPTER_BUFFER = 12;
const STORAGE_KEY = "nikke-core-dust-calculator-config-v1";
const PERSISTED_PARAM_KEYS = [
  "startLevel",
  "startProgress",
  "startHourlyRate",
  "startBoxes",
  "currentNormalStageId",
  "currentHardStageId",
  "simulateDays",
  "paidSweeps",
];

const CORE_DUST_BREAKPOINTS = [
  { nextLevel: 11, cost: 20 },
  { nextLevel: 21, cost: 40 },
  { nextLevel: 41, cost: 80 },
  { nextLevel: 61, cost: 400 },
  { nextLevel: 81, cost: 1000 },
  { nextLevel: 101, cost: 2000 },
  { nextLevel: 121, cost: 4500 },
  { nextLevel: 141, cost: 7000 },
  { nextLevel: 161, cost: 7000 },
  { nextLevel: 181, cost: 8000 },
];

const CORE_DUST_RANGES = [
  { from: 201, to: 250, cost: 10000 },
  { from: 251, to: 300, cost: 10000 },
  { from: 301, to: 350, cost: 10000 },
  { from: 351, to: 400, cost: 11000 },
  { from: 401, to: 450, cost: 12000 },
  { from: 451, to: 500, cost: 13000 },
  { from: 501, to: 550, cost: 14000 },
  { from: 551, to: 600, cost: 15000 },
  { from: 601, to: 650, cost: 16000 },
  { from: 651, to: 700, cost: 17000 },
  { from: 701, to: 750, cost: 18000 },
  { from: 751, to: 800, cost: 19000 },
  { from: 801, to: 9999, cost: 20000 },
];

function defaultStrategies() {
  return [
    { name: "获得即开", type: "获得即开", enabled: true, note: "每次拥有箱子时，立刻按当时小时收益全部打开。" },
    { name: "完全不开", type: "完全不开", enabled: true, note: "全程不主动开箱，只保留箱子库存。" },
    { name: "主线后开", type: "主线后开", enabled: true, note: "每次普通主线更新并重算基地收益后，按当时小时收益打开库存箱子。" },
    { name: "最后一天全开", type: "最后一天全开", enabled: true, note: "只在模拟最后一天按当时小时收益打开全部库存箱子。" },
  ];
}

function parseDateInput(text) {
  if (!text) return null;
  const [year, month, day] = String(text).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDateString(baseText, days) {
  const baseDate = parseDateInput(baseText) ?? new Date();
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return formatDateInput(next);
}

function mainlineChapterForIndex(index) {
  return Number(state.params.currentMainlineChapter || 34) + 2 + index * 2;
}

function formatMainlineLabel(chapter) {
  return `主线${chapter}章`;
}

function defaultMainlineLabel(index) {
  return formatMainlineLabel(mainlineChapterForIndex(index));
}

function syncMainlineChaptersByDate() {
  const sorted = state.mainlines
    .map((item, index) => ({
      index,
      timestamp: parseDateInput(item.date)?.getTime() ?? Date.now() + index * 86400000,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  sorted.forEach((item, order) => {
    state.mainlines[item.index].chapter = mainlineChapterForIndex(order);
  });
}

const state = {
  params: {
    startLevel: 378,
    startProgress: 0,
    startHourlyRate: 79,
    startBoxes: 1800,
    currentNormalStageId: "",
    currentHardStageId: "",
    currentBaseLevel: 1,
    currentMainlineChapter: 34,
    simulateDays: 300,
    paidSweeps: 2,
    startDate: DEFAULT_START_DATE,
  },
  mainlines: [
    { chapter: 36, date: offsetDateString(DEFAULT_START_DATE, 50) },
    { chapter: 38, date: offsetDateString(DEFAULT_START_DATE, 100) },
    { chapter: 40, date: offsetDateString(DEFAULT_START_DATE, 150) },
    { chapter: 42, date: offsetDateString(DEFAULT_START_DATE, 200) },
    { chapter: 44, date: offsetDateString(DEFAULT_START_DATE, 250) },
  ],
  hardlines: [],
  events: [],
  activityConfig: {
    mode: ACTIVITY_EDITOR_MODES.PRESET,
  },
  extras: [
    { name: "每日补充", startDate: DEFAULT_START_DATE, startDay: 0, endDay: 300, frequency: "每日", resourceType: "芯尘", amount: 0, enabled: true, note: "" },
    { name: "每周补充", startDate: DEFAULT_START_DATE, startDay: 0, endDay: 300, frequency: "每周", resourceType: "芯尘", amount: 0, enabled: true, note: "" },
    { name: "每月补充", startDate: DEFAULT_START_DATE, startDay: 0, endDay: 300, frequency: "每月", resourceType: "芯尘", amount: 0, enabled: true, note: "" },
  ],
  strategies: [
    ...defaultStrategies(),
  ],
  results: {},
  summaries: [],
  detailStrategy: "",
  mainlineEditorIndex: 0,
  mainlineModalOpen: false,
  mainlinePopupPosition: { x: 0, y: 0 },
  nikkeData: {
    sourceLabel: FALLBACK_NIKKE_DATA ? "本地快照" : "未加载",
    chaptersVersion: FALLBACK_NIKKE_DATA?.chaptersVersion ?? "",
    outpostVersion: FALLBACK_NIKKE_DATA?.outpostVersion ?? "",
    normalProgressOptions: FALLBACK_NIKKE_DATA?.normalProgressOptions ?? [],
    hardProgressOptions: FALLBACK_NIKKE_DATA?.hardProgressOptions ?? [],
    outpostCoreDustMul: FALLBACK_NIKKE_DATA?.outpostCoreDustMul ?? [null],
  },
};

function persistedParamsSnapshot() {
  return PERSISTED_PARAM_KEYS.reduce((result, key) => {
    result[key] = state.params[key];
    return result;
  }, {});
}

function persistEditableState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      params: persistedParamsSnapshot(),
      mainlines: state.mainlines,
      hardlines: state.hardlines,
      events: state.events,
      activityConfig: state.activityConfig,
      extras: state.extras,
      strategies: state.strategies,
      detailStrategy: state.detailStrategy,
    }));
  } catch (error) {
    console.warn("保存本地配置失败。", error);
  }
}

function restoreEditableState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.params && typeof saved.params === "object") {
      PERSISTED_PARAM_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(saved.params, key)) state.params[key] = saved.params[key];
      });
    }
    if (Array.isArray(saved?.mainlines)) state.mainlines = saved.mainlines;
    if (Array.isArray(saved?.hardlines)) state.hardlines = saved.hardlines;
    if (Array.isArray(saved?.events)) state.events = saved.events;
    if (saved?.activityConfig && typeof saved.activityConfig === "object") {
      state.activityConfig = { ...state.activityConfig, ...saved.activityConfig };
    }
    if (Array.isArray(saved?.extras)) state.extras = saved.extras;
    if (Array.isArray(saved?.strategies)) state.strategies = saved.strategies;
    if (typeof saved?.detailStrategy === "string") state.detailStrategy = saved.detailStrategy;
  } catch (error) {
    console.warn("读取本地配置失败，已使用默认配置。", error);
  }
}

restoreEditableState();

function resetDefaultStrategiesIfNeeded() {
  const defaults = defaultStrategies();
  if (
    !Array.isArray(state.strategies) ||
    !state.strategies.length ||
    state.strategies.some((strategy) => !STRATEGY_TYPES.includes(strategy.type))
  ) {
    state.strategies = defaults;
    state.detailStrategy = "";
    persistEditableState();
    return;
  }

  let changed = false;
  defaults.forEach((strategy) => {
    if (!state.strategies.some((item) => item.type === strategy.type)) {
      state.strategies.push({ ...strategy });
      changed = true;
    }
  });
  if (changed) {
    persistEditableState();
  }
}

resetDefaultStrategiesIfNeeded();

const mainlineTimelineChart = echarts.init(document.getElementById("mainline-timeline-chart"));
const lineChart = echarts.init(document.getElementById("line-chart"));
const barChart = echarts.init(document.getElementById("bar-chart"));
const statusText = document.getElementById("status-text");
const bestStrategyText = document.getElementById("best-strategy-text");
const currentLevelText = document.getElementById("current-level-text");
const finalLevelText = document.getElementById("final-level-text");
const strategyCountText = document.getElementById("strategy-count-text");
const detailStrategySelect = document.getElementById("detail-strategy-select");
const pageNavList = document.getElementById("page-nav-list");
const mainlineEditorHost = document.getElementById("mainline-editor");
const mainlineModalRoot = document.createElement("div");
mainlineModalRoot.className = "mainline-modal";
document.body.appendChild(mainlineModalRoot);

function dailyHours() {
  return FIXED_BASE_DAILY_HOURS + (FIXED_FREE_SWEEPS + state.params.paidSweeps) * FIXED_HOURS_PER_SWEEP;
}

function parseOptionalInt(value) {
  const text = String(value ?? "").trim();
  const lowered = text.toLowerCase();
  if (!text || lowered.includes("none") || ["null", "nil", "na", "n/a"].includes(lowered)) return null;
  const num = Number(text);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function normalizeNikkeData(chaptersPayload, outpostPayload) {
  const allStages = [];
  (chaptersPayload?.Chapters || []).forEach((chapter) => {
    (chapter.Sections || []).forEach((section) => {
      allStages.push({
        id: String(section.id),
        label: String(section.Section),
      });
    });
  });

  const normalStartIndex = allStages.findIndex((item) => item.label.startsWith("2-12"));
  const normalProgressOptions = normalStartIndex >= 0 ? allStages.slice(normalStartIndex) : allStages;
  const hardProgressOptions = allStages;
  const outpostCoreDustMul = [null];
  (outpostPayload?.outpost || []).forEach((row) => {
    outpostCoreDustMul[Number(row.level)] = Number.parseFloat(row.core_dust_mul);
  });

  return {
    sourceLabel: "远程实时",
    chaptersVersion: String(chaptersPayload?.version || ""),
    outpostVersion: String(outpostPayload?.version || ""),
    normalProgressOptions,
    hardProgressOptions,
    outpostCoreDustMul,
  };
}

function applyNikkeData(data, sourceLabel = data?.sourceLabel || "本地快照") {
  if (!data) return;
  state.nikkeData = {
    sourceLabel,
    chaptersVersion: data.chaptersVersion || "",
    outpostVersion: data.outpostVersion || "",
    normalProgressOptions: data.normalProgressOptions || [],
    hardProgressOptions: data.hardProgressOptions || [],
    outpostCoreDustMul: data.outpostCoreDustMul || [null],
  };
  syncDerivedProgressData();
}

function findLastStageIdForChapter(chapter, options) {
  const prefix = `${chapter}-`;
  const matches = (options || []).filter((item) => item.label.startsWith(prefix));
  return matches.at(-1)?.id || "";
}

function findStageLabelById(options, id) {
  return (options || []).find((item) => String(item.id) === String(id))?.label || "";
}

function chapterFromStageLabel(label) {
  const match = String(label || "").match(/^(\d+)-/);
  return match ? Number(match[1]) : null;
}

function buildChapterStageStats() {
  const rowsByChapter = new Map();
  (state.nikkeData.hardProgressOptions || []).forEach((item) => {
    const chapter = chapterFromStageLabel(item.label);
    if (chapter == null) return;
    if (!rowsByChapter.has(chapter)) rowsByChapter.set(chapter, []);
    rowsByChapter.get(chapter).push(item);
  });

  const rows = [...rowsByChapter.entries()]
    .filter(([chapter]) => chapter >= 2)
    .map(([chapter, stages]) => ({
      chapter,
      count: stages.length,
      lastStageId: String(stages.at(-1)?.id || ""),
      lastStageLabel: stages.at(-1)?.label || "",
    }))
    .sort((a, b) => a.chapter - b.chapter);

  const recent = rows.slice(-ESTIMATE_RECENT_CHAPTERS);
  const average = recent.length ? recent.reduce((sum, row) => sum + row.count, 0) / recent.length : 0;
  const estimatedStagesPerChapter = Math.max(1, Math.round(average || 44));
  const latest = rows.at(-1);
  const latestStageId = Number(latest?.lastStageId || state.nikkeData.hardProgressOptions?.at(-1)?.id || 0);

  return {
    rows,
    recent,
    latestChapter: latest?.chapter || 0,
    latestStageId,
    average,
    estimatedStagesPerChapter,
  };
}

function estimatedChapterFromStageId(stageId, stats = buildChapterStageStats()) {
  const numericId = Number(stageId || 0);
  if (!numericId || numericId <= stats.latestStageId || !stats.estimatedStagesPerChapter) return null;
  return stats.latestChapter + Math.ceil((numericId - stats.latestStageId) / stats.estimatedStagesPerChapter);
}

function maxProjectedChapter(stats = buildChapterStageStats()) {
  const mainlineMax = state.mainlines.reduce((max, item) => Math.max(max, Number(item.chapter || 0)), Number(state.params.currentMainlineChapter || 0));
  const selectedHardMax = state.hardlines.reduce((max, item) => Math.max(max, estimatedChapterFromStageId(item.stageId, stats) || 0), 0);
  return Math.max(stats.latestChapter + ESTIMATE_FUTURE_CHAPTER_BUFFER, mainlineMax, selectedHardMax);
}

function estimatedBossOptionForChapter(chapter, stats = buildChapterStageStats()) {
  const knownId = findLastStageIdForChapter(chapter, state.nikkeData.hardProgressOptions);
  if (knownId) {
    return {
      id: knownId,
      label: findStageLabelById(state.nikkeData.hardProgressOptions, knownId),
      estimated: false,
    };
  }

  if (!stats.latestChapter || chapter <= stats.latestChapter) return null;
  const offset = chapter - stats.latestChapter;
  return {
    id: String(stats.latestStageId + offset * stats.estimatedStagesPerChapter),
    label: `${chapter}-${stats.estimatedStagesPerChapter} BOSS（估算）`,
    estimated: true,
  };
}

function progressOptionsWithEstimatedFuture() {
  const stats = buildChapterStageStats();
  const options = [...(state.nikkeData.hardProgressOptions || [])];
  const maxChapter = maxProjectedChapter(stats);
  for (let chapter = stats.latestChapter + 1; chapter <= maxChapter; chapter += 1) {
    const option = estimatedBossOptionForChapter(chapter, stats);
    if (option) options.push(option);
  }
  return options;
}

function mainlineEstimateTip() {
  const stats = buildChapterStageStats();
  if (!stats.recent.length) return "暂无章节统计数据";
  const start = stats.recent[0].chapter;
  const end = stats.recent.at(-1).chapter;
  return `已统计 ${start}-${end} 章平均 ${stats.average.toFixed(1)} 关，后续按 ${stats.estimatedStagesPerChapter} 关/章估算`;
}

function computeOutpostLevel(normalStageId, hardStageId) {
  const normalOptions = state.nikkeData.normalProgressOptions || [];
  const hardOptions = state.nikkeData.hardProgressOptions || [];
  const normalStartId = Number(normalOptions[0]?.id || 0);
  const hardStartId = Number(hardOptions[0]?.id || 0);
  const normalValue = Number(normalStageId || 0);
  const hardValue = Number(hardStageId || 0);
  const normalContribution = Math.max(0, normalValue - normalStartId);
  const hardContribution = hardValue ? Math.max(0, hardValue - hardStartId + 1) : 0;
  const rawLevel = Math.floor((normalContribution + hardContribution) / 5) + 1;
  const maxLevel = Math.max(1, (state.nikkeData.outpostCoreDustMul || []).length - 1);
  return Math.min(rawLevel, maxLevel);
}

function computeOutpostRate(normalStageId, hardStageId, fallbackRate = state.params.startHourlyRate) {
  const baseLevel = computeOutpostLevel(normalStageId, hardStageId);
  const rate = Number(state.nikkeData.outpostCoreDustMul?.[baseLevel]);
  return {
    baseLevel,
    hourlyRate: Number.isFinite(rate) && rate > 0 ? rate : fallbackRate,
  };
}

function hardBossProgressOptions() {
  return progressOptionsWithEstimatedFuture().filter((option) => /\bBOSS\b/i.test(option.label));
}

function stageLabel(stageId, options = null) {
  return findStageLabelById(options || progressOptionsWithEstimatedFuture(), stageId) || "-";
}

function chapterProgressOptions(options) {
  const chapters = [];
  const seen = new Set();
  (options || []).forEach((option) => {
    const chapter = chapterFromStageLabel(option.label);
    if (chapter == null || seen.has(chapter)) return;
    seen.add(chapter);
    chapters.push({ id: String(chapter), label: `${chapter}章` });
  });
  return chapters.sort((a, b) => Number(a.id) - Number(b.id));
}

function stageOptionsForChapter(chapter, options) {
  const target = Number(chapter);
  if (!target) return [];
  return (options || []).filter((option) => chapterFromStageLabel(option.label) === target);
}

function nextHardBossStageId() {
  const options = hardBossProgressOptions();
  if (!options.length) return "";
  const configuredMax = state.hardlines.reduce((max, item) => Math.max(max, Number(item.stageId || 0)), Number(state.params.currentHardStageId || 0));
  return options.find((option) => Number(option.id) > configuredMax)?.id || options.at(-1)?.id || "";
}

function syncDerivedProgressData() {
  const normalOptions = state.nikkeData.normalProgressOptions || [];
  const hardOptions = progressOptionsWithEstimatedFuture();
  if (!normalOptions.length) return;

  if (!state.params.currentNormalStageId) {
    state.params.currentNormalStageId = findLastStageIdForChapter(state.params.currentMainlineChapter, normalOptions) || normalOptions[0].id;
  }

  if (state.params.currentHardStageId && !findStageLabelById(hardOptions, state.params.currentHardStageId)) {
    state.params.currentHardStageId = "";
  }

  const currentChapter = chapterFromStageLabel(findStageLabelById(normalOptions, state.params.currentNormalStageId));
  if (currentChapter != null) state.params.currentMainlineChapter = currentChapter;

  const baseLevel = computeOutpostLevel(state.params.currentNormalStageId, state.params.currentHardStageId);
  state.params.currentBaseLevel = baseLevel;
  state.params.startHourlyRate = state.nikkeData.outpostCoreDustMul[baseLevel] || state.params.startHourlyRate;
  state.hardlines = state.hardlines.filter((item) => !item.stageId || findStageLabelById(hardOptions, item.stageId));
}

async function loadNikkeData() {
  applyNikkeData(state.nikkeData, state.nikkeData.sourceLabel);

  try {
    const [chaptersResponse, outpostResponse] = await Promise.all([
      fetch(`${NIKKE_REMOTE_BASE}/chapters.json`),
      fetch(`${NIKKE_REMOTE_BASE}/outpost.json`),
    ]);
    if (!chaptersResponse.ok || !outpostResponse.ok) throw new Error("远程数据请求失败");
    const [chaptersPayload, outpostPayload] = await Promise.all([
      chaptersResponse.json(),
      outpostResponse.json(),
    ]);
    applyNikkeData(normalizeNikkeData(chaptersPayload, outpostPayload), "远程实时");
  } catch (error) {
    console.warn("NIKKE 数据动态加载失败，已回退到本地快照。", error);
  }
}

function normalizeFrequency(value) {
  const text = String(value ?? "").trim();
  const lowered = text.toLowerCase();
  if (text === "每日" || lowered === "daily") return "每日";
  if (text === "每周" || lowered === "weekly") return "每周";
  if (text === "每月" || lowered === "monthly") return "每月";
  if (text === "一次性" || lowered === "once" || lowered === "one-time") return "一次性";
  return text;
}

function normalizeExtraResourceType(value) {
  const text = String(value ?? "").trim();
  if (text === "芯尘箱" || text.toLowerCase() === "box" || text.toLowerCase() === "boxes") return "芯尘箱";
  return "芯尘";
}

function dayToDate(day) {
  const base = parseDateInput(state.params.startDate) ?? new Date();
  base.setDate(base.getDate() + day);
  return base;
}

function dateToDay(dateText) {
  const start = parseDateInput(state.params.startDate);
  const target = parseDateInput(dateText);
  if (!start || !target) return null;
  return Math.floor((target.getTime() - start.getTime()) / 86400000);
}

function addMonthsClamped(date, months) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetMonth = month + months;
  const first = new Date(year, targetMonth, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(day, lastDay));
}

function isExtraTriggered(extra, day) {
  const frequency = normalizeFrequency(extra.frequency);
  const startDay = extra.startDate ? (dateToDay(extra.startDate) ?? extra.startDay) : extra.startDay;
  if (day < startDay) return false;
  if (frequency !== "一次性" && day > extra.endDay) return false;
  if (frequency === "每日") return true;
  if (frequency === "每周") return (day - startDay) % 7 === 0;
  if (frequency === "每月") {
    const current = dayToDate(day);
    const anchor = dayToDate(startDay);
    let cursor = new Date(anchor);
    while (cursor <= current) {
      if (
        cursor.getFullYear() === current.getFullYear() &&
        cursor.getMonth() === current.getMonth() &&
        cursor.getDate() === current.getDate()
      ) return true;
      const passedMonths = (cursor.getFullYear() - anchor.getFullYear()) * 12 + cursor.getMonth() - anchor.getMonth() + 1;
      cursor = addMonthsClamped(anchor, passedMonths);
    }
    return false;
  }
  if (frequency === "一次性") return day === startDay;
  return false;
}

function isActivityTriggered(activity, day) {
  const startDay = dateToDay(activity.startDate);
  if (startDay == null || day < startDay) return false;
  const durationDays = Math.max(1, Number(activity.durationDays || 1));
  const endDayExclusive = startDay + durationDays;
  if (day >= endDayExclusive) return false;
  if (activity.mode === ACTIVITY_MODES.DAILY) return true;
  if (activity.mode === ACTIVITY_MODES.WEEKLY) return (day - startDay) % 7 === 0;
  return day === startDay;
}

function buildPresetActivities() {
  const results = [];
  const totalDays = Math.max(0, Number(state.params.simulateDays || 0));
  const startDate = state.params.startDate;
  const largeStep = 42;
  const smallStep = 28;

  const appendPresetActivity = (name, startDay, durationDays, paidHardTickets, phases) => {
    const baseByOffset = new Map();
    phases.forEach((phase) => {
      const valuePerRun = phase.difficulty === "hard" ? 4 : 2;
      const phaseStart = phase.startOffset;
      if (phase.difficulty === "hard" && paidHardTickets > 0) {
        const dayOneTickets = 5 + paidHardTickets;
        const dayOneRewardRuns = Math.max(0, dayOneTickets - 11);
        baseByOffset.set(phaseStart, (baseByOffset.get(phaseStart) || 0) + dayOneRewardRuns * valuePerRun);
        for (let offset = phaseStart + 1; offset < phaseStart + 7; offset += 1) {
          baseByOffset.set(offset, (baseByOffset.get(offset) || 0) + valuePerRun * 5);
        }
        return;
      }

      const rewards = [
        [phaseStart, 0],
        [phaseStart + 1, 0],
        [phaseStart + 2, valuePerRun * 4],
      ];
      for (let offset = phaseStart + 3; offset < phaseStart + 7; offset += 1) {
        rewards.push([offset, valuePerRun * 5]);
      }
      rewards.forEach(([offset, boxes]) => {
        baseByOffset.set(offset, (baseByOffset.get(offset) || 0) + boxes);
      });
    });

    for (let offset = 0; offset < durationDays; offset += 1) {
      const boxes = baseByOffset.get(offset) || 0;
      results.push({
        name,
        mode: ACTIVITY_MODES.ONCE,
        startDate: offsetDateString(startDate, startDay + offset),
        durationDays: 1,
        boxes,
        locked: false,
      });
    }
  };

  for (let day = 0; day <= totalDays; day += largeStep) {
    appendPresetActivity("21天大型活动", day, 21, 70, [
      { startOffset: 0, difficulty: "normal" },
      { startOffset: 7, difficulty: "normal" },
      { startOffset: 14, difficulty: "hard" },
    ]);
  }

  for (let day = 0; day <= totalDays; day += smallStep) {
    appendPresetActivity("14天小活动", day, 14, 45, [
      { startOffset: 0, difficulty: "normal" },
      { startOffset: 7, difficulty: "hard" },
    ]);
  }

  return results;
}

function effectiveEvents() {
  return state.activityConfig.mode === ACTIVITY_EDITOR_MODES.PRESET ? buildPresetActivities() : state.events;
}

function getCoreDustCostForNextLevel(currentLevel) {
  const nextLevel = currentLevel + 1;
  const breakpoint = CORE_DUST_BREAKPOINTS.find((item) => item.nextLevel === nextLevel);
  if (breakpoint) return breakpoint.cost;
  const range = CORE_DUST_RANGES.find((item) => nextLevel >= item.from && nextLevel <= item.to);
  return range ? range.cost : 0;
}

function computeBaseHourlyRate(level, outpostHourlyRate = state.params.startHourlyRate) {
  return outpostHourlyRate;
}

function normalizeLevelProgress(level, progress) {
  let currentLevel = level;
  let currentProgress = progress;
  while (true) {
    const cost = getCoreDustCostForNextLevel(currentLevel);
    if (cost === 0) {
      currentLevel += 1;
      continue;
    }
    if (currentProgress >= cost) {
      currentProgress -= cost;
      currentLevel += 1;
      continue;
    }
    break;
  }
  return { level: currentLevel, progress: currentProgress };
}

function dustNeededForTargetLevel(targetLevel, currentLevel, currentProgress) {
  if (targetLevel <= currentLevel) return 0;
  let tempLevel = currentLevel;
  let tempProgress = currentProgress;
  let needed = 0;
  while (tempLevel < targetLevel) {
    const cost = getCoreDustCostForNextLevel(tempLevel);
    if (cost === 0) {
      tempLevel += 1;
      tempProgress = 0;
      continue;
    }
    needed += Math.max(0, cost - tempProgress);
    tempLevel += 1;
    tempProgress = 0;
  }
  return needed;
}

function boxesNeededForTargetLevel(targetLevel, currentLevel, currentProgress, boxRate) {
  const neededDust = dustNeededForTargetLevel(targetLevel, currentLevel, currentProgress);
  if (neededDust <= 0 || boxRate <= 0) return 0;
  return Math.ceil(neededDust / boxRate);
}

function activateNormalProgressFromMainlines(updates, currentNormalStageId) {
  let activeNormalStageId = currentNormalStageId || "";
  let activatedChapter = null;
  updates.forEach((update) => {
    const chapter = Number(update.chapter || 0);
    if (!chapter) return;
    const option = estimatedBossOptionForChapter(chapter);
    if (!option) return;
    if (Number(option.id || 0) > Number(activeNormalStageId || 0)) {
      activeNormalStageId = option.id;
      activatedChapter = chapter;
    }
  });
  return { activeNormalStageId, activatedChapter };
}

function activateAvailableHardlines(pendingUpdates, level, currentHardStageId) {
  let activeHardStageId = currentHardStageId || "";
  const activated = [];
  const remaining = [];
  pendingUpdates.forEach((update) => {
    if (update.gateLevel == null || level < Number(update.gateLevel)) {
      remaining.push(update);
      return;
    }
    if (Number(update.stageId || 0) > Number(activeHardStageId || 0)) {
      activeHardStageId = update.stageId;
      activated.push(update);
    }
  });
  return { activeHardStageId, activated, remaining };
}

function openBoxes(progressDust, boxes, count, boxRate) {
  const actual = Math.min(Math.max(0, count), boxes);
  const gainedDust = actual * Math.max(0, boxRate);
  return { progressDust: progressDust + gainedDust, boxes: boxes - actual, gainedDust, actual };
}

function simulate(strategy) {
  const states = [];
  let level = state.params.startLevel;
  let progressDust = state.params.startProgress;
  let boxes = state.params.startBoxes;
  let activeNormalStageId = state.params.currentNormalStageId || "";
  let activeHardStageId = state.params.currentHardStageId || "";
  let outpostInfo = computeOutpostRate(activeNormalStageId, activeHardStageId);
  let outpostBaseLevel = outpostInfo.baseLevel;
  let outpostHourlyRate = outpostInfo.hourlyRate;

  syncMainlineChaptersByDate();
  const mainlineByDay = new Map();
  state.mainlines.forEach((update) => {
    const day = dateToDay(update.date);
    if (day == null) return;
    if (!mainlineByDay.has(day)) mainlineByDay.set(day, []);
    mainlineByDay.get(day).push({ ...update, day });
  });

  const activeExtras = state.extras;
  let pendingHardlines = state.hardlines
    .filter((update) => update.stageId && update.gateLevel != null)
    .map((update) => ({ ...update, gateLevel: Number(update.gateLevel), stageId: String(update.stageId) }))
    .sort((a, b) => a.gateLevel - b.gateLevel || Number(a.stageId) - Number(b.stageId));
  let releasedUpdatesCount = 0;
  let hardUpdatesSeen = 0;

  ({ level, progress: progressDust } = normalizeLevelProgress(level, progressDust));

  for (let day = 0; day <= state.params.simulateDays; day += 1) {
    let strategyNote = "";
    let openedBoxesToday = 0;
    let dustFromBoxesToday = 0;
    const appendStrategyNote = (text) => {
      if (!text) return;
      strategyNote = `${strategyNote} | ${text}`.replace(/^ \| /, "").trim();
    };
    const activateHardlinesForCurrentLevel = () => {
      const activation = activateAvailableHardlines(pendingHardlines, level, activeHardStageId);
      pendingHardlines = activation.remaining;
      if (!activation.activated.length) return false;
      activeHardStageId = activation.activeHardStageId;
      hardUpdatesSeen += activation.activated.length;
      outpostInfo = computeOutpostRate(activeNormalStageId, activeHardStageId, outpostHourlyRate);
      outpostBaseLevel = outpostInfo.baseLevel;
      outpostHourlyRate = outpostInfo.hourlyRate;
      appendStrategyNote(`困难进度更新到 ${stageLabel(activeHardStageId)}，基地 ${outpostBaseLevel}`);
      return true;
    };
    const nextDynamicOpenTargetLevel = () => {
      const nextHardGate = pendingHardlines
        .map((update) => Number(update.gateLevel))
        .filter((gateLevel) => Number.isFinite(gateLevel) && gateLevel > level)
        .sort((a, b) => a - b)[0];
      return nextHardGate ?? Infinity;
    };
    const openBoxesWithDynamicRate = (requestedBoxes) => {
      let remaining = Math.min(Math.max(0, Number(requestedBoxes || 0)), boxes);
      let actual = 0;
      let gainedDust = 0;

      while (remaining > 0 && boxes > 0) {
        activateHardlinesForCurrentLevel();
        const dynamicHourlyRate = computeBaseHourlyRate(level, outpostHourlyRate);
        const boxRate = Math.max(0, dynamicHourlyRate);
        let chunk = remaining;

        if (boxRate > 0) {
          const targetLevel = nextDynamicOpenTargetLevel();
          const neededDust = Number.isFinite(targetLevel)
            ? dustNeededForTargetLevel(targetLevel, level, progressDust)
            : 0;
          if (neededDust > 0) chunk = Math.min(chunk, Math.ceil(neededDust / boxRate));
        }

        const result = openBoxes(progressDust, boxes, chunk, boxRate);
        progressDust = result.progressDust;
        boxes = result.boxes;
        actual += result.actual;
        gainedDust += result.gainedDust;
        remaining -= result.actual;
        ({ level, progress: progressDust } = normalizeLevelProgress(level, progressDust));
        if (result.actual <= 0) break;
      }

      return { actual, gainedDust };
    };

    const activityBoxes = effectiveEvents().reduce((sum, event) => {
      return sum + (isActivityTriggered(event, day) ? Number(event.boxes || 0) : 0);
    }, 0);
    const triggeredExtras = activeExtras.filter((extra) => isExtraTriggered(extra, day));
    const extraDust = triggeredExtras.reduce((sum, extra) => {
      return normalizeExtraResourceType(extra.resourceType) === "芯尘" ? sum + Number(extra.amount || 0) : sum;
    }, 0);
    const extraBoxes = triggeredExtras.reduce((sum, extra) => {
      return normalizeExtraResourceType(extra.resourceType) === "芯尘箱" ? sum + Number(extra.amount || 0) : sum;
    }, 0);
    boxes += activityBoxes + extraBoxes;

    const releasedToday = mainlineByDay.get(day) || [];
    releasedUpdatesCount += releasedToday.length;

    const preNormalActivation = activateNormalProgressFromMainlines(releasedToday, activeNormalStageId);
    if (preNormalActivation.activatedChapter != null) {
      activeNormalStageId = preNormalActivation.activeNormalStageId;
      outpostInfo = computeOutpostRate(activeNormalStageId, activeHardStageId, outpostHourlyRate);
      outpostBaseLevel = outpostInfo.baseLevel;
      outpostHourlyRate = outpostInfo.hourlyRate;
      appendStrategyNote(`普通主线更新到 ${stageLabel(activeNormalStageId)}，基地 ${outpostBaseLevel}`);
    }

    activateHardlinesForCurrentLevel();

    let hourlyRate = computeBaseHourlyRate(level, outpostHourlyRate);

    if (strategy.type === "获得即开" && boxes > 0) {
      const result = openBoxesWithDynamicRate(boxes);
      openedBoxesToday += result.actual;
      dustFromBoxesToday += result.gainedDust;
      appendStrategyNote(`获得即开 ${result.actual.toFixed(0)} 箱`);
    } else if (strategy.type === "主线后开" && (releasedToday.length || day === state.params.simulateDays) && boxes > 0) {
      const result = openBoxesWithDynamicRate(boxes);
      openedBoxesToday += result.actual;
      dustFromBoxesToday += result.gainedDust;
      appendStrategyNote(`${releasedToday.length ? "主线后开" : "最后补开"} ${result.actual.toFixed(0)} 箱`);
    } else if (strategy.type === "最后一天全开" && day === state.params.simulateDays && boxes > 0) {
      const result = openBoxesWithDynamicRate(boxes);
      openedBoxesToday += result.actual;
      dustFromBoxesToday += result.gainedDust;
      appendStrategyNote(`最后一天全开 ${result.actual.toFixed(0)} 箱`);
    }

    ({ level, progress: progressDust } = normalizeLevelProgress(level, progressDust));

    activateHardlinesForCurrentLevel();

    hourlyRate = computeBaseHourlyRate(level, outpostHourlyRate);

    const dailyDust = hourlyRate * dailyHours();
    progressDust += dailyDust + extraDust;
    ({ level, progress: progressDust } = normalizeLevelProgress(level, progressDust));

    const nextCost = getCoreDustCostForNextLevel(level);
    states.push({
      day,
      level,
      progressDust,
      nextCost,
      displayLevel: nextCost > 0 ? level + progressDust / nextCost : level,
      hourlyRate,
      boxes,
      openedBoxesToday,
      dustFromBoxesToday,
      dailyDust,
      extraDust,
      extraBoxes,
      activityBoxes,
      normalStageId: activeNormalStageId,
      normalProgressLabel: stageLabel(activeNormalStageId),
      hardStageId: activeHardStageId,
      hardProgressLabel: stageLabel(activeHardStageId),
      outpostBaseLevel,
      updatesSeen: releasedUpdatesCount,
      hardUpdatesSeen,
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
        totalOpenedBoxes: rows.reduce((sum, row) => sum + row.openedBoxesToday, 0),
      };
    })
    .sort((a, b) => b.finalDisplayLevel - a.finalDisplayLevel);
}

function getCurrentDisplayLevel() {
  const normalized = normalizeLevelProgress(state.params.startLevel, state.params.startProgress);
  const nextCost = getCoreDustCostForNextLevel(normalized.level);
  return nextCost > 0 ? normalized.level + normalized.progress / nextCost : normalized.level;
}

function renderStatusOverview(summary = null) {
  bestStrategyText.textContent = summary?.name ?? "--";
  currentLevelText.textContent = summary ? getCurrentDisplayLevel().toFixed(2) : "--";
  finalLevelText.textContent = summary ? summary.finalDisplayLevel.toFixed(2) : "--";
  strategyCountText.textContent = summary ? String(state.summaries.length) : "--";
}

function refreshParamDerivedOutputs(host = document.getElementById("params-form")) {
  if (!host) return;
  const outputs = {
    currentBaseLevel: String(state.params.currentBaseLevel),
    startHourlyRate: state.params.startHourlyRate.toFixed(2),
    nikkeDataSource: `${state.nikkeData.sourceLabel} / Chapters ${state.nikkeData.chaptersVersion || "-"} / Outpost ${state.nikkeData.outpostVersion || "-"}`,
    dailyHours: dailyHours().toFixed(1),
    nextCost: String(getCoreDustCostForNextLevel(state.params.startLevel)),
  };
  Object.entries(outputs).forEach(([key, value]) => {
    const input = host.querySelector(`[data-param-output="${key}"]`);
    if (input) input.value = value;
  });
}

function renderParams() {
  const host = document.getElementById("params-form");
  host.innerHTML = "";
  const addEditableInput = (label, key, kind) => {
    const field = document.createElement("label");
    field.className = "field";
    field.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.type = kind === "date" ? "date" : "number";
    if (kind === "float") input.step = "0.5";
    if (kind === "int") input.step = "1";
    input.value = state.params[key];
    input.addEventListener("input", (event) => {
      const raw = event.target.value || 0;
      state.params[key] = kind === "date" ? String(raw) : kind === "int" ? Math.trunc(Number(raw || 0)) : Number(raw || 0);
      persistEditableState();
      refreshParamDerivedOutputs(host);
      if (key === "startDate") renderMainlineTimeline();
    });
    field.appendChild(input);
    host.appendChild(field);
  };

  const addSelectInput = (label, key, options, allowEmpty = false) => {
    const field = document.createElement("label");
    field.className = "field";
    field.innerHTML = `<span>${label}</span>`;
    const select = document.createElement("select");
    if (allowEmpty) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "未选择";
      select.appendChild(empty);
    }
    options.forEach((option) => {
      const el = document.createElement("option");
      el.value = option.id;
      el.textContent = option.label;
      if (String(option.id) === String(state.params[key] || "")) el.selected = true;
      select.appendChild(el);
    });
    select.addEventListener("change", (event) => {
      state.params[key] = event.target.value;
      syncDerivedProgressData();
      persistEditableState();
      refreshParamDerivedOutputs(host);
      renderMainlineTimeline();
    });
    field.appendChild(select);
    host.appendChild(field);
  };

  const addHardProgressInputs = () => {
    const hardOptions = state.nikkeData.hardProgressOptions || [];
    const currentLabel = findStageLabelById(hardOptions, state.params.currentHardStageId);
    const currentChapter = chapterFromStageLabel(currentLabel);
    const selectedChapter = currentChapter == null ? "" : String(currentChapter);

    const chapterField = document.createElement("label");
    chapterField.className = "field";
    chapterField.innerHTML = "<span>当前困难章节</span>";
    const chapterSelect = document.createElement("select");
    const emptyChapter = document.createElement("option");
    emptyChapter.value = "";
    emptyChapter.textContent = "未选择";
    chapterSelect.appendChild(emptyChapter);
    chapterProgressOptions(hardOptions).forEach((option) => {
      const el = document.createElement("option");
      el.value = option.id;
      el.textContent = option.label;
      if (option.id === selectedChapter) el.selected = true;
      chapterSelect.appendChild(el);
    });
    chapterField.appendChild(chapterSelect);
    host.appendChild(chapterField);

    const stageField = document.createElement("label");
    stageField.className = "field";
    stageField.innerHTML = "<span>当前困难关卡</span>";
    const stageSelect = document.createElement("select");

    const fillStageSelect = (chapter, value = state.params.currentHardStageId) => {
      stageSelect.innerHTML = "";
      const emptyStage = document.createElement("option");
      emptyStage.value = "";
      emptyStage.textContent = chapter ? "请选择关卡" : "请先选择章节";
      stageSelect.appendChild(emptyStage);
      const stageOptions = stageOptionsForChapter(chapter, hardOptions);
      stageOptions.forEach((option) => {
        const el = document.createElement("option");
        el.value = option.id;
        el.textContent = option.label;
        if (String(option.id) === String(value || "")) el.selected = true;
        stageSelect.appendChild(el);
      });
      stageSelect.disabled = !stageOptions.length;
    };

    fillStageSelect(selectedChapter);

    chapterSelect.addEventListener("change", (event) => {
      const chapter = event.target.value;
      const stageOptions = stageOptionsForChapter(chapter, hardOptions);
      state.params.currentHardStageId = stageOptions[0]?.id || "";
      fillStageSelect(chapter, state.params.currentHardStageId);
      syncDerivedProgressData();
      persistEditableState();
      refreshParamDerivedOutputs(host);
      renderMainlineTimeline();
    });

    stageSelect.addEventListener("change", (event) => {
      state.params.currentHardStageId = event.target.value;
      syncDerivedProgressData();
      persistEditableState();
      refreshParamDerivedOutputs(host);
      renderMainlineTimeline();
    });

    stageField.appendChild(stageSelect);
    host.appendChild(stageField);
  };

  const addReadonlyInput = (label, outputKey, value) => {
    const field = document.createElement("label");
    field.className = "field";
    field.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.disabled = true;
    input.value = value;
    input.setAttribute("data-param-output", outputKey);
    field.appendChild(input);
    host.appendChild(field);
  };

  addEditableInput("当前等级", "startLevel", "int");
  addEditableInput("当前级内进度", "startProgress", "float");
  addEditableInput("拥有芯尘箱（小时）", "startBoxes", "float");

  if (state.nikkeData.normalProgressOptions.length) {
    addSelectInput("当前普通主线进度", "currentNormalStageId", state.nikkeData.normalProgressOptions);
    addHardProgressInputs();
    addReadonlyInput("当前基地等级", "currentBaseLevel", String(state.params.currentBaseLevel));
    addReadonlyInput("当前小时芯尘", "startHourlyRate", state.params.startHourlyRate.toFixed(2));
    addReadonlyInput("NIKKE数据", "nikkeDataSource", `${state.nikkeData.sourceLabel} / Chapters ${state.nikkeData.chaptersVersion || "-"} / Outpost ${state.nikkeData.outpostVersion || "-"}`);
  } else {
    addEditableInput("当前小时芯尘", "startHourlyRate", "float");
  }

  addEditableInput("模拟天数", "simulateDays", "int");
  addEditableInput("购买扫荡次数", "paidSweeps", "int");
  addReadonlyInput("自动计算的每日小时数", "dailyHours", dailyHours().toFixed(1));
  addReadonlyInput("当前等级下一级芯尘", "nextCost", String(getCoreDustCostForNextLevel(state.params.startLevel)));
}

function renderDustReference() {
  const rangeBody = document.getElementById("dust-range-body");
  rangeBody.innerHTML = "";
  CORE_DUST_RANGES.forEach((row) => {
    const label = row.to >= 9999 ? `${row.from}+` : `${row.from}-${row.to}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${label}</td><td>${row.cost}</td>`;
    rangeBody.appendChild(tr);
  });
}

function createField(label, value, onChange, options = {}) {
  const wrap = document.createElement("label");
  wrap.className = `field ${options.long ? "long" : ""} ${options.fullSpan ? "full-span" : ""} ${options.columnClass || ""}`.trim();
  wrap.innerHTML = `<span class="field-label ${options.hideLabel ? "is-hidden" : ""}">${label}</span>`;

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
      persistEditableState();
    });
    row.appendChild(input);
    row.appendChild(text);
    wrap.appendChild(row);
    return wrap;
  }

  const input = options.type === "select" ? document.createElement("select") : document.createElement("input");
  input.className = `field-control ${options.columnClass || ""}`.trim();
  if (options.type === "select") {
    (options.options || []).forEach((option) => {
      const optionValue = typeof option === "object" ? option.id ?? option.value : option;
      const optionLabel = typeof option === "object" ? option.label ?? optionValue : option;
      const el = document.createElement("option");
      el.value = optionValue;
      el.textContent = optionLabel;
      if (String(optionValue) === String(value ?? "")) el.selected = true;
      input.appendChild(el);
    });
  } else {
    input.type = options.type || "text";
    input.value = value ?? "";
    if (options.step) input.step = options.step;
  }

  input.addEventListener(options.type === "select" ? "change" : "input", (event) => {
    const raw = event.target.value;
    if (options.cast === "number") onChange(Number(raw || 0));
    else if (options.cast === "optionalInt") onChange(parseOptionalInt(raw));
    else onChange(raw);
    persistEditableState();
  });
  wrap.appendChild(input);
  return wrap;
}

function createCompactField(value, onChange, options = {}) {
  const input = options.type === "select" ? document.createElement("select") : document.createElement("input");
  input.className = `timeline-inline-input ${options.compactClass || ""} ${options.columnClass || ""}`.trim();

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
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.step) input.step = options.step;
  }

  if (options.title) input.title = options.title;
  if (options.ariaLabel) input.setAttribute("aria-label", options.ariaLabel);

  input.addEventListener(options.type === "select" ? "change" : "input", (event) => {
    const raw = event.target.value;
    if (options.cast === "number") onChange(Number(raw || 0));
    else if (options.cast === "optionalInt") onChange(parseOptionalInt(raw));
    else onChange(raw);
    persistEditableState();
  });

  return input;
}

function renderListHeader(host, className, labels, includeAction = true) {
  const header = document.createElement("div");
  header.className = `${className} list-header`;
  labels.forEach((label) => {
    const cell = document.createElement("div");
    const config = typeof label === "string" ? { label } : label;
    cell.className = `list-header-cell ${config.columnClass || ""}`.trim();
    cell.textContent = config.label;
    header.appendChild(cell);
  });
  if (includeAction) {
    const actionCell = document.createElement("div");
    actionCell.className = "list-header-cell list-header-cell-action";
    actionCell.textContent = "操作";
    header.appendChild(actionCell);
  }
  host.appendChild(header);
}

function renderGenericRows(listId, rows, schema, onDelete, options = {}) {
  const host = document.getElementById(listId);
  host.innerHTML = "";
  if (options.showHeader !== false) {
    renderListHeader(host, `editor-grid ${options.gridClass || ""}`.trim(), schema.map((field) => ({ label: field.label, columnClass: field.columnClass })));
  }
  rows.forEach((row, index) => {
    const card = document.createElement("div");
    card.className = "editor-row";
    const grid = document.createElement("div");
    grid.className = `editor-grid ${options.gridClass || ""}`.trim();
    schema.forEach((field) => {
      grid.appendChild(createField(field.label, row[field.key], (value) => { row[field.key] = value; }, field));
    });
    if (!row.locked) {
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.type = "button";
      del.textContent = "x";
      del.addEventListener("click", () => {
        onDelete(index);
        persistEditableState();
      });
      grid.appendChild(del);
    }
    card.appendChild(grid);
    host.appendChild(card);
  });
}

function ensureMainlineEditorIndex() {
  if (!state.mainlines.length) {
    state.mainlineEditorIndex = -1;
    return;
  }
  if (!Number.isInteger(state.mainlineEditorIndex) || state.mainlineEditorIndex < 0 || state.mainlineEditorIndex >= state.mainlines.length) {
    state.mainlineEditorIndex = 0;
  }
}

function sortedMainlineEntries() {
  syncMainlineChaptersByDate();
  return state.mainlines
    .map((item, index) => {
      const parsedDate = parseDateInput(item.date);
      return {
        ...item,
        index,
      label: formatMainlineLabel(item.chapter ?? mainlineChapterForIndex(index)),
        timestamp: parsedDate ? parsedDate.getTime() : Date.now() + index * 86400000,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function renderMainlineEditor() {
  if (!mainlineEditorHost) return;
  mainlineEditorHost.innerHTML = "";
}

function closeMainlineModal() {
  state.mainlineModalOpen = false;
  mainlineModalRoot.classList.remove("is-open");
  mainlineModalRoot.innerHTML = "";
}

function setMainlinePopupPosition(x, y) {
  const width = 420;
  const height = 320;
  state.mainlinePopupPosition = {
    x: Math.min(Math.max(window.scrollX + 12, x), window.scrollX + window.innerWidth - width - 12),
    y: Math.min(Math.max(window.scrollY + 12, y), window.scrollY + window.innerHeight - height - 12),
  };
}

function renderMainlineModal() {
  ensureMainlineEditorIndex();
  if (!state.mainlineModalOpen || state.mainlineEditorIndex < 0 || !state.mainlines.length) {
    closeMainlineModal();
    return;
  }

  const current = state.mainlines[state.mainlineEditorIndex];
  const { x, y } = state.mainlinePopupPosition;
  const currentLabel = formatMainlineLabel(current.chapter ?? mainlineChapterForIndex(state.mainlineEditorIndex));

  mainlineModalRoot.classList.add("is-open");
  mainlineModalRoot.innerHTML = `
    <div class="mainline-modal-dialog" role="dialog" aria-modal="false" aria-label="编辑主线节点" style="left:${x}px;top:${y}px;">
      <div class="mainline-modal-head">
        <div>
          <div class="mainline-modal-title">编辑主线节点</div>
          <div class="mainline-modal-subtitle">${currentLabel}</div>
        </div>
        <button class="icon-btn mainline-modal-close" type="button" data-close="modal">x</button>
      </div>
      <div class="mainline-modal-grid">
        <div class="mainline-readonly-chip col-wide">${currentLabel}</div>
        <label class="field col-date">
          <span class="field-label">更新时间</span>
          <input id="mainline-modal-date" class="field-control" type="date" value="${current.date}">
        </label>
      </div>
      <div class="mainline-modal-actions">
        <button class="ghost-btn danger-btn" type="button" id="mainline-modal-delete">删除节点</button>
        <button class="primary-btn" type="button" id="mainline-modal-done">完成</button>
      </div>
    </div>
  `;

  const bindValue = (id, setter, options = {}) => {
    const el = document.getElementById(id);
    if (!el) return;
    const { eventName = "input", rerender = true, afterChange } = options;
    el.addEventListener(eventName, () => {
      setter(el.value);
      if (afterChange) afterChange(el.value);
      persistEditableState();
      if (rerender) renderMainlineTimeline();
    });
  };

  bindValue("mainline-modal-date", (value) => {
    current.date = value || current.date;
  }, { eventName: "change", rerender: true });
  mainlineModalRoot.querySelectorAll('[data-close="modal"]').forEach((node) => {
    node.addEventListener("click", closeMainlineModal);
  });
  document.getElementById("mainline-modal-done")?.addEventListener("click", () => {
    renderMainlineTimeline();
    closeMainlineModal();
  });
  document.getElementById("mainline-modal-delete")?.addEventListener("click", () => {
    state.mainlines.splice(state.mainlineEditorIndex, 1);
    if (state.mainlineEditorIndex >= state.mainlines.length) state.mainlineEditorIndex = state.mainlines.length - 1;
    persistEditableState();
    renderMainlineTimeline();
    closeMainlineModal();
  });
}

function renderMainlineTimeline() {
  ensureMainlineEditorIndex();
  const entries = sortedMainlineEntries();
  const estimateTip = mainlineEstimateTip();

  if (!entries.length) {
    mainlineTimelineChart.setOption({
      title: {
        text: "暂无主线节点",
        subtext: `双击时间轴空白处新增主线节点\n${estimateTip}`,
        left: "center",
        top: "middle",
        textStyle: { fontSize: 18, fontWeight: 600, color: "#6b778c" },
        subtextStyle: { fontSize: 13, color: "#7a879b", padding: [10, 0, 0, 0] },
      },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
      graphic: [],
    }, true);
    renderMainlineEditor();
    renderMainlineModal();
    return;
  }

  const firstTs = entries[0].timestamp;
  const lastTs = entries[entries.length - 1].timestamp;
  const padding = Math.max(86400000 * 10, Math.floor((lastTs - firstTs || 86400000) * 0.08));

  const lineData = entries.map((item) => [item.timestamp, 0]);
  const scatterData = entries.map((item) => ({
    value: [item.timestamp, 0],
    originalIndex: item.index,
    symbolSize: 0,
    itemStyle: {
      color: "rgba(0,0,0,0)",
    },
    label: {
      show: true,
      position: "top",
      distance: 18,
      formatter: `${item.label}\n${item.date}`,
      color: "#1f2937",
      fontSize: 12,
      lineHeight: 18,
      align: "center",
      fontWeight: item.index === state.mainlineEditorIndex ? 700 : 500,
    },
  }));

  mainlineTimelineChart.setOption({
    animation: true,
    title: {
      text: "主线更新时间线",
      subtext: `双击空白处新增节点，单击节点编辑，拖动节点修改日期\n${estimateTip}`,
      left: "center",
      top: 8,
      textStyle: { fontSize: 18, fontWeight: 700, color: "#1f2937" },
      subtextStyle: { fontSize: 12, color: "#7a879b", padding: [8, 0, 0, 0] },
    },
    grid: { left: 24, right: 24, top: 74, bottom: 36 },
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const item = entries.find((entry) => entry.index === params.data.originalIndex);
        if (!item) return "";
        const progressOption = estimatedBossOptionForChapter(item.chapter);
        const baseLevel = progressOption ? computeOutpostLevel(progressOption.id, state.params.currentHardStageId) : "-";
        return [
          item.label,
          item.date,
          `普通进度：${progressOption?.label || "-"}`,
          `预计基地等级：${baseLevel}`,
          estimateTip,
        ].join("<br>");
      },
    },
    xAxis: {
      type: "time",
      min: firstTs - padding,
      max: lastTs + padding,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: -1,
      max: 1,
      show: false,
    },
    series: [
      {
        type: "line",
        data: lineData,
        smooth: false,
        symbol: "none",
        lineStyle: { color: "#2F6FED", width: 3 },
        z: 1,
      },
      {
        type: "scatter",
        data: scatterData,
        z: 2,
      },
    ],
  }, true);

  const nodeGraphics = entries.map((item) => {
    const pixel = mainlineTimelineChart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [item.timestamp, 0]);
    return {
      id: `mainline-node-${item.index}`,
      type: "circle",
      position: pixel,
      shape: { r: item.index === state.mainlineEditorIndex ? 10 : 8 },
      draggable: true,
      cursor: "move",
      z: 100,
      style: {
        fill: item.index === state.mainlineEditorIndex ? "#D35D3D" : "#2F6FED",
        stroke: "#ffffff",
        lineWidth: 2,
        shadowBlur: 10,
        shadowColor: "rgba(47,111,237,0.18)",
      },
      onclick: () => {
        state.mainlineEditorIndex = item.index;
        const rect = mainlineTimelineChart.getDom().getBoundingClientRect();
        setMainlinePopupPosition(window.scrollX + rect.left + pixel[0] + 14, window.scrollY + rect.top + pixel[1] - 24);
        state.mainlineModalOpen = true;
        renderMainlineTimeline();
      },
      ondrag: function () {
        const next = mainlineTimelineChart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, this.position);
        if (!Array.isArray(next) || !next[0]) return;
        state.mainlines[item.index].date = formatDateInput(new Date(next[0]));
        state.mainlineEditorIndex = item.index;
        renderMainlineEditor();
        if (state.mainlineModalOpen) renderMainlineModal();
      },
      ondragend: () => {
        persistEditableState();
        renderMainlineTimeline();
      },
    };
  });

  mainlineTimelineChart.setOption({ graphic: nodeGraphics });
  const chartDom = mainlineTimelineChart.getDom();
  if (chartDom._mainlineDblClickHandler) {
    chartDom.removeEventListener("dblclick", chartDom._mainlineDblClickHandler);
  }
  chartDom._mainlineDblClickHandler = (event) => {
    const rect = chartDom.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const clickedNode = entries.some((item) => {
      const [px, py] = mainlineTimelineChart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [item.timestamp, 0]);
      return Math.hypot(px - offsetX, py - offsetY) <= 18;
    });
    if (clickedNode) return;
    const next = mainlineTimelineChart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [offsetX, offsetY]);
    if (!Array.isArray(next) || !next[0]) return;
    state.mainlines.push({
      date: formatDateInput(new Date(next[0])),
    });
    state.mainlineEditorIndex = state.mainlines.length - 1;
    persistEditableState();
    setMainlinePopupPosition(window.scrollX + rect.left + offsetX + 14, window.scrollY + rect.top + offsetY - 24);
    state.mainlineModalOpen = true;
    renderMainlineTimeline();
  };
  chartDom.addEventListener("dblclick", chartDom._mainlineDblClickHandler);

  renderMainlineEditor();
  renderMainlineModal();
}

function renderHardlinesEditor() {
  const host = document.getElementById("hardlines-list");
  if (!host) return;
  const bossOptions = hardBossProgressOptions();
  renderGenericRows("hardlines-list", state.hardlines, [
    { key: "gateLevel", label: "到达等级", type: "number", cast: "optionalInt", step: "1", columnClass: "col-day" },
    { key: "stageId", label: "困难BOSS进度", type: "select", options: bossOptions, columnClass: "col-hard-progress" },
  ], (index) => {
    state.hardlines.splice(index, 1);
    renderEditors();
  }, { gridClass: "hardlines-grid" });
  if (!bossOptions.length) {
    host.innerHTML = "";
    const note = document.createElement("div");
    note.className = "events-preset-note";
    note.textContent = "暂无困难进度数据，加载 NIKKE 数据后可选择每章 BOSS。";
    host.appendChild(note);
  }
}

function renderTimelineRows(listId, rows, rowType, onDelete) {
  const host = document.getElementById(listId);
  host.innerHTML = "";
  renderListHeader(host, "timeline-grid", rowType === "mainline" ? ["更新时间"] : ["开始日期", "持续天数", "获得箱子"]);
  rows.forEach((row, index) => {
    const card = document.createElement("div");
    card.className = `timeline-card ${rowType}`;

    const compactGrid = document.createElement("div");
    compactGrid.className = "timeline-grid";
    if (rowType === "mainline") {
      compactGrid.appendChild(createCompactField(row.date, (value) => { row.date = value; }, { type: "date", ariaLabel: "主线更新时间", title: "主线更新时间", compactClass: "is-date", columnClass: "col-date" }));
    } else {
      compactGrid.appendChild(createCompactField(row.startDate, (value) => { row.startDate = value; }, { type: "date", ariaLabel: "活动开始日期", title: "活动开始日期", compactClass: "is-date", columnClass: "col-date" }));
      compactGrid.appendChild(createCompactField(row.durationDays, (value) => { row.durationDays = value; }, { type: "number", cast: "number", step: "1", placeholder: "天数", ariaLabel: "活动持续天数", title: "活动持续天数", compactClass: "is-short", columnClass: "col-number" }));
      compactGrid.appendChild(createCompactField(row.boxes, (value) => { row.boxes = value; }, { type: "number", cast: "number", step: "1", placeholder: "箱子", ariaLabel: "活动获得箱子数", title: "活动获得箱子数", compactClass: "is-short", columnClass: "col-number" }));
    }
    card.appendChild(compactGrid);

    if (!row.locked) {
      const compactDel = document.createElement("button");
      compactDel.className = "icon-btn";
      compactDel.type = "button";
      compactDel.textContent = "x";
      compactDel.addEventListener("click", () => {
        onDelete(index);
        persistEditableState();
      });
      card.appendChild(compactDel);
    }

    host.appendChild(card);
  });
}

function renderEventsEditor() {
  const host = document.getElementById("events-list");
  const toolbar = document.querySelector("#section-events .section-toolbar");
  if (!host || !toolbar) return;

  toolbar.innerHTML = "";
  host.innerHTML = "";

  const controls = document.createElement("div");
  controls.className = "events-mode-bar";

  const modeField = createField("活动模式", state.activityConfig.mode, (value) => {
    state.activityConfig.mode = value;
    renderEventsEditor();
  }, {
    type: "select",
    options: [ACTIVITY_EDITOR_MODES.CUSTOM, ACTIVITY_EDITOR_MODES.PRESET],
    columnClass: "col-frequency",
  });
  controls.appendChild(modeField);

  if (state.activityConfig.mode === ACTIVITY_EDITOR_MODES.PRESET) {
    const note = document.createElement("div");
    note.className = "events-preset-note";
    note.textContent = "预设：小活动约 324 箱，大活动约 472 箱。每日 5 门票推进；11 关产箱，normal 每次 2 箱、hard 每次 4 箱。hard 首日买票从 1 关推完，剩余门票扫荡 11 关。";
    host.appendChild(controls);
    host.appendChild(note);
    return;
  }

  const addSmallBtn = document.createElement("button");
  addSmallBtn.type = "button";
  addSmallBtn.className = "small-btn";
  addSmallBtn.textContent = "新增14天小活动";
  addSmallBtn.addEventListener("click", () => {
    state.events.push({ name: "14天小活动", startDate: state.params.startDate, durationDays: 14, boxes: 324, locked: false });
    persistEditableState();
    renderEventsEditor();
  });
  controls.appendChild(addSmallBtn);

  const addLargeBtn = document.createElement("button");
  addLargeBtn.type = "button";
  addLargeBtn.className = "small-btn";
  addLargeBtn.textContent = "新增21天大型活动";
  addLargeBtn.addEventListener("click", () => {
    state.events.push({ name: "21天大型活动", startDate: state.params.startDate, durationDays: 21, boxes: 472, locked: false });
    persistEditableState();
    renderEventsEditor();
  });
  controls.appendChild(addLargeBtn);
  host.appendChild(controls);

  const list = document.createElement("div");
  list.id = "events-custom-list";
  list.className = "editor-list";
  host.appendChild(list);

  renderGenericRows("events-custom-list", state.events, [
    { key: "name", label: "名称", type: "text", columnClass: "col-name" },
    { key: "startDate", label: "开始日期", type: "date", columnClass: "col-date" },
    { key: "durationDays", label: "持续天数", type: "number", cast: "number", columnClass: "col-day" },
    { key: "boxes", label: "获得箱子", type: "number", cast: "number", step: "1", columnClass: "col-amount" },
  ], (index) => {
    state.events.splice(index, 1);
    renderEventsEditor();
  }, { showHeader: false, gridClass: "events-grid" });
}

function renderEditors() {
  renderMainlineTimeline();
  renderHardlinesEditor();
  renderEventsEditor();

  renderGenericRows("extras-list", state.extras, [
    { key: "name", label: "名称", type: "text", columnClass: "col-name" },
    { key: "startDate", label: "开始日期", type: "date", columnClass: "col-date" },
    { key: "frequency", label: "类型", type: "select", options: EXTRA_FREQUENCIES, columnClass: "col-frequency" },
    { key: "resourceType", label: "获取类型", type: "select", options: EXTRA_RESOURCE_TYPES, columnClass: "col-frequency" },
    { key: "amount", label: "数量", type: "number", cast: "number", step: "0.1", columnClass: "col-amount" },
    { key: "note", label: "备注", type: "text", columnClass: "col-note" },
  ], (index) => {
    state.extras.splice(index, 1);
    renderEditors();
  }, { showHeader: false, gridClass: "extras-grid" });

  renderGenericRows("strategies-list", state.strategies, [
    { key: "name", label: "名称", type: "text", hideLabel: true },
    { key: "type", label: "类型", type: "select", options: STRATEGY_TYPES, hideLabel: true },
    { key: "note", label: "备注", type: "text", hideLabel: true },
  ], (index) => {
    state.strategies.splice(index, 1);
    renderEditors();
  }, { gridClass: "strategies-grid" });
}

function renderMetrics() {
  const host = document.getElementById("metrics-grid");
  host.innerHTML = "";
  host.hidden = true;
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

function activeStrategyNames() {
  return state.summaries.map((item) => item.name);
}

function renderCharts() {
  const names = activeStrategyNames();
  if (!names.length) {
    lineChart.setOption({ title: { text: "运行模拟后显示策略曲线", left: "center", top: "middle" }, series: [] }, true);
    barChart.setOption({ title: { text: "暂无可显示的策略", left: "center", top: "middle" }, series: [] }, true);
    return;
  }

  const lineSeries = names.map((name, index) => {
    const rows = state.results[name] || [];
    return {
      name,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.5, color: CHART_COLORS[index % CHART_COLORS.length] },
      itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
      data: rows.map((row) => [formatDateInput(dayToDate(row.day)), Number(row.displayLevel.toFixed(4))]),
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
    xAxis: { type: "time", name: "日期", nameLocation: "middle", nameGap: 30 },
    yAxis: { type: "value", name: "等级" },
    series: lineSeries,
  }, true);

  barChart.setOption({
    grid: { left: 56, right: 24, top: 26, bottom: 70 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category", data: state.summaries.map((row) => row.name), axisLabel: { rotate: 16 } },
    yAxis: { type: "value", name: "最终等级" },
    series: [{
      type: "bar",
      data: state.summaries.map((row, index) => ({
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
    `;
    tr.addEventListener("click", () => {
      state.detailStrategy = row.name;
      persistEditableState();
      fillSelect(detailStrategySelect, activeStrategyNames(), state.detailStrategy, true);
      renderSummaryTable();
      renderDetailTable();
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
      <td>${row.level}</td>
      <td>${row.progressDust.toFixed(0)}</td>
      <td>${row.nextCost}</td>
      <td>${row.hourlyRate.toFixed(2)}</td>
      <td>${row.boxes.toFixed(0)}</td>
      <td>${row.openedBoxesToday.toFixed(0)}</td>
      <td>${row.activityBoxes.toFixed(0)}</td>
      <td>${row.dailyDust.toFixed(0)}</td>
      <td>${row.extraDust.toFixed(0)}</td>
      <td>${row.extraBoxes.toFixed(0)}</td>
      <td>${row.hardProgressLabel || "-"}</td>
      <td>${row.outpostBaseLevel ?? "-"}</td>
      <td class="detail-note-cell">${row.strategyNote || ""}</td>
    `;
    body.appendChild(tr);
  });
}

function runSimulation() {
  try {
    const enabledStrategies = state.strategies.filter((strategy) => strategy.enabled);
    if (!enabledStrategies.length) {
      state.results = {};
      state.summaries = [];
      statusText.textContent = "至少启用一个策略";
      renderStatusOverview();
      return;
    }
    state.results = {};
    enabledStrategies.forEach((strategy) => {
      state.results[strategy.name] = simulate(strategy);
    });
    state.summaries = buildSummaries();
    if (!state.detailStrategy || !state.summaries.some((item) => item.name === state.detailStrategy)) {
      state.detailStrategy = state.summaries[0]?.name || "";
      persistEditableState();
    }
    fillSelect(detailStrategySelect, activeStrategyNames(), state.detailStrategy, true);
    renderMetrics();
    renderCharts();
    renderSummaryTable();
    renderDetailTable();
    const best = state.summaries[0];
    statusText.textContent = "计算完成";
    renderStatusOverview(best);
  } catch (error) {
    state.results = {};
    state.summaries = [];
    console.error(error);
    statusText.textContent = `计算失败：${error.message}`;
    renderStatusOverview();
  }
}

function exportCurrentCSV() {
  const rows = state.results[state.detailStrategy];
  if (!rows || !rows.length) {
    statusText.textContent = "请先计算并选择一个明细策略";
    return;
  }
  const data = [
    ["day", "level", "progress_dust", "next_level_cost", "display_level", "hourly_rate", "boxes", "opened_boxes_today", "daily_dust", "extra_dust", "extra_boxes", "activity_boxes", "normal_progress", "hard_progress", "outpost_base_level", "updates_seen", "hard_updates_seen", "strategy_note"],
    ...rows.map((row) => [
      row.day,
      row.level,
      row.progressDust.toFixed(2),
      row.nextCost,
      row.displayLevel.toFixed(4),
      row.hourlyRate.toFixed(2),
      row.boxes.toFixed(0),
      row.openedBoxesToday.toFixed(0),
      row.dailyDust.toFixed(2),
      row.extraDust.toFixed(2),
      row.extraBoxes.toFixed(2),
      row.activityBoxes.toFixed(2),
      row.normalProgressLabel ?? "",
      row.hardProgressLabel ?? "",
      row.outpostBaseLevel ?? "",
      row.updatesSeen,
      row.hardUpdatesSeen,
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
      if (section.id === "section-mainlines") setTimeout(() => mainlineTimelineChart.resize(), 0);
      updateActiveNav();
    });
  });
}

function ensureEventToolbarButtons() {
  const host = document.querySelector("#section-events .section-toolbar");
  if (!host) return;
  host.innerHTML = `
    <button data-add="event-small" class="small-btn" type="button">新增14天小活动</button>
    <button data-add="event-large" class="small-btn" type="button">新增21天大型活动</button>
  `;
}

function syncInlineSectionActions() {
  ["section-mainlines", "section-hardlines", "section-events", "section-extras"].forEach((id) => {
    const section = document.getElementById(id);
    if (section) section.classList.add("has-inline-toolbar");
  });

  const mainlineAdd = document.querySelector('[data-add="mainlines"]');
  if (mainlineAdd) mainlineAdd.textContent = "新增";

  const extrasAdd = document.querySelector('[data-add="extras"]');
  if (extrasAdd) extrasAdd.textContent = "新增";

  const hardlinesAdd = document.querySelector('[data-add="hardlines"]');
  if (hardlinesAdd) hardlinesAdd.textContent = "新增";
}

function buildPageNav() {
  pageNavList.innerHTML = "";
  document.querySelectorAll("[data-nav-label]").forEach((section) => {
    const id = section.id;
    const label = section.dataset.navLabel;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-nav-link";
    button.dataset.target = id;
    button.textContent = label;
    button.addEventListener("click", () => {
      const top = section.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    });
    pageNavList.appendChild(button);
  });
}

function updateActiveNav() {
  const sections = [...document.querySelectorAll("[data-nav-label]")];
  if (!sections.length) return;
  const pivot = window.scrollY + 180;
  let activeId = sections[0].id;
  sections.forEach((section) => {
    if (section.offsetTop <= pivot) activeId = section.id;
  });
  document.querySelectorAll(".page-nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.target === activeId);
  });
}

function bindEvents() {
  ensureEventToolbarButtons();
  const mainlineAdd = document.querySelector('[data-add="mainlines"]');
  if (mainlineAdd) mainlineAdd.closest(".section-toolbar")?.remove();
  document.getElementById("run-btn").addEventListener("click", runSimulation);
  document.getElementById("export-csv-btn").addEventListener("click", exportCurrentCSV);
  document.getElementById("export-png-btn").addEventListener("click", exportChartPNG);

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.add;
      if (type === "event-small") state.events.push({ name: "14天小活动", mode: ACTIVITY_MODES.ONCE, startDate: state.params.startDate, durationDays: 14, boxes: 324, locked: false });
      if (type === "event-large") state.events.push({ name: "21天大型活动", mode: ACTIVITY_MODES.ONCE, startDate: state.params.startDate, durationDays: 21, boxes: 472, locked: false });
      if (type === "hardlines") state.hardlines.push({ gateLevel: state.params.startLevel, stageId: nextHardBossStageId(), locked: false });
      if (type === "extras") state.extras.push({ name: "新来源", startDate: state.params.startDate, startDay: 0, endDay: state.params.simulateDays, frequency: "每日", resourceType: "芯尘", amount: 0, enabled: true, note: "" });
      if (type === "strategies") state.strategies.push({ name: "新策略", type: "获得即开", enabled: true, note: "" });
      persistEditableState();
      renderEditors();
    });
  });

  detailStrategySelect.addEventListener("change", (event) => {
    state.detailStrategy = event.target.value;
    persistEditableState();
    renderSummaryTable();
    renderDetailTable();
  });

  window.addEventListener("resize", () => {
    mainlineTimelineChart.resize();
    lineChart.resize();
    barChart.resize();
    updateActiveNav();
  });
  window.addEventListener("scroll", updateActiveNav, { passive: true });
  document.addEventListener("mousedown", (event) => {
    if (!state.mainlineModalOpen) return;
    const dialog = mainlineModalRoot.querySelector(".mainline-modal-dialog");
    if (!dialog) return;
    if (!dialog.contains(event.target)) closeMainlineModal();
  });
}

async function initializeApp() {
  buildPageNav();
  bindCollapsible();
  bindEvents();
  await loadNikkeData();
  renderParams();
  renderDustReference();
  renderEditors();
  runSimulation();
  updateActiveNav();
}

initializeApp();
