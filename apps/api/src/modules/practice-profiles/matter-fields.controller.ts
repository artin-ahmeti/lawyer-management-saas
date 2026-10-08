import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Patch,
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
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { createZodDto, ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import {
  matterFieldsResultSchema,
  matterFieldsSchema,
  matterParamsSchema,
  updateMatterFieldsSchema,
} from '@lawfirm/core';
import { ApiErrorDto } from '../firms/firm.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { MatterFieldsService } from './matter-fields.service';

class MatterFieldsDto extends createZodDto(matterFieldsSchema) {}
class MatterFieldsResultDto extends createZodDto(matterFieldsResultSchema) {}
class UpdateMatterFieldsDto extends createZodDto(updateMatterFieldsSchema) {}
class MatterFieldsParamsDto extends createZodDto(matterParamsSchema) {}

@Controller('matters/:matterId')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiParam({ name: 'matterId', schema: { type: 'string', format: 'uuid' } })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class MatterFieldsController {
  constructor(@Inject(MatterFieldsService) private readonly fields: MatterFieldsService) {}
  @Get('fields')
  @Header('Cache-Control', 'no-store')
  @ZodResponse({ status: 200, type: MatterFieldsDto })
  read(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterFieldsParamsDto)) params: MatterFieldsParamsDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.fields.read(request.user, params.matterId);
  }
  @Patch('fields')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: UpdateMatterFieldsDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: MatterFieldsResultDto })
  update(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterFieldsParamsDto)) params: MatterFieldsParamsDto,
    @Body(new ZodValidationPipe(UpdateMatterFieldsDto)) input: UpdateMatterFieldsDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.fields.update(
      request.user,
      params.matterId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
}
