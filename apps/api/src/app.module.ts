import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard, RolesGuard } from './auth/guards';
import { DashboardController } from './dashboard/dashboard.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { ExamAssignmentsModule } from './exam-assignments/exam-assignments.module';
import { ExamAttemptsModule } from './exam-attempts/exam-attempts.module';
import { ResultsModule } from './results/results.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    UsersModule,
    ClassesModule,
    QuestionsModule,
    ExamsModule,
    ExamAssignmentsModule,
    ExamAttemptsModule,
    ResultsModule,
  ],
  controllers: [AuthController, DashboardController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
