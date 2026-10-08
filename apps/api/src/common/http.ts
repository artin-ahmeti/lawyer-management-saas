import { randomUUID } from 'node:crypto';
import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
  type INestApplication,
} from '@nestjs/common';
import { uuidSchema } from '@lawfirm/core';
import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { Reflector } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationException } from 'nestjs-zod';
import type { AuthClaims } from './auth/auth-claims';

export type ApiRequest = Request & { user?: AuthClaims; requestId: string };

// Allowlisted metadata only: tokens, firm names, SQL and request bodies never enter this sink.
export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'clepso-api' },
});

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<ApiRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = request.requestId ?? randomUUID();
    const status =
      error instanceof ZodValidationException
        ? 422
        : error instanceof HttpException
          ? error.getStatus()
          : 500;
    const detail = error instanceof HttpException ? error.getResponse() : undefined;
    const payload =
      typeof detail === 'object' && detail !== null ? (detail as Record<string, unknown>) : {};
    const code =
      typeof payload.code === 'string'
        ? payload.code
        : status === 422
          ? 'INVALID_REQUEST'
          : `HTTP_${status}`;
    const message =
      status >= 500
        ? 'The request could not be completed. Retry with the same action key.'
        : typeof payload.message === 'string'
          ? payload.message
          : typeof detail === 'string'
            ? detail
            : 'The request could not be accepted.';
    if (status >= 500)
      log.error({
        event: 'request_failed',
        entryPoint: 'http',
        requestId,
        status,
        errorType: error instanceof Error ? error.name : 'Unknown',
      });
    response.status(status).json({ code, message, requestId });
  }
}

/** Also used by integration tests so the HTTP contract matches the running service. */
export function configureHttp(app: INestApplication) {
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'PATCH', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.use((request: ApiRequest, response: Response, next: NextFunction) => {
    const supplied = request.headers['x-request-id'];
    const parsed = uuidSchema.safeParse(supplied ?? randomUUID());
    request.requestId = parsed.success ? parsed.data : randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    const started = performance.now();
    response.on('finish', () =>
      log.info({
        event: 'http_completed',
        entryPoint: 'http',
        requestId: request.requestId,
        method: request.method,
        route: request.route?.path ?? 'unmatched',
        status: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    if (!parsed.success) {
      response.status(422).json({
        code: 'INVALID_REQUEST_ID',
        message: 'X-Request-Id must be a UUID.',
        requestId: request.requestId,
      });
      return;
    }
    next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
}
