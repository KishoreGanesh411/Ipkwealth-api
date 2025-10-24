import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../core/firebase/firebase.module';
import { LeadEventService } from '../lead_event/lead-event.service';
import { UserModule } from '../user/user-api.module';
import { AccountApplicationResolver } from './account-application.resolver';
import { AccountApplicationService } from './account-application.service';

@Module({
  imports: [AuthModule, UserModule, FirebaseModule],
  providers: [
    PrismaService,
    LeadEventService,
    AccountApplicationService,
    AccountApplicationResolver,
    FirebaseModule,
  ],
})
export class AccountApplicationModule {}
