import { UnprocessableEntityException } from '@nestjs/common';
import { uuidSchema } from '@lawfirm/core';
export function actionKey(value: string | undefined) {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success)
    throw new UnprocessableEntityException({
      code: 'INVALID_ACTION_KEY',
      message: 'Idempotency-Key must be a UUID.',
    });
  return parsed.data;
}
