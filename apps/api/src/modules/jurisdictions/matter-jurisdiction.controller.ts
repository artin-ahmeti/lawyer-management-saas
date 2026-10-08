import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Post,
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
  addMatterJurisdictionSchema,
  endMatterJurisdictionSchema,
  matterJurisdictionListSchema,
  matterJurisdictionResultSchema,
  matterParamsSchema,
} from '@lawfirm/core';
import { ApiErrorDto } from '../firms/firm.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { MatterJurisdictionService } from './matter-jurisdiction.service';

class AddMatterJurisdictionDto extends createZodDto(addMatterJurisdictionSchema) {}
class EndMatterJurisdictionDto extends createZodDto(endMatterJurisdictionSchema) {}
class MatterJurisdictionListDto extends createZodDto(matterJurisdictionListSchema) {}
class MatterJurisdictionResultDto extends createZodDto(matterJurisdictionResultSchema) {}
class MatterJurisdictionParamsDto extends createZodDto(matterParamsSchema) {}
const keyHeader = {
  name: 'Idempotency-Key',
  required: true,
  schema: { type: 'string', format: 'uuid' },
} as const;

@Controller('matters/:matterId')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiParam({ name: 'matterId', schema: { type: 'string', format: 'uuid' } })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class MatterJurisdictionController {
  constructor(
    @Inject(MatterJurisdictionService) private readonly references: MatterJurisdictionService,
  ) {}
  @Get('jurisdictions')
  @Header('Cache-Control', 'no-store')
  @ZodResponse({ status: 200, type: MatterJurisdictionListDto })
  list(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterJurisdictionParamsDto)) params: MatterJurisdictionParamsDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.references.list(request.user, params.matterId);
  }
  @Post('jurisdictions')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: AddMatterJurisdictionDto })
  @ApiHeader(keyHeader)
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 201, type: MatterJurisdictionResultDto })
  add(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterJurisdictionParamsDto)) params: MatterJurisdictionParamsDto,
    @Body(new ZodValidationPipe(AddMatterJurisdictionDto)) input: AddMatterJurisdictionDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.references.add(
      request.user,
      params.matterId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
  @Post('jurisdiction-endings')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: EndMatterJurisdictionDto })
  @ApiHeader(keyHeader)
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: MatterJurisdictionResultDto })
  end(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterJurisdictionParamsDto)) params: MatterJurisdictionParamsDto,
    @Body(new ZodValidationPipe(EndMatterJurisdictionDto)) input: EndMatterJurisdictionDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.references.end(
      request.user,
      params.matterId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
}
