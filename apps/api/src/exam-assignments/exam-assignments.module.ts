import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamAssignmentsController } from './exam-assignments.controller';
import { ExamAssignmentsService } from './exam-assignments.service';

@Module({
  controllers: [ExamAssignmentsController],
  providers: [ExamAssignmentsService, PrismaService],
  exports: [ExamAssignmentsService],
})
export class ExamAssignmentsModule {}
