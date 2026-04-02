import Fastify from 'fastify';
import 'dotenv/config';

const server = Fastify({
  // logger: true,
});

// PLUGINS
server.register(import('./plugins/db.js'));
server.register(import('./plugins/cacheCardsPlugin.js'));

// ERROR HANDLER
server.setErrorHandler((error: any, request: any, reply: any) => {
  server.log.error(error);
  // 专门识别 Schema 拦截的错误
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      message: '数据格式不对，请检查输入',
      details: error.validation,
    });
  }
  // 其他 500 错误
  reply.status(error.statusCode || 500).send({
    success: false,
    message: error.message || '服务器内部错误',
  });
});
// todo 404 处理，小程序端需要一个固定格式的响应，不能直接返回 404 页面
// server.register(
//   function (instance, options, done) {
//     instance.setNotFoundHandler(function (request, reply) {});
//     done();
//   },
//   { prefix: '/' },
// );
// ROUTES
server.register(import('./routes/root.js'));
server.register(import('./routes/tarot.js'), { prefix: '/api/tarot' });

/**
 * Run the server!
 */
const start = async () => {
  try {
    server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
