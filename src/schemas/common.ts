export const baseResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    code: { type: 'number' },
  },
  required: ['success', 'message', 'code'],
};

export const otherResponseSchema = {
  '4xx': { ...baseResponseSchema }, // 匹配所有 4 开头的错误
  '5xx': { ...baseResponseSchema }, // 匹配所有 5 开头的错误
};
