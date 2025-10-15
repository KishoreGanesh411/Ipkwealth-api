import { Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma/prisma.module';
import { LeadEventService } from './lead-event.service';

@Module({
  imports: [PrismaAppModule],
  providers: [LeadEventService],
  exports: [LeadEventService],
})
export class LeadEventModule { }
