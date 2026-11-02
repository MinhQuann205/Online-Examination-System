import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth.types';
import { Roles } from '../auth/decorators';
import { ExamsService } from './exams.service';

@ApiTags('exams')
@ApiCookieAuth('access_token')
@Controller('exams')
@Roles('ADMIN', 'TEACHER')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  list(@Req() request: AuthRequest, @Query() query: Record<string, string>) {
    return this.exams.list(request.user, query);
  }

  @Post()
  @Roles('TEACHER')
  create(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.exams.create(request.user, body);
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.exams.get(id, request.user);
  }

  @Patch(':id')
  @Roles('TEACHER')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.exams.update(id, request.user, body);
  }

  @Get(':id/preview')
  preview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.exams.preview(id, request.user);
  }

  @Get(':id/versions')
  versions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.exams.versions(id, request.user);
  }

  @Post(':id/publish')
  @Roles('TEACHER')
  publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.exams.publish(id, request.user);
  }

  @Post(':id/new-version')
  @Roles('TEACHER')
  newVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.exams.newVersion(id, request.user);
  }

  @Post(':id/archive')
  @Roles('TEACHER')
  archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.exams.archive(id, request.user);
  }
}
