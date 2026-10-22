import { Controller, Get, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import type { AuthRequest } from '../auth/auth.types';

@ApiTags('dashboard')
@ApiCookieAuth('access_token')
@Controller('dashboard')
export class DashboardController {
  @Get('admin') @Roles('ADMIN') admin(@Req() request: AuthRequest) {
    return { user: request.user, section: 'admin' };
  }
  @Get('teacher') @Roles('TEACHER') teacher(@Req() request: AuthRequest) {
    return { user: request.user, section: 'teacher' };
  }
  @Get('student') @Roles('STUDENT') student(@Req() request: AuthRequest) {
    return { user: request.user, section: 'student' };
  }
}
