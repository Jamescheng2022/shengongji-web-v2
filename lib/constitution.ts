// =============================================
// 深宫纪 - 宪法校验器 (Phase 1)
// 三道防线中的第二道：AI 输出后逐条校验
// =============================================

import type { AIResponse, Stats, GameState, Rank } from './game-engine';

// ---------- 类型定义 ----------

export type ViolationLevel = 'yellow' | 'orange' | 'red';

export interface Violation {
  rule: string;           // 违反了哪条宪法
  detail: string;         // 具体描述
  level: ViolationLevel;
  field: string;          // 违规出现在哪个字段 (narration / choices / stat_changes)
}

export interface ViolationReport {
  level: 'green' | ViolationLevel;
  violations: Violation[];
  shouldRetry: boolean;   // 橙色：重试一次
  shouldFallback: boolean; // 红色：切 fallback
}

// ---------- 权力矩阵 ----------

interface PowerMatrix {
  can: string[];
  cannot: string[];
}

const RANK_POWERS: Record<string, PowerMatrix> = {
  '秀女': {
    can: [
      '在储秀宫内走动', '与其他秀女交谈', '观察嬷嬷言行',
      '学习宫规', '请安问礼', '接受训诫',
    ],
    cannot: [
      '独自外出储秀宫', '夜间出行', '指挥太监或宫女',
      '携带利器', '拒绝上级命令', '直接与皇帝对话',
      '进入其他妃嫔宫殿', '传递秘密信件', '使用毒药',
      '密谋暗杀', '面见太后',
    ],
  },
  '采女': {
    can: [
      '管理自己的小院', '支配贴身宫女', '在本宫范围走动',
      '给嬷嬷送礼', '参加日常请安',
    ],
    cannot: [
      '调动侍卫', '直接面见太后', '处罚他人宫女太监',
      '夜间随意出行', '携带利器', '使用毒药',
    ],
  },
  '美人': {
    can: [
      '管理自己的院落', '支配数名宫女太监', '在后宫各处走动',
      '参加请安', '与其他嫔妃社交',
    ],
    cannot: [
      '调动侍卫', '直接面见太后（需通报）', '处罚高位嫔妃下人',
      '携带利器', '使用毒药',
    ],
  },
  '贵人': {
    can: [
      '有自己的宫殿', '参与请安', '接触皇帝',
      '管理本宫事务', '与各宫往来',
    ],
    cannot: [
      '处罚其他妃嫔下人', '干预朝政', '携带利器',
      '调动侍卫', '使用毒药',
    ],
  },
  '嫔': {
    can: [
      '有独立宫殿', '参与宫务', '侍寝',
      '参与重要仪式', '提拔身边人',
    ],
    cannot: [
      '协理六宫（需妃位以上）', '干预朝政',
      '处罚同级嫔妃', '调动军队',
    ],
  },
  '妃': {
    can: [
      '协理六宫', '处罚低位嫔妃', '参与重大仪式',
      '有大量宫女太监', '与太后直接对话',
    ],
    cannot: [
      '废后', '调动军队', '出宫', '谋反',
    ],
  },
  '贵妃': {
    can: [
      '协理六宫', '处罚低位嫔妃', '参与重大仪式',
      '影响皇帝决策', '与太后直接对话',
    ],
    cannot: [
      '废后', '调动军队', '出宫', '谋反',
    ],
  },
  '皇贵妃': {
    can: [
      '代皇后管理六宫', '处罚低位嫔妃', '参与重大仪式',
      '影响朝政（间接）', '与太后平等对话',
    ],
    cannot: [
      '废后', '调动军队', '出宫', '谋反',
    ],
  },
  '皇后': {
    can: [
      '管理六宫', '代太后行事', '参与重大仪式',
      '处罚所有低位嫔妃', '与皇帝平等对话',
    ],
    cannot: [
      '违抗圣旨', '谋反', '调动军队', '出宫',
    ],
  },
};

export function getPowerMatrix(rank: string): PowerMatrix {
  return RANK_POWERS[rank] || RANK_POWERS['秀女'];
}

// ---------- 阶段允许出场的 NPC ----------

