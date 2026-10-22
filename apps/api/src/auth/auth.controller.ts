import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  type ChangePasswordInput,
  type LoginInput,
} from '@exam/shared';
import { AuthService } from './auth.service';
import { Public } from './decorators';
import { ZodPipe } from './zod.pipe';
import type { AuthRequest } from './auth.types';

const secure = process.env.NODE_ENV === 'production';
const cookieBase = {
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  path: '/',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private setCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    response.cookie('access_token', tokens.accessToken, {
      ...cookieBase,
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('refresh_token', tokens.refreshToken, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and set HttpOnly cookies' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: { email: { type: 'string' }, password: { type: 'string' } },
    },
  })
  async login(
    @Body(new ZodPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(input);
    this.setCookies(response, result);
    return result.user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('refresh_token')
  async refresh(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.refresh(
      request.cookies?.refresh_token as string | undefined,
    );
    this.setCookies(response, result);
    return result.user;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(
      request.cookies?.refresh_token as string | undefined,
    );
    response.clearCookie('access_token', cookieBase);
    response.clearCookie('refresh_token', cookieBase);
  }

  @Get('me')
  @ApiCookieAuth('access_token')
  me(@Req() request: AuthRequest) {
    return request.user;
  }

  @Post('change-password')
  @HttpCode(204)
  @ApiCookieAuth('access_token')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string', minLength: 12 },
      },
    },
  })
  async changePassword(
    @Req() request: AuthRequest,
    @Body(new ZodPipe(changePasswordSchema)) input: ChangePasswordInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.changePassword(request.user.id, input);
    response.clearCookie('access_token', cookieBase);
    response.clearCookie('refresh_token', cookieBase);
  }
}
