import { FastifyPluginAsync } from 'fastify';
import tarotSchema from '../schemas/tarotSchema';
import OpenAI from 'openai';
import { Card } from '../types';
import { getPrompt } from './config/aiPrompt';
interface DrawBody {
  type: string;
}

const api_key = process.env.DS_API_KEY || '';
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: api_key,
});

/**
 * todo:后续抽卡跟 ai 解读优化成一个 sse 接口
 */
const tarotRoutes: FastifyPluginAsync = async (fastify, options) => {
  // 抽牌函数
  const drawCards = (type: string) => {
    // 1. 转换成数组，方便操作
    const allCards = Array.from(fastify.cards.values());

    // 2. 定义牌阵对应的张数
    const countConfig: Record<string, number> = {
      '1': 1, // 单牌
      '2': 3, // 三张牌（过去、现在、未来）
      '3': 10, // 十字牌阵（常用 10 张）
    };
    const count = countConfig[type] || 1;

    // 3. 洗牌算法 (Fisher-Yates Shuffle)
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    // 4. 抽取指定数量并加上随机正逆位
    return allCards.slice(0, count).map((card) => ({
      ...card,
      is_reversed: Math.random() > 0.5, // 50% 概率逆位
    }));
  };

  // 抽牌
  fastify.post('/draw', { schema: tarotSchema }, async (request, reply) => {
    const { type } = request.body as DrawBody;
    const cardsResult = drawCards(type);
    if (cardsResult.length === 0) {
      throw new Error('没有足够的卡牌可供抽取');
    }
    return {
      code: 200,
      success: true,
      message: '抽牌成功',
      data: {
        cards: cardsResult,
      },
    };
  });

  // AI 解牌
  fastify.post<{ Body: { cards: Card[]; userNotes?: string; inInterpret_role?: '1' | '2' } }>('/aiInterpret', async (request, reply) => {
    if (!request.body.cards || request.body.cards.length === 0) {
      return reply.status(400).send({
        success: false,
        message: '请提供至少一张牌的名称',
      });
    }

    // 格式化牌面信息
    function formatCardsForAI(drawResult: any[]) {
      return drawResult
        .map((card) => {
          const cardInfo = fastify.cards.get(card.id) as Card;
          const direction = card.is_reversed ? '逆位' : '正位';
          return `${cardInfo.name_cn} (${direction})`;
        })
        .join('、');
    }
    request.body.inInterpret_role = request.body.inInterpret_role ?? '1'; // 默认使用姐姐角色
    const params = {
      formattedCards: formatCardsForAI(request.body.cards),
      userNotes: request.body.userNotes || '',
      inInterpret_role: request.body.inInterpret_role === '1' ? 'sister' : 'girl' as 'sister' | 'girl',
    };

    try {
      const prompt = getPrompt({ ...params });
      // 设置 响应头
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      const completion = await openai.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: 'deepseek-chat',
        stream: true,
      });
      // 实时转发 AI 响应
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          // 按照 SSE 规范格式化：data: 内容\n\n
          reply.raw.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      // 4. 结束流
      reply.raw.end();
    } catch {
      return reply.status(500).send({
        success: false,
        message: 'AI 解释服务请求失败',
        code: 500,
      });
    }
  });
};

export default tarotRoutes;
