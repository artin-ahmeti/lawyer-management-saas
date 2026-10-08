import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Patch,
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
  createPracticeProfileSchema,
  practiceProfileDetailSchema,
  practiceProfileListQuerySchema,
  practiceProfileListSchema,
  practiceProfileParamsSchema,
  practiceProfileResultSchema,
  revisePracticeProfileSchema,
} from '@lawfirm/core';
import { ApiErrorDto } from '../firms/firm.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { PracticeProfileService } from './practice-profile.service';

class CreatePracticeProfileDto extends createZodDto(createPracticeProfileSchema) {}
class RevisePracticeProfileDto extends createZodDto(revisePracticeProfileSchema) {}
class PracticeProfileResultDto extends createZodDto(practiceProfileResultSchema) {}
class PracticeProfileDetailDto extends createZodDto(practiceProfileDetailSchema) {}
class PracticeProfileListDto extends createZodDto(practiceProfileListSchema) {}
class PracticeProfileListQueryDto extends createZodDto(practiceProfileListQuerySchema) {}
class PracticeProfileParamsDto extends createZodDto(practiceProfileParamsSchema) {}
const keyHeader = {
  name: 'Idempotency-Key',
  required: true,
  schema: { type: 'string', format: 'uuid' },
} as const;

@Controller('practice-profiles')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class PracticeProfileController {
  constructor(@Inject(PracticeProfileService) private readonly profiles: PracticeProfileService) {}
  @Get()
  @ApiQuery({
    name: 'status',
    required: false,
    schema: { type: 'string', enum: ['active', 'archived'] },
  })
  @ApiQuery({ name: 'afterName', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @Header('Cache-Control', 'no-store')
  @ZodResponse({ status: 200, type: PracticeProfileListDto })
  list(
    @Req() request: ApiRequest,
    @Query(new ZodValidationPipe(PracticeProfileListQueryDto)) query: PracticeProfileListQueryDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.profiles.list(request.user, query);
  }
  @Get(':profileId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'profileId', schema: { type: 'string', format: 'uuid' } })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: PracticeProfileDetailDto })
  read(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(PracticeProfileParamsDto)) params: PracticeProfileParamsDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.profiles.read(request.user, params.profileId);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: CreatePracticeProfileDto })
  @ApiHeader(keyHeader)
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 201, type: PracticeProfileResultDto })
  create(
    @Req() request: ApiRequest,
    @Body(new ZodValidationPipe(CreatePracticeProfileDto)) input: CreatePracticeProfileDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.profiles.create(request.user, input, actionKey(key), request.requestId);
  }
  @Patch(':profileId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'profileId', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: RevisePracticeProfileDto })
  @ApiHeader(keyHeader)
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: PracticeProfileResultDto })
  revise(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(PracticeProfileParamsDto)) params: PracticeProfileParamsDto,
    @Body(new ZodValidationPipe(RevisePracticeProfileDto)) input: RevisePracticeProfileDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.profiles.revise(
      request.user,
      params.profileId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
}
