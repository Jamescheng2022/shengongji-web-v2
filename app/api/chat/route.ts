import { buildSystemPrompt, buildUserMessage, buildSystemPromptWithSummary } from '@/lib/prompts';
import { GameState, AIResponse, parseAIOutput, cleanNarration, getRecentSummaries, formatSummariesForPrompt } from '@/lib/game-engine';
import { getCache, setCache } from '@/lib/prefetch-cache';
import { 
  shouldUseFixedScript, 
  getNextSceneId,
  FIXED_SCENES,
  EP_FLOWS,
  BRANCH_MAP
} from '@/lib/fixed-script';

export async function POST(req: Request) {
  let gameState: GameState;
  let playerInput: string;

  try {
    const body = await req.json();
    gameState = body.gameState;
    playerInput = body.playerInput;
  } catch (e) {
    console.error('[chat] Failed to parse request body:', e);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  // ========== 检查是否使用固定剧本（前十集） ==========
  if (shouldUseFixedScript(gameState.currentEpisode)) {
    console.log('[chat] Using fixed script for episode', gameState.currentEpisode);
    
    // 获取当前场景
    const flowKey = `ep${gameState.currentEpisode}_flow`;
    const flow = EP_FLOWS[flowKey];
    
    if (flow) {
      const sceneIndex = (gameState.currentSection || 1) - 1;
      const currentSceneId = flow[sceneIndex];
      const currentScene = FIXED_SCENES[currentSceneId];
      
      if (currentScene) {
        // 找到玩家选择的选项
        const choice = currentScene.choices.find(c => c.text === playerInput);
        const fallbackChoice = currentScene.choices[0];
        const selectedChoice = choice || fallbackChoice;
        
        // 生成下一场景（传递正确的选择ID以支持分支）
        const selectedChoiceId = selectedChoice?.id || 1;
        const nextSceneId = getNextSceneId(currentSceneId, selectedChoiceId);
        const nextScene = nextSceneId ? FIXED_SCENES[nextSceneId] : null;
        
        // 确定是否结束当前集
        const currentSection = gameState.currentSection || 1;
        const episodeEnd = currentSection >= 3 || currentScene.id.includes('_s3');
        // 返回下一节的 section（processAIResponse 需要这个值来递增）
        const nextSection = episodeEnd ? 1 : currentSection + 1;
        
        // ========== 修复：跳过开场重复问题 ==========
        // 如果是第1集第1节的第一个选择（开场已由客户端显示），直接返回下一场景
        const isFirstChoice = gameState.history.length === 0 && currentSection === 1;
        
        // 确定返回哪个场景的叙述和选项
        const displayScene = isFirstChoice && nextScene ? nextScene : currentScene;
        const displayChoices = (isFirstChoice && nextScene) ? nextScene.choices : (nextScene || currentScene).choices;
        
        // 转换为AI响应格式
        const response: AIResponse = {
          title: displayScene.title,
          section: nextSection,
          narration: displayScene.narration,
          subtext: displayScene.subtext,
          stat_changes: selectedChoice?.stat_changes || {},
          choices: displayChoices.map((c, i) => ({
            id: i + 1,
            text: c.text,
            stat_changes: c.stat_changes,
          })),
          episode_end: episodeEnd,
          ending: null,
        };
        
        // 缓存响应
        const cacheKey = `${gameState.id}_${playerInput}`;
        setCache(cacheKey, response);
        
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // 1. 检查缓存
  const cacheKey = `${gameState.id}_${playerInput}`;
  const cachedResult = getCache(cacheKey);
  if (cachedResult) {
    console.log('[chat] Cache hit for:', cacheKey);
    return new Response(JSON.stringify(cachedResult), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ========== 构建系统Prompt（支持章节摘要）==========
  let systemPrompt = buildSystemPrompt(gameState);

  // 从第5集开始注入章节摘要（提前至5集，原为11集）
  if (gameState.currentEpisode > 5 && gameState.chapterSummaries.length > 0) {
    const recentSummaries = getRecentSummaries(gameState, 2);
    const summaryText = formatSummariesForPrompt(recentSummaries);
    if (summaryText) {
      systemPrompt = buildSystemPromptWithSummary(gameState, summaryText);
      console.log('[chat] Injected', recentSummaries.length, 'chapter summaries into prompt');
    }
  }

  const userMessage = buildUserMessage(gameState, playerInput);

  // API Key 优先级：ZHIPU > OPENROUTER > AI_API_KEY
  const zhipuKey = process.env.ZHIPU_API_KEY || '';
  const openrouterKey = process.env.OPENROUTER_API_KEY || '';
  const genericKey = process.env.AI_API_KEY || '';

  let apiKey = '';
  let baseURL = '';
  let model = '';

  if (zhipuKey) {
    apiKey = zhipuKey;
    baseURL = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    model = process.env.AI_MODEL || 'glm-4-flash';
  } else if (openrouterKey) {
    apiKey = openrouterKey;
    baseURL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
    model = process.env.AI_MODEL || 'qwen/qwen3-8b:free';
  } else if (genericKey) {
    apiKey = genericKey;
    baseURL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
    model = process.env.AI_MODEL || 'qwen/qwen3-8b:free';
  }

  // 没有 API Key → 内置剧情引擎
  if (!apiKey) {
    console.log('[chat] No API key, using fallback engine');
    const fallbackResponse = generateFallbackStory(gameState, playerInput);
    return new Response(JSON.stringify(fallbackResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ======== 调用真实 AI（非流式，简单可靠） ========
  console.log('[chat] Calling AI:', baseURL, model);

  try {
    const apiURL = `${baseURL}/chat/completions`;
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1200,
        temperature: 0.85,
        stream: false, // 非流式，等AI生成完毕再返回
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[chat] AI API error:', response.status, errText);
      const fallbackResponse = generateFallbackStory(gameState, playerInput);
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    console.log('[chat] AI raw output:', rawContent.slice(0, 300));

    // 解析 AI 返回的 JSON
    let aiResponse: AIResponse;
    try {
      aiResponse = parseAIOutput(rawContent);
    } catch (e) {
      console.error('[chat] JSON parse error:', e);
      // 解析失败：把原始文本当作剧情，附上默认选项
      aiResponse = {
        narration: cleanNarration(rawContent),
        choices: [
          { id: 1, text: '继续观望' },
          { id: 2, text: '采取行动' },
          { id: 3, text: '另寻他法' },
        ],
        stat_changes: {},
        episode_end: false,
        ending: null,
        // 设计文档新增字段
        subtext: undefined,
        title: undefined,
      };
    }

    // 确保 choices 一定有值
    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      aiResponse.choices = [
        { id: 1, text: '继续观望' },
        { id: 2, text: '采取行动' },
        { id: 3, text: '另寻他法' },
      ];
    }

    // 确保 stat_changes 存在
    if (!aiResponse.stat_changes) {
      aiResponse.stat_changes = {};
    }

    // 确保 narration 存在
    if (!aiResponse.narration) {
      aiResponse.narration = '（剧情生成中...）';
    }

    console.log('[chat] Success, narration length:', aiResponse.narration.length, 'choices:', aiResponse.choices.length);

    // 存入缓存
    setCache(cacheKey, aiResponse);

    return new Response(JSON.stringify(aiResponse), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[chat] AI request failed:', err);
    const fallbackResponse = generateFallbackStory(gameState, playerInput);
    return new Response(JSON.stringify(fallbackResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ========== 内置剧情引擎（无API时使用）==========

/**
 * 基于游戏状态（flags + episode）驱动的剧情选择
 * 替换旧的关键词匹配方式，确保剧情连贯一致
 */
function generateFallbackStory(state: GameState, input: string): AIResponse {
  const ep = state.currentEpisode;
  const flags = new Set(state.flags || []);

  // 第1-3集：入宫阶段
  if (ep <= 3) {
    return generateEarlyGameStory(state, flags, ep);
  }
  // 第4-10集：适应阶段
  if (ep <= 10) {
    return generateMidGameStory(state, flags, ep);
  }
  // 第10集以后
  return generateLateGameStory(state, flags, ep);
}

function generateEarlyGameStory(state: GameState, flags: Set<string>, ep: number): AIResponse {
  const name = state.playerProfile.fullName;

  if (!flags.has("chuxiu_intro_done")) {
    return {
      narration: `景隆二年，暮春三月。

紫禁城的朱红大门在晨曦中缓缓开启，${name}随着一众秀女鱼贯而入。她不自觉地攥紧了手中的帕子——那是母亲临别时塞给她的，帕角绣着一朵素净的兰花。

储秀宫院中，教导嬷嬷王氏面容冷峻："进了这道门，你们便不再是谁家的千金小姐。生死荣辱，全凭各人造化。"

身旁一位衣着华贵的女子轻哼一声——是蒙古科尔沁部的博尔济吉特氏·乌兰。她瞥了你一眼，压低声音道："站远些。别沾了本小姐的贵气。"

几双眼睛悄悄看向这边。${name}感到后背微微发凉。`,
      choices: [
        { id: 1, text: "垂眸不语，默默退后半步（隐忍，观察局势）", stat_changes: { wisdom: 3, scheming: 2 } },
        { id: 2, text: "浅笑回礼，不卑不亢地回应（博弈，试探关系）", stat_changes: { cruelty: 2, influence: 2 } },
        { id: 3, text: "消耗1点洞察力，解读乌兰的潜台词", stat_changes: { insight: -1 } },
      ],
      new_flags: ["chuxiu_intro_done"],
      stat_changes: {},
      episode_end: false,
      ending: null,
    };
  }

  if (!flags.has("met_yunshui")) {
    return {
      narration: `${name}走进分配给她的厢房，房间不大，但收拾得还算整洁。

正整理行囊时，隔壁传来轻轻的叩门声。门外站着一位面容清秀的少女，眉眼温柔，穿着素净的藕荷色褂子，微微福身道："姐姐好，我是你的邻房，佟佳氏·云舒。初来乍到，想着与姐姐打个照面。"

她的笑容真切，但${name}注意到她的目光很快扫过了自己桌上的行囊——那里面有一封父亲的亲笔信。`,
      choices: [
        { id: 1, text: "热情相迎，邀她进来说话", stat_changes: { scheming: 2, wisdom: 1 } },
        { id: 2, text: "礼貌寒暄，但保持距离", stat_changes: { scheming: 3, wisdom: 2 } },
        { id: 3, text: "婉言谢绝，称自己要休息", stat_changes: { virtue: 3, scheming: 1 } },
      ],
      new_flags: ["met_yunshui"],
      stat_changes: {},
      episode_end: false,
      ending: null,
    };
  }

  if (!flags.has("huafei_visit")) {
    return {
      narration: `回到厢房，${name}取出父亲临别前塞给她的一封信。信封上只写了四个字："慎之又慎。"

她刚要拆开，忽听院中传来一阵骚动——有人喊道："华妃娘娘驾到！"

${name}的心猛地一跳。华妃，钮祜禄氏·瑞华，将门之后，性烈骄纵，宠冠后宫……

她该怎么做？`,
      choices: [
        { id: 1, text: "赶紧出去跪迎华妃", stat_changes: { favor: 2, scheming: 1 } },
        { id: 2, text: "先收好信再出去", stat_changes: { scheming: 3, wisdom: 2 } },
        { id: 3, text: "消耗1点洞察力，感知华妃来意", stat_changes: { insight: -1 } },
      ],
      new_flags: ["huafei_visit"],
      stat_changes: {},
      episode_end: false,
      ending: null,
    };
  }

  if (!flags.has("audition_done")) {
    return {
      narration: `三日后，选秀的日子到了。

太和殿前，秀女们按照旗籍排成两列。景隆帝端坐龙椅之上，面容俊朗但不怒自威。

"沈氏。"点名的声音忽然响起。

${name}深吸一口气，走上前去，按照礼仪端正地跪拜。她能感受到头顶那道目光的重量。

"朕听闻你善画？"景隆帝忽然问道。

${name}一愣——她确实自幼学画，但这事并不为外人所知。是谁告诉皇上的？

"回皇上，臣女……略通丹青，不敢言善。"她低头答道。

"不必谦虚。"景隆帝的声音里带着一丝玩味，"朕案头恰好有一幅画，缺了题诗。你来看看。"`,
      choices: [
        { id: 1, text: "大方上前，展露才学", stat_changes: { favor: 5, wisdom: 3 } },
        { id: 2, text: "推辞才疏，请皇上另选高明", stat_changes: { virtue: 3, wisdom: 2 } },
        { id: 3, text: "含蓄应承，先看画再决定", stat_changes: { scheming: 3, favor: 2 } },
      ],
      new_flags: ["audition_done"],
      stat_changes: {},
      episode_end: true,
      ending: null,
    };
  }

  return {
    narration: `选秀尘埃落定。

${name}被封为采女，搬入了延禧宫的偏殿。消息传回沈家，父亲沈大人终于松了口气——能在第一次选秀便入选，已是不易。

然而后宫的水，比她想象的还要深。

这日，王嬷嬷悄悄来访，压低声音道："小主，奴婢有句话不知当讲不当讲……华妃娘娘那边，似乎对小主有些不满。"

${name}的心沉了下去。她知道，树欲静而风不止。`,
    choices: [
      { id: 1, text: "请王嬷嬷细说（探听华妃动向）", stat_changes: { scheming: 3, insight: 2 } },
      { id: 2, text: "淡然处之，先观察再说", stat_changes: { wisdom: 3, virtue: 2 } },
      { id: 3, text: "主动出击，去拜访华妃", stat_changes: { cruelty: 3, favor: -3 } },
    ],
    new_flags: ["court_entering"],
    stat_changes: {},
    episode_end: true,
    ending: null,
  };
}

function generateMidGameStory(state: GameState, flags: Set<string>, ep: number): AIResponse {
  const name = state.playerProfile.fullName;

  if (flags.has("court_entering") && !flags.has("empress_meeting")) {
    return {
      narration: `这日午后，坤宁宫的小太监忽然来传话："皇后娘娘请沈采女过去说话。"

${name}心中一凛。皇后的召见，往往意味着后宫的格局即将变动。

坤宁宫内，博尔济吉特氏·婉仪端坐凤椅，面容端丽，神色从容。她的目光在${name}身上停留片刻，缓缓开口："沈采女，你入宫也有些时日了。本宫听闻，你与华妃似乎有些不愉快？"

这是一个陷阱，还是一个机会？`,
      choices: [
        { id: 1, text: "坦言相告，试探皇后态度", stat_changes: { scheming: 3, influence: 2 } },
        { id: 2, text: "避重就轻，只称一切安好", stat_changes: { virtue: 3, scheming: 1 } },
        { id: 3, text: "消耗1点洞察力，分析皇后真实意图", stat_changes: { insight: -1 } },
      ],
      new_flags: ["empress_meeting"],
      stat_changes: {},
      episode_end: ep % 3 === 0,
      ending: null,
    };
  }

  if (flags.has("empress_meeting") && !flags.has("shupin_contact")) {
    return {
      narration: `月色下的御花园，比白日更添了几分幽静。

${name}本不该出现在这里——夜间御花园不许宫人随意走动。但她收到了一张字条，约她亥时在牡丹亭相见，落款是一个她不认识的印记。

牡丹亭的石桌上放着一盏冷茶，旁边坐着一个太监模样的人："沈小主，淑嫔娘娘让我带句话。华妃近日要对新入宫的秀女下手。上个月的赵秀女……并非病故。"

${name}的心猛地揪紧了。赵秀女就住在她隔壁，一周前忽然"病故"被抬出宫……

太监将一个小瓷瓶放在桌上，转身消失在夜色中。`,
      choices: [
        { id: 1, text: "拿走瓷瓶，回去仔细查验", stat_changes: { scheming: 4, health: -3 } },
        { id: 2, text: "不碰瓷瓶，假装没来过", stat_changes: { wisdom: 3, virtue: 2 } },
        { id: 3, text: "将此事告知王嬷嬷", stat_changes: { scheming: 2, influence: 2 } },
      ],
      new_flags: ["shupin_contact", "huafei_threat"],
      stat_changes: {},
      episode_end: ep % 3 === 0,
      ending: null,
    };
  }

  const midPool = [
    {
      narration: `翌日清晨，延禧宫的小太监匆匆跑来："沈采女，华妃娘娘请您过去一趟。"

${name}的心沉了沉。自从入宫以来，她还从未与华妃正面打过交道。但宫里的风言风语她也有所耳闻——华妃性烈骄纵，得罪她的人，往往没有好下场。

她该如何应对这场可能的鸿门宴？`,
      choices: [
        { id: 1, text: "欣然赴约，以退为进", stat_changes: { scheming: 4, favor: -2 } },
        { id: 2, text: "称病拖延，争取准备时间", stat_changes: { wisdom: 3, scheming: 2 } },
        { id: 3, text: "消耗1点洞察力，感知此行吉凶", stat_changes: { insight: -1 } },
      ],
      new_flags: ["huafei_invitation"],
    },
    {
      narration: `入夜，一阵急促的脚步声打破了延禧宫的宁静。

一个小太监匆匆跑来传话："万岁爷今晚临幸延禧宫，沈采女速速准备！"

一时间，整个院子都沸腾了。贴身宫女香芹手忙脚乱地帮${name}更衣梳妆。

"小主，这可是千载难逢的机会啊！"香芹兴奋道。

${name}却心中忐忑。皇恩浩荡，却也伴君如伴虎……`,
      choices: [
        { id: 1, text: "精心打扮，全力争取侍寝", stat_changes: { favor: 5, cruelty: 2 } },
        { id: 2, text: "淡妆素裹，以才情取胜", stat_changes: { favor: 3, wisdom: 2 } },
        { id: 3, text: "故意素净，降低存在感", stat_changes: { virtue: 3, scheming: 2 } },
      ],
      new_flags: ["emperor_visit"],
    },
  ];

  const story = midPool[Math.floor(Math.random() * midPool.length)];
  return { ...story, stat_changes: {}, episode_end: false, ending: null };
}

function generateLateGameStory(state: GameState, flags: Set<string>, ep: number): AIResponse {
  const name = state.playerProfile.fullName;

  if (state.stats.dread >= 90) {
    return {
      narration: `${name}躺在床上，感到一阵剧痛从腹部蔓延至全身。

太医匆匆赶来，却只能摇头叹息。

"是鸩毒。"王嬷嬷的声音在耳边响起，带着一丝悲凉，"小主，皇上的忌惮……终于化作了杀心。"

${name}的眼前渐渐模糊。她想起了父亲临别时的话——"慎之又慎"……但终究，还是没能逃过这深宫的算计。`,
      choices: [],
      stat_changes: {},
      new_flags: [],
      episode_end: true,
      ending: "death_poison",
    };
  }

  if (state.stats.san <= 10) {
    return {
      narration: `${name}坐在窗前，目光呆滞。

那些后宫的算计、尔虞我诈、日日夜夜的精神紧绷……终于在这一刻，压垮了她最后的理智。

"一、二、三……"她开始无意识地数着什么，手指发白。

宫女们面面相觑——沈采女，似乎疯了。`,
      choices: [],
      stat_changes: {},
      new_flags: [],
      episode_end: true,
      ending: "suicide",
    };
  }

  return {
    narration: `景隆${2 + Math.floor(ep / 10)}年，后宫的格局悄然变化。

${name}已从当年的采女，成长为一位不容小觑的存在。然而后宫的水，永远比表面看起来的要深。

这日，有人悄悄递来一张纸条："太后有请。"

纸条上没有落款，但${name}知道，能以太后的名义传话的人，后宫之中屈指可数。太后的召见，是福是祸？`,
    choices: [
      { id: 1, text: "立即前往，不敢有丝毫怠慢", stat_changes: { virtue: 3, influence: 2 } },
      { id: 2, text: "先打听太后近况，再做决定", stat_changes: { scheming: 4, wisdom: 2 } },
      { id: 3, text: "消耗1点洞察力，揣摩太后意图", stat_changes: { insight: -1 } },
    ],
    new_flags: [`taihou_audience_${ep}`],
    stat_changes: {},
    episode_end: ep % 5 === 0,
    ending: null,
  };
}

