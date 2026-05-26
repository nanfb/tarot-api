import { FastifyPluginAsync } from 'fastify';
import generateToken from '../utils/generateToken';

type RefreshTokenBody = { refreshToken?: string };
type JwtPayload = { id: number; type: 'access' | 'refresh' };

const refreshTokenRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post<{ Body: RefreshTokenBody }>('/auth/refreshToken', async (request, reply) => {
        const currentRefreshToken = request.body?.refreshToken;

        if (!currentRefreshToken) {
            return reply.code(400).send({
                success: false,
                code: 400,
                message: '缺少 refreshToken',
            });
        }

        try {
            const decoded = fastify.jwt.verify(currentRefreshToken) as JwtPayload;

            if (decoded.type !== 'refresh') {
                return reply.code(401).send({
                    success: false,
                    code: 401,
                    message: '令牌类型错误',
                });
            }

            const redisKey = `tarot:auth:rt:${decoded.id}`;
            const storedRefreshToken = await fastify.redis.get(redisKey);
            if (!storedRefreshToken || storedRefreshToken !== currentRefreshToken) {
                return reply.code(403).send({
                    success: false,
                    code: 403,
                    message: '登录已彻底过期，请重新登录',
                });
            }

            const { accessToken, refreshToken, shortTime, longTime } = await generateToken(fastify, decoded.id);
            return {
                code: 200,
                data: {
                    accessToken,
                    refreshToken,
                    accessExpiresIn: shortTime.number,
                    refreshExpiresIn: longTime.number,
                },
            };
        } catch (err) {
            if (err instanceof Error && err.message === 'REDIS_STORE_FAILED') {
                return reply.code(500).send({
                    success: false,
                    code: 500,
                    message: '服务端错误，请稍后重试',
                });
            }

            return reply.code(403).send({
                success: false,
                code: 403,
                message: '登录已彻底过期，请重新登录',
            });
        }
    });
};

export default refreshTokenRoutes;
