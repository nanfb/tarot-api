import { FastifyPluginAsync } from 'fastify';
import OpenAI from 'openai';
import type { Card } from '../types';
import tarotSchema from '../schemas/tarotSchema';
import { insertTarotHistoryRecord, listTarotHistoryRecords } from '../repository/tarotRepo';
import {
  buildHistoryCards,
  drawCardsFromDeck,
  formatCardsContent,
  formatCardsForAI,
  getDrawTypeLabel,
  getRoleLabel,
  inferDrawTypeByCardCount,
  mapTarotHistoryRecord,
  resolveDrawType,
  resolveRole,
  toStoredDrawType,
  toStoredRole,
  type TarotDrawType,
  type TarotRole,
} from '../services/tarotService';
import { getPrompt } from './config/aiPrompt';

interface DrawBody {
  type?: string;
  drawType?: string;
}

interface InterpretBody {
  cards: Card[];
  userNotes?: string;
  inInterpret_role?: TarotRole;
  drawType?: TarotDrawType;
}

type AuthUser = { id: number; type: 'access' | 'refresh' };

const apiKey = process.env.DS_API_KEY || '';
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey,
});

const tarotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: DrawBody }>('/draw', { schema: tarotSchema }, async (request) => {
    const drawType = resolveDrawType(request.body.drawType ?? request.body.type);
    const cards = drawCardsFromDeck(fastify.cards, drawType);

    return {
      code: 200,
      success: true,
      message: '抽牌成功',
      data: {
        drawType,
        cards,
      },
    };
  });
  fastify.get<{ Querystring: { pageNo?: string; pageSize?: string } }>('/history', { preHandler: fastify.authenticate }, async (request) => {
    const userId = (request.user as AuthUser).id;

    // 设置默认页码为 1，默认每页条数为 10（最大不超过 50）
    const pageNo = Math.max(Number(request.query.pageNo) || 1, 1);
    const pageSize = Math.min(Math.max(Number(request.query.pageSize) || 10, 1), 50);
    const rows = await listTarotHistoryRecords(fastify.pg, userId, pageNo, pageSize);

    return {
      code: 200,
      success: true,
      data: {
        list: rows.map(mapTarotHistoryRecord),
      },
    };
  });

  fastify.post<{ Body: InterpretBody }>('/aiInterpret', { preHandler: fastify.tryAuthenticate }, async (request, reply) => {
    const cards = request.body.cards ?? [];

    if (!cards.length) {
      return reply.code(400).send({
        code: 400,
        success: false,
        message: '请至少提供一张牌',
      });
    }

    const role = resolveRole(request.body.inInterpret_role);
    const drawType = resolveDrawType(request.body.drawType ?? inferDrawTypeByCardCount(cards.length));
    const prompt = getPrompt({
      formattedCards: formatCardsForAI(cards, fastify.cards),
      userNotes: request.body.userNotes || '',
      inInterpret_role: toStoredRole(role) as 'sister' | 'girl',
    });

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    let interpretation = '';

    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: 'deepseek-chat',
        stream: true,
      });

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (!content) {
          continue;
        }

        interpretation += content;
        reply.raw.write(`data: ${JSON.stringify({ content })}\n\n`);
      }

      const authUser = request.user as AuthUser | undefined;
      if (authUser?.id && interpretation.trim()) {
        const historyCards = buildHistoryCards(cards, drawType);

        try {
          await insertTarotHistoryRecord(fastify.pg, {
            userId: authUser.id,
            drawType: toStoredDrawType(drawType),
            drawTypeLabel: getDrawTypeLabel(drawType),
            drawPersona: toStoredRole(role),
            drawPersonaLabel: getRoleLabel(role),
            cardsContent: formatCardsContent(cards, drawType),
            cardsPayload: historyCards,
            userNotes: request.body.userNotes?.trim() || '',
            interpretation: interpretation.trim(),
          });
        } catch (error) {
          fastify.log.error(error, 'save tarot history failed');
        }
      }

      reply.raw.end();
      return reply;
    } catch (error) {
      fastify.log.error(error, 'tarot ai interpret failed');

      if (!reply.raw.writableEnded) {
        if (!reply.raw.headersSent) {
          return reply.code(500).send({
            code: 500,
            success: false,
            message: 'AI 解读服务请求失败',
          });
        }

        reply.raw.end();
      }

      return reply;
    }
  });
};

export default tarotRoutes;
