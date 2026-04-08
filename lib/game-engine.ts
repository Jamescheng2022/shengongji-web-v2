// =============================================
// 深宫纪 - 游戏引擎核心
// =============================================

// ---------- 类型定义 ----------

export interface Stats {
  // 原有属性
  favor: number;      // 宠爱 0-100 (保留兼容)
  scheming: number;   // 心机 0-100
  health: number;     // 健康 0-100
  influence: number;  // 势力 0-100
  silver: number;     // 银两 0-9999
  wisdom: number;     // 智慧 0-100
  virtue: number;     // 德行 -100~100
  cruelty: number;    // 狠毒 0-100
  
  // ========== 设计文档新增属性 ==========
  
  /** 理智/初心 (0-100) - 底线与清醒，归零则发疯或惨死 */
  san: number;
  
  /** 帝王恩宠·新鲜感 (0-100) - 皇帝对你有多少新鲜感 */
  freshness: number;
  
  /** 帝王恩宠·实用价值 (0-100) - 皇帝觉得你有多少利用价值 */
  usefulness: number;
  
  /** 帝王忌惮值 (0-100) - 皇帝有多忌惮你，满值必死！ */
  dread: number;
  
  /** 洞察力 (0-100) - 用于解码NPC潜台词，每场危机可用1-2次 */
  insight: number;
}

export type Rank =
  | '秀女' | '采女' | '美人' | '贵人'
  | '嫔' | '妃' | '贵妃' | '皇贵妃' | '皇后';

export const RANK_ORDER: Rank[] = [
  '秀女', '采女', '美人', '贵人', '嫔', '妃', '贵妃', '皇贵妃', '皇后',
];

export interface StoryEntry {
  role: 'narrator' | 'player';
  content: string;
  timestamp: number;
}

export type EndingType =
  | 'death_poison'   // 赐毒酒
  | 'death_illness'  // 病逝
  | 'cold_palace'    // 打入冷宫
  | 'exile'          // 流放
  | 'suicide'        // 自尽
  | 'become_nun'     // 出家
  | 'queen'          // 封后
  | 'peaceful'       // 善终
  | null;

// ---------- 宫册·章节系统 ----------

export interface Chapter {
  id: string;               // 章节唯一ID
  index: number;            // 章节序号（从1开始）
  episode: number;          // 对应集数
  title: string;            // 章节标题
  narration: string;        // 剧情正文
  playerChoice: string;     // 玩家的选择（本章结尾做出的选择）
  availableChoices: { id: number; text: string }[];  // 当时提供的选项
  statChanges: Partial<Stats>;   // 本章属性变化
  statSnapshot: Stats;           // 本章结束时的属性快照
  rankAtTime: Rank;              // 本章时的位份
  flagsSnapshot?: string[];      // 本章选择前的 flags 快照
  summarySnapshot?: string;      // 本章选择前的摘要快照
  timestamp: number;             // 记录时间
}

// ---------- 章节摘要系统（解决长剧情一致性）----------

/**
 * 章节摘要 - 用于解决AI长文本剧情生成的一致性问题
 * 每3节自动生成一个摘要，包含关键事件和状态快照
 */
export interface ChapterSummary {
  id: string;                    // 摘要唯一ID
  episodeRange: [number, number]; // 覆盖的集数范围 [起始, 结束]
  summaryText: string;           // 100-150字的剧情摘要
  keyEvents: string[];          // 关键事件列表（3-5个）
  npcRelations: {               // NPC关系快照
    [npcName: string]: 'friend' | 'enemy' | 'neutral' | 'unknown';
  };
  plotFlags: string[];          // 已触发的剧情flag
  statSnapshot: Stats;           // 生成时的属性快照
  timestamp: number;             // 生成时间
}

// 摘要生成常量
const SUMMARY_INTERVAL = 3;  // 每3节生成一次摘要
const MAX_SUMMARIES = 10;   // 最多保留10个摘要（覆盖约30集）

// ---------- 角色档案 ----------

