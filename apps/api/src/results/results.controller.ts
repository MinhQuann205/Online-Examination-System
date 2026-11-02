import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth.types';
import { Roles } from '../auth/decorators';
import { ResultsService } from './results.service';

@ApiTags('results')
@ApiCookieAuth('access_token')
@Controller('results')
@Roles('ADMIN', 'TEACHER', 'STUDENT')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get()
  @Roles('STUDENT')
  list(@Req() request: AuthRequest, @Query() query: Record<string, string>) {
    return this.results.listStudentPage(request.user, query);
  }

  @Get('exams/:examId')
  @Roles('ADMIN', 'TEACHER')
  exam(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Req() request: AuthRequest,
  ) {
    return this.results.exam(examId, request.user);
  }

  @Get(':id')
  attempt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.results.attempt(id, request.user);
  }
}
