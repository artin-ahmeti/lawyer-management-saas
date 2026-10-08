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
  createForumSchema,
  forumListQuerySchema,
  forumListSchema,
  forumParamsSchema,
  forumResultSchema,
  updateForumSchema,
  usJurisdictions,
} from '@lawfirm/core';
import { ApiErrorDto } from '../firms/firm.dto';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { actionKey } from '../../common/action-key';
import type { ApiRequest } from '../../common/http';
import { ForumService } from './forum.service';

class CreateForumDto extends createZodDto(createForumSchema) {}
class UpdateForumDto extends createZodDto(updateForumSchema) {}
class ForumResultDto extends createZodDto(forumResultSchema) {}
class ForumListDto extends createZodDto(forumListSchema) {}
class ForumListQueryDto extends createZodDto(forumListQuerySchema) {}
class ForumParamsDto extends createZodDto(forumParamsSchema) {}
const keyHeader = {
  name: 'Idempotency-Key',
  required: true,
  schema: { type: 'string', format: 'uuid' },
} as const;

@Controller('forums')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiUnprocessableEntityResponse({ type: ApiErrorDto })
export class ForumController {
  constructor(@Inject(ForumService) private readonly forums: ForumService) {}
  @Get()
  @ApiQuery({
    name: 'status',
    required: false,
    schema: { type: 'string', enum: ['active', 'archived'] },
  })
  @ApiQuery({
    name: 'jurisdiction',
    required: false,
    schema: { type: 'string', enum: usJurisdictions.map((j) => j.code) },
  })
  @ApiQuery({ name: 'afterName', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'afterId', required: false, schema: { type: 'string', format: 'uuid' } })
  @Header('Cache-Control', 'no-store')
  @ZodResponse({ status: 200, type: ForumListDto })
  list(
    @Req() request: ApiRequest,
    @Query(new ZodValidationPipe(ForumListQueryDto)) query: ForumListQueryDto,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.forums.list(request.user, query);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiBody({ type: CreateForumDto })
  @ApiHeader(keyHeader)
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 201, type: ForumResultDto })
  create(
    @Req() request: ApiRequest,
    @Body(new ZodValidationPipe(CreateForumDto)) input: CreateForumDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.forums.create(request.user, input, actionKey(key), request.requestId);
  }
  @Patch(':forumId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'forumId', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: UpdateForumDto })
  @ApiHeader(keyHeader)
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodResponse({ status: 200, type: ForumResultDto })
  update(
    @Req() request: ApiRequest,
    @Param(new ZodValidationPipe(ForumParamsDto)) params: ForumParamsDto,
    @Body(new ZodValidationPipe(UpdateForumDto)) input: UpdateForumDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    if (!request.user) throw new UnauthorizedException();
    return this.forums.update(
      request.user,
      params.forumId,
      input,
      actionKey(key),
      request.requestId,
    );
  }
}