export interface PlayerProfile {
  surname: string;       // 姓氏（如"沈"）
  givenName: string;     // 名字（如"知意"）
  fullName: string;      // 完整名字
  avatarId: string;      // 头像ID（对应预设古风头像）
  origin: string;        // 出身（如"书香门第"、"将门虎女"等）
  personality: string;   // 性格倾向（如"隐忍"、"果决"、"温婉"等）
}

export const AVATAR_OPTIONS: { id: string; label: string; emoji: string; desc: string }[] = [
  { id: 'gentle',    label: '温婉',   emoji: '🌸', desc: '眉眼如画，温柔似水' },
  { id: 'elegant',   label: '端庄',   emoji: '🪷', desc: '仪态万千，气度不凡' },
  { id: 'clever',    label: '灵秀',   emoji: '🦋', desc: '慧黠灵动，古灵精怪' },
  { id: 'cold',      label: '清冷',   emoji: '❄️', desc: '冷若冰霜，不近人情' },
  { id: 'fierce',    label: '刚烈',   emoji: '🔥', desc: '性烈如火，宁折不弯' },
  { id: 'charming',  label: '妩媚',   emoji: '🌙', desc: '风情万种，倾国倾城' },
];

export const ORIGIN_OPTIONS: { id: string; label: string; desc: string; statBonus: Partial<Stats> }[] = [
  { id: 'scholar',   label: '书香门第', desc: '父亲任大理寺少卿，清正不阿', statBonus: { wisdom: 10, virtue: 10 } },
  { id: 'military',  label: '将门虎女', desc: '父亲是镇守边关的参将', statBonus: { influence: 10, health: 5 } },
  { id: 'merchant',  label: '商贾之家', desc: '家族经营江南丝绸生意，富甲一方', statBonus: { silver: 200, scheming: 5 } },
  { id: 'noble',     label: '没落贵族', desc: '祖上曾是开国功臣，如今门庭冷落', statBonus: { influence: 5, favor: 5, scheming: 5 } },
  { id: 'common',    label: '寒门碧玉', desc: '出身清贫却才情出众，被选入宫', statBonus: { wisdom: 5, virtue: 5, health: 5 } },
];

export const PERSONALITY_OPTIONS: { id: string; label: string; emoji: string; desc: string }[] = [
  { id: 'patient',    label: '隐忍', emoji: '🌊', desc: '善于隐藏锋芒，伺机而动' },
  { id: 'decisive',   label: '果决', emoji: '⚔️', desc: '行事雷厉风行，当断则断' },
  { id: 'graceful',   label: '温婉', emoji: '🍃', desc: '以柔克刚，化敌为友' },
  { id: 'cunning',    label: '机敏', emoji: '🦊', desc: '心思七窍玲珑，算无遗策' },
  { id: 'righteous',  label: '正直', emoji: '☀️', desc: '秉持正道，不屑阴谋' },
];

export const DEFAULT_PROFILE: PlayerProfile = {
  surname: '沈',
  givenName: '知意',
  fullName: '沈知意',
  avatarId: 'gentle',
  origin: 'scholar',
  personality: 'patient',
};

export interface GameState {
  id: string;
  name: string;           // 存档名
  playerProfile: PlayerProfile;  // 角色档案
  currentEpisode: number;
  currentSection: number;  // 当前小节（每集3节）
  stats: Stats;
  rank: Rank;
  history: StoryEntry[];  // 最近剧情（仅保留最近 MAX_HISTORY 条）
  summary: string;        // 之前剧情的压缩摘要
  flags: string[];        // 已触发事件标记
  ending: EndingType;
  chapters: Chapter[];    // 宫册·所有章节
  /** 章节摘要数组 - 用于解决长剧情一致性，每3节生成一次 */
  chapterSummaries: ChapterSummary[];
  pendingNarration: string;               // 当前等待玩家选择的剧情文本
  pendingChoices: { id: number; text: string; stat_changes?: Partial<Stats> }[];  // 当前等待玩家选择的选项
  pendingStatChanges: Partial<Stats>;     // 当前剧情对应的属性变化
  /** 潜台词 - 当前NPC对话的真实意图，玩家可消耗洞察力解码 */
  pendingSubtext?: string;
  freeRewindsToday: number;    // 今日已用免费改命次数
  lastRewindDate: string;      // 上次改命日期（用于重置每日次数）
  createdAt: number;
  updatedAt: number;
}

