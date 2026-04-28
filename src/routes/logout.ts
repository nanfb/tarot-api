import { FastifyPluginAsync } from 'fastify';
const logoutRoutes: FastifyPluginAsync = async (fastify, options) => {

    fastify.get('/wxLogout', async (request: any, reply) => {
        const decoded = await request.jwtVerify() as { id: number, type: 'access' | 'refresh' };
        await fastify.redis.del(`tarot:auth:rt:${decoded.id}`);
        return {
            code: 200,
            message: 'Logged out successfully',
            data: {
                success: true,
                message: 'Logged out successfully'
            }

        }
    })
}

export default logoutRoutes