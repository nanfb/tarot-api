import fp from 'fastify-plugin';
// 用于首次加载时从数据库中读取所有卡牌数据，并将其缓存到内存中，方便后续快速访问
export default fp(async (fastify) => {
  const { rows } = await fastify.pg.query('SELECT * FROM cards');
  const cardsMap = new Map(rows.map((card) => [card.id, card]));
  fastify.decorate('cards', cardsMap);
});
