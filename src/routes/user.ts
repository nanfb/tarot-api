import { FastifyPluginAsync } from 'fastify';
const userRoutes: FastifyPluginAsync = async (fastify, options) => {

    fastify.get('/info', async (request, reply) => {
        try {
            const decoded = await request.jwtVerify()
            const userId = (decoded as { id: number }).id;
            if (!userId) {
                return reply.code(401).send({ message: '无效的 Token' });
            }
            const query = `
      SELECT id, nickname, avatar_url, draw_persona, draw_type 
      FROM users 
      WHERE id = $1
    `;
            const { rows } = await fastify.pg.query(query, [userId]);

            if (rows.length === 0) {
                return reply.code(404).send({ message: '用户不存在' });
            }

            return {
                code: 200,
                data: rows[0]
            };

        } catch (err: any) {
            if (err.statusCode === 401) {
                return reply.code(401).send({ success: false, code: 401 });
            } else {
                return reply.code(500).send({
                    success: false,
                    message: '服务器错误',
                    code: 500
                })
            }

        }
    })
}

export default userRoutes