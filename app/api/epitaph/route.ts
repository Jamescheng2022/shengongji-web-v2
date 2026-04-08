import { buildEpitaphPrompt } from '@/lib/prompts';
import type { GameState } from '@/lib/game-engine';

export interface EpitaphResult {
  epitaph: string;
  epitaph_interpretation: string;
  biography: string;
  biography_poem: string;
  verdict: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      surname,
      endingType,
      endingTitle,
      episodes,
      finalRank,
      stats,
      history,
    } = body as {
      fullName: string;
      surname: string;
      endingType: string;
      endingTitle: string;
      episodes: number;
      finalRank: string;
      stats: { san: number; cruelty: number; freshness: number; usefulness: number; dread: number };
      history: { role: string; content: string }[];
    };

    const prompt = buildEpitaphPrompt(
      fullName,
      surname,
      endingType,
      endingTitle,
      episodes,
      finalRank,
      stats,
      history
    );

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

    // 没有 API Key → 返回默认墓志铭
    if (!apiKey) {
      console.log('[epitaph] No API key, using default epitaph');
      return new Response(JSON.stringify({
        epitaph: '深宫一梦，浮生若寄。芳华易逝，香魂永逝。',
        epitaph_interpretation: '宫墙深几许，魂魄化尘埃',
        biography: '史书无传，唯留此碑。功过是非，任凭后人评说。',
        biography_poem: '「一入宫门深似海」——《现代民谚》',
        verdict: '生如夏花，死如秋叶。',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 调用 AI 生成墓志铭
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[epitaph] API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 提取 JSON
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[epitaph] No JSON found in response');
      throw new Error('Invalid JSON response');
    }

    const epitaphData = JSON.parse(jsonMatch[1] || jsonMatch[0]) as EpitaphResult;
    console.log('[epitaph] Generated successfully');

    return new Response(JSON.stringify(epitaphData), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[epitaph] Error:', e);
    return new Response(JSON.stringify({
      error: '生成墓志铭失败',
      epitaph: '深宫一梦，浮生若寄。',
      epitaph_interpretation: '梦醒时分，一切成空',
      biography: '命运多舛，事迹湮没于历史长河。',
      biography_poem: '「古今多少事，都付笑谈中」——《临江仙》',
      verdict: '天意弄人，命途多舛。',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
