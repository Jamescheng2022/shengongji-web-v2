import { buildSystemPrompt, buildUserMessage, buildSystemPromptWithSummary } from '@/lib/prompts';
import { GameState, AIResponse, parseAIOutput, cleanNarration, getRecentSummaries, formatSummariesForPrompt } from '@/lib/game-engine';
import { getCache, setCache } from '@/lib/prefetch-cache';
import { 
  shouldUseFixedScript, 
  getNextSceneId,
  FIXED_SCENES,
  EP_FLOWS
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
        
        // 生成下一场景
        const nextSceneId = getNextSceneId(currentSceneId, selectedChoice?.id || 1);
        const nextScene = nextSceneId ? FIXED_SCENES[nextSceneId] : null;
        
        // 确定是否结束当前集
        const currentSection = gameState.currentSection || 1;
        const episodeEnd = currentSection >= 3 || currentScene.id.includes('_s3');
        // 返回下一节的 section（processAIResponse 需要这个值来递增）
        const nextSection = episodeEnd ? 1 : currentSection + 1;
        
        // 转换为AI响应格式
        const response: AIResponse = {
          title: currentScene.title,
          section: nextSection,
          narration: currentScene.narration,
          subtext: currentScene.subtext,
          stat_changes: selectedChoice?.stat_changes || {},
          choices: (nextScene || currentScene).choices.map((c, i) => ({
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

  // 在第11集之后，如果有章节摘要，注入到Prompt中
  if (gameState.currentEpisode > 10 && gameState.chapterSummaries.length > 0) {
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

// ========== 内置剧情引擎（无API时使用） ==========

function generateFallbackStory(state: GameState, input: string): AIResponse {
  const ep = state.currentEpisode;
  const pool = getStoryPool(ep, state, input);
  const story = pool[Math.floor(Math.random() * pool.length)];
  return story;
}

function getStoryPool(episode: number, state: GameState, input: string): AIResponse[] {
  const inputLower = input.toLowerCase();

  if (episode === 1) {
    if (inputLower.includes('不语') || inputLower.includes('退后') || inputLower.includes('沉默')) {
      return [{
        narration: `沈知意不动声色地退后半步，垂下眼帘。\n\n乌兰见她如此识趣，嗤笑一声，便不再理会。王嬷嬷的目光却在沈知意身上多停了一瞬——那种不卑不亢的沉静，倒让她想起了当年的德太妃。\n\n"今日起，你们便住在储秀宫东西配殿。"王嬷嬷继续说道，"三日后选秀面圣，在此之前，不得随意走动。"\n\n众秀女各自散去。沈知意走进分配给她的厢房，房间不大，但收拾得还算整洁。正整理行囊时，隔壁传来一阵轻轻的叩门声。\n\n门外站着一位面容清秀的少女，眉眼温柔，穿着素净的藕荷色褂子，微微福身道："姐姐好，我是你的邻房，佟佳氏云舒。初来乍到，想着与姐姐打个照面。"\n\n她的笑容真切，但沈知意注意到她的目光很快扫过了自己桌上的行囊——那里面有一封父亲的亲笔信。`,
        choices: [
          { id: 1, text: "热情相迎，邀她进来说话" },
          { id: 2, text: "礼貌寒暄，但保持距离" },
          { id: 3, text: "婉言谢绝，称自己要休息" },
        ],
        stat_changes: { scheming: 3, wisdom: 2 },
        new_flags: ["met_yunshui", "entered_chuxiu_palace"],
        episode_end: false,
        ending: null,
      }];
    } else if (inputLower.includes('回应') || inputLower.includes('不卑') || inputLower.includes('笑')) {
      return [{
        narration: `沈知意抬起头，淡淡一笑，福了福身道："姐姐说笑了。贵气不贵气的，进了这宫门，大家都是天家的人，谁也不比谁贵上几分。"\n\n此话一出，周围几位秀女都暗暗侧目。乌兰的脸色微变，没料到这个汉军旗的丫头竟敢回嘴。王嬷嬷嘴角微不可查地动了一下。\n\n"你——"乌兰正要发作，身后一位年长的嬷嬷拉了拉她的袖子，低声道："小主，这里是储秀宫，不是科尔沁草原。"\n\n乌兰冷哼一声，拂袖而去。但沈知意分明看见她回头时那双眼睛里的寒意——她知道，自己刚刚在这后宫里，树了第一个敌人。\n\n回到厢房，沈知意取出父亲临别前塞给她的一封信。信封上只写了四个字："慎之又慎。"\n\n她刚要拆开，忽听院中传来一阵骚动——有人喊道："华妃娘娘驾到！"`,
        choices: [
          { id: 1, text: "赶紧出去跪迎华妃" },
          { id: 2, text: "先收好信再出去" },
          { id: 3, text: "躲在房中偷偷观望" },
        ],
        stat_changes: { favor: 2, scheming: 5, influence: 2, cruelty: 1 },
        new_flags: ["offended_wulan", "entered_chuxiu_palace"],
        episode_end: false,
        ending: null,
      }];
    } else {
      return [{
        narration: `沈知意假装没有听到乌兰的话，转身恭恭敬敬地向王嬷嬷福了一礼："嬷嬷辛苦，请嬷嬷多多指教。"\n\n王嬷嬷微微颔首，目光中多了几分赞许："倒是个懂规矩的。"\n\n乌兰见沈知意不接茬，反而去讨好嬷嬷，一时竟也无从发作，只能悻悻地跟着众人往配殿走去。\n\n夜里，储秀宫安静下来。沈知意在烛光下取出随身带来的一本《女诫》——这是母亲特意让她带进宫的。书页间夹着一张薄纸，上面是父亲的笔迹，只有八个字：\n\n"不争则无过，无过则安。"\n\n她默念了两遍，将纸折好贴身收起。窗外月色如水，远处隐约传来宫墙后的丝竹声。\n\n忽然，隔壁传来压低的哭声。沈知意侧耳倾听——是一个年轻女子的啜泣，断断续续，满是恐惧。`,
        choices: [
          { id: 1, text: "过去敲门关心" },
          { id: 2, text: "当作没听到，继续看书" },
          { id: 3, text: "记在心里，明日再打听" },
        ],
        stat_changes: { wisdom: 3, scheming: 2, virtue: 3 },
        new_flags: ["impressed_mammy_wang", "entered_chuxiu_palace"],
        episode_end: false,
        ending: null,
      }];
    }
  }

  const generalPool: AIResponse[] = [
    {
      narration: `翌日清晨，储秀宫的钟声在薄雾中响起。沈知意早早起身梳洗，按照嬷嬷昨日教授的规矩，将发髻梳得一丝不苟。\n\n用过早膳，王嬷嬷将众秀女召至正殿，面色凝重道："今日皇后娘娘要来储秀宫巡视。尔等务必言行得体，若有失仪之处——"\n\n她没有说完，但众人都明白那未尽之意。\n\n巳时，一阵环佩叮当。皇后博尔济吉特氏·婉仪在众宫女的簇拥下款款而来。她容貌端丽，神色从容，一双凤眼带着审视的目光扫过每一位秀女。\n\n"这位是？"皇后在沈知意面前停下了脚步。\n\n"回娘娘，沈德山之女，沈知意。"王嬷嬷在一旁禀报。\n\n皇后微微颔首："沈少卿的女儿。你父亲在大理寺做事，素来清正。"\n\n所有人的目光都聚焦在沈知意身上。皇后似乎在等她说些什么。`,
      choices: [
        { id: 1, text: "谦虚回应，称父亲不过尽本分" },
        { id: 2, text: "借机表忠心，称愿效忠皇后" },
        { id: 3, text: "沉默恭敬，只行礼不多言" },
      ],
      stat_changes: { favor: 3, influence: 2 },
      new_flags: ["met_empress"],
      episode_end: false,
      ending: null,
    },
    {
      narration: `入夜，一阵急促的脚步声打破了储秀宫的宁静。\n\n一个小太监匆匆跑来传话："万岁爷今晚要临幸储秀宫，各位小主速速准备！"\n\n一时间，整个院子都沸腾了。秀女们手忙脚乱地更衣梳妆，有人喜形于色，有人惶恐不安。\n\n沈知意的心也跳快了几拍。她从箱中取出母亲准备的一套月白色绣兰花的褂子——素净，但做工精致。\n\n云舒从隔壁走过来，面带担忧："知意姐姐，听说皇上最近心情不好，前朝有人弹劾了好几位大臣……万一问起朝事，我们该如何应对？"\n\n沈知意正在思索，乌兰却已经盛装打扮完毕，浓妆艳抹地走出来，冷冷道："问什么朝事？侍奉圣驾，只需讨皇上欢心便是。有些人啊，既不懂风情，又没有家世，就别痴心妄想了。"\n\n远处，灯笼的光芒逐渐逼近。`,
      choices: [
        { id: 1, text: "淡妆素裹，以才情取胜" },
        { id: 2, text: "刻意回避，不去争宠" },
        { id: 3, text: "暗中观察其他人的表现" },
      ],
      stat_changes: { scheming: 3, favor: 2 },
      new_flags: ["emperor_visit_chuxiu"],
      episode_end: false,
      ending: null,
    },
    {
      narration: `三日后，选秀的日子到了。\n\n太和殿前，秀女们按照旗籍排成两列。沈知意站在汉军旗的队伍中，前面是满洲旗和蒙古旗的秀女——她们的位置总是靠前一些。\n\n景隆帝端坐龙椅之上，面容俊朗但不怒自威。他看起来不过三十许人，眉宇间却有着与年龄不符的深沉。\n\n"沈氏。"点名的声音忽然响起。\n\n沈知意深吸一口气，走上前去，按照礼仪端正地跪拜。她能感受到头顶那道目光的重量。\n\n"朕听闻你善画？"景隆帝忽然问道。\n\n沈知意一愣——她确实自幼学画，但这事并不为外人所知。是谁告诉皇上的？\n\n"回皇上，臣女……略通丹青，不敢言善。"她低头答道。\n\n"不必谦虚。"景隆帝的声音里带着一丝玩味，"朕案头恰好有一幅画，缺了题诗。你来看看。"\n\n大殿内一阵低低的议论声。`,
      choices: [
        { id: 1, text: "大方上前，展露才学" },
        { id: 2, text: "推辞才疏，请皇上另选高明" },
        { id: 3, text: "含蓄应承，先看画再决定" },
      ],
      stat_changes: { favor: 5, wisdom: 3, influence: 2 },
      new_flags: ["emperor_noticed", "painting_event"],
      episode_end: true,
      ending: null,
    },
    {
      narration: `月色下的御花园，比白日更添了几分幽静。\n\n沈知意本不该出现在这里——夜间御花园不许宫人随意走动。但她收到了一张字条，约她亥时在牡丹亭相见，落款是一个她不认识的印记。\n\n牡丹亭的石桌上放着一盏冷茶，旁边坐着一个太监模样的人。看见沈知意，他站起来行了个礼："沈小主，我家主子让我带句话。"\n\n"你家主子是……？"\n\n"淑嫔娘娘。"太监压低声音，"娘娘说，华妃近日要对新入宫的秀女下手。她已经查到，上个月那位赵秀女的'暴病'，并非天意。"\n\n沈知意的心猛地揪紧了。赵秀女就住在她隔壁，一周前忽然'病故'被抬出宫，大家都以为是水土不服……\n\n"娘娘说，您是聪明人。这后宫里，一个人活不长。"太监说完，将一个小瓷瓶放在桌上，转身消失在夜色中。\n\n小瓷瓶里是什么？沈知意盯着它，手指微微发抖。`,
      choices: [
        { id: 1, text: "拿走瓷瓶，回去仔细查验" },
        { id: 2, text: "不碰瓷瓶，假装没来过" },
        { id: 3, text: "将此事告知王嬷嬷" },
      ],
      stat_changes: { scheming: 5, health: -5, wisdom: 3 },
      new_flags: ["shupin_contact", "huafei_threat"],
      episode_end: false,
      ending: null,
    },
    {
      narration: `连日的阴雨终于停了。\n\n沈知意被提升为采女后，搬入了延禧宫的偏殿。虽然只是一间小小的厢房，但终究比储秀宫的大通铺强了不少。\n\n然而好景不长。这日晨起，贴身宫女香芹端来早膳，面色苍白地附耳道："小主，奴婢听说……华妃娘娘昨晚在皇上面前提起您了。"\n\n"说了什么？"\n\n"说……说您的父亲沈大人，在朝上弹劾了华妃兄长的旧部。华妃娘娘很不高兴。"\n\n沈知意放下筷子。前朝后宫，果然盘根错节。父亲在大理寺的一举一动，都会影响她在后宫的处境。\n\n正说着，外面传来传唤的声音——皇后娘娘要见她。\n\n"来的好快。"沈知意喃喃道。她知道，皇后召见绝非好意，但也不会是坏事。在这后宫里，每个人都是棋子，关键是看你被谁执子。`,
      choices: [
        { id: 1, text: "坦然赴约，见招拆招" },
        { id: 2, text: "先打听皇后近况再去" },
        { id: 3, text: "称病拖延，争取时间" },
      ],
      stat_changes: { influence: 3, scheming: 2, favor: -2 },
      new_flags: ["court_politics_entangled"],
      episode_end: false,
      ending: null,
    },
  ];

  return generalPool;
}
