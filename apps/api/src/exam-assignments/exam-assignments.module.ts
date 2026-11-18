import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamAssignmentsController } from './exam-assignments.controller';
import { ExamAssignmentsService } from './exam-assignments.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamAssignmentsController],
  providers: [ExamAssignmentsService],
  exports: [ExamAssignmentsService],
})
export class ExamAssignmentsModule {}
