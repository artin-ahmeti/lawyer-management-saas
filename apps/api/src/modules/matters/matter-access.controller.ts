import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
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
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { createZodDto, ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import {
  changeMatterAccessSchema,
  changeMatterAccessResultSchema,
  matterAccessListSchema,
  matterAccessCandidatesSchema,
  matterAccessHistorySchema,
  matterAccessHistoryQuerySchema,
  matterParamsSchema,
  matterListQuerySchema,
} from '@lawfirm/core';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { ApiErrorDto } from '../firms/firm.dto';
import { MatterAccessService } from './matter-access.service';
class ParamsDto extends createZodDto(matterParamsSchema) {}
class CursorDto extends createZodDto(matterListQuerySchema) {}
class HistoryCursorDto extends createZodDto(matterAccessHistoryQuerySchema) {}
class ChangeDto extends createZodDto(changeMatterAccessSchema) {}
class ResultDto extends createZodDto(changeMatterAccessResultSchema) {}
class ListDto extends createZodDto(matterAccessListSchema) {}
class CandidatesDto extends createZodDto(matterAccessCandidatesSchema) {}
class HistoryDto extends createZodDto(matterAccessHistorySchema) {}
@Controller('matters/:matterId')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiParam({ name: 'matterId', schema: { type: 'string', format: 'uuid' } })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class MatterAccessController {
  constructor(@Inject(MatterAccessService) private readonly access: MatterAccessService) {}
  @Get('access')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: 200, type: ListDto })
  list(
    @Req() req: ApiRequest,
    @Param(new ZodValidationPipe(ParamsDto)) params: ParamsDto,
    @Query(new ZodValidationPipe(CursorDto)) cursor: CursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.access.list(req.user, params.matterId, cursor.afterId);
  }
  @Get('access-candidates')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: 200, type: CandidatesDto })
  candidates(
    @Req() req: ApiRequest,
    @Param(new ZodValidationPipe(ParamsDto)) params: ParamsDto,
    @Query(new ZodValidationPipe(CursorDto)) cursor: CursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.access.candidates(req.user, params.matterId, cursor.afterId);
  }
  @Get('access-history')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'beforeId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'beforeCreatedAt', required: false, type: String, format: 'date-time' })
  @ZodResponse({ status: 200, type: HistoryDto })
  history(
    @Req() req: ApiRequest,
    @Param(new ZodValidationPipe(ParamsDto)) params: ParamsDto,
    @Query(new ZodValidationPipe(HistoryCursorDto)) cursor: HistoryCursorDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.access.history(req.user, params.matterId, cursor);
  }
  @Post('access-changes')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: ChangeDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: ResultDto })
  change(
    @Req() req: ApiRequest,
    @Param(new ZodValidationPipe(ParamsDto)) params: ParamsDto,
    @Body(new ZodValidationPipe(ChangeDto)) input: ChangeDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.access.change(req.user, params.matterId, input, actionKey(key), req.requestId);
  }
}
