import { Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma/prisma.module';
import { RmController } from './rm.controller';
import { RmService } from './rm.service';

@Module({
  imports: [PrismaAppModule],
  providers: [RmService],
  controllers: [RmController],
  exports: [RmService],
})
export class RmModule {}
