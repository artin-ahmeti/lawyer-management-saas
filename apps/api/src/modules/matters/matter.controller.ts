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
  createMatterSchema,
  createMatterResultSchema,
  matterListQuerySchema,
  matterListSchema,
  matterParamsSchema,
  matterSchema,
} from '@lawfirm/core';
import { ApiErrorDto } from '../firms/firm.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { MatterService } from './matter.service';

class CreateMatterDto extends createZodDto(createMatterSchema) {}
class CreateMatterResultDto extends createZodDto(createMatterResultSchema) {}
class MatterDto extends createZodDto(matterSchema) {}
class MatterListDto extends createZodDto(matterListSchema) {}
class MatterParamsDto extends createZodDto(matterParamsSchema) {}
class MatterQueryDto extends createZodDto(matterListQuerySchema) {}
@Controller('matters')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class MatterController {
  constructor(@Inject(MatterService) private readonly matters: MatterService) {}
  @Get()
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @Header('Cache-Control', 'no-store')
  @ZodResponse({ status: 200, type: MatterListDto })
  list(
    @Req() request: ApiRequest,
    @Query(new ZodValidationPipe(MatterQueryDto)) query: MatterQueryDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.matters.list(request.user, query.afterId);
  }
  @Get(':matterId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'matterId', schema: { type: 'string', format: 'uuid' } })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: MatterDto })
  read(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterParamsDto)) params: MatterParamsDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.matters.read(request.user, params.matterId);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: CreateMatterDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 201, type: CreateMatterResultDto })
  create(
    @Req() request: ApiRequest,
    @Body(new ZodValidationPipe(CreateMatterDto)) input: CreateMatterDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.matters.create(request.user, input, actionKey(key), request.requestId);
  }
}
