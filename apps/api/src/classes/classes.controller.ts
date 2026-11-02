import {
  Body,
  Controller,
  Delete,
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
import { ClassesService } from './classes.service';
@ApiTags('classes')
@ApiCookieAuth('access_token')
@Controller('classes')
export class ClassesController {
  constructor(private service: ClassesService) {}
  @Get() list(
    @Req() r: AuthRequest,
    @Query() q: Record<string, string | undefined>,
  ) {
    return this.service.list(r.user, q);
  }
  @Post() @Roles('ADMIN') create(@Body() b: unknown) {
    return this.service.create(b);
  }
  @Get(':id') get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() r: AuthRequest,
  ) {
    return this.service.get(id, r.user);
  }
  @Patch(':id') @Roles('ADMIN', 'TEACHER') update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.update(id, r.user, b);
  }
  @Get(':id/students') students(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() r: AuthRequest,
  ) {
    return this.service.get(id, r.user).then((c) => c.members);
  }
  @Post(':id/students') @Roles('ADMIN', 'TEACHER') add(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() r: AuthRequest,
    @Body() b: { studentId: string },
  ) {
    return this.service.addStudent(id, b.studentId, r.user);
  }
  @Delete(':id/students/:studentId') @Roles('ADMIN', 'TEACHER') remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('studentId', new ParseUUIDPipe()) s: string,
    @Req() r: AuthRequest,
  ) {
    return this.service.removeStudent(id, s, r.user);
  }
}
