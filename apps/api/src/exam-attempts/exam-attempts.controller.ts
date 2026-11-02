import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth.types';
import { Roles } from '../auth/decorators';
import { ExamAttemptsService } from './exam-attempts.service';

@ApiTags('exam-attempts')
@ApiCookieAuth('access_token')
@Roles('STUDENT')
@Controller()
export class ExamAttemptsController {
  constructor(private readonly attempts: ExamAttemptsService) {}

  @Post('exam-assignments/:assignmentId/start')
  start(
    @Param('assignmentId', new ParseUUIDPipe()) assignmentId: string,
    @Req() request: AuthRequest,
  ) {
    return this.attempts.start(assignmentId, request.user);
  }

  @Get('exam-attempts/:id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.attempts.get(id, request.user);
  }

  @Put('exam-attempts/:id/answers/:questionId')
  answer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Req() request: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.attempts.saveAnswer(id, questionId, request.user, body);
  }

  @Post('exam-attempts/:id/submit')
  submit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.attempts.submit(id, request.user);
  }

  @Put('exam-attempts/:id/review/:questionId')
  review(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Req() request: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.attempts.setReview(id, questionId, request.user, body);
  }
}