export interface AIResponse {
  narration: string;
  // 每个选项附带预期属性变化（如不确定可为空）
  choices: { 
    id: number; 
    text: string; 
    // 选项的预期属性变化，格式：{ 属性: 变化值 }
    stat_changes?: Partial<Stats>;
  }[];
  stat_changes: Partial<Stats>;
  new_flags?: string[];
  episode_end?: boolean;
  ending?: EndingType;
  /** 章节标题 - 七言/八言古典对仗句，如"藏锋芒碎玉轩称病，避祸端御花园逢迎" */
  title?: string;
  /** 潜台词 - 当前NPC对话的真实意图，玩家可消耗洞察力解码 */
  subtext?: string;
  /** 当前小节数（集内回合） */
  section?: number;
}

// ---------- 常量 ----------

const MAX_HISTORY = 20;
const FREE_REWINDS_PER_DAY = 1;

const RANK_THRESHOLDS: Record<Rank, { favor: number; influence: number; episode: number }> = {
  '秀女':   { favor: 0,  influence: 0,  episode: 0 },
  '采女':   { favor: 10, influence: 5,  episode: 1 },
  '美人':   { favor: 25, influence: 15, episode: 5 },
  '贵人':   { favor: 40, influence: 25, episode: 12 },
  '嫔':     { favor: 55, influence: 35, episode: 25 },
  '妃':     { favor: 65, influence: 50, episode: 40 },
  '贵妃':   { favor: 75, influence: 65, episode: 60 },
  '皇贵妃': { favor: 85, influence: 80, episode: 80 },
  '皇后':   { favor: 95, influence: 90, episode: 95 },
};

// ---------- 核心函数 ----------

