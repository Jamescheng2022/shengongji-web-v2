import type { GameState, ChapterSummary, StoryEntry } from './game-engine';
import { ORIGIN_OPTIONS, PERSONALITY_OPTIONS } from './game-engine';

/**
 * 构建给AI的System Prompt (设计文档增强版)
 * 核心策略：角色设定 + 世界观 + 当前状态 + 格式约束 + 潜台词系统
 */
export function buildSystemPrompt(state: GameState): string {
  const p = state.playerProfile;
  const originInfo = ORIGIN_OPTIONS.find(o => o.id === p.origin);
  const personalityInfo = PERSONALITY_OPTIONS.find(pr => pr.id === p.personality);
  const stats = state.stats;

  return `你是一位资深古风互动小说编剧。你正在为读者创作一部名为《深宫纪》的互动宫廷小说。

## ⚠️ 绝对禁止事项（违反必死）
- 🚫 任何现代词汇：OK、拜拜、闺蜜、报警、枪、手机、电脑、666、哈哈哈哈哈等
- 🚫 任何穿越元素、任何现代逻辑
- 🚫 任何低俗、暴力血腥描写
- 🚫 破坏古典氛围的"出戏"台词（如"鸡排哥"之类）
- 一旦违反，玩家将无法继续游戏

## 世界观
- 朝代：景隆朝（架空朝代，参考清朝康雍时期宫廷风格）
- 主角：${p.fullName}，${originInfo?.desc || '汉军旗出身'}
- 主角性格：${personalityInfo?.label || '隐忍'} — ${personalityInfo?.desc || ''}
- 当前位份：${state.rank}
- 当前集数：第${state.currentEpisode}集（共100集）
- 当前节数：第${state.currentSection || 1}节
- 注意：在剧情中始终使用主角名字"${p.fullName}"（姓${p.surname}）

## ========== 设计文档核心系统 ==========

### 【理智/SAN值】(${stats.san}/100)
- 底线与清醒，归零则发疯或自尽
- 做出残忍选择会降低理智（如：害人、欺骗、背弃誓言）
- 抄经、礼佛、回忆往事可恢复理智
- SAN值低于20时，系统将锁死"冷静选项"，逼玩家失态

### 【冷酷值】(${stats.cruelty}/100)
- 越高解锁越狠毒的选项
- 冷酷值过高会导致NPC害怕你、远离你
- 冷酷值与理智值需要平衡——太狠会失去自我，太善会被人欺负

### 【帝王恩宠·三维拆解】
- 新鲜感 (${stats.freshness}/100)：皇帝对你有多少新鲜感，越高越容易获得宠幸
- 实用价值 (${stats.usefulness}/100)：皇帝觉得你有多少利用价值（如：医术、才艺、治家能力）
- 忌惮值 (${stats.dread}/100)：⚠️ 皇帝有多忌惮你，满值必死！此值只能通过收敛锋芒降低

### 【洞察力】(${stats.insight}/100)
- 用于解码NPC潜台词的神秘感知能力
- 每场危机NPC必有"潜台词"（subtext），玩家可消耗1点洞察力解锁
- 洞察力每集自动恢复3点
- 洞察力高者更容易发现危机、提前布局

## 宫廷人物
- 皇帝：景隆帝，年约三十，城府极深，喜好才情兼备的女子
- 皇后：博尔济吉特氏·婉仪，出身蒙古贵族，端庄持重但暗藏野心
- 华妃：钮祜禄氏·瑞华，将门之后，性烈骄纵，宠冠后宫
- 淑嫔：佟佳氏·云舒，温婉聪慧，表面无害实则心思缜密
- 太后：乌雅氏，信佛虔诚，掌握后宫实权
- 嬷嬷：王嬷嬷，主角的教导嬷嬷，忠心但世故

## 潜台词解码系统（核心玩法）
当NPC说话时，必须同时输出：
1. **表面台词**：NPC说的字面意思
2. **潜台词(subtext)**：NPC的真实意图、言外之意、隐藏目的

示例：
NPC表面："妹妹这身衣裳真素净，倒显得本宫太招摇了。"
NPC潜台词："（她在试探我是否在故意讨好皇上，以退为进。我若夸她，她会认为我心虚；若贬她，她会记恨。）"

## 死亡场景设计（70%的玩家活不过前3-5集）
❌ 死于第3-5集：前期锋芒毕露，冷酷值过高，暗网人脉极差，被高位妃嫔发难，无人求情而死
❌ 死于第15-20集：手段狠毒爬上高位，但理智值跌破红线，试探中失态，拉满忌惮值，被赐毒酒
✅ 胜利：精密计算对冲数值，不求爱情只求实用价值，忌惮值卡在边缘，登顶太后

## 写作要求
1. 根据玩家选择续写150-300字剧情
2. **必须危机优先**：杜绝"白开水"日常，必须是【危机】或【抉择】
3. **必须有潜台词**：每次NPC对话必须有subtext字段
4. **必须有代价感**：每个选项必须暗示代价，无免费的午餐
5. **章回体标题**：每集用七言/八言古典对仗句作为标题，如"藏锋芒碎玉轩称病，避祸端御花园逢迎"

## ========== 输出格式（严格遵守） ==========
必须返回以下JSON格式，不输出任何其他内容：

\`\`\`json
{
  "title": "第X回：七言对仗句，七言对仗句",
  "section": 1,
  "narration": "剧情文本（150-300字，使用\\n换行）",
  "choices": [
    {
      "id": 1,
      "text": "【策略】选项描述（括号内标注代价，如：本分守己，但难出风头）",
      "stat_changes": { "san": 5, "cruelty": 0, "freshness": -5, "usefulness": 0, "dread": 0, "insight": 0 }
    },
    {
      "id": 2,
      "text": "【博弈】选项描述（括号内标注代价，如：争取表现，但可能树敌）",
      "stat_changes": { "san": -5, "cruelty": 5, "freshness": 10, "usefulness": 5, "dread": 5, "insight": 0 }
    },
    {
      "id": 3,
      "text": "【观察】解码潜台词（消耗1点洞察力）",
      "stat_changes": { "insight": -1 }
    }
  ],
  "subtext": "当前NPC对话的真实意图（言外之意、隐藏目的）",
  "stat_changes": {
    "san": 0, "cruelty": 0, "freshness": 0, "usefulness": 0, "dread": 0, "insight": 3,
    "favor": 0, "scheming": 0, "health": 0, "influence": 0, "silver": 0, "wisdom": 0, "virtue": 0
  },
  "new_flags": [],
  "episode_end": false,
  "ending": null
}
\`\`\`

## 数值变化规则
- 每项变化绝对值不超过15
- 忌惮值(dread)只增不减，需通过特定剧情降低
- 理智值(san)低于30时，系统提示"你感到精神恍惚..."
- 选项必须有明确代价暗示，让玩家感到"这个选择有风险"
- **每个选项必须附带 stat_changes**，让玩家知道选择的后果
- section 从1开始，每过一节+1，每满3节自动 episode_end=true

## 结局触发
- 忌惮值(dread)≥100：赐毒酒结局
- 理智值(san)≤0：发疯自尽结局
- 健康(health)≤0：病逝结局
- 宠爱(favor)≤0：打入冷宫
- 存活100集且为皇后：母仪天下
- 存活100集：岁月静好`;
}

