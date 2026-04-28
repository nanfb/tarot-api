import { FastifyPluginAsync } from "fastify";
import fp from 'fastify-plugin';


declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>;
    }
}

const authPlugin: FastifyPluginAsync = async (fastify, options) => {
    //封装一个装饰器，方便在特定路由手动调用
    fastify.decorate('authenticate', async (request, reply) => {
        const authHeader = request.headers.authorization;

        // 1. 如果完全没传 Token
        if (!authHeader) return;

        // 2. 如果传了 Token，则校验
        try {
            const decoded = await request.jwtVerify() as { id: number, type: 'access' | 'refresh' };
            // 判断redis中的id还在不在，不在的话短token也失效
            const hasSession = await fastify.redis.exists(`tarot:auth:rt:${decoded.id}`);
            if (!hasSession) {
                return reply.code(401).send({ success: false, message: '会话已过期，请重新登录' });
            }
            if (decoded.type !== 'access') {
                return reply.code(401).send({ success: false, code: 401, message: '令牌类型错误' });
            }
        } catch (err: any) {
            return reply.code(401).send({
                success: false,
                code: 401,
                message: 'Token 无效或已过期',
            });
        }
    });
    // 3. 全局拦截
    fastify.addHook('preHandler', async (request, reply) => {
        // 白名单
        const publicRoutes = ['/api/login/wxLogin', '/auth/refreshToken'];
        console.log(request.url)
        if (publicRoutes.includes(request.url)) return;

        await fastify.authenticate(request, reply);
    });
};

export default fp(authPlugin);