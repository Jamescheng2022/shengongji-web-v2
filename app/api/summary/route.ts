import { buildSummaryPrompt, parseSummaryResponse } from '@/lib/prompts';
import { GameState, ChapterSummary } from '@/lib/game-engine';

export async function POST(req: Request) {
  let gameState: GameState;

  try {
    const body = await req.json();
    gameState = body.gameState;
  } catch (e) {
    console.error('[summary] Failed to parse request body:', e);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  // 从第5集开始生成摘要（提前至5集，原为11集）
  if (gameState.currentEpisode < 5 || gameState.currentSection % 3 !== 0) {
    return new Response(JSON.stringify({ skipped: true, reason: 'Not at summary point' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  // 没有 API Key → 返回失败
  if (!apiKey) {
    console.log('[summary] No API key available');
    return new Response(JSON.stringify({ skipped: true, reason: 'No API key configured' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('[summary] Generating summary for episode', gameState.currentEpisode);

  try {
    // 构建摘要Prompt
    const summaryPrompt = buildSummaryPrompt(
      gameState.playerProfile.fullName,
      gameState.history,
      gameState.currentEpisode,
      gameState.stats,
      gameState.rank,
      gameState.chapterSummaries,
    );

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
          { role: 'user', content: summaryPrompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error('[summary] AI API error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI API error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    console.log('[summary] AI raw output:', rawContent.slice(0, 300));

    // 解析AI响应
    const summaryData = parseSummaryResponse(rawContent);

    // 构建章节摘要对象
    const lastSummary = gameState.chapterSummaries[gameState.chapterSummaries.length - 1];
    const startEpisode = lastSummary ? lastSummary.episodeRange[1] + 1 : 1;

    const chapterSummary: ChapterSummary = {
      id: `summary_${Date.now()}`,
      episodeRange: [startEpisode, gameState.currentEpisode],
      summaryText: summaryData.summaryText,
      keyEvents: summaryData.keyEvents,
      npcRelations: summaryData.npcRelations,
      plotFlags: [...gameState.flags],
      statSnapshot: { ...gameState.stats },
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify({
      success: true,
      summary: chapterSummary,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[summary] Error:', e);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
