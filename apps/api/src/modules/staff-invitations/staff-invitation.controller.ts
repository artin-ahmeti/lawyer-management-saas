import {
  Body,
  Controller,
  Get,
  Post,
  Headers,
  Header,
  Inject,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { ApiErrorDto } from '../firms/firm.dto';
import {
  CreateStaffInvitationDto,
  InvitationRevisionDto,
  InvitationParamsDto,
  InvitationCursorDto,
  StaffInvitationListDto,
  ReceivedInvitationListDto,
  StaffInvitationCommandResultDto,
} from './staff-invitation.dto';
import { StaffInvitationService } from './staff-invitation.service';

@Controller()
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class StaffInvitationController {
  constructor(
    @Inject(StaffInvitationService) private readonly invitations: StaffInvitationService,
  ) {}
  @Get('firms/current/staff-invitations')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'beforeId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'beforeCreatedAt', required: false, type: String, format: 'date-time' })
  @ZodResponse({ status: 200, type: StaffInvitationListDto })
  list(
    @Req() req: ApiRequest,
    @Query(new ZodValidationPipe(InvitationCursorDto)) cursor: InvitationCursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.invitations.list(req.user, cursor);
  }
  @Post('firms/current/staff-invitations')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: CreateStaffInvitationDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: StaffInvitationCommandResultDto })
  create(
    @Req() req: ApiRequest,
    @Body(new ZodValidationPipe(CreateStaffInvitationDto)) body: CreateStaffInvitationDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.invitations.create(req.user, body, actionKey(key), req.requestId);
  }
  @Post('firms/current/staff-invitations/:invitationId/revocation')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'invitationId', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: InvitationRevisionDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: StaffInvitationCommandResultDto })
  revoke(
    @Req() req: ApiRequest,
    @Param(new ZodValidationPipe(InvitationParamsDto)) params: InvitationParamsDto,
    @Body(new ZodValidationPipe(InvitationRevisionDto)) body: InvitationRevisionDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.invitations.revoke(
      req.user,
      params.invitationId,
      body,
      actionKey(key),
      req.requestId,
    );
  }
  @Get('staff-invitations/received')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'beforeId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'beforeCreatedAt', required: false, type: String, format: 'date-time' })
  @ZodResponse({ status: 200, type: ReceivedInvitationListDto })
  received(
    @Req() req: ApiRequest,
    @Query(new ZodValidationPipe(InvitationCursorDto)) cursor: InvitationCursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.invitations.received(req.user, cursor);
  }
  @Post('staff-invitations/:invitationId/acceptance')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'invitationId', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: InvitationRevisionDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: StaffInvitationCommandResultDto })
  accept(
    @Req() req: ApiRequest,
    @Param(new ZodValidationPipe(InvitationParamsDto)) params: InvitationParamsDto,
    @Body(new ZodValidationPipe(InvitationRevisionDto)) body: InvitationRevisionDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.invitations.accept(
      req.user,
      params.invitationId,
      body,
      actionKey(key),
      req.requestId,
    );
  }
}
