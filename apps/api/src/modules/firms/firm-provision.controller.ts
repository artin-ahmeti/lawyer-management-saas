import {
  Body,
  Controller,
  Headers,
  Header,
  Inject,
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
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ZodResponse, ZodValidationPipe } from 'nestjs-zod';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { ApiErrorDto, ProvisionFirmDto, ProvisionFirmResultDto } from './firm.dto';
import { FirmProvisionService } from './firm-provision.service';
@Controller('firms')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class FirmProvisionController {
  constructor(@Inject(FirmProvisionService) private readonly firms: FirmProvisionService) {}
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Provision an initial staff firm for a confirmed account without existing firm membership',
  })
  @ApiBody({ type: ProvisionFirmDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiHeader({ name: 'X-Request-Id', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: ProvisionFirmResultDto })
  provision(
    @Req() request: ApiRequest,
    @Body(new ZodValidationPipe(ProvisionFirmDto)) input: ProvisionFirmDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.firms.provision(request.user, input, actionKey(key), request.requestId);
  }
}
