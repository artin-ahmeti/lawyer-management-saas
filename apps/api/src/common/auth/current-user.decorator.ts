import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthClaims } from './auth-claims';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthClaims => {
    const request = context.switchToHttp().getRequest<{ user: AuthClaims }>();
    return request.user;
  },
);
