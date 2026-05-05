import { buildSystemPrompt, buildUserMessage, buildSystemPromptWithSummary } from '@/lib/prompts';
import { validateAIOutput, buildCorrectionPrompt } from '@/lib/constitution';
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

  const cacheKey = `${gameState.id}_${playerInput}`;

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
        const episodeEnd: boolean = !!(currentSection >= 3 || (nextScene && nextScene.id.includes('_s3')));
        // 返回下一节的 section
        const nextSection = episodeEnd ? 1 : currentSection + 1;
        
        // 转换为AI响应格式
        const response: AIResponse = {
          title: nextScene ? nextScene.title : currentScene.title,
          section: nextSection,
          narration: nextScene ? nextScene.narration : currentScene.narration,
          subtext: nextScene ? nextScene.subtext : currentScene.subtext,
          highlight: nextScene ? nextScene.highlight : currentScene.highlight,
          stat_changes: selectedChoice?.stat_changes || {},
          choices: nextScene ? nextScene.choices.map((c, i) => ({
            id: i + 1,
            text: c.text,
            stat_changes: c.stat_changes,
          })) : [],
          episode_end: episodeEnd,
          ending: null,
        };
        
        setCache(cacheKey, response);
        
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // 1. 检查缓存
  const cachedResult = getCache(cacheKey);
  if (cachedResult) {
    console.log('[chat] Cache hit for:', cacheKey);
    return new Response(JSON.stringify(cachedResult), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ZHIPU_API_KEY || process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  const apiURL = process.env.AI_BASE_URL || (process.env.ZHIPU_API_KEY ? 'https://open.bigmodel.cn/api/paas/v4/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions');
  const model = process.env.AI_MODEL || (process.env.ZHIPU_API_KEY ? 'glm-4-flash' : 'openai/gpt-3.5-turbo');

  if (!apiKey) {
    const fallbackResponse = generateFallbackStory(gameState, playerInput);
    setCache(cacheKey, fallbackResponse);
    return new Response(JSON.stringify(fallbackResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 获取摘要内容
  const summaryText = formatSummariesForPrompt(getRecentSummaries(gameState, 3));

  // 始终注入宪法约束块（通过 buildSystemPromptWithSummary）
  let systemPrompt = buildSystemPromptWithSummary(gameState, summaryText);

  // 从第5集开始注入章节摘要（提前至5集，原为11集）
  if (gameState.currentEpisode > 5 && gameState.chapterSummaries.length > 0) {
    // 摘要已在 buildSystemPromptWithSummary 中处理
  }

  const userMessage = buildUserMessage(gameState, playerInput);

  try {
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
        temperature: 0.8,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[chat] API error:', error);
      throw new Error(`API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    console.log('[chat] Raw content:', rawContent.slice(0, 200));

    let aiResponse: AIResponse;
    try {
      aiResponse = parseAIOutput(rawContent);
    } catch (e) {
      console.error('[chat] JSON parse error, raw:', rawContent);
      // 如果解析失败，返回 fallback 剧情
      const fallbackResponse = generateFallbackStory(gameState, playerInput);
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 确定 episode_end
    const currentSection = gameState.currentSection || 1;
    const episodeEnd = currentSection >= 3;
    aiResponse.episode_end = episodeEnd;
    // 递增 section
    aiResponse.section = episodeEnd ? 1 : currentSection + 1;

    // 确保 narration 存在
    if (!aiResponse.narration) {
      aiResponse.narration = '（剧情生成中...）';
    }

    // ========== 宪法校验管道 ==========
    const validation = validateAIOutput(aiResponse, gameState);
    
    if (validation.violations.length > 0) {
      console.log('[CONSTITUTION] 检测到违规:', validation.level,
        validation.violations.map(v => `[${v.rule}] ${v.detail}`));
    }

    // 红色违规：直接切 fallback（不可修复的严重违规）
    if (validation.shouldFallback) {
      console.log('[CONSTITUTION] 🔴 红色违规，切换到 fallback 引擎');
      const fallbackResponse = generateFallbackStory(gameState, playerInput);
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 橙色违规：重试一次（带违规反馈让 AI 修正）
    if (validation.shouldRetry) {
      console.log('[CONSTITUTION] 🟠 橙色违规，重试中...');
      try {
        const correctionPrompt = buildCorrectionPrompt(validation.violations);
        const retryResponse = await fetch(apiURL, {
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
              { role: 'assistant', content: rawContent },
              { role: 'user', content: correctionPrompt },
            ],
            max_tokens: 1200,
            temperature: 0.7,  // 降温以提高遵从度
            stream: false,
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryRaw = retryData.choices?.[0]?.message?.content || '';
          console.log('[CONSTITUTION] Retry raw:', retryRaw.slice(0, 200));
          
          try {
            const retryParsed = parseAIOutput(retryRaw);
            // 对重试结果再做一次校验
            const retryValidation = validateAIOutput(retryParsed, gameState);
            
            if (retryValidation.shouldFallback) {
              // 重试后仍然红色违规，切 fallback
              console.log('[CONSTITUTION] 🔴 重试后仍红色违规，切 fallback');
              const fallbackResponse = generateFallbackStory(gameState, playerInput);
              return new Response(JSON.stringify(fallbackResponse), {
                headers: { 'Content-Type': 'application/json' },
              });
            }
            
            // 重试成功（即使还有黄色违规也放行）
            console.log('[CONSTITUTION] ✅ 重试后校验通过，级别:', retryValidation.level);
            aiResponse = retryParsed;
          } catch (retryParseErr) {
            console.error('[CONSTITUTION] 重试结果解析失败，使用原始输出');
            // 保持原始 aiResponse
          }
        }
      } catch (retryErr) {
        console.error('[CONSTITUTION] 重试请求失败:', retryErr);
        // 保持原始 aiResponse
      }
    }

    // 缓存响应
    setCache(cacheKey, aiResponse);

    return new Response(JSON.stringify(aiResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[chat] Chat error:', e);
    // 发生严重错误时返回 fallback 剧情
    const fallbackResponse = generateFallbackStory(gameState, playerInput);
    return new Response(JSON.stringify(fallbackResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 当 AI 引擎失效时返回的备选剧情（Fallback 引擎）
 * 这是一个简单的规则引擎，确保游戏不会因为 AI 挂了而中断
 */
function generateFallbackStory(state: GameState, playerInput: string): AIResponse {
  const flags = new Set(state.flags);
  const name = state.playerProfile.fullName;
  const ep = state.currentEpisode;

  // 根据当前集数和状态生成对应阶段的固定剧情
  if (ep <= 3) {
    return generateEarlyGameStory(state, flags, ep);
  } else if (ep <= 10) {
    return generateMidGameStory(state, flags, ep);
  }

  // 通用的保底响应
  return {
    narration: `${name}深吸一口气，平复了一下心情。在这深宫之中，每一个决定都如履薄冰。虽然前路漫漫，但她知道，唯有步步为营，才能在这朱墙之内生存下去。`,
    choices: [
      { id: 1, text: "静观其变，稳扎稳打", stat_changes: { wisdom: 3, virtue: 2 } },
      { id: 2, text: "暗中观察，寻找盟友", stat_changes: { scheming: 3, favor: 1 } },
      { id: 3, text: "收敛锋芒，暂避风头", stat_changes: { virtue: 2, dread: -3 } },
    ],
    stat_changes: {},
    episode_end: ep % 3 === 0,
    ending: null,
  };
}

// 模拟早期剧情的 Fallback
function generateEarlyGameStory(state: GameState, flags: Set<string>, ep: number): AIResponse {
  const name = state.playerProfile.fullName;

  if (flags.has("huafei_visit")) {
    return {
      narration: `华妃离开后，储秀宫的空气依然凝重得让人喘不过气。
      
${name}坐在桌边，看着镜子里的自己。入宫短短数日，她已见识到了后宫的残酷。王嬷嬷走进来，低声道："小主，华妃娘娘向来跋扈，今日的事，您受委屈了。"`,
      choices: [
        { id: 1, text: "向王嬷嬷请教生存之道", stat_changes: { wisdom: 3, virtue: 2 } },
        { id: 2, text: "沉默片刻，眼神逐渐冷冽", stat_changes: { scheming: 3, cruelty: 2 } },
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

  return {
    narration: `${name}知道，这后宫之中，没有永远的朋友，只有永远的利益。唯有保持清醒，才能走到最后。`,
    choices: [
      { id: 1, text: "继续前行", stat_changes: { wisdom: 1 } },
    ],
    stat_changes: {},
    episode_end: ep % 3 === 0,
    ending: null,
  };
}
