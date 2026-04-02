import { FastifyPluginAsync } from 'fastify';
const rootRoute: FastifyPluginAsync = async (fastify, options) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const { url } = request;
    console.log(url, 'url');
    // 白名单
    const whiteList = ['/login'];
    if (whiteList.includes(url)) {
      return;
    } else {
      return '未知页面';
    }
  });
  fastify.get('/test', async () => {
    return {
      code: 200,
      text: "111"
    }
  })
};

export default rootRoute;