const STAGE_NPCS: Record<string, string[]> = {
  early: ['王嬷嬷', '嬷嬷', '乌兰', '柳婉儿'],  // 第1-3集
  mid_early: ['王嬷嬷', '嬷嬷', '乌兰', '柳婉儿', '华妃', '皇后', '淑嫔', '云舒', '皇帝', '景隆帝'],  // 第4-10集
  mid: ['王嬷嬷', '乌兰', '华妃', '皇后', '淑嫔', '云舒', '皇帝', '景隆帝', '太后'],  // 第11-30集
  late: ['王嬷嬷', '乌兰', '华妃', '皇后', '淑嫔', '云舒', '皇帝', '景隆帝', '太后'],  // 第31+集，所有人
};

export function getAllowedNPCs(episode: number): string[] {
  if (episode <= 3) return STAGE_NPCS.early;
  if (episode <= 10) return STAGE_NPCS.mid_early;
  if (episode <= 30) return STAGE_NPCS.mid;
  return STAGE_NPCS.late;
}

// ---------- 铁律六：禁词表 ----------

// 现代物品
const MODERN_OBJECTS = /手机|电脑|汽车|飞机|火车|步枪|手枪|炸弹|玻璃杯|塑料|钢笔|圆珠笔|necklace|earring|bracelet|ring|phone|computer|car/i;

// 现代用语
const MODERN_SLANG = /\b(OK|ok|Ok)\b|闺蜜|报警|打卡|社交|拉黑|KPI|CEO|APP|WiFi|GPS|打工|上班|下班|网络|在线|离线|直播|粉丝|流量|热搜|吐槽|安利|种草|拔草/;

// 网络用语
const NET_SPEAK = /666|yyds|绝绝子|破防|暴击|人设|吃瓜|凡尔赛|内卷|躺平|摆烂|emo|girlboss|slay|queen|king/i;

// AI 套话 / 现代逻辑连接词
const AI_CLICHE = /值得一提的是|不言而喻|毋庸置疑|综上所述|总而言之|众所周知|事实上|从某种程度上说|如前所述|正如我们所见/;

// 现代逻辑（不可能出现在宫廷场景中的概念）
const MODERN_LOGIC = /面试|招聘|简历|合同|签约|投资|股票|贷款|利率|人力资源|团队建设|项目管理|创业|品牌|营销|市场|运营|流程|方案|策划|推广/;

// 数值暴露 / meta-gaming（AI 不应该直接提到游戏数值）
const META_GAMING = /宠爱值|好感度|忌惮值|san值|SAN值|数值|经验值|升级|积分|属性|技能点|血量|蓝量|MP|HP|攻击力|防御力/;

const LANGUAGE_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: MODERN_OBJECTS,  category: '现代物品' },
  { pattern: MODERN_SLANG,    category: '现代用语' },
  { pattern: NET_SPEAK,       category: '网络用语' },
  { pattern: AI_CLICHE,       category: 'AI套话' },
  { pattern: MODERN_LOGIC,    category: '现代逻辑' },
  { pattern: META_GAMING,     category: '数值暴露' },
];

// ---------- 铁律一：权力越界检测关键词 ----------

const POWER_VIOLATION_PATTERNS: Record<string, RegExp[]> = {
  '秀女': [
    /匕首|短刀|利刃|长剑|弓箭/,               // 武器
    /毒药|毒粉|砒霜|鸩毒|堕胎药/,             // 毒药
    /潜入.*寝宫|闯入.*宫|偷偷溜进|夜探/,       // 非法闯入
    /命令.*太监|指挥.*侍卫|吩咐.*公公/,         // 越权指挥
    /侍寝|承恩|翻牌|临幸|侍候圣驾/,           // 秀女阶段不可能
    /废了|杀了|处死|赐死|杖毙|活埋/,           // 无此权力
    /调动.*御林军|调兵|暗杀|行刺|谋反/,         // 极端越权
  ],
  '采女': [
    /匕首|短刀|利刃|长剑|弓箭/,
    /毒药|毒粉|砒霜|鸩毒/,
    /调动.*侍卫|指挥.*御林军|调兵/,
    /处罚.*其他.*宫女|杖责.*他人/,
    /暗杀|行刺|谋反/,
  ],
  '美人': [
    /匕首|短刀|利刃|长剑|弓箭/,
    /毒药|毒粉|砒霜|鸩毒/,
    /调动.*侍卫|指挥.*御林军|调兵/,
    /暗杀|行刺|谋反/,
  ],
  '贵人': [
    /调动.*御林军|调兵/,
    /暗杀|行刺|谋反/,
  ],
};

