import { FastifyPluginAsync } from 'fastify';
import {
  fromStoredDrawType,
  fromStoredRole,
  resolveDrawType,
  resolveRole,
  toStoredDrawType,
  toStoredRole,
} from '../services/tarotService';

type AuthUser = { id: number; type: 'access' | 'refresh' };

interface PreferencesBody {
  role?: '1' | '2';
  drawType?: '1' | '2' | '3';
}

function formatUserInfo(row: any) {
  return {
    userId: row.userId,
    nickname: row.nickname,
    avatar: row.avatar,
    role: fromStoredRole(row.draw_persona),
    drawType: fromStoredDrawType(row.draw_type),
    drawPersona: row.draw_persona,
    spreadType: row.draw_type,
  };
}

const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/info', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = (request.user as AuthUser).id;
      const { rows } = await fastify.pg.query(
        `
          SELECT
            id AS "userId",
            nickname,
            avatar_url AS avatar,
            draw_persona,
            draw_type
          FROM users
          WHERE id = $1
        `,
        [userId],
      );

      if (!rows.length) {
        return reply.code(404).send({
          code: 404,
          success: false,
          message: 'user not found',
        });
      }

      return {
        code: 200,
        data: formatUserInfo(rows[0]),
      };
    }
    catch {
      return reply.code(500).send({
        code: 500,
        success: false,
        message: 'server error',
      });
    }
  });

  fastify.put<{ Body: PreferencesBody }>('/preferences', { preHandler: fastify.authenticate }, async (request, reply) => {
    try {
      const userId = (request.user as AuthUser).id;
      const role = resolveRole(request.body?.role);
      const drawType = resolveDrawType(request.body?.drawType);

      const { rows } = await fastify.pg.query(
        `
          UPDATE users
          SET
            draw_persona = $1,
            draw_type = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING
            id AS "userId",
            nickname,
            avatar_url AS avatar,
            draw_persona,
            draw_type
        `,
        [toStoredRole(role), toStoredDrawType(drawType), userId],
      );

      if (!rows.length) {
        return reply.code(404).send({
          code: 404,
          success: false,
          message: 'user not found',
        });
      }

      return {
        code: 200,
        success: true,
        message: 'preferences saved',
        data: formatUserInfo(rows[0]),
      };
    }
    catch {
      return reply.code(500).send({
        code: 500,
        success: false,
        message: 'save preferences failed',
      });
    }
  });
};

export default userRoutes;
