/**
 * 解决插件的沙箱问题，在依赖注入的时候，fastify只是个克隆体，并不是真正的实例，
 * 使用fastify-plugin可以让插件在注册的时候，拿到真正的实例，解决沙箱问题，让pg挂载在真正的实例上。
 */
import { FastifyPluginAsync } from 'fastify';
import fastifyRedis from '@fastify/redis'

import fp from 'fastify-plugin';
const redisConnector: FastifyPluginAsync = async (fastify, options) => {
    await fastify.register(fastifyRedis, {
        host: '127.0.0.1',
        port: 6379,
        // 如果你在 docker run 时没设密码，这里就不需要 password
        // password: 'your_password', 

        // 建议加上这个，防止 Redis 连不上导致整个进程挂掉
        closeClient: true
    });
};

export default fp(redisConnector);
