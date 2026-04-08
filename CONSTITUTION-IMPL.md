# 宪法落地方案：从纸面到代码

> 上一篇《CONSTITUTION.md》是哲学。这一篇是工程图纸。

---

## 一、先回答你的问题：GitHub 上有没有成熟方案？

**有，但没有一个能直接拿来用。**

我调研了所有主流方案，结论如下：

| 方案 | Stars | 语言 | 适配度 | 致命问题 |
|------|-------|------|-------|---------|
| [NVIDIA NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) | 4.4k | Python | ❌ 低 | Python-only，需要额外部署服务，太重 |
| [Guardrails AI](https://github.com/guardrails-ai/guardrails) | 4k+ | Python | ❌ 低 | Python-only，面向数据验证而非叙事控制 |
| [OpenAI Guardrails JS](https://github.com/openai/openai-guardrails-js) | 76 | TypeScript | ⚠️ 中 | 绑死 OpenAI API，你用的是 DeepSeek |
| [Vercel AI SDK Middleware](https://ai-sdk.dev/v5/docs/ai-sdk-core/middleware) | — | TypeScript | ⚠️ 中 | 通用中间件框架，需要自己写所有校验逻辑 |
| [Beyond Logic NPC Pipeline](https://beyondlogiclabs.com/devlog/papers/npc-pipeline/) | — | 概念论文 | ✅ 高 | 不是开源项目，只是架构设计思路 |
| [Meta LlamaFirewall](https://ai.meta.com/research/publications/llamafirewall/) | 新 | Python | ❌ 低 | 安全导向（注入防护），非叙事约束 |

### 结论

**不存在"安装一个 npm 包就能防止秀女拿刀杀人"的银弹。**

原因很简单——你的问题不是通用安全问题（过滤脏话、防注入），而是**领域特定的叙事一致性问题**。这个领域目前没有成熟方案，需要自己造轮子。

但好消息是：Beyond Logic 的多轮管道思路 + Vercel AI SDK 的中间件架构 + 你现有的代码基础，可以组合出一套**轻量、精准、不依赖外部服务**的解决方案。

---

## 二、架构设计：三道防线

```
玩家操作
  │
  ▼
┌─────────────────────────────────────────┐
│         第一道防线：Prompt 宪法注入         │
│     （让 AI 从源头就知道什么不能做）          │
│         修改 prompts.ts                   │
└─────────────────────────────────────────┘
  │
  ▼  AI 生成内容
┌─────────────────────────────────────────┐
│         第二道防线：输出校验器              │
│     （AI 生成后，逐条检查是否违宪）          │
│         新增 lib/constitution.ts          │
└─────────────────────────────────────────┘
  │
  │  违规？──▶ 重试 / Fallback
  │
  ▼  通过
┌─────────────────────────────────────────┐
│         第三道防线：世界状态机              │
│     （维护不可违背的物理规则和时间线）        │
│         新增 lib/world-state.ts           │
└─────────────────────────────────────────┘
  │
  ▼  最终输出给玩家
```

---

## 三、第一道防线：Prompt 宪法注入

### 问题

当前 `prompts.ts` 的 System Prompt 有约束，但太松散。AI 看到"禁止现代词汇"会点头，然后写出"珍珠necklace"。

### 解决思路

不只是告诉 AI "不能做什么"，而是**用结构化数据把当前世界状态喂给它**，让它的生成空间从一开始就被框死。

### 具体方案：在 `prompts.ts` 中新增 `buildConstitutionBlock()`

```typescript
// lib/prompts.ts 新增

/**
 * 根据当前游戏状态，生成宪法约束块
 * 这不是泛泛的规则，而是精确到"此时此刻你能做什么"
 */
export function buildConstitutionBlock(state: GameState): string {
  const episode = state.currentEpisode;
  const rank = state.rank;
  
  // ===== 1. 权力矩阵：当前身份能做/不能做的事 =====
  const powerMatrix = getPowerMatrix(rank);
  
  // ===== 2. 物理约束：当前时空限制 =====
  const physicalRules = getPhysicalRules(episode, state.currentSection);
  
  // ===== 3. 可用人物：此阶段允许出场的 NPC =====
  const allowedNPCs = getAllowedNPCs(episode);
  
  // ===== 4. 禁词表：当前阶段的绝对禁止内容 =====
  const bannedContent = getBannedContent(episode);

  return `
## 🔒 宪法约束（本段规则优先级高于一切）

### 当前身份权力边界（${rank}）
- 可以做：${powerMatrix.can.join('、')}
- 绝对不能做：${powerMatrix.cannot.join('、')}

### 物理世界限制
${physicalRules}

### 本集可出场人物（禁止凭空引入不在此列表的人物）
${allowedNPCs.join('、')}

### 禁止出现的内容
${bannedContent.join('、')}

### 选项设计铁律
- 每个选项必须有明确代价，禁止"完美解决"型选项
- 选项中的人物/地点/物品必须在最近剧情中出现过
- 第三个选项必须是消耗洞察力的"解读潜台词"选项
`;
}
```

### 权力矩阵实现

```typescript
// lib/constitution.ts

interface PowerMatrix {
  can: string[];
  cannot: string[];
}

const RANK_POWERS: Record<string, PowerMatrix> = {
  '秀女': {
    can: [
      '在储秀宫内走动', '与其他秀女交谈', '观察嬷嬷言行',
      '学习宫规', '请安问礼', '接受嬷嬷训诫'
    ],
    cannot: [
      '独自外出储秀宫', '夜间出行（宵禁）', '指挥任何太监宫女',
      '携带利器', '拒绝上级命令', '直接与皇帝对话',
      '进入其他妃嫔宫殿', '传递秘密信件', '贿赂侍卫',
      '使用毒药', '密谋暗杀', '面见太后'
    ]
  },
  '采女': {
    can: [
      '管理自己的小院', '支配贴身宫女（1-2人）', '在本宫范围内走动',
      '给嬷嬷送礼', '参加日常请安'
    ],
    cannot: [
      '调动侍卫', '进出高位妃嫔宫殿（需通报）', '直接面见太后',
      '处罚他人的宫女太监', '夜间出行', '携带利器'
    ]
  },
  // ... 贵人、嫔、妃、贵妃、皇后
};

export function getPowerMatrix(rank: string): PowerMatrix {
  return RANK_POWERS[rank] || RANK_POWERS['秀女'];
}
```

---

## 四、第二道防线：输出校验器（核心）

### 架构

```typescript
// lib/constitution.ts

export interface ViolationReport {
  level: 'green' | 'yellow' | 'orange' | 'red';
  violations: Violation[];
  shouldRetry: boolean;
  shouldFallback: boolean;
}

interface Violation {
  rule: string;           // 违反了哪条宪法
  detail: string;         // 具体描述
  level: 'yellow' | 'orange' | 'red';
  field: string;          // 违规出现在哪个字段
}
```

### 校验管道

```typescript
export function validateAIOutput(
  output: AIResponse,
  state: GameState
): ViolationReport {
  const violations: Violation[] = [];

  // ===== 铁律一：权力守恒 =====
  checkPowerBoundary(output, state, violations);

  // ===== 铁律二：物理真实性 =====
  checkPhysicalReality(output, state, violations);

  // ===== 铁律三：NPC 智商守恒 =====
  checkNPCConsistency(output, state, violations);

  // ===== 铁律四：时间线一致性 =====
  checkTimelineConsistency(output, state, violations);

  // ===== 铁律五：代价不可免除 =====
  checkChoiceCost(output, violations);

  // ===== 铁律六：语言纯度 =====
  checkLanguagePurity(output, violations);

  // ===== 选项锚定检查 =====
  checkChoiceAnchoring(output, state, violations);

  // ===== 数值合理性检查 =====
  checkStatChanges(output, state, violations);

  // 计算总体级别
  const maxLevel = getMaxLevel(violations);

  return {
    level: violations.length === 0 ? 'green' : maxLevel,
    violations,
    shouldRetry: maxLevel === 'orange',
    shouldFallback: maxLevel === 'red',
  };
}
```

### 各校验器的具体实现

#### 铁律六：语言纯度（最容易实现，效果最好）

```typescript
// 这是最高优先级的校验器，因为它用正则就能搞定

const MODERN_WORDS = [
  // 现代物品
  /手机|电脑|汽车|飞机|火车|枪|手枪|步枪|炸弹|necklace|earring/,
  // 现代用语
  /OK|ok|闺蜜|报警|打卡|社交|拉黑|KPI|CEO|APP|WiFi|GPS/,
  // 网络用语
  /666|yyds|绝绝子|破防|暴击|人设|吃瓜|凡尔赛|内卷|躺平/,
  // AI 套话
  /值得一提的是|不言而喻|毋庸置疑|综上所述|总而言之|众所周知/,
  // 现代逻辑
  /面试|招聘|简历|合同|签约|投资|股票|贷款|利率|人力资源/,
  // 数值暴露（meta-gaming）
  /宠爱值|好感度|忌惮值|san值|数值|经验值|升级|积分/,
];

function checkLanguagePurity(output: AIResponse, violations: Violation[]) {
  const allText = [
    output.narration,
    output.subtext || '',
    ...(output.choices?.map(c => c.text) || []),
  ].join(' ');

  for (const pattern of MODERN_WORDS) {
    const match = allText.match(pattern);
    if (match) {
      violations.push({
        rule: '铁律六：语言纯度',
        detail: `检测到现代词汇："${match[0]}"`,
        level: 'red',
        field: 'narration/choices',
      });
    }
  }
}
```

#### 铁律一：权力守恒

```typescript
// 根据当前 rank 检查行为是否越权

const POWER_VIOLATIONS: Record<string, RegExp[]> = {
  '秀女': [
    /匕首|短刀|利刃|毒药|毒粉|砒霜/,          // 秀女不可能持有武器/毒药
    /潜入.*寝宫|闯入|偷偷溜进/,                  // 秀女不能随意进出
    /命令.*太监|指挥.*侍卫|吩咐.*公公/,          // 秀女无权指挥
    /侍寝|承恩|翻牌|临幸/,                        // 秀女阶段不可能
    /废了|杀了|处死|赐死|下毒/,                    // 秀女无此权力
  ],
  '采女': [
    /匕首|短刀|毒药|砒霜/,
    /调动.*侍卫|指挥.*御林军/,
    /处罚.*其他.*宫女|杖责/,
  ],
  // ... 其他品级
};

function checkPowerBoundary(
  output: AIResponse,
  state: GameState,
  violations: Violation[]
) {
  const patterns = POWER_VIOLATIONS[state.rank];
  if (!patterns) return;

  const narration = output.narration || '';
  for (const pattern of patterns) {
    const match = narration.match(pattern);
    if (match) {
      violations.push({
        rule: '铁律一：权力守恒',
        detail: `${state.rank}不应出现此行为："${match[0]}"`,
        level: 'red',
        field: 'narration',
      });
    }
  }
}
```

#### 铁律五：代价不可免除

```typescript
function checkChoiceCost(output: AIResponse, violations: Violation[]) {
  if (!output.choices || output.choices.length === 0) return;

  for (const choice of output.choices) {
    // 检查洞察力选项不算
    if (choice.text.includes('洞察力') || choice.text.includes('解读')) continue;

    const statChanges = choice.stat_changes;
    if (!statChanges) {
      violations.push({
        rule: '铁律五：代价不可免除',
        detail: `选项"${choice.text.slice(0, 20)}..."缺少 stat_changes`,
        level: 'orange',
        field: 'choices',
      });
      continue;
    }

    // 检查是否所有变化都是正面的（不允许"白嫖"选项）
    const values = Object.values(statChanges).filter(v => v !== 0);
    const allPositive = values.length > 0 && values.every(v => {
      // dread 增加是负面的，所以 dread > 0 算代价
      return v > 0;
    });

    // 如果除 dread 外所有非零变化都是正面的，这是一个"免费午餐"
    const hasNegative = Object.entries(statChanges).some(([key, val]) => {
      if (key === 'dread') return false; // dread 增加是代价
      return (val as number) < 0;
    });
    const hasDreadIncrease = (statChanges as any).dread > 0;

    if (!hasNegative && !hasDreadIncrease && values.length > 0) {
      violations.push({
        rule: '铁律五：代价不可免除',
        detail: `选项"${choice.text.slice(0, 20)}..."没有任何代价（全是收益）`,
        level: 'orange',
        field: 'choices',
      });
    }
  }
}
```

#### 选项锚定检查

```typescript
function checkChoiceAnchoring(
  output: AIResponse,
  state: GameState,
  violations: Violation[]
) {
  if (!output.choices) return;

  // 从最近的剧情中提取已出现的关键元素
  const recentNarrations = state.history
    .filter(h => h.role === 'narrator')
    .slice(-3)
    .map(h => h.content)
    .join(' ');

  // 加上当前这段新生成的叙事
  const contextText = recentNarrations + ' ' + (output.narration || '');

  // 已知NPC列表
  const ALL_NPCS = [
    '华妃', '皇后', '皇帝', '太后', '嬷嬷', '王嬷嬷',
    '乌兰', '淑嫔', '景隆帝', '柳婉儿', '云舒'
  ];

  for (const choice of output.choices) {
    // 跳过洞察力选项
    if (choice.text.includes('洞察力')) continue;

    // 检查选项中提到的NPC是否在最近剧情中出现
    for (const npc of ALL_NPCS) {
      if (choice.text.includes(npc) && !contextText.includes(npc)) {
        violations.push({
          rule: '第十二条：选项锚定',
          detail: `选项提到"${npc}"，但最近剧情中未出现此人物`,
          level: 'orange',
          field: 'choices',
        });
      }
    }
  }
}
```

---

## 五、第三道防线：世界状态机

### 为什么需要它

Prompt 和校验器都是基于文本的——它们能抓住"秀女拿匕首"，但抓不住更微妙的问题，比如"第3集已经发生的事件在第5集被遗忘"。

世界状态机维护一个**结构化的世界快照**，每次 AI 生成后更新，每次 AI 调用前注入。

### 数据结构

```typescript
// lib/world-state.ts

export interface WorldState {
  // 时空坐标
  currentLocation: string;        // "储秀宫" | "御花园" | ...
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  season: string;                 // "暮春" | "盛夏" | ...

  // NPC 状态（key 是 NPC 名，value 是状态）
  npcStates: Record<string, {
    alive: boolean;
    location: string;             // 当前在哪
    attitudeToPlayer: number;     // -100 到 100
    lastInteraction: number;      // 上次互动是第几集
    knownSecrets: string[];       // 她知道的秘密
  }>;

  // 物品/资源
  playerInventory: string[];      // 玩家持有的物品
  
  // 已发生的关键事件（不可逆）
  events: string[];               // ["得罪华妃", "获得王嬷嬷信任", ...]

  // 伏笔追踪
  foreshadowing: {
    planted: string;              // 埋下的伏笔
    plantedAt: number;            // 哪一集埋的
    resolvedAt?: number;          // 哪一集收的（空=未收）
  }[];
}
```

### 如何使用

```typescript
// 在 chat/route.ts 中

// 1. AI 调用前：注入世界状态
const worldContext = serializeWorldState(worldState);
const systemPrompt = buildSystemPromptWithSummary(state, summaryText)
  + '\n\n' + buildConstitutionBlock(state)
  + '\n\n' + worldContext;

// 2. AI 生成后：校验
const validation = validateAIOutput(aiResponse, state);

if (validation.shouldFallback) {
  // 红色违规：使用 fallback
  return useFallback(state);
}

if (validation.shouldRetry && retryCount < 2) {
  // 橙色违规：重试一次，把违规信息反馈给 AI
  return retryWithFeedback(validation.violations);
}

// 3. 校验通过：更新世界状态
updateWorldState(worldState, aiResponse);
```

---

## 六、在 `chat/route.ts` 中的集成点

```typescript
// app/api/chat/route.ts — 修改后的核心流程

import { validateAIOutput } from '@/lib/constitution';
import { buildConstitutionBlock } from '@/lib/prompts';

export async function POST(req: Request) {
  // ... 解析请求 ...

  // ===== 构建增强 Prompt =====
  const constitutionBlock = buildConstitutionBlock(gameState);
  const systemPrompt = buildSystemPromptWithSummary(gameState, summaryText)
    + '\n\n' + constitutionBlock;

  // ===== AI 调用 =====
  let aiResponse = await callAI(systemPrompt, userMessage);

  // ===== 输出校验（最多重试 1 次）=====
  let validation = validateAIOutput(aiResponse, gameState);

  if (validation.shouldRetry) {
    console.log('[CONSTITUTION] 橙色违规，重试中...', 
      validation.violations.map(v => v.detail));

    // 把违规反馈给 AI，让它修正
    const correctionPrompt = `
你的上一次输出有以下问题，请修正后重新生成：
${validation.violations.map(v => `- ${v.rule}：${v.detail}`).join('\n')}
请严格修正以上问题后，重新输出完整 JSON。
`;
    aiResponse = await callAI(systemPrompt, correctionPrompt);
    validation = validateAIOutput(aiResponse, gameState);
  }

  if (validation.shouldFallback) {
    console.log('[CONSTITUTION] 红色违规，使用 fallback',
      validation.violations.map(v => v.detail));
    aiResponse = getFallbackResponse(gameState);
  }

  // ===== 记录违规日志 =====
  if (validation.violations.length > 0) {
    logViolations(validation, gameState);
  }

  return Response.json(aiResponse);
}
```

---

## 七、实施路线图（按优先级排序）

### Phase 1：立刻见效（1-2天工作量）

| 任务 | 文件 | 效果 |
|------|------|------|
| 禁词正则检测 | `lib/constitution.ts` | 杀死"necklace"类错误 |
| 权力越界检测 | `lib/constitution.ts` | 杀死"秀女拿刀"类错误 |
| 阶段边界检测 | `lib/constitution.ts` | 杀死"第1集侍寝"类错误 |
| Prompt 注入宪法块 | `lib/prompts.ts` | 从源头减少 AI 犯错 |
| chat/route.ts 集成校验 | `app/api/chat/route.ts` | 串联整个流程 |

### Phase 2：叙事质量（3-5天工作量）

| 任务 | 文件 | 效果 |
|------|------|------|
| 选项代价检测 | `lib/constitution.ts` | 杀死"白嫖"选项 |
| 选项锚定检测 | `lib/constitution.ts` | 杀死"凭空跳出"的选项 |
| 橙色重试机制 | `app/api/chat/route.ts` | 自动修正中等违规 |
| Fallback 剧情库 | `lib/fallback-scenes.ts` | 红色违规时的安全着陆 |

### Phase 3：深度一致性（长期迭代）

| 任务 | 文件 | 效果 |
|------|------|------|
| 世界状态机 | `lib/world-state.ts` | 追踪 NPC/地点/事件 |
| NPC 态度连续性验证 | `lib/constitution.ts` | 防止"上集仇人下集闺蜜" |
| 伏笔追踪系统 | `lib/world-state.ts` | 确保伏笔有种有收 |
| 违规数据分析仪表板 | 新页面 | 知道 AI 最常犯什么错 |

---

## 八、成本分析

| 方案 | 额外 API 调用 | 延迟 | Token 消耗 |
|------|-------------|------|-----------|
| Prompt 宪法注入 | 0 | 0ms | +200-300 tokens/次 |
| 输出校验器（正则） | 0 | <5ms | 0 |
| 橙色重试 | 最多 +1 次 | +2-3s | +原始调用的 100% |
| Fallback | 0 | 0ms | 0 |
| 世界状态注入 | 0 | 0ms | +100-200 tokens/次 |

**最坏情况**：每次对话多花 1 次 AI 调用（橙色重试）。实际上经过 Prompt 优化后，重试率应该低于 10%。

---

## 九、关于"100% 不跑偏"的诚实回答

做不到。原因：

1. **LLM 的本质是概率模型** — 它不理解规则，它只是在匹配模式。你写"不要用现代词汇"，它 99% 的时候不会用，但那 1% 你拦不住。
2. **正则匹配不能覆盖所有情况** — "面试宫女"这种语义级的现代逻辑，正则抓不住，得靠 Prompt 教育。
3. **风格漂移是渐进的** — 第1段像《甄嬛传》，第20段像起点小说，这个过程是连续的，没有明确的阈值可以触发熔断。

**但 80% → 95% 的提升是完全可行的。** Phase 1 做完，最严重的跑偏问题（秀女杀人、现代词汇、阶段越界）就能被消灭。剩下的 5% 是风格漂移和微妙的逻辑不一致，需要长期迭代。

---

*最后一句话：宪法不是写完就生效的。它需要被编码、被执行、被持续校准。就像真正的宪法一样——纸上的文字没有力量，有力量的是背后的执行机制。*