// ---------- 阶段边界检测 ----------

interface StageBan {
  patterns: RegExp[];
  reason: string;
}

const STAGE_BANS: Record<string, StageBan[]> = {
  // 第1-3集：入宫初选阶段
  early: [
    {
      patterns: [/侍寝|承恩|翻牌|临幸|侍候圣驾|承宠/],
      reason: '第1-3集是入宫选秀阶段，不可能侍寝',
    },
    {
      patterns: [/封.*嫔|封.*妃|晋封|册封|晋升为/],
      reason: '第1-3集不可能有封号晋升',
    },
    {
      patterns: [/皇帝.*(?:说|道|笑|怒|看)|景隆帝.*(?:说|道|笑|怒|看)/],
      reason: '第1-3集皇帝不应正式出场（只闻其名不见其人）',
    },
    {
      patterns: [/太后.*(?:召见|传话|说道)|面见太后/],
      reason: '第1-3集太后不应与秀女直接互动',
    },
  ],
  // 第4-10集：后宫适应阶段
  mid_early: [
    {
      patterns: [/太后寿辰|皇帝大婚|立储|废太子|选秀大典/],
      reason: '第4-10集不应出现重大宫廷事件',
    },
  ],
};

// ---------- 校验函数实现 ----------

function checkLanguagePurity(output: AIResponse, violations: Violation[]): void {
  const allText = [
    output.narration || '',
    output.subtext || '',
    output.title || '',
    ...(output.choices?.map(c => c.text) || []),
  ].join(' ');

  for (const { pattern, category } of LANGUAGE_PATTERNS) {
    const match = allText.match(pattern);
    if (match) {
      violations.push({
        rule: '铁律六：语言纯度',
        detail: `检测到${category}："${match[0]}"`,
        level: 'red',
        field: 'narration',
      });
    }
  }
}

function checkPowerBoundary(output: AIResponse, state: GameState, violations: Violation[]): void {
  const patterns = POWER_VIOLATION_PATTERNS[state.rank];
  if (!patterns) return;

  const narration = output.narration || '';
  const choiceTexts = (output.choices || []).map(c => c.text).join(' ');
  const allText = narration + ' ' + choiceTexts;

  for (const pattern of patterns) {
    const match = allText.match(pattern);
    if (match) {
      violations.push({
        rule: '铁律一：权力守恒',
        detail: `当前身份"${state.rank}"不应出现此行为："${match[0]}"`,
        level: 'red',
        field: 'narration',
      });
    }
  }
}

function checkStageBoundary(output: AIResponse, state: GameState, violations: Violation[]): void {
  const episode = state.currentEpisode;
  let stageKey: string;
  if (episode <= 3) stageKey = 'early';
  else if (episode <= 10) stageKey = 'mid_early';
  else return; // 第11集以后不做阶段边界检查

  const bans = STAGE_BANS[stageKey];
  if (!bans) return;

  const allText = [
    output.narration || '',
    output.subtext || '',
    ...(output.choices?.map(c => c.text) || []),
  ].join(' ');

  for (const ban of bans) {
    for (const pattern of ban.patterns) {
      const match = allText.match(pattern);
      if (match) {
        violations.push({
          rule: '阶段边界',
          detail: `${ban.reason}，但检测到："${match[0]}"`,
          level: 'red',
          field: 'narration',
        });
      }
    }
  }
}

