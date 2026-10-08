import {
  Body,
  Controller,
  Get,
  Headers,
  Header,
  Inject,
  Patch,
  Post,
  Param,
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
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiOperation,
  ApiParam,
  ApiNotFoundResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import type { ApiRequest } from '../../common/http';
import { actionKey } from '../../common/action-key';
import {
  ApiErrorDto,
  FirmExecutionListDto,
  FirmExecutionHistoryParamsDto,
  FirmExecutionHistoryDto,
  FirmProfileDto,
  RenameFirmDto,
  RenameFirmResultDto,
  ProcessingReadinessDto,
  RecoverExecutionDto,
  RecoverExecutionResultDto,
  RecoveryReviewDto,
} from './firm.dto';
import { FirmService } from './firm.service';
import { FirmRecoveryService } from './firm-recovery.service';

@Controller('firms/current')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
export class FirmController {
  constructor(
    @Inject(FirmService) private readonly firms: FirmService,
    @Inject(FirmRecoveryService) private readonly recovery: FirmRecoveryService,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: FirmProfileDto })
  read(@Req() request: ApiRequest) {
    if (!request.user) throw new UnauthorizedException();
    return this.firms.read(request.user);
  }

  @Get('executions')
  @ZodResponse({ status: 200, type: FirmExecutionListDto })
  executions(@Req() request: ApiRequest) {
    if (!request.user) throw new UnauthorizedException();
    return this.firms.executions(request.user);
  }

  @Get('processing-readiness')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Inspect current processing availability without retrying work' })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: ProcessingReadinessDto })
  processingReadiness(@Req() request: ApiRequest) {
    if (!request.user) throw new UnauthorizedException();
    return this.firms.processingReadiness(request.user, request.requestId);
  }

  @Get('executions/:jobId/attempts')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Inspect retained firm-profile processing attempts without executing work',
  })
  @ApiParam({ name: 'jobId', schema: { type: 'string', format: 'uuid' } })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: FirmExecutionHistoryDto })
  executionHistory(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(FirmExecutionHistoryParamsDto))
    params: FirmExecutionHistoryParamsDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.firms.executionHistory(request.user, params.jobId);
  }

  @Patch('name')
  @ApiBody({ type: RenameFirmDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: RenameFirmResultDto })
  rename(
    @Req() request: ApiRequest,
    @Body(new ZodValidationPipe(RenameFirmDto)) input: RenameFirmDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.firms.rename(request.user, input, actionKey(key), request.requestId);
  }

  @Get('executions/:jobId/recovery')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'jobId', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ summary: 'Review whether a failed firm check can have a new authorized request' })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: RecoveryReviewDto })
  recoveryReview(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(FirmExecutionHistoryParamsDto))
    params: FirmExecutionHistoryParamsDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.recovery.review(request.user, params.jobId);
  }

  @Post('executions/:jobId/recovery')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'jobId', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: RecoverExecutionDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorDto })
  @ApiOperation({
    summary: 'Request one new profile check after reviewing a retained failed check',
  })
  @ZodResponse({ status: 200, type: RecoverExecutionResultDto })
  recover(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(FirmExecutionHistoryParamsDto))
    params: FirmExecutionHistoryParamsDto,
    @Body(new ZodValidationPipe(RecoverExecutionDto)) input: RecoverExecutionDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.recovery.request(
      request.user,
      params.jobId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
}
