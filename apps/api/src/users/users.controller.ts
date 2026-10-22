import {
  Body,
  Controller,
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
import { UsersService } from './users.service';
@ApiTags('users')
@ApiCookieAuth('access_token')
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}
  @Get('me') me(@Req() req: AuthRequest) {
    return this.service.get(req.user.id, req.user);
  }
  @Patch('me') mePatch(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.service.update(req.user.id, req.user, body);
  }
  @Get() @Roles('ADMIN', 'TEACHER') list(
    @Query() q: unknown,
    @Req() req: AuthRequest,
  ) {
    return this.service.list(q, req.user);
  }
  @Post() @Roles('ADMIN') create(@Body() body: unknown) {
    return this.service.create(body);
  }
  @Get(':id') get(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.get(id, req.user);
  }
  @Patch(':id') @Roles('ADMIN') patch(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, req.user, body);
  }
  @Patch(':id/status') @Roles('ADMIN') status(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.service.status(id, body.isActive === true);
  }
  @Post(':id/reset-password') @Roles('ADMIN') reset(@Param('id') id: string) {
    return this.service.resetPassword(id);
  }
}
