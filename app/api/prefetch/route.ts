import { buildSystemPrompt, buildUserMessage } from '@/lib/prompts';
import { GameState, AIResponse, parseAIOutput } from '@/lib/game-engine';
import { setCache } from '@/lib/prefetch-cache';

export const maxDuration = 30; // Vercel setting

export async function POST(req: Request) {
  try {
    const { gameState, options } = await req.json();
    if (!gameState || !options || !Array.isArray(options)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

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

    if (!apiKey) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'No API key configured',
        choice1: null,
        choice2: null,
        choice3: null,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildSystemPrompt(gameState);

    const fetchOption = async (optionText: string): Promise<AIResponse | null> => {
      const userMessage = buildUserMessage(gameState, optionText);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(`${baseURL}/chat/completions`, {
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
            stream: false,
            temperature: 0.85,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        const aiResponse = parseAIOutput(rawContent);

        // 存入缓存
        setCache(`${gameState.id}_${optionText}`, aiResponse);
        return aiResponse;
      } catch (err) {
        console.error(`[prefetch] Error fetching option "${optionText}":`, err);
        return null;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // 并行请求
    const results = await Promise.all(options.slice(0, 3).map(opt => fetchOption(opt)));

    const responseData = {
      choice1: results[0],
      choice2: results[1],
      choice3: results[2],
    };

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[prefetch] Global error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
