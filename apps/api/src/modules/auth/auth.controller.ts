import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import {
  StaffContextDto,
  StaffMembershipCursorDto,
  StaffMembershipListDto,
  StaffAuthErrorDto,
  ActiveFirmSelectionDto,
  SelectStaffFirmDto,
  SelectStaffFirmResultDto,
} from './staff-context.dto';
import { StaffMembershipService } from './staff-membership.service';
import { StaffFirmSelectionService } from './staff-firm-selection.service';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
  constructor(
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
    @Inject(StaffMembershipService) private readonly memberships: StaffMembershipService,
    @Inject(StaffFirmSelectionService) private readonly selection: StaffFirmSelectionService,
  ) {}
  @Get('active-firm')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Authoritative workspace selection for this login session' })
  @ApiForbiddenResponse({ type: StaffAuthErrorDto })
  @ApiUnauthorizedResponse({ type: StaffAuthErrorDto })
  @ZodResponse({ status: 200, type: ActiveFirmSelectionDto })
  activeFirm(@CurrentUser() user: AuthClaims) {
    return this.selection.current(user);
  }

  @Post('active-firm')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Select a currently granted staff workspace for this login session; refresh through Auth afterward',
  })
  @ApiBody({ type: SelectStaffFirmDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: StaffAuthErrorDto })
  @ApiForbiddenResponse({ type: StaffAuthErrorDto })
  @ApiUnauthorizedResponse({ type: StaffAuthErrorDto })
  @ApiUnprocessableEntityResponse({ type: StaffAuthErrorDto })
  @ZodResponse({ status: 200, type: SelectStaffFirmResultDto })
  selectFirm(
    @Req() request: ApiRequest,
    @Body(new ZodValidationPipe(SelectStaffFirmDto)) input: SelectStaffFirmDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.selection.select(request.user, input, actionKey(key), request.requestId);
  }
  @Get('memberships')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Confirmed account’s live staff memberships; does not select a workspace',
  })
  @ApiQuery({ name: 'afterId', required: false, type: String, format: 'uuid' })
  @ApiForbiddenResponse({ type: StaffAuthErrorDto })
  @ApiUnauthorizedResponse({ type: StaffAuthErrorDto })
  @ApiUnprocessableEntityResponse({ type: StaffAuthErrorDto })
  @ZodResponse({ status: 200, type: StaffMembershipListDto })
  membershipsForAccount(
    @CurrentUser() user: AuthClaims,
    @Query(new ZodValidationPipe(StaffMembershipCursorDto)) cursor: StaffMembershipCursorDto,
  ) {
    return this.memberships.list(user, cursor);
  }
  @Get('me')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Current verified identity and live staff membership capabilities' })
  @ZodResponse({ status: 200, type: StaffContextDto })
  me(@CurrentUser() user: AuthClaims) {
    return this.access.context(user);
  }
}