export function createNewGame(name: string = '存档一', profile?: Partial<PlayerProfile>): GameState {
  const p: PlayerProfile = {
    ...DEFAULT_PROFILE,
    ...profile,
    fullName: profile?.fullName || `${profile?.surname || DEFAULT_PROFILE.surname}${profile?.givenName || DEFAULT_PROFILE.givenName}`,
  };

  // 根据出身加成初始属性
  const originBonus = ORIGIN_OPTIONS.find(o => o.id === p.origin)?.statBonus || {};

  const baseStats: Stats = {
    favor: 15,
    scheming: 20,
    health: 100,
    influence: 5,
    silver: 200,
    wisdom: 30,
    virtue: 10,
    cruelty: 0,
    // 设计文档新增初始值
    san: 80,         // 理智初始80，留有余裕
    freshness: 30,   // 新鲜感初始中等
    usefulness: 20,  // 实用价值较低
    dread: 0,       // 忌惮值初始为0
    insight: 10,     // 洞察力初始较低
  };

  return {
    id: `save_${Date.now()}`,
    name,
    playerProfile: p,
    currentEpisode: 1,
    currentSection: 1,
    stats: clampStats(applyStatChanges(baseStats, originBonus)),
    rank: '秀女',
    history: [],
    summary: '',
    flags: [],
    ending: null,
    chapters: [],
    chapterSummaries: [],  // 章节摘要数组，初始为空
    pendingNarration: '',
    pendingChoices: [],
    pendingStatChanges: {},
    pendingSubtext: '', // 潜台词
    freeRewindsToday: 0,
    lastRewindDate: new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** 钳制数值到合法范围 */
export function clampStats(stats: Stats): Stats {
  return {
    favor: Math.max(0, Math.min(100, Math.round(stats.favor))),
    scheming: Math.max(0, Math.min(100, Math.round(stats.scheming))),
    health: Math.max(0, Math.min(100, Math.round(stats.health))),
    influence: Math.max(0, Math.min(100, Math.round(stats.influence))),
    silver: Math.max(0, Math.min(9999, Math.round(stats.silver))),
    wisdom: Math.max(0, Math.min(100, Math.round(stats.wisdom))),
    virtue: Math.max(-100, Math.min(100, Math.round(stats.virtue))),
    cruelty: Math.max(0, Math.min(100, Math.round(stats.cruelty))),
    // 设计文档新增属性
    san: Math.max(0, Math.min(100, Math.round(stats.san))),
    freshness: Math.max(0, Math.min(100, Math.round(stats.freshness))),
    usefulness: Math.max(0, Math.min(100, Math.round(stats.usefulness))),
    dread: Math.max(0, Math.min(100, Math.round(stats.dread))),
    insight: Math.max(0, Math.min(100, Math.round(stats.insight))),
  };
}

/** 应用属性变化 */
export function applyStatChanges(current: Stats, changes: Partial<Stats>): Stats {
  const newStats = { ...current };
  for (const [key, value] of Object.entries(changes)) {
    if (key in newStats && typeof value === 'number') {
      (newStats as Record<string, number>)[key] += value;
    }
  }
  return clampStats(newStats);
}

/** 检查是否应该晋升 */
export function checkPromotion(state: GameState): Rank {
  const currentIdx = RANK_ORDER.indexOf(state.rank);
  let newRank = state.rank;

  for (let i = currentIdx + 1; i < RANK_ORDER.length; i++) {
    const rank = RANK_ORDER[i];
    const threshold = RANK_THRESHOLDS[rank];
    if (
      state.stats.favor >= threshold.favor &&
      state.stats.influence >= threshold.influence &&
      state.currentEpisode >= threshold.episode
    ) {
      newRank = rank;
    } else {
      break;
    }
  }
  return newRank;
}

/** 检查结局条件 - 设计文档增强版 */
export function checkEnding(state: GameState): EndingType {
  const { stats, currentEpisode } = state;
  
  // ========== 死亡条件（按优先级）==========
  
  // 1. 忌惮值满则赐死
  if (stats.dread >= 100) return 'death_poison';
  
  // 2. 理智归零则发疯/自尽
  if (stats.san <= 0) return 'suicide';
  
  // 3. 健康归零则病逝
  if (stats.health <= 0) return 'death_illness';
  
  // 4. 宠爱归零超过5集则打入冷宫
  if (stats.favor <= 0 && currentEpisode > 5) return 'cold_palace';
  
  // 5. 势力归零则被边缘化（流放）
  if (stats.influence <= 0 && currentEpisode > 10) return 'exile';
  
  // 6. 德行严重亏损可能被要求出家
  if (stats.virtue <= -50 && currentEpisode > 15) return 'become_nun';
  
  // ========== 胜利条件 ==========
  
  // 7. 100集后成为皇后
  if (state.rank === '皇后' && currentEpisode >= 100) return 'queen';
  
  // 8. 存活100集
  if (currentEpisode >= 100) return 'peaceful';
  
  return null;
}

/** 获取死亡/触发结局的原因描述 */
export function getEndingCause(state: GameState): string {
  const { stats, currentEpisode } = state;
  
  if (stats.dread >= 100) return '帝王忌惮日深，一杯鸩酒，终结了所有挣扎。';
  if (stats.san <= 0) return '理智崩塌，在绝望中选择最后的尊严。';
  if (stats.health <= 0) return '深宫的阴冷与算计终于压垮了你的身体。';
  if (stats.favor <= 0 && currentEpisode > 5) return '失去了所有恩宠，你被打入冷宫。';
  if (stats.influence <= 0 && currentEpisode > 10) return '势力尽失，一纸诏书，你被逐出京城。';
  if (stats.virtue <= -50 && currentEpisode > 15) return '看透了后宫的虚妄，你选择遁入空门。';
  
  return '';
}

/** 处理AI响应，更新游戏状态 */
export function processAIResponse(state: GameState, response: AIResponse): GameState {
  const newStats = applyStatChanges(state.stats, response.stat_changes);
  const newHistory = [
    ...state.history,
    { role: 'narrator' as const, content: response.narration, timestamp: Date.now() },
  ].slice(-MAX_HISTORY);

  // 处理节数
  const currentSection = response.section || (state.currentSection + 1);
  const episodeEnd = response.episode_end || currentSection > 3;
  const newEpisode = episodeEnd ? state.currentEpisode + 1 : state.currentEpisode;
  const newSection = episodeEnd ? 1 : currentSection;

  const newState: GameState = {
    ...state,
    stats: newStats,
    history: newHistory,
    flags: [...state.flags, ...(response.new_flags || [])],
    pendingNarration: response.narration,
    pendingChoices: response.choices,
    pendingStatChanges: response.stat_changes,
    pendingSubtext: response.subtext, // 潜台词
    currentEpisode: newEpisode,
    currentSection: newSection,
    updatedAt: Date.now(),
  };

  // 检查晋升
  const newRank = checkPromotion(newState);
  if (newRank !== newState.rank) {
    newState.rank = newRank;
    newState.flags.push(`promoted_to_${newRank}`);
  }

  // 检查结局
  const ending = response.ending || checkEnding(newState);
  if (ending) {
    newState.ending = ending;
  }

  return newState;
}

// ---------- 宫册·章节操作 ----------

/** 添加一个新章节到宫册 */
export function addChapter(
  state: GameState,
  narration: string,
  playerChoice: string,
  availableChoices: { id: number; text: string }[],
  statChanges: Partial<Stats>,
  title?: string,
): GameState {
  const chapterIndex = state.chapters.length + 1;
  const chapter: Chapter = {
    id: `ch_${Date.now()}_${chapterIndex}`,
    index: chapterIndex,
    episode: state.currentEpisode,
    title: title || `第${chapterIndex}回`,
    narration,
    playerChoice,
    availableChoices,
    statChanges,
    statSnapshot: { ...state.stats },
    rankAtTime: state.rank,
    flagsSnapshot: [...state.flags],
    summarySnapshot: state.summary,
    timestamp: Date.now(),
  };

  return {
    ...state,
    chapters: [...state.chapters, chapter],
  };
}

function rebuildHistoryForPendingChapter(chapters: Chapter[], targetIdx: number): StoryEntry[] {
  if (targetIdx <= 0) return [];

  const rebuilt: StoryEntry[] = [];

  for (let i = 0; i < targetIdx; i++) {
    rebuilt.push({
      role: 'player',
      content: chapters[i].playerChoice,
      timestamp: chapters[i].timestamp,
    });

    rebuilt.push({
      role: 'narrator',
      content: chapters[i + 1].narration,
      timestamp: chapters[i + 1].timestamp,
    });
  }

  return rebuilt.slice(-MAX_HISTORY);
}

/** 改命回退：回退到指定章节，删除之后所有章节，恢复属性快照 */
export function rewindToChapter(state: GameState, chapterId: string): GameState | null {
  const idx = state.chapters.findIndex(c => c.id === chapterId);
  if (idx < 0) return null;

  const targetChapter = state.chapters[idx];
  const keptChapters = state.chapters.slice(0, idx);

  return {
    ...state,
    chapters: keptChapters,
    stats: { ...targetChapter.statSnapshot },
    rank: targetChapter.rankAtTime,
    currentEpisode: targetChapter.episode,
    history: rebuildHistoryForPendingChapter(state.chapters, idx),
    flags: targetChapter.flagsSnapshot ? [...targetChapter.flagsSnapshot] : [...state.flags],
    summary: targetChapter.summarySnapshot ?? state.summary,
    ending: null,
    pendingNarration: targetChapter.narration,
    pendingChoices: [...targetChapter.availableChoices],
    pendingStatChanges: { ...targetChapter.statChanges },
    updatedAt: Date.now(),
  };
}

// ---------- 章节摘要系统函数 ----------

/**
 * 检查是否应该生成章节摘要
 * 每3节生成一次摘要
 */
export function shouldGenerateSummary(state: GameState): boolean {
  // 新游戏不需要摘要
  if (state.currentEpisode === 1 && state.currentSection <= 1) {
    return false;
  }
  // 每3节生成一次
  return state.currentSection % SUMMARY_INTERVAL === 0;
}

/**
 * 检查是否需要生成摘要（用于回退后）
 */
export function needsSummary(state: GameState): boolean {
  if (state.chapterSummaries.length === 0) {
    return state.currentEpisode > 1 || state.currentSection > 1;
  }
  const lastSummary = state.chapterSummaries[state.chapterSummaries.length - 1];
  return state.currentEpisode > lastSummary.episodeRange[1];
}

/**
 * 添加章节摘要
 */
export function addChapterSummary(
  state: GameState,
  summaryText: string,
  keyEvents: string[],
  npcRelations: { [npcName: string]: 'friend' | 'enemy' | 'neutral' | 'unknown' },
): GameState {
  const lastSummary = state.chapterSummaries[state.chapterSummaries.length - 1];
  const startEpisode = lastSummary ? lastSummary.episodeRange[1] + 1 : 1;
  const endEpisode = state.currentEpisode;

  const newSummary: ChapterSummary = {
    id: `summary_${Date.now()}`,
    episodeRange: [startEpisode, endEpisode],
    summaryText,
    keyEvents,
    npcRelations,
    plotFlags: [...state.flags],
    statSnapshot: { ...state.stats },
    timestamp: Date.now(),
  };

  // 保留最近10个摘要（约30集内容）
  const updatedSummaries = [...state.chapterSummaries, newSummary].slice(-MAX_SUMMARIES);

  return {
    ...state,
    chapterSummaries: updatedSummaries,
  };
}

/**
 * 获取最近的章节摘要（最多2个）用于注入Prompt
 */
export function getRecentSummaries(state: GameState, count: number = 2): ChapterSummary[] {
  return state.chapterSummaries.slice(-count);
}

/**
 * 格式化摘要为Prompt文本
 */
export function formatSummariesForPrompt(summaries: ChapterSummary[]): string {
  if (summaries.length === 0) return '';

  const formatted = summaries.map(s => {
    const npcRelationsText = Object.entries(s.npcRelations)
      .map(([name, relation]) => `${name}（${relation === 'friend' ? '友善' : relation === 'enemy' ? '敌对' : '中立' === 'unknown' ? '未知' : '中立'}）`)
      .join('、');

    return `【第${s.episodeRange[0]}-${s.episodeRange[1]}集剧情摘要】
剧情：${s.summaryText}
关键事件：${s.keyEvents.join('；')}
人物关系：${npcRelationsText || '暂无记录'}`;
  }).join('\n\n');

  return `## ========== 前期剧情摘要 ==========\n${formatted}\n\n⚠️ 请严格遵循以上剧情摘要，保持人物关系和事件逻辑一致！`;
}

/** 检查是否可以免费改命 */
export function canFreeRewind(state: GameState): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastRewindDate !== today) {
    return true; // 新的一天，重置次数
  }
  return state.freeRewindsToday < FREE_REWINDS_PER_DAY;
}

