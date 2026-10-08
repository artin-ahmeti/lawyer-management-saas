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
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { createZodDto, ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import {
  removedStaffCursorSchema,
  removedStaffListSchema,
  removeStaffMembershipSchema,
  restoreStaffMembershipSchema,
  staffMembershipHistoryCursorSchema,
  staffMembershipHistorySchema,
  staffMembershipResultSchema,
} from '@lawfirm/core';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { ApiErrorDto } from './firm.dto';
import { StaffMembershipService } from './staff-membership.service';
class RemovedStaffCursorDto extends createZodDto(removedStaffCursorSchema) {}
class RemovedStaffListDto extends createZodDto(removedStaffListSchema) {}
class StaffMembershipHistoryCursorDto extends createZodDto(staffMembershipHistoryCursorSchema) {}
class StaffMembershipHistoryDto extends createZodDto(staffMembershipHistorySchema) {}
class StaffRemovalDto extends createZodDto(removeStaffMembershipSchema) {}
class StaffRestorationDto extends createZodDto(restoreStaffMembershipSchema) {}
class StaffMembershipResultDto extends createZodDto(staffMembershipResultSchema) {}
@Controller('firms/current/staff')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class StaffMembershipController {
  constructor(
    @Inject(StaffMembershipService) private readonly memberships: StaffMembershipService,
  ) {}
  @Get('removed')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: 200, type: RemovedStaffListDto })
  removed(
    @Req() req: ApiRequest,
    @Query(new ZodValidationPipe(RemovedStaffCursorDto)) cursor: RemovedStaffCursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.memberships.removed(req.user, cursor.afterId);
  }
  @Get('membership-history')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'beforeId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'beforeCreatedAt', required: false, type: String, format: 'date-time' })
  @ZodResponse({ status: 200, type: StaffMembershipHistoryDto })
  history(
    @Req() req: ApiRequest,
    @Query(new ZodValidationPipe(StaffMembershipHistoryCursorDto))
    cursor: StaffMembershipHistoryCursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.memberships.history(req.user, cursor);
  }
  @Post('removals')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: StaffRemovalDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: StaffMembershipResultDto })
  remove(
    @Req() req: ApiRequest,
    @Body(new ZodValidationPipe(StaffRemovalDto)) input: StaffRemovalDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.memberships.remove(req.user, input, actionKey(key), req.requestId);
  }
  @Post('restorations')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: StaffRestorationDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: StaffMembershipResultDto })
  restore(
    @Req() req: ApiRequest,
    @Body(new ZodValidationPipe(StaffRestorationDto)) input: StaffRestorationDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.memberships.restore(req.user, input, actionKey(key), req.requestId);
  }
}
