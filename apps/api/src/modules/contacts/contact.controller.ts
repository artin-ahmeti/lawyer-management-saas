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
  contactDetailSchema,
  contactListQuerySchema,
  contactListSchema,
  contactMatterListSchema,
  contactParamsSchema,
  contactResultSchema,
  createContactSchema,
  partyPageQuerySchema,
  updateContactSchema,
} from '@lawfirm/core';
import { ApiErrorDto } from '../firms/firm.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { ContactService } from './contact.service';

class CreateContactDto extends createZodDto(createContactSchema) {}
class UpdateContactDto extends createZodDto(updateContactSchema) {}
class ContactResultDto extends createZodDto(contactResultSchema) {}
class ContactDetailDto extends createZodDto(contactDetailSchema) {}
class ContactListDto extends createZodDto(contactListSchema) {}
class ContactListQueryDto extends createZodDto(contactListQuerySchema) {}
class ContactParamsDto extends createZodDto(contactParamsSchema) {}
class ContactMatterListDto extends createZodDto(contactMatterListSchema) {}
class PageQueryDto extends createZodDto(partyPageQuerySchema) {}
const keyHeader = {
  name: 'Idempotency-Key',
  required: true,
  schema: { type: 'string', format: 'uuid' },
} as const;

@Controller('contacts')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class ContactController {
  constructor(@Inject(ContactService) private readonly contacts: ContactService) {}
  @Get()
  @ApiQuery({ name: 'q', required: false, schema: { type: 'string', maxLength: 100 } })
  @ApiQuery({ name: 'afterName', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @Header('Cache-Control', 'no-store')
  @ZodResponse({ status: 200, type: ContactListDto })
  list(
    @Req() request: ApiRequest,
    @Query(new ZodValidationPipe(ContactListQueryDto)) query: ContactListQueryDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.contacts.list(request.user, query);
  }
  @Get(':contactId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'contactId', schema: { type: 'string', format: 'uuid' } })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: ContactDetailDto })
  read(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(ContactParamsDto)) params: ContactParamsDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.contacts.read(request.user, params.contactId);
  }
  @Get(':contactId/matters')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'contactId', schema: { type: 'string', format: 'uuid' } })
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: ContactMatterListDto })
  matters(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(ContactParamsDto)) params: ContactParamsDto,
    @Query(new ZodValidationPipe(PageQueryDto)) query: PageQueryDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.contacts.matters(request.user, params.contactId, query.afterId);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: CreateContactDto })
  @ApiHeader(keyHeader)
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 201, type: ContactResultDto })
  create(
    @Req() request: ApiRequest,
    @Body(new ZodValidationPipe(CreateContactDto)) input: CreateContactDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.contacts.create(request.user, input, actionKey(key), request.requestId);
  }
  @Patch(':contactId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'contactId', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: UpdateContactDto })
  @ApiHeader(keyHeader)
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: ContactResultDto })
  update(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(ContactParamsDto)) params: ContactParamsDto,
    @Body(new ZodValidationPipe(UpdateContactDto)) input: UpdateContactDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.contacts.update(
      request.user,
      params.contactId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
}