/** 消耗一次免费改命 */
export function useFreeRewind(state: GameState): GameState {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastRewindDate !== today) {
    return { ...state, freeRewindsToday: 1, lastRewindDate: today };
  }
  return { ...state, freeRewindsToday: state.freeRewindsToday + 1 };
}

// ---------- 辅助函数 ----------

/** 获取位份排名进度 (0~1) */
export function getRankProgress(rank: Rank): number {
  const idx = RANK_ORDER.indexOf(rank);
  return idx / (RANK_ORDER.length - 1);
}

/** 获取位份中文描述（支持自定义姓名） */
export function getRankTitle(rank: Rank, profile?: PlayerProfile): string {
  const surname = profile?.surname || '沈';
  const givenFirst = profile?.givenName?.[0] || '知';
  const titles: Record<Rank, string> = {
    '秀女': '秀女',
    '采女': '采女',
    '美人': `${surname}美人`,
    '贵人': `${surname}贵人`,
    '嫔': `${givenFirst}嫔`,
    '妃': `${givenFirst}妃`,
    '贵妃': `${givenFirst}贵妃`,
    '皇贵妃': `${surname}皇贵妃`,
    '皇后': `${surname}皇后`,
  };
  return titles[rank];
}

// ---------- AI 解析工具 ----------

