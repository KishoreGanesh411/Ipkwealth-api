import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { encryptField } from '../common/crypto.util';
import { ApplicationStatusEnum, KycStatusEnum } from './enums/application.enum';
import { LeadEventService } from '../lead_event/lead-event.service';

@Injectable()
export class AccountApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: LeadEventService,
  ) {}

  private parseJson<T = unknown>(s?: string | null): T | null {
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  }

  async create(input: {
    leadId: string;
    pan?: string | null;
    aadhaar?: string | null;
    documentsJson?: string | null;
    riskProfile?: string | null;
    investmentPreferencesJson?: string | null;
    consentAuditJson?: string | null;
    authorId?: string | null;
  }) {
    const now = new Date();
    const app = await this.prisma.accountApplication.create({
      data: {
        leadId: input.leadId,
        encryptedPan: encryptField(input.pan ?? null) ?? undefined,
        encryptedAadhaar: encryptField(input.aadhaar ?? null) ?? undefined,
        documents: this.parseJson(input.documentsJson) as Prisma.InputJsonValue,
        riskProfile: input.riskProfile ?? undefined,
        investmentPreferences: this.parseJson(
          input.investmentPreferencesJson,
        ) as Prisma.InputJsonValue,
        consentAudit: this.parseJson(input.consentAuditJson) as Prisma.InputJsonValue,
        applicationStatus: 'SUBMITTED' as $Enums.ApplicationStatus,
        kycStatus: 'PENDING' as $Enums.KycStatus,
        submittedAt: now,
      },
    });

    await this.events.createEvent({
      leadId: input.leadId,
      authorId: input.authorId,
      type: 'STATUS_CHANGE' as $Enums.LeadEventType,
      text: `Account application submitted`,
      tags: ['ACCOUNT_APP', 'SUBMITTED'],
      next: { applicationStatus: 'SUBMITTED', applicationId: app.id } as Prisma.InputJsonValue,
    });

    return app;
  }

  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatusEnum,
    remark?: string | null,
    authorId?: string | null,
  ) {
    const prev = await this.prisma.accountApplication.findUnique({ where: { id: applicationId } });
    if (!prev) throw new Error('Application not found');

    const now = new Date();
    const next = await this.prisma.accountApplication.update({
      where: { id: applicationId },
      data: {
        applicationStatus: status as unknown as $Enums.ApplicationStatus,
        reviewedAt: status === ApplicationStatusEnum.UNDER_REVIEW ? now : prev.reviewedAt,
        approvedAt: status === ApplicationStatusEnum.APPROVED ? now : prev.approvedAt,
        declinedAt: status === ApplicationStatusEnum.DECLINED ? now : prev.declinedAt,
      },
    });

    await this.events.createEvent({
      leadId: next.leadId,
      authorId,
      type: 'STATUS_CHANGE' as $Enums.LeadEventType,
      text: `Application status: ${prev.applicationStatus} -> ${status}${remark ? ` | ${remark}` : ''}`,
      tags: ['ACCOUNT_APP'],
      prev: { applicationStatus: prev.applicationStatus, applicationId } as Prisma.InputJsonValue,
      next: { applicationStatus: next.applicationStatus, applicationId } as Prisma.InputJsonValue,
    });

    // If approved, bump lead stage to ACCOUNT_OPENED
    if (status === ApplicationStatusEnum.APPROVED) {
      try {
        const lead = await this.prisma.ipkLeadd.update({
          where: { id: next.leadId },
          data: { clientStage: 'ACCOUNT_OPENED' as $Enums.ClientStage, lastSeenAt: now },
        });
        await this.events.stageChangeSnapshot({
          leadId: next.leadId,
          summaryText: 'Account opened',
          tags: ['STAGE', 'ACCOUNT_OPENED'],
          prev: { clientStage: lead.clientStage },
          next: { clientStage: 'ACCOUNT_OPENED' },
          meta: { ui: 'AUTO_FROM_APP_APPROVAL', applicationId },
          authorId,
        });
      } catch {}
    }

    return next;
  }

  async updateKycStatus(
    applicationId: string,
    kyc: KycStatusEnum,
    remark?: string | null,
    authorId?: string | null,
  ) {
    const prev = await this.prisma.accountApplication.findUnique({ where: { id: applicationId } });
    if (!prev) throw new Error('Application not found');
    const next = await this.prisma.accountApplication.update({
      where: { id: applicationId },
      data: { kycStatus: kyc as unknown as $Enums.KycStatus },
    });

    await this.events.createEvent({
      leadId: next.leadId,
      authorId,
      type: 'STATUS_CHANGE' as $Enums.LeadEventType,
      text: `KYC status: ${prev.kycStatus} -> ${kyc}${remark ? ` | ${remark}` : ''}`,
      tags: ['ACCOUNT_APP', 'KYC'],
      prev: { kycStatus: prev.kycStatus, applicationId } as Prisma.InputJsonValue,
      next: { kycStatus: next.kycStatus, applicationId } as Prisma.InputJsonValue,
    });

    return next;
  }

  async findByLead(leadId: string) {
    return this.prisma.accountApplication.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
