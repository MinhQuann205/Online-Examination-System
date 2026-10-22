import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard, RolesGuard } from './auth/guards';
import { DashboardController } from './dashboard/dashboard.controller';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, DashboardController],
  providers: [
    PrismaService,
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
