import 'fastify';
import '@fastify/jwt';
interface CardsMap extends Map<number, Card> { }
// 1. 定义单张牌的结构
export interface Card {
  id: number;
  name_cn: string;
  name_en: string;
  rank_number: number;
  description_upright: string;
  description_reversed: string;
  arcana_type: string;
  suit: string | null; // 通常 suit 可能是 string 或 null
  img_alias: string;
  [key: string]: any;
}

declare module 'fastify' {
  interface FastifyInstance {
    cards: CardsMap;
  }
}


declare module '@fastify/jwt' {
  interface VerifyPayloadType {
    // 这里定义你 JWT 载荷的结构
    payload: {
      id: number;
      type: 'access' | 'refresh';
    };
    // 这里定义 request.user 的结构（通常与 payload 一致）
    user: {
      id: number;
      type: 'access' | 'refresh';
    };
  }
}