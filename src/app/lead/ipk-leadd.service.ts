// src/app/lead/app/ipk-leadd.service.ts
import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { DbSeqService } from '../../common/db-seq.service';
import { makeMonthlyLeadKey, pad4 } from '../../common/leadcode.util';
import { normalizePhone, parseApproachAt } from '../common/phone.util';
import { ChangeStageInput } from './dto/change-stage.input';
import { CreateIpkLeaddInput } from './dto/create-lead.input';
import { LeadListArgs } from './dto/lead-list.args';
import { LeadPhoneInput } from './dto/lead-phone.input';
import { LeadEventType } from './enums/ipk-leadd.enum';

// function pad2(n: number) {
//   return String(n).padStart(2, '0');
// }

@Injectable()
export class IpkLeaddService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbseq: DbSeqService,
  ) { }

  private buildName(f?: string | null, l?: string | null, fb?: string | null) {
    const s = [f, l].filter(Boolean).join(' ');
    return s || fb || undefined;
  }

  /** Create OPEN lead if new; if same phone exists, treat as RE-ENTRY */
  async createPendingLead(input: CreateIpkLeaddInput) {
    const pn = normalizePhone(input.phone);
    const approachAt = parseApproachAt(input.approachAt);
    const clientQa = input.clientQa ?? null;
    const existing = await this.prisma.ipkLeadd.findFirst({
      where: {
        OR: [pn ? { phoneNormalized: pn } : undefined, { phone: input.phone }].filter(
          Boolean,
        ) as Prisma.IpkLeaddWhereInput[],
      },
      orderBy: { createdAt: 'desc' },
      include: { assignedRm: true },
    });

    if (existing) {
      const mergedName =
        input.name ??
        this.buildName(input.firstName, input.lastName, existing.name) ??
        existing.name;

      return this.prisma.ipkLeadd.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName ?? existing.firstName,
          lastName: input.lastName ?? existing.lastName,
          name: mergedName,
          email: input.email ?? existing.email,
          location: input.location ?? existing.location,
          referralCode: input.referralCode ?? existing.referralCode ?? null,
          gender: (input.gender as $Enums.Gender) ?? existing.gender ?? null,
          age: (input.age as number | null) ?? existing.age ?? null,
          profession: (input.profession as $Enums.Profession) ?? existing.profession ?? null,
          companyName: input.companyName ?? existing.companyName,
          designation: input.designation ?? existing.designation,
          product: (input.product as $Enums.Product) ?? existing.product ?? null,
          investmentRange: input.investmentRange ?? existing.investmentRange,
          sipAmount: (input.sipAmount as number | null) ?? existing.sipAmount ?? null,
          clientTypes: input.clientTypes ?? existing.clientTypes,
          remark: input.remark ?? existing.remark,

          phoneNormalized: pn ?? existing.phoneNormalized,
          archived: false,
          status:
            existing.status === $Enums.LeadStatus.CLOSED ? $Enums.LeadStatus.OPEN : existing.status,

          reenterCount: { increment: 1 },
          lastSeenAt: new Date(),
          approachAt: approachAt ?? existing.approachAt ?? null,
          clientQa: clientQa ?? (existing.clientQa as any) ?? null,
        },
        include: { assignedRm: true },
      });
    }

    return this.prisma.ipkLeadd.create({
      data: {
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        name: input.name ?? this.buildName(input.firstName, input.lastName, null),

        email: input.email ?? null,
        phone: input.phone,
        phoneNormalized: pn,
        leadSource: input.leadSource,

        referralCode: input.referralCode ?? null,

        gender: (input.gender as $Enums.Gender) ?? null,
        age: (input.age as number | null) ?? null,
        location: input.location ?? null,

        profession: (input.profession as $Enums.Profession) ?? null,
        companyName: input.companyName ?? null,
        designation: input.designation ?? null,
        product: (input.product as $Enums.Product) ?? null,
        investmentRange: input.investmentRange ?? null,
        sipAmount: (input.sipAmount as number | null) ?? null,

        clientTypes: input.clientTypes ?? null,
        remark: input.remark ?? null,

        leadCode: null,
        assignedRmId: null,
        assignedRM: null,

        status: $Enums.LeadStatus.OPEN,
        archived: false,

        reenterCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        approachAt: approachAt ?? null,
        clientQa: clientQa ? (clientQa as any) : null,
      },
      include: { assignedRm: true },
    });
  }

  private async pickNextRm() {
    const rms = await this.prisma.user.findMany({
      where: {
        role: $Enums.UserRoles.RM,
        status: $Enums.Status.ACTIVE,
        archived: false,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (rms.length === 0) throw new Error('No active Relationship Managers found');

    const { start } = await this.dbseq.nextRange('RR_RM_ACTIVE', 1);
    const idx = (start - 1) % rms.length;
    return rms[idx];
  }

  async assignLead(id: string) {
    const existing = await this.prisma.ipkLeadd.findUnique({
      where: { id },
      include: { assignedRm: true },
    });
    if (!existing) throw new Error('Lead not found');

    if (existing.assignedRmId && existing.leadCode) return existing;

    const now = new Date();
    const rm = await this.pickNextRm();

    let leadCode = existing.leadCode;
    if (!leadCode) {
      const { key, prefix } = makeMonthlyLeadKey(now);
      const { start } = await this.dbseq.nextRange(key, 1);
      leadCode = `${prefix}${pad4(start)}`;
    }

    return this.prisma.ipkLeadd.update({
      where: { id },
      data: {
        leadCode,
        assignedRmId: rm.id,
        assignedRM: rm.name,
        status: $Enums.LeadStatus.ASSIGNED,
        updatedAt: now,
      },
      include: { assignedRm: true },
    });
  }

  async assignLeads(ids: string[], concurrency = 10) {
    if (!ids?.length) return [];
    const results: any[] = [];
    let i = 0;
    const worker = async () => {
      while (true) {
        const myIndex = i++;
        if (myIndex >= ids.length) break;
        const id = ids[myIndex];
        try {
          const r = await this.assignLead(id);
          results.push(r);
        } catch { }
      }
    };
    const n = Math.min(concurrency, ids.length);
    await Promise.all(Array.from({ length: n }, () => worker()));
    return results;
  }

  async list(args: LeadListArgs) {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 10));

    const where: Prisma.IpkLeaddWhereInput = {
      archived: args.archived ?? false,
      status: args.status ?? undefined, // null => no status filter
      OR: args.search
        ? [
          { firstName: { contains: args.search, mode: 'insensitive' } },
          { lastName: { contains: args.search, mode: 'insensitive' } },
          { name: { contains: args.search, mode: 'insensitive' } },
          { phone: { contains: args.search } },
          { leadSource: { contains: args.search, mode: 'insensitive' } },
          { leadCode: { contains: args.search, mode: 'insensitive' } },
        ]
        : undefined,
    };

    // ---- Dormant filter -------------------------------------------------
    // Show leads that are EITHER:
    //   A) inactive for N+ days, OR
    //   B) have re-entered at least once.
    //
    // If dormantDays is 0/undefined, we skip A) (so “Any” shows re-entries regardless of age).
    if (args.dormantOnly) {
      const dormantOr: Prisma.IpkLeaddWhereInput[] = [];

      const days = Number(args.dormantDays ?? 0);
      if (days > 0) {
        const cutoff = new Date(Date.now() - days * 86_400_000);
        dormantOr.push({
          OR: [
            { lastSeenAt: { lte: cutoff } },
            // if never “seen”, fall back to updatedAt
            { AND: [{ lastSeenAt: null }, { updatedAt: { lte: cutoff } }] },
          ],
        });
      }

      // Always include “has re-entered”
      dormantOr.push({ reenterCount: { gt: 0 } });

      // Attach to where.AND
      const andParts: Prisma.IpkLeaddWhereInput[] = [];
      if (where.AND) andParts.push(...(Array.isArray(where.AND) ? where.AND : [where.AND]));
      andParts.push({ OR: dormantOr });

      where.AND = andParts;
    }
    // --------------------------------------------------------------------

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ipkLeadd.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { assignedRm: true },
      }),
      this.prisma.ipkLeadd.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async leadsOpen() {
    return this.prisma.ipkLeadd.findMany({
      where: { status: $Enums.LeadStatus.OPEN, archived: false },
      orderBy: { createdAt: 'desc' },
      include: { assignedRm: true },
      take: 200,
    });
  }

  async listAll() {
    return this.prisma.ipkLeadd.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
  async createLeadsBulk(rows: CreateIpkLeaddInput[]) {
    const errors: string[] = [];
    let created = 0,
      merged = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      try {
        // Minimal validation
        if (!r.phone) throw new Error('Phone missing');
        if (!r.leadSource) throw new Error('Lead Source missing');
        if (!r.name && !r.firstName && !r.lastName) throw new Error('Name missing');

        // normalize
        r.phone = normalizePhone(r.phone) ?? r.phone;
        const res = await this.createPendingLead(r);

        // crude dup check before create
        if (res.reenterCount && res.reenterCount > 0) merged++;
        else created++;
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e?.message ?? 'Unknown error'}`);
      }
    }

    return { created, merged, failed: errors.length, errors };
  }

  // --------------------------- Phones ---------------------------------
  async getPhones(leadId: string) {
    return this.prisma.leadPhone.findMany({
      where: { leadId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getEvents(leadId: string, limit = 100) {
    return this.prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  async addPhone(leadId: string, input: LeadPhoneInput, authorId?: string | null) {
    const normalized = normalizePhone(input.number);
    if (!normalized) throw new Error('Invalid phone number');

    const existingCount = await this.prisma.leadPhone.count({ where: { leadId } });
    if (existingCount >= 4) throw new Error('Maximum 4 phone numbers allowed per lead');

    // Create phone entry
    const created = await this.prisma.leadPhone.create({
      data: {
        leadId,
        label: input.label as $Enums.PhoneLabel,
        number: input.number,
        normalized,
        isPrimary: Boolean(input.isPrimary),
        isWhatsapp: Boolean(input.isWhatsapp),
      },
    });

    // Ensure single primary: if created isPrimary or there was none, normalize primaries
    if (created.isPrimary) {
      await this.prisma.leadPhone.updateMany({
        where: { leadId, NOT: { id: created.id } },
        data: { isPrimary: false },
      });
    } else {
      const hasPrimary = await this.prisma.leadPhone.findFirst({
        where: { leadId, isPrimary: true },
      });
      if (!hasPrimary) {
        await this.prisma.leadPhone.update({
          where: { id: created.id },
          data: { isPrimary: true },
        });
      }
    }

    await this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.PHONE_ADDED as $Enums.LeadEventType,
        text: `Added phone ${created.number}`,
        tags: [created.label],
        meta: { phoneId: created.id, normalized: created.normalized },
      },
    });

    return this.getPhones(leadId);
  }

  async removePhone(phoneId: string, authorId?: string | null) {
    const phone = await this.prisma.leadPhone.findUnique({ where: { id: phoneId } });
    if (!phone) throw new Error('Phone not found');

    await this.prisma.leadPhone.delete({ where: { id: phoneId } });

    // If primary removed, pick another as primary if exists
    if (phone.isPrimary) {
      const next = await this.prisma.leadPhone.findFirst({
        where: { leadId: phone.leadId },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await this.prisma.leadPhone.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    await this.prisma.leadEvent.create({
      data: {
        leadId: phone.leadId,
        authorId: authorId ?? null,
        type: LeadEventType.PHONE_REMOVED as $Enums.LeadEventType,
        text: `Removed phone ${phone.number}`,
        tags: [phone.label],
        meta: { phoneId },
      },
    });

    return this.getPhones(phone.leadId);
  }

  async markPrimaryPhone(phoneId: string, authorId?: string | null) {
    const phone = await this.prisma.leadPhone.findUnique({ where: { id: phoneId } });
    if (!phone) throw new Error('Phone not found');

    await this.prisma.$transaction([
      this.prisma.leadPhone.updateMany({
        where: { leadId: phone.leadId, NOT: { id: phoneId } },
        data: { isPrimary: false },
      }),
      this.prisma.leadPhone.update({ where: { id: phoneId }, data: { isPrimary: true } }),
    ]);

    await this.prisma.leadEvent.create({
      data: {
        leadId: phone.leadId,
        authorId: authorId ?? null,
        type: LeadEventType.PHONE_MARKED_PRIMARY as $Enums.LeadEventType,
        text: `Marked primary ${phone.number}`,
        tags: [phone.label],
        meta: { phoneId },
      },
    });

    return this.getPhones(phone.leadId);
  }

  async setWhatsapp(phoneId: string, isWhatsapp: boolean, authorId?: string | null) {
    const phone = await this.prisma.leadPhone.findUnique({ where: { id: phoneId } });
    if (!phone) throw new Error('Phone not found');
    const updated = await this.prisma.leadPhone.update({
      where: { id: phoneId },
      data: { isWhatsapp },
    });
    await this.prisma.leadEvent.create({
      data: {
        leadId: phone.leadId,
        authorId: authorId ?? null,
        type: LeadEventType.NOTE as $Enums.LeadEventType,
        text: `${isWhatsapp ? 'Enabled' : 'Disabled'} WhatsApp on ${phone.number}`,
        tags: ['WHATSAPP'],
        meta: { phoneId },
      },
    });
    return updated;
  }

  // --------------------------- Events & Updates ------------------------
  async addNote(leadId: string, text: string, tags: string[] = [], authorId?: string | null) {
    return this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.NOTE as $Enums.LeadEventType,
        text,
        tags,
      },
    });
  }

  async addInteraction(
    leadId: string,
    text: string,
    tags: string[] = [],
    authorId?: string | null,
  ) {
    return this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.INTERACTION as $Enums.LeadEventType,
        text,
        tags,
      },
    });
  }

  async updateRemark(leadId: string, remark: string, authorId?: string | null) {
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { remark: true },
    });
    const next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: { remark } });
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.REMARK_UPDATED as $Enums.LeadEventType,
        text: 'Remark updated',
        tags: [],
        prev: { remark: prev?.remark ?? null },
        next: { remark: next.remark ?? null },
      },
    });
    return next;
  }

  async updateBio(leadId: string, bioText: string, authorId?: string | null) {
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { bioText: true },
    });
    const next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: { bioText } });
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.BIO_UPDATED as $Enums.LeadEventType,
        text: 'Bio updated',
        tags: [],
        prev: { bioText: prev?.bioText ?? null },
        next: { bioText: next.bioText ?? null },
      },
    });
    return next;
  }

  async updateStatus(leadId: string, status: $Enums.LeadStatus, authorId?: string | null) {
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { status: true },
    });
    const next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: { status } });
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.STATUS_CHANGE as $Enums.LeadEventType,
        text: `Status: ${prev?.status ?? 'UNKNOWN'} -> ${status}`,
        tags: ['STATUS'],
        prev: { status: prev?.status ?? null },
        next: { status },
      },
    });
    return next;
  }

  async reassignLeadToUser(leadId: string, newRmId: string, authorId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: newRmId },
      select: { id: true, name: true },
    });
    if (!user) throw new Error('RM user not found');
    const next = await this.prisma.ipkLeadd.update({
      where: { id: leadId },
      data: {
        assignedRmId: user.id,
        assignedRM: user.name,
        status: $Enums.LeadStatus.ASSIGNED,
      },
    });
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.ASSIGNMENT as $Enums.LeadEventType,
        text: `Assigned to ${user.name}`,
        tags: ['ASSIGNMENT'],
        next: { assignedRmId: user.id, assignedRM: user.name },
      },
    });
    return next;
  }

  async updateClientQa(
    leadId: string,
    items: Array<{ question: string; answer: string }>,
    authorId?: string | null,
  ) {
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { clientQa: true },
    });
    const next = await this.prisma.ipkLeadd.update({
      where: { id: leadId },
      data: { clientQa: items as any },
    });
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: LeadEventType.HISTORY_SNAPSHOT as $Enums.LeadEventType,
        text: 'Client Q&A updated',
        tags: ['CLIENT_QA'],
        prev: { clientQa: prev?.clientQa ?? null },
        next: { clientQa: next.clientQa ?? null },
      },
    });
    return next;
  }
  async changeStage(input: ChangeStageInput, authorId?: string | null) {
    const { leadId, stage, productExplained, channel, nextFollowUpAt, note } = input;

    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: {
        status: true,
        clientStage: true,
        assignedRM: true,
        assignedRmId: true,
        remark: true,
        approachAt: true,
        lastSeenAt: true,
        leadCode: true,
        name: true,
        phone: true,
        leadSource: true,
        product: true,
        clientTypes: true,
      },
    });
    if (!prev) throw new Error('Lead not found');

    // Update minimal lead fields: clientStage + approachAt + lastSeenAt
    const next = await this.prisma.ipkLeadd.update({
      where: { id: leadId },
      data: {
        clientStage: stage as unknown as $Enums.ClientStage,
        approachAt: nextFollowUpAt ?? prev.approachAt ?? null,
        lastSeenAt: new Date(),
      },
    });

    // Build an informative text line for the timeline
    const summaryText = [
      `Stage → ${stage}`,
      typeof productExplained === 'boolean'
        ? `Product explained: ${productExplained ? 'Yes' : 'No'}`
        : null,
      channel ? `Channel: ${channel}` : null,
      nextFollowUpAt ? `Next follow-up: ${nextFollowUpAt.toISOString()}` : null,
      note ? `Note: ${note}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    // Single rich event with snapshot
    await this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId: authorId ?? null,
        type: $Enums.LeadEventType.HISTORY_SNAPSHOT,
        text: summaryText || 'Stage updated',
        tags: [
          'STAGE',
          ...(channel ? [String(channel)] : []),
          ...(productExplained === true ? ['PRODUCT_EXPLAINED'] : []),
          ...(productExplained === false ? ['PRODUCT_NOT_EXPLAINED'] : []),
        ],
        prev: {
          status: prev.status,
          clientStage: prev.clientStage,
          approachAt: prev.approachAt,
          lastSeenAt: prev.lastSeenAt,
          assignedRM: prev.assignedRM,
          leadCode: prev.leadCode,
          name: prev.name,
          phone: prev.phone,
          leadSource: prev.leadSource,
          product: prev.product,
          clientTypes: prev.clientTypes,
          remark: prev.remark,
        },
        next: {
          status: next.status,
          clientStage: next.clientStage,
          approachAt: next.approachAt,
          lastSeenAt: next.lastSeenAt,
          assignedRM: next.assignedRM,
          leadCode: next.leadCode,
          name: prev.name,
          phone: prev.phone,
          leadSource: prev.leadSource,
          product: prev.product,
          clientTypes: prev.clientTypes,
          remark: prev.remark,
        },
        meta: {
          productExplained: typeof productExplained === 'boolean' ? productExplained : null,
          channel: channel ?? null,
          ui: 'RM_CHANGE_STAGE_FORM',
        },
      },
    });

    // Optional: if you also want a lightweight interaction line
    if (note) {
      await this.prisma.leadEvent.create({
        data: {
          leadId,
          authorId: authorId ?? null,
          type: $Enums.LeadEventType.INTERACTION,
          text: note,
          tags: channel ? [String(channel)] : [],
        },
      });
    }

    return next;
  }
}