function checkChoiceCost(output: AIResponse, violations: Violation[]): void {
  if (!output.choices || output.choices.length === 0) return;

  for (const choice of output.choices) {
    // 跳过洞察力选项（第3选项通常是消耗洞察力）
    if (choice.text.includes('洞察力') || choice.text.includes('解读') || choice.text.includes('观察')) {
      continue;
    }

    const changes = choice.stat_changes;
    if (!changes) {
      violations.push({
        rule: '铁律五：代价不可免除',
        detail: `选项"${choice.text.slice(0, 25)}..."缺少 stat_changes`,
        level: 'orange',
        field: 'choices',
      });
      continue;
    }

    // 检查是否全是正面变化（"白嫖"选项）
    const entries = Object.entries(changes).filter(([, v]) => v !== 0);
    if (entries.length === 0) continue; // 全零不算违规（可能是叙事选项）

    // dread 增加算代价，其他属性减少算代价
    const hasCost = entries.some(([key, val]) => {
      if (key === 'dread') return (val as number) > 0;       // dread增加 = 代价
      if (key === 'san') return (val as number) < 0;          // san减少 = 代价
      if (key === 'health') return (val as number) < 0;       // 健康减少 = 代价
      if (key === 'insight') return (val as number) < 0;      // 洞察力消耗 = 代价
      if (key === 'favor') return (val as number) < 0;        // 失宠 = 代价
      if (key === 'cruelty') return (val as number) > 0;      // 变狠 = 代价（心理代价）
      return (val as number) < 0; // 其他属性减少 = 代价
    });

    if (!hasCost) {
      violations.push({
        rule: '铁律五：代价不可免除',
        detail: `选项"${choice.text.slice(0, 25)}..."没有任何代价（全是正面变化）`,
        level: 'orange',
        field: 'choices',
      });
    }
  }
}

function checkChoiceAnchoring(output: AIResponse, state: GameState, violations: Violation[]): void {
  if (!output.choices || output.choices.length === 0) return;

  // 从最近的剧情中提取上下文
  const recentNarrations = state.history
    .filter(h => h.role === 'narrator')
    .slice(-3)
    .map(h => h.content)
    .join(' ');

  // 加上当前这段新叙事
  const contextText = recentNarrations + ' ' + (output.narration || '');

  // 已知 NPC 完整列表
  const ALL_NPCS = [
    '华妃', '皇后', '皇帝', '太后', '嬷嬷', '王嬷嬷',
    '乌兰', '淑嫔', '景隆帝', '柳婉儿', '云舒',
  ];

  for (const choice of output.choices) {
    // 洞察力选项跳过
    if (choice.text.includes('洞察力')) continue;

    for (const npc of ALL_NPCS) {
      if (choice.text.includes(npc) && !contextText.includes(npc)) {
        violations.push({
          rule: '选项锚定',
          detail: `选项提到"${npc}"，但最近剧情中未出现此人物`,
          level: 'orange',
          field: 'choices',
        });
      }
    }
  }
}

function checkStatChanges(output: AIResponse, state: GameState, violations: Violation[]): void {
  const changes = output.stat_changes;
  if (!changes) return;

  // 每项变化绝对值不应超过15
  const MAX_CHANGE = 15;
  for (const [key, val] of Object.entries(changes)) {
    const v = val as number;
    if (Math.abs(v) > MAX_CHANGE) {
      violations.push({
        rule: '数值合理性',
        detail: `${key} 变化 ${v} 超过上限 ±${MAX_CHANGE}`,
        level: 'orange',
        field: 'stat_changes',
      });
    }
  }

  // dread 不应在没有叙事支撑的情况下大幅变化
  const dreadChange = (changes as Partial<Stats>).dread;
  if (dreadChange !== undefined && dreadChange < 0 && Math.abs(dreadChange) > 5) {
    violations.push({
      rule: '数值合理性',
      detail: `忌惮值(dread)大幅下降 ${dreadChange}——忌惮值原则上只增不减`,
      level: 'orange',
      field: 'stat_changes',
    });
  }
}

// ---------- 主校验函数 ----------

function getMaxLevel(violations: Violation[]): ViolationLevel {
  if (violations.some(v => v.level === 'red')) return 'red';
  if (violations.some(v => v.level === 'orange')) return 'orange';
  return 'yellow';
}

/**
 * 对 AI 输出进行宪法校验
 * @returns ViolationReport 包含违规列表和建议操作
 */
export function validateAIOutput(
  output: AIResponse,
  state: GameState,
): ViolationReport {
  const violations: Violation[] = [];

  // 铁律六：语言纯度（正则检测，最容易实现且效果最好）
  checkLanguagePurity(output, violations);

  // 铁律一：权力守恒（当前身份不应出现的行为）
  checkPowerBoundary(output, state, violations);

  // 阶段边界（当前集数不应出现的内容）
  checkStageBoundary(output, state, violations);

  // 铁律五：代价不可免除（选项必须有代价）
  checkChoiceCost(output, violations);

  // 选项锚定（选项必须引用最近出现过的元素）
  checkChoiceAnchoring(output, state, violations);

  // 数值合理性（变化幅度检查）
  checkStatChanges(output, state, violations);

  const maxLevel = violations.length > 0 ? getMaxLevel(violations) : 'green' as const;

  return {
    level: maxLevel === 'green' ? 'green' : maxLevel,
    violations,
    shouldRetry: maxLevel === 'orange',
    shouldFallback: maxLevel === 'red',
  };
}

