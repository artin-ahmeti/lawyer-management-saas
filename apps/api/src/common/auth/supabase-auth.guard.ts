import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { staffClaimsSchema } from '@lawfirm/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { JWTPayload } from 'jose';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import type { AuthClaims } from './auth-claims';

/**
 * Verifies Supabase access tokens.
 * Modern projects sign ES256/RS256 — verified against the project's JWKS.
 * Legacy HS256 (shared JWT secret) is still accepted when the secret is set.
 * NOTE: ConfigService must stay a VALUE import (DI metadata).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly hsSecret?: Uint8Array;
  private readonly issuer: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not set');
    }
    this.issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));

    const secret = config.get<string>('SUPABASE_JWT_SECRET');
    this.hsSecret = secret ? new TextEncoder().encode(secret) : undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthClaims }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: JWTPayload;
    try {
      const { alg } = decodeProtectedHeader(token);
      const options = {
        audience: 'authenticated',
        issuer: this.issuer,
        requiredClaims: ['sub', 'exp'],
      };
      if (alg === 'HS256') {
        if (!this.hsSecret) {
          throw new Error('HS256 token but SUPABASE_JWT_SECRET not configured');
        }
        ({ payload } = await jwtVerify(token, this.hsSecret, {
          ...options,
          algorithms: ['HS256'],
        }));
      } else {
        ({ payload } = await jwtVerify(token, this.jwks, {
          ...options,
          algorithms: ['ES256', 'RS256'],
        }));
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const claims = staffClaimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new UnauthorizedException('Not an authenticated user token');
    }
    request.user = claims.data;
    return true;
  }
}
