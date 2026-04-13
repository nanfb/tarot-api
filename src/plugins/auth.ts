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
            await request.jwtVerify();
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