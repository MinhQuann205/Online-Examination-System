import { Module } from '@nestjs/common';
import { GradingModule } from '../grading/grading.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamAttemptsController } from './exam-attempts.controller';
import { ExamAttemptsService } from './exam-attempts.service';

@Module({
  imports: [PrismaModule, GradingModule],
  controllers: [ExamAttemptsController],
  providers: [ExamAttemptsService],
  exports: [ExamAttemptsService],
})
export class ExamAttemptsModule {}
