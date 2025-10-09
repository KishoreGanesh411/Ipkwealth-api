// src/ipk-leadd/ipk-leadd.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { DbSeqService } from 'src/common/db-seq.service';
import { AssignmentService } from './assignment.service';
import { PrismaAppModule } from 'prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user-api.module';
import { LeadController } from './lead.controller';
import { IpkLeaddResolver } from './lead.resolver';
import { IpkLeaddService } from './ipk-leadd.service';

@Module({
  imports: [
    PrismaAppModule,
    CommonModule,
    forwardRef(() => AuthModule),
    // Ensure FirebaseAuthGuard deps (UserApiService) are resolvable here
    forwardRef(() => UserModule),
  ],
  providers: [
    IpkLeaddResolver,
    IpkLeaddService,
    PrismaService,
    DbSeqService,
    AssignmentService,
  ],
  controllers: [LeadController],
  exports: [IpkLeaddService],
})
export class IpkLeaddModule {}
