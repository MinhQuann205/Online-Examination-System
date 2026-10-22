import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard, RolesGuard } from './auth/guards';
import { DashboardController } from './dashboard/dashboard.controller';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [
    JwtModule.register({}),
    UsersModule,
    ClassesModule,
    QuestionsModule,
  ],
  controllers: [AuthController, DashboardController],
  providers: [
    PrismaService,
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
