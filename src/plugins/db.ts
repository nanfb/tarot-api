/**
 * 解决插件的沙箱问题，在依赖注入的时候，fastify只是个克隆体，并不是真正的实例，
 * 使用fastify-plugin可以让插件在注册的时候，拿到真正的实例，解决沙箱问题，让pg挂载在真正的实例上。
 */
import { FastifyPluginAsync } from 'fastify';
import fastifyPostgres from '@fastify/postgres';

import fp from 'fastify-plugin';
const dbConnector: FastifyPluginAsync = async (fastify, options) => {
  await fastify.register(fastifyPostgres, {
    // 这里的连接字符串格式：postgres://用户名:密码@地址:端口/数据库名
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  });
};

export default fp(dbConnector);