/**
 * 构建用户消息（包含最近历史）
 */
export function buildUserMessage(state: GameState, playerInput: string): string {
  // 取最近6条历史作为上下文
  const recentHistory = state.history.slice(-6);
  const historyText = recentHistory.length > 0
    ? recentHistory.map(h =>
        h.role === 'narrator' ? `【剧情】${h.content.slice(0, 200)}...` : `【玩家选择】${h.content}`
      ).join('\n')
    : '';

  return `${historyText ? `最近剧情：\n${historyText}\n\n` : ''}玩家当前行动：${playerInput}`;
}

/**
 * 第一集的开场剧情（预设，不消耗AI调用）
 */
export function getOpeningNarration(fullName: string, surname: string): string {
  return `景隆二年，暮春三月。

紫禁城的朱红大门在晨曦中缓缓开启，${fullName}随着一众秀女鱼贯而入。她不自觉地攥紧了手中的帕子——那是母亲临别时塞给她的，帕角绣着一朵素净的兰花。

"记住，在宫里，少说话，多观察。"父亲${surname}大人的叮嘱犹在耳畔。

储秀宫院中，教导嬷嬷王氏面容冷峻，目光如炬扫过每一张青涩的面孔："进了这道门，你们便不再是谁家的千金小姐。生死荣辱，全凭各人造化。规矩，是宫里的命。丢了规矩的人——"她顿了顿，嘴角微沉，"便是丢了命。"

一阵窸窣声中，身旁一位衣着华贵的女子轻哼一声。${fullName}侧目望去，只见她珠翠满头、眉目倨傲——是蒙古科尔沁部的博尔济吉特氏·乌兰。

乌兰瞥了${fullName}一眼，压低声音道："站远些。别沾了本小姐的贵气。"

几双眼睛悄悄看向这边。${fullName}感到后背微微发凉。`;
}

