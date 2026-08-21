import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
  @Get('me')
  @ApiOperation({ summary: 'Current user claims (verifies the write-path token end to end)' })
  me(@CurrentUser() user: AuthClaims): {
    userId: string;
    email?: string;
    firmId?: string;
    role?: string;
  } {
    return {
      userId: user.sub,
      email: user.email,
      firmId: user.firm_id,
      role: user.user_role,
    };
  }
}
