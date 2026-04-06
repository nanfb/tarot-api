import { FastifyPluginAsync } from 'fastify';
import { setTimeout } from 'node:timers/promises';
const userRoutes: FastifyPluginAsync = async (fastify, options) => {


    fastify.get('/config', async () => {

        await setTimeout(2000);
        return {
            code: 200,
            text: "111"
        }
    })
}

export default userRoutes