function stripNarrationArtifacts(raw: string): string {
  const text = raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    // 清理模型偶发附带在剧情末尾的属性/状态原始文本
    .replace(/\n{1,2}(?:(?:当前)?(?:属性|数值|状态|Stats?)\s*[:：][\s\S]*|(?:宠爱|心机|健康|势力|银两|智慧|德行|狠毒|favor|scheming|health|influence|silver|wisdom|virtue|cruelty|episode|集数|回合|存活)\s*[:：][\s\S]*)$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text || '（剧情生成中，请稍候...）';
}

function sanitizeAIResponse(response: AIResponse): AIResponse {
  const safeChoices = Array.isArray(response.choices)
    ? response.choices
        .filter((choice) => choice && typeof choice.text === 'string' && choice.text.trim())
        .slice(0, 3)
        .map((choice, index) => ({
          id: typeof choice.id === 'number' ? choice.id : index + 1,
          text: choice.text.replace(/\s+/g, ' ').trim(),
        }))
    : [];

  return {
    ...response,
    narration: stripNarrationArtifacts(response.narration || ''),
    choices: safeChoices,
    stat_changes: response.stat_changes || {},
    // 设计文档新增：保留潜台词和章节标题
    subtext: response.subtext || undefined,
    title: response.title || undefined,
  };
}

export function parseAIOutput(raw: string): AIResponse {
  // 去掉可能的思考过程 <think>...</think>
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // 尝试多种 JSON 提取方式
  // 1. ```json ... ```
  const jsonBlockMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    return sanitizeAIResponse(JSON.parse(jsonBlockMatch[1]));
  }

  // 2. ``` ... ``` (无 json 标记)
  const codeBlockMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    if (inner.startsWith('{')) {
      return sanitizeAIResponse(JSON.parse(inner));
    }
  }

  // 3. 直接找最外层 { ... }
  const braceStart = cleaned.indexOf('{');
  const braceEnd = cleaned.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const jsonStr = cleaned.slice(braceStart, braceEnd + 1);
    return sanitizeAIResponse(JSON.parse(jsonStr));
  }

  throw new Error('No valid JSON found in AI output');
}

