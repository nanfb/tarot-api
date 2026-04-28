import { FastifyPluginAsync } from 'fastify';
import generateToken from "../utils/generateToken";
const getOpenid = async (code: string) => {
    const controller = new AbortController()
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.APPID}&secret=${process.env.APP_SECRET}&js_code=${code}&grant_type=authorization_code`, { signal });
        const data = await res.json();
        return data;

    } catch (err) {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

const loginRoutes: FastifyPluginAsync = async (fastify, options) => {

    fastify.post('/wxLogin', async (request: any, reply) => {
        const { code } = request.body
        if (code) {
            try {
                const data = await getOpenid(code)
                if (!data || data.errcode) {
                    return {
                        code: 500,
                        message: data.errmsg
                    }
                }
                const { openid, session_key } = data
                // 插入openid 和 nickname + 检测唯一性,如果存在就返回对应数据，如果注册过就更新时间
                const sql = `
             INSERT INTO users (openid, nickname)
             VALUES ($1, $2)
             ON CONFLICT (openid) 
             DO UPDATE SET updated_at = CURRENT_TIMESTAMP
             RETURNING id AS "userId", nickname, avatar_url AS "avatar";
            `;

                const randomNickname = `用户_${Math.random().toString(36).slice(-4)}`;

                const { rows } = await fastify.pg.query(sql, [openid, randomNickname]);
                const userInfo = rows[0];

                const { accessToken, refreshToken, shortTime, longTime } = await generateToken(fastify, userInfo.userId);
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
                return reply.code(500).send({ message: '登录失败，请稍后重试' });
            }
        } else {
            return {
                code: 400,
                text: "code不能为空"
            }
        }
    })
}

export default loginRoutes