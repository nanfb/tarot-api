
import { FastifyInstance } from 'fastify';



// login 和 refreshToken 生成 token 的逻辑要一致
export default async function (fastify: FastifyInstance, id: number) {

    const shortTime = {
        string: '2d',
        number: 2 * 24 * 60 * 60 // 2天，单位为秒
    }
    const longTime = {
        string: '30d',
        number: 30 * 24 * 60 * 60 // 30天，单位为秒
    }
    const accessToken = fastify.jwt.sign(
        { id, type: 'access' },
        { expiresIn: shortTime.string }
    );
    // 2. 生成长 Token (Refresh Token)
    const refreshToken = fastify.jwt.sign(
        { id, type: 'refresh' },
        { expiresIn: longTime.string }
    );
    try {
        await fastify.redis.set(`tarot:auth:rt:${id}`, refreshToken, 'EX', longTime.number);
        return {
            accessToken, refreshToken, shortTime, longTime
        }
    } catch (err) {
        throw new Error('REDIS_STORE_FAILED'); // 抛出
    }

}