export function cleanNarration(raw: string): string {
  return stripNarrationArtifacts(raw);
}

// ---------- 存档系统 ----------

const SAVE_KEY = 'shengongji_saves';

export function getAllSaves(): GameState[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SAVE_KEY);
    const saves: GameState[] = data ? JSON.parse(data) : [];
    // 兼容旧存档：补齐新字段
    return saves.map(s => ({
      ...s,
      playerProfile: s.playerProfile || DEFAULT_PROFILE,
      chapters: (s.chapters || []).map(chapter => ({
        ...chapter,
        flagsSnapshot: chapter.flagsSnapshot || [],
        summarySnapshot: chapter.summarySnapshot || '',
      })),
      pendingNarration: s.pendingNarration || '',
      pendingChoices: s.pendingChoices || [],
      pendingStatChanges: s.pendingStatChanges || {},
      pendingSubtext: s.pendingSubtext || '', // 新增：潜台词
      // 新增数值属性（兼容旧存档）
      san: s.stats?.san ?? 80,
      freshness: s.stats?.freshness ?? 30,
      usefulness: s.stats?.usefulness ?? 20,
      dread: s.stats?.dread ?? 0,
      insight: s.stats?.insight ?? 10,
      freeRewindsToday: s.freeRewindsToday || 0,
      lastRewindDate: s.lastRewindDate || new Date().toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

export function saveSave(state: GameState): void {
  if (typeof window === 'undefined') return;
  const saves = getAllSaves();
  const idx = saves.findIndex(s => s.id === state.id);
  if (idx >= 0) {
    saves[idx] = state;
  } else {
    saves.push(state);
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
}

export function deleteSave(id: string): void {
  if (typeof window === 'undefined') return;
  const saves = getAllSaves().filter(s => s.id !== id);
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
}

export function getLatestSave(): GameState | null {
  const saves = getAllSaves();
  if (saves.length === 0) return null;
  return saves.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}
