import { Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma/prisma.module';
import { DbSeqService } from './db-seq.service';

@Module({
  imports: [PrismaAppModule],
  providers: [DbSeqService],
  exports: [DbSeqService], // other modules can import CommonModule
})
export class CommonModule {}
