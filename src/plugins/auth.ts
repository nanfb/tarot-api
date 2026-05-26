import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

type JwtPayload = { id: number; type: 'access' | 'refresh' };

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        tryAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
    const verifyAccessToken = async (request: FastifyRequest, reply: FastifyReply, required: boolean) => {
        const token = request.headers.authorization;

        if (!token) {
            if (!required) return;

            return reply.code(401).send({
                success: false,
                message: '缺少校验凭证，请登录后重试',
                code: 401,
            });
        }

        try {
            const decoded = await request.jwtVerify<JwtPayload>();

            if (decoded.type !== 'access') {
                return reply.code(401).send({
                    success: false,
                    code: 401,
                    message: '令牌类型错误',
                });
            }

            const hasSession = await fastify.redis.exists(`tarot:auth:rt:${decoded.id}`);
            if (!hasSession) {
                return reply.code(401).send({
                    success: false,
                    code: 401,
                    message: '会话已过期，请重新登录',
                });
            }
        } catch {
            return reply.code(401).send({
                success: false,
                code: 401,
                message: 'Token 无效或已过期',
            });
        }
    };

    fastify.decorate('authenticate', async (request, reply) => verifyAccessToken(request, reply, true));
    fastify.decorate('tryAuthenticate', async (request, reply) => verifyAccessToken(request, reply, false));
};

export default fp(authPlugin);
