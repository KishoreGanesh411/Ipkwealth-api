import { Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LeadEventService } from './lead-event.service';
import { LeadEventResolver } from './lead-event.resolver';

@Module({
  imports: [PrismaAppModule, AuthModule],
  providers: [LeadEventService, LeadEventResolver],
  exports: [LeadEventService],
})
export class LeadEventModule {}
