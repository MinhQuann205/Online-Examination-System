import { Module } from '@nestjs/common';
import { GradingModule } from '../grading/grading.module';
import { PrismaService } from '../prisma/prisma.service';
import { ExamAttemptsController } from './exam-attempts.controller';
import { ExamAttemptsService } from './exam-attempts.service';

@Module({
  imports: [GradingModule],
  controllers: [ExamAttemptsController],
  providers: [ExamAttemptsService, PrismaService],
  exports: [ExamAttemptsService],
})
export class ExamAttemptsModule {}
