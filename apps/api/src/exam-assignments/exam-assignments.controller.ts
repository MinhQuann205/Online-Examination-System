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
import { ExamAssignmentsService } from './exam-assignments.service';

@ApiTags('exam-assignments')
@ApiCookieAuth('access_token')
@Controller('exam-assignments')
@Roles('ADMIN', 'TEACHER', 'STUDENT')
export class ExamAssignmentsController {
  constructor(private readonly assignments: ExamAssignmentsService) {}

  @Get()
  list(@Req() request: AuthRequest, @Query() query: Record<string, string>) {
    return this.assignments.list(request.user, query);
  }

  @Post()
  @Roles('ADMIN', 'TEACHER')
  create(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.assignments.create(request.user, body);
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.assignments.get(id, request.user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TEACHER')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.assignments.update(id, request.user, body);
  }

  @Get(':id/students')
  @Roles('ADMIN', 'TEACHER')
  students(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.assignments.students(id, request.user);
  }
}
