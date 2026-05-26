import { FastifyPluginAsync } from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import fp from 'fastify-plugin';
import { ensureTarotHistoryTable } from '../repository/tarotRepo';

const dbConnector: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyPostgres, {
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  });

  await ensureTarotHistoryTable(fastify.pg);
};

export default fp(dbConnector);
