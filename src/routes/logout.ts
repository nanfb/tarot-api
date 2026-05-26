import { FastifyPluginAsync } from 'fastify';

type AuthUser = { id: number; type: 'access' | 'refresh' };

const logoutRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/wxLogout', { preHandler: fastify.authenticate }, async (request) => {
        const userId = (request.user as AuthUser).id;
        await fastify.redis.del(`tarot:auth:rt:${userId}`);

        return {
            code: 200,
            message: 'Logged out successfully',
            data: {
                success: true,
                message: 'Logged out successfully',
            },
        };
    });
};

export default logoutRoutes;
