// src/ipk-leadd/ipk-leadd.module.ts
import { Module } from '@nestjs/common';
import { IpkLeaddResolver } from './lead.resolver';
import { IpkLeaddService } from './ipk-leadd.service';
// import { LeadController } from './lead.controller';
import { PrismaService } from 'prisma/prisma.service';
import { DbSeqService } from 'src/common/db-seq.service';
// import { RmAssignService } from './rm-assign.service';
import { AssignmentService } from './assignment.service';
import { PrismaAppModule } from 'prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaAppModule, CommonModule],
  providers: [
    IpkLeaddResolver,
    IpkLeaddService,
    PrismaService,
    DbSeqService,
    AssignmentService,
    // RmAssignService,
  ],
  // controllers: [LeadController],
  exports: [IpkLeaddService],
})
export class IpkLeaddModule {}