// ---------- 宪法 Prompt 注入块 ----------

/**
 * 根据当前游戏状态生成宪法约束块，注入到 System Prompt 中
 * 这不是泛泛的规则，而是精确到"此时此刻你能做什么"
 */
export function buildConstitutionBlock(state: GameState): string {
  const rank = state.rank;
  const episode = state.currentEpisode;
  const power = getPowerMatrix(rank);
  const allowedNPCs = getAllowedNPCs(episode);

  // 阶段性物理约束
  let physicalRules: string;
  if (episode <= 3) {
    physicalRules = `- 主角所在地点：储秀宫（不得离开）
- 时间设定：入宫选秀期间，每日晨起请安、午后学规矩、傍晚回房
- 宵禁：酉时（17:00）后不得外出
- 可活动区域：储秀宫院内、廊下、正厅
- 不可进入：任何其他宫殿、御花园、皇帝寝宫`;
  } else if (episode <= 10) {
    physicalRules = `- 主角所在地点：分配的住处（延禧宫等）
- 可活动区域：本宫、御花园（白天）、皇后宫（请安时）
- 需要通报才能进入：华妃寝宫、其他妃嫔宫殿
- 宵禁：戌时（19:00）后不得随意走动
- 不可进入：皇帝寝宫（除非被召）、太后寝宫、前朝`;
  } else if (episode <= 30) {
    physicalRules = `- 活动范围扩大，但仍需遵守宫规
- 夜间出行需有理由和随从
- 前朝仍然禁入`;
  } else {
    physicalRules = `- 根据当前位份"${rank}"，活动范围较广
- 但仍需遵守基本宫规，不得出宫`;
  }

  // 阶段性禁止内容
  let bannedContent: string;
  if (episode <= 3) {
    bannedContent = `- 皇帝正式出场（只可远观或听闻）
- 侍寝、翻牌、承恩
- 封号晋升
- 太后单独召见
- 任何暴力行为（打、杀、毒）
- 夜间密会`;
  } else if (episode <= 10) {
    bannedContent = `- 太后寿辰、皇帝大婚等重大事件
- 立储、废太子
- 调动侍卫或军队
- 出宫`;
  } else {
    bannedContent = `- 调动军队、谋反
- 出宫（除非特殊剧情）
- 穿越、现代元素`;
  }

  return `
## 🔒 宪法约束（本段规则优先级高于一切，违反将被系统拦截）

### 当前身份权力边界 —— ${rank}
✅ 可以做：${power.can.join('、')}
🚫 绝对不能做：${power.cannot.join('、')}

### 物理世界限制（第${episode}集）
${physicalRules}

### 本阶段可出场人物（禁止凭空引入不在此列表中的人物）
${allowedNPCs.join('、')}

### 本阶段禁止出现的内容
${bannedContent}

### 选项设计铁律（每个选项必须满足）
1. 必须有明确代价（stat_changes 中必须有负面变化或 dread 增加）
2. 必须锚定最近1-2段剧情中出现过的人物/地点/事件
3. 禁止"完美解决"型选项——不存在让所有人满意的选择
4. 第三个选项应为"消耗洞察力解读潜台词"
5. 禁止在叙事中直接提及数值（如"宠爱值上升"）——用行为和表情暗示变化
`;
}

// ---------- 违规修正 Prompt ----------

/**
 * 当 AI 输出被判定为橙色违规时，生成修正指令
 */
export function buildCorrectionPrompt(violations: Violation[]): string {
  const issues = violations
    .map(v => `- 【${v.rule}】${v.detail}`)
    .join('\n');

  return `## ⚠️ 你的上一次输出存在以下违规问题，请严格修正后重新生成完整 JSON：

${issues}

请注意：
1. 修正以上所有问题
2. 保持 JSON 格式完整
3. 不要解释你的修改，直接输出修正后的 JSON`;
}
