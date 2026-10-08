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
  changeStaffRoleSchema,
  changeStaffRoleResultSchema,
  firmStaffListSchema,
  staffRoleHistorySchema,
  staffRoleHistoryCursorSchema,
  firmStaffCursorSchema,
} from '@lawfirm/core';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { ApiErrorDto } from '../firms/firm.dto';
import { StaffRoleService } from './staff-role.service';
class FirmStaffCursorDto extends createZodDto(firmStaffCursorSchema) {}
class StaffRoleHistoryCursorDto extends createZodDto(staffRoleHistoryCursorSchema) {}
class StaffRoleChangeDto extends createZodDto(changeStaffRoleSchema) {}
class StaffRoleResultDto extends createZodDto(changeStaffRoleResultSchema) {}
class FirmStaffListDto extends createZodDto(firmStaffListSchema) {}
class StaffRoleHistoryDto extends createZodDto(staffRoleHistorySchema) {}
@Controller('firms/current/staff')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class StaffRoleController {
  constructor(@Inject(StaffRoleService) private readonly access: StaffRoleService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: 200, type: FirmStaffListDto })
  list(
    @Req() req: ApiRequest,
    @Query(new ZodValidationPipe(FirmStaffCursorDto)) cursor: FirmStaffCursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.access.list(req.user, cursor.afterId);
  }
  @Get('history')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'beforeId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'beforeCreatedAt', required: false, type: String, format: 'date-time' })
  @ZodResponse({ status: 200, type: StaffRoleHistoryDto })
  history(
    @Req() req: ApiRequest,
    @Query(new ZodValidationPipe(StaffRoleHistoryCursorDto)) cursor: StaffRoleHistoryCursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.access.history(req.user, cursor);
  }
  @Post('role-changes')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: StaffRoleChangeDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: StaffRoleResultDto })
  change(
    @Req() req: ApiRequest,
    @Body(new ZodValidationPipe(StaffRoleChangeDto)) input: StaffRoleChangeDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.access.change(req.user, input, actionKey(key), req.requestId);
  }
}
