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
  addMatterPartySchema,
  endMatterPartySchema,
  matterParamsSchema,
  matterPartyListSchema,
  matterPartyResultSchema,
  partyPageQuerySchema,
} from '@lawfirm/core';
import { ApiErrorDto } from '../firms/firm.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { MatterPartyService } from './matter-party.service';

class AddMatterPartyDto extends createZodDto(addMatterPartySchema) {}
class EndMatterPartyDto extends createZodDto(endMatterPartySchema) {}
class MatterPartyListDto extends createZodDto(matterPartyListSchema) {}
class MatterPartyResultDto extends createZodDto(matterPartyResultSchema) {}
class MatterPartyParamsDto extends createZodDto(matterParamsSchema) {}
class PartyPageQueryDto extends createZodDto(partyPageQuerySchema) {}
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
export class MatterPartyController {
  constructor(@Inject(MatterPartyService) private readonly parties: MatterPartyService) {}
  @Get('parties')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: 200, type: MatterPartyListDto })
  list(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterPartyParamsDto)) params: MatterPartyParamsDto,
    @Query(new ZodValidationPipe(PartyPageQueryDto)) query: PartyPageQueryDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.parties.list(request.user, params.matterId, query.afterId);
  }
  @Post('parties')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: AddMatterPartyDto })
  @ApiHeader(keyHeader)
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 201, type: MatterPartyResultDto })
  add(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterPartyParamsDto)) params: MatterPartyParamsDto,
    @Body(new ZodValidationPipe(AddMatterPartyDto)) input: AddMatterPartyDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.parties.add(
      request.user,
      params.matterId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
  @Post('party-endings')
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: EndMatterPartyDto })
  @ApiHeader(keyHeader)
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: MatterPartyResultDto })
  end(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(MatterPartyParamsDto)) params: MatterPartyParamsDto,
    @Body(new ZodValidationPipe(EndMatterPartyDto)) input: EndMatterPartyDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.parties.end(
      request.user,
      params.matterId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
}