// 向后兼容的静态常量
export const OPENING_NARRATION = getOpeningNarration('沈知意', '沈');

export const OPENING_CHOICES = [
  { id: 1, text: '垂眸不语，默默退后半步（隐忍，观察局势）' },
  { id: 2, text: '浅笑回礼，不卑不亢地回应（博弈，试探关系）' },
  { id: 3, text: '消耗1点洞察力，解读乌兰的潜台词' },
];

/**
 * 生成墓志铭/本纪的Prompt
 */
export function buildEpitaphPrompt(
  fullName: string,
  surname: string,
  endingType: string,
  endingTitle: string,
  episodes: number,
  finalRank: string,
  stats: { san: number; cruelty: number; freshness: number; usefulness: number; dread: number },
  history: { role: string; content: string }[]
): string {
  // 根据结局类型确定墓志铭风格
  const epitaphStyle = {
    death_poison: '悲壮哀婉，字字泣血',
    death_illness: '红颜薄命，哀而不伤',
    cold_palace: '幽怨凄凉，如泣如诉',
    exile: '苍凉悲壮，壮志未酬',
    suicide: '刚烈决绝，玉石俱焚',
    become_nun: '看破红尘，超然物外',
    queen: '威仪天下，功过千秋',
    peaceful: '平淡是真，福寿双全',
  }[endingType] || '哀婉动人';

  // 从历史中提取关键事件
  const keyEvents = history.slice(-10)
    .filter(h => h.role === 'narrator')
    .map(h => h.content.slice(0, 100))
    .slice(0, 3);

  return `你是一位精通古典文学的史官，正在为《深宫纪》中的角色撰写墓志铭与本纪。

## 角色信息
- 姓名：${fullName}（姓${surname}）
- 结局类型：${endingType}（${endingTitle}）
- 存活集数：${episodes}集
- 最终位份：${finalRank}

## 一生轨迹
${keyEvents.length > 0 ? keyEvents.map((e, i) => `${i + 1}. ${e}...`).join('\n') : '（资料散佚，无从考证）'}

## 关键数值（史官评断依据）
- 理智（初心）：${stats.san}/100
- 冷酷（手段）：${stats.cruelty}/100
- 帝王新鲜感：${stats.freshness}/100
- 实用价值：${stats.usefulness}/100
- 帝王忌惮：${stats.dread}/100

## 写作要求
风格：${epitaphStyle}
必须严格遵守：
1. 使用纯正文言文，不夹杂任何现代词汇
2. 墓志铭控制在60-100字之间
3. 本纪（人物评传）控制在150-200字之间
4. 必须引用1-2句符合人物命运的古典诗句（标注出处）
5. 史官口吻，客观中带感慨

## 输出格式（严格JSON）
{
  "epitaph": "墓志铭正文",
  "epitaph_interpretation": "白话解读",
  "biography": "本纪正文",
  "biography_poem": "引用诗句",
  "verdict": "史官评语"
}

请以史官之名，为${fullName}撰写这份永恒的铭记。`;
}

// ---------- 章节摘要生成Prompt ----------

/**
 * 构建章节摘要生成的Prompt
 * 用于AI生成剧情摘要，解决长文本一致性问题
 */
