import { FastifyPluginAsync } from "fastify";
import generateToken from "../utils/generateToken";
const refreshToken: FastifyPluginAsync = async (fastify, options) => {
    fastify.post('/auth/refreshToken', async (request: any, reply) => {
        // 刷新 token 的逻辑
        try {

            const decoded = fastify.jwt.verify(request.body.refreshToken) as { id: number, type: 'access' | 'refresh' };

            //  校验类型：必须是 refresh，防止别人拿还没过期的短 Token 来刷
            if (decoded.type !== 'refresh') {
                return reply.code(401).send({ success: false, code: 401, message: '令牌类型错误' });
            }
            // 没过期，直接拿 id 重新发牌
            const userId = decoded.id;
            const { accessToken, refreshToken, shortTime, longTime } = await generateToken(fastify, userId);
            return {
                code: 200,
                data: {
                    accessToken,
                    refreshToken,
                    accessExpiresIn: shortTime.number,
                    refreshExpiresIn: longTime.number,
                }
            }

        } catch (err) {
            if (err === 'REDIS_STORE_FAILED') {
                return reply.code(500).send({ message: '服务端错误，请稍后重试' });
            }
            // 如果长 Token 也过期了，jwt.verify 会抛错
            // 这里返回 403，前端收到后执行删除本地所有缓存并跳转登录
            return reply.code(403).send({
                success: false,
                code: 403,
                message: '登录已彻底过期，请重新登录'
            });
        }

    });
}

export default refreshToken