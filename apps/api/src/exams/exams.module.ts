import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  controllers: [ExamsController],
  providers: [ExamsService, PrismaService],
  exports: [ExamsService],
})
export class ExamsModule {}