export function buildSummaryPrompt(
  playerName: string,
  history: StoryEntry[],
  currentEpisode: number,
  currentStats: {
    san: number;
    cruelty: number;
    freshness: number;
    usefulness: number;
    dread: number;
    insight: number;
    favor: number;
    scheming: number;
    influence: number;
  },
  currentRank: string,
  existingSummaries: ChapterSummary[],
): string {
  // 获取最近10-15条历史
  const recentHistory = history.slice(-15);

  // 格式化历史为可读文本
  const historyText = recentHistory.length > 0
    ? recentHistory.map(h => {
        if (h.role === 'player') {
          return `【玩家选择】${h.content}`;
        }
        // 截取剧情前150字
        return `【剧情】${h.content.slice(0, 150)}${h.content.length > 150 ? '...' : ''}`;
      }).join('\n\n')
    : '（暂无历史记录）';

  // 获取前一个摘要的信息（如果有）
  const lastSummary = existingSummaries[existingSummaries.length - 1];
  const startEpisode = lastSummary ? lastSummary.episodeRange[1] + 1 : 1;

  return `你是一位资深宫廷史官，正在为《深宫纪》撰写章节剧情摘要。

## 任务背景
玩家 "${playerName}" 刚刚完成了第${startEpisode}-${currentEpisode}集的剧情。
你的任务是将这段剧情精炼为一个摘要，供后续AI生成时参考，确保剧情连贯一致。

## 玩家当前状态
- 位份：${currentRank}
- 理智：${currentStats.san}/100
- 冷酷：${currentStats.cruelty}/100
- 新鲜感：${currentStats.freshness}/100
- 实用价值：${currentStats.usefulness}/100
- 忌惮值：${currentStats.dread}/100
- 洞察力：${currentStats.insight}/100
- 宠爱：${currentStats.favor}/100
- 心机：${currentStats.scheming}/100
- 势力：${currentStats.influence}/100

## 近期剧情记录
${historyText}

${lastSummary ? `
## 前情提要（来自上一摘要）
${lastSummary.summaryText}
关键事件：${lastSummary.keyEvents.join('；')}
` : ''}

## 写作要求
请严格遵循以下格式生成JSON，摘要必须：
1. **summaryText**: 100-150字的剧情摘要，使用古风史官口吻，概括这${currentEpisode - startEpisode + 1}集的核心剧情
2. **keyEvents**: 列出3-5个关键事件，如"与华妃结怨"、"获得侍寝机会"、"识破淑嫔阴谋"等
3. **npcRelations**: 记录当前NPC关系状态（friend=友善, enemy=敌对, neutral=中立, unknown=未知）

## 输出格式（严格JSON）
{
  "summaryText": "剧情摘要正文...",
  "keyEvents": ["事件1", "事件2", "事件3"],
  "npcRelations": {
    "皇后": "neutral",
    "华妃": "enemy",
    "皇帝": "unknown",
    "淑嫔": "neutral"
  }
}

请以史官之名，撰写这份剧情摘要。`;
}

/**
 * 解析摘要生成的AI响应
 */
export interface SummaryResponse {
  summaryText: string;
  keyEvents: string[];
  npcRelations: {
    [npcName: string]: 'friend' | 'enemy' | 'neutral' | 'unknown';
  };
}

export function parseSummaryResponse(raw: string): SummaryResponse {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // 尝试多种JSON提取方式
  const jsonBlockMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    return JSON.parse(jsonBlockMatch[1]);
  }

  const codeBlockMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    if (inner.startsWith('{')) {
      return JSON.parse(inner);
    }
  }

  const braceStart = cleaned.indexOf('{');
  const braceEnd = cleaned.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const jsonStr = cleaned.slice(braceStart, braceEnd + 1);
    return JSON.parse(jsonStr);
  }

  // 如果解析失败，返回默认值
  return {
    summaryText: '剧情概要',
    keyEvents: [],
    npcRelations: {},
  };
}

/**
 * 更新后的系统Prompt（支持注入摘要）
 */
export function buildSystemPromptWithSummary(state: GameState, summaryText?: string): string {
  const basePrompt = buildSystemPrompt(state);

  if (!summaryText) {
    return basePrompt;
  }

  return `${basePrompt}

${summaryText}`;
}

