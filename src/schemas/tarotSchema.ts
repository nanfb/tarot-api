import { baseResponseSchema, otherResponseSchema } from './common';
export default {
  body: {
    type: 'object',
    required: ['type'], // 必填项
    properties: {
      type: {
        type: 'string',
        enum: ['1', '2', '3'], // 限制取值范围
        description: '牌阵类型',
      },
      user_notes: { type: 'string', maxLength: 100 }, // 问题，可选项，限制长度
    },
  },
  response: {
    200: {
      ...baseResponseSchema,
      properties: {
        ...baseResponseSchema.properties,
        data: { cards: 'array', additionalProperties: true },
      },
    },
    ...otherResponseSchema,
  },
};
