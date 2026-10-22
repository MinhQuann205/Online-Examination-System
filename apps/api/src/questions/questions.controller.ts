import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import type { AuthRequest } from '../auth/auth.types';
import { QuestionsService } from './questions.service';
@ApiTags('questions')
@ApiCookieAuth('access_token')
@Controller('questions')
@Roles('ADMIN', 'TEACHER')
export class QuestionsController {
  constructor(private service: QuestionsService) {}
  @Get() list(
    @Req() r: AuthRequest,
    @Query() q: Record<string, string | undefined>,
  ) {
    return this.service.list(r.user, q);
  }
  @Post() @Roles('TEACHER') create(@Req() r: AuthRequest, @Body() b: unknown) {
    return this.service.create(r.user, b);
  }
  @Get('statistics') @Roles('TEACHER') stats(@Req() r: AuthRequest) {
    return this.service.statistics(r.user);
  }
  @Get(':id') get(@Param('id') id: string, @Req() r: AuthRequest) {
    return this.service.get(id, r.user);
  }
  @Patch(':id') @Roles('TEACHER') update(
    @Param('id') id: string,
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.update(id, r.user, b);
  }
  @Post(':id/duplicate') @Roles('TEACHER') duplicate(
    @Param('id') id: string,
    @Req() r: AuthRequest,
  ) {
    return this.service.duplicate(id, r.user);
  }
  @Delete(':id') @Roles('TEACHER') archive(
    @Param('id') id: string,
    @Req() r: AuthRequest,
  ) {
    return this.service.archive(id, r.user);
  }
}
