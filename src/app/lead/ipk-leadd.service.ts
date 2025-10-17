// src/app/lead/app/ipk-leadd.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { DbSeqService } from '../../common/db-seq.service';
import { makeMonthlyLeadKey, pad4 } from '../../common/leadcode.util';
import { normalizePhone, parseApproachAt } from '../common/phone.util';
import { ChangeStageInput } from './dto/change-stage.input';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateIpkLeaddInput } from './dto/create-lead.input';
import { LeadListArgs } from './dto/lead-list.args';
import { LeadPhoneInput } from './dto/lead-phone.input';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { DormantReason, InteractionChannel, InteractionOutcome } from './enums/ipk-leadd.enum';
import { LeadEventService } from '../lead_event/lead-event.service';

// function pad2(n: number) {
//   return String(n).padStart(2, '0');
// }

  @Injectable()
  export class IpkLeaddService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbseq: DbSeqService,
    private readonly leadEvents: LeadEventService,
  ) { }

    private buildName(f?: string | null, l?: string | null, fb?: string | null) {
      const s = [f, l].filter(Boolean).join(' ');
      return s || fb || undefined;
    }

    // Mongo ObjectId strings are 24 hex characters
    private isValidObjectId(id: string | null | undefined): boolean {
      if (!id || typeof id !== 'string') return false;
      return /^[a-fA-F0-9]{24}$/.test(id);
    }

  async createLead(input: CreateLeadDto) {
    const approachAt = parseApproachAt(input.approachAt);
    const payload: CreateIpkLeaddInput = {
      ...input,
      approachAt: approachAt ?? undefined,
    } as unknown as CreateIpkLeaddInput;

    return this.createPendingLead(payload);
  }

  async findAllLeads(includeArchived = false) {
    return this.prisma.ipkLeadd.findMany({
      where: includeArchived ? undefined : { archived: false },
      orderBy: { createdAt: 'desc' },
      include: { assignedRm: true },
    });
  }

  async findLeadById(id: string) {
    // Avoid Prisma P2023 by validating Mongo ObjectId
    if (!this.isValidObjectId(id)) return null;
    return this.prisma.ipkLeadd.findUnique({
      where: { id },
      include: { assignedRm: true, phones: true, events: true },
    });
  }

  async updateLead(id: string, input: UpdateLeadDto) {
    const data = this.buildLeadUpdateData(input);
    if (Object.keys(data).length === 0) {
      return this.findLeadById(id);
    }

    return this.prisma.ipkLeadd.update({
      where: { id },
      data,
      include: { assignedRm: true },
    });
  }

  async removeLead(id: string) {
    return this.prisma.ipkLeadd.update({
      where: { id },
      data: { archived: true, status: $Enums.LeadStatus.CLOSED },
      include: { assignedRm: true },
    });
  }

  private buildLeadUpdateData(input: UpdateLeadDto): Prisma.IpkLeaddUpdateInput {
    const data: Prisma.IpkLeaddUpdateInput = {};

    if (input.firstName !== undefined) data.firstName = input.firstName ?? null;
    if (input.lastName !== undefined) data.lastName = input.lastName ?? null;
    if (input.name !== undefined) data.name = input.name ?? null;
    if (input.email !== undefined) data.email = input.email ?? null;
    if (input.leadSource !== undefined) data.leadSource = input.leadSource;
    if (input.referralCode !== undefined) data.referralCode = input.referralCode ?? null;
    if ((input as any).referralName !== undefined)
      (data as any).referralName = (input as any).referralName ?? null;
    if (input.gender !== undefined) data.gender = (input.gender as $Enums.Gender | null) ?? null;
    if (input.age !== undefined) data.age = input.age ?? null;
    if (input.location !== undefined) data.location = input.location ?? null;
    if (input.profession !== undefined)
      data.profession = (input.profession as $Enums.Profession | null) ?? null;
    if (input.companyName !== undefined) data.companyName = input.companyName ?? null;
    if (input.designation !== undefined) data.designation = input.designation ?? null;
    if (input.product !== undefined)
      data.product = (input.product as $Enums.Product | null) ?? null;
    if (input.investmentRange !== undefined) data.investmentRange = input.investmentRange ?? null;
    if (input.sipAmount !== undefined) data.sipAmount = input.sipAmount ?? null;
    if (input.clientTypes !== undefined) data.clientTypes = input.clientTypes ?? null;
    if (input.remark !== undefined) data.remark = input.remark ?? null;
    if (input.bioText !== undefined) data.bioText = input.bioText ?? null;

    if (input.phone !== undefined) {
      data.phone = input.phone ?? null;
      data.phoneNormalized = normalizePhone(input.phone) ?? null;
    }

    if (input.approachAt !== undefined) {
      data.approachAt = parseApproachAt(input.approachAt) ?? null;
    }

    if (input.clientQa !== undefined) {
      data.clientQa = input.clientQa ? (input.clientQa as any) : null;
    }

    if ((input as any).occupations !== undefined) {
      const occs = this.sanitizeOccupations((input as any).occupations);
      // For updates on Mongo composite lists, direct assignment replaces the array
      (data as any).occupations = occs ?? [];
    }

    return data;
  }

  private sanitizeOccupations(
    occs?:
      | Array<{
        profession?: string | null;
        companyName?: string | null;
        designation?: string | null;
        startedAt?: Date | string | null;
        endedAt?: Date | string | null;
      }>
      | null,
  ) {
    if (!occs || !Array.isArray(occs)) return null;
    const toDate = (v: any) => {
      if (!v) return undefined;
      if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    };
    return occs
      .map((o) => ({
        profession: (o.profession as $Enums.Profession | undefined) ?? undefined,
        companyName: o.companyName ?? undefined,
        designation: o.designation ?? undefined,
        startedAt: toDate(o.startedAt),
        endedAt: toDate(o.endedAt),
      }))
      .filter((o) => !!o.profession);
  }

  /** Create OPEN lead if new; if same phone exists, treat as RE-ENTRY */
  async createPendingLead(input: CreateIpkLeaddInput) {
    const pn = normalizePhone(input.phone);
    const approachAt = parseApproachAt(input.approachAt);
    const clientQa = input.clientQa ?? null;
    const occupations = this.sanitizeOccupations((input as any).occupations) ?? [];
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
          referralName: (input as any).referralName ?? (existing as any).referralName ?? null,
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
          bioText: input.bioText ?? existing.bioText,
          occupations: (input as any).occupations ? occupations : ((existing as any).occupations ?? []),

          phoneNormalized: pn ?? existing.phoneNormalized,
          archived: false,
          status:
            existing.status === $Enums.LeadStatus.CLOSED ? $Enums.LeadStatus.OPEN : existing.status,

          reenterCount: { increment: 1 },
          lastSeenAt: new Date(),
          approachAt: approachAt ?? existing.approachAt ?? null,
          clientQa: clientQa ?? (existing.clientQa as any) ?? null,
        } as any,
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
        referralName: (input as any).referralName ?? null,

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
        bioText: input.bioText ?? null,
        occupations,

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
      } as any,
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

    const updated = await this.prisma.ipkLeadd.update({
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

    // Update RM lastAssignedAt for diagnostics
    await this.prisma.user.update({ where: { id: rm.id }, data: { lastAssignedAt: now } });

    // Emit assignment event
    await this.leadEvents.assignment(id, rm.id, rm.name, null);

    return updated;
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

    // Avoid Mongo transactions for read-only ops; run in parallel instead
    const [items, total] = await Promise.all([
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
    return this.leadEvents.getEvents(leadId, limit);
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

    await this.leadEvents.phoneAdded(
      leadId,
      { id: created.id, number: created.number, normalized: created.normalized, label: created.label as any },
      authorId,
    );

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

    await this.leadEvents.phoneRemoved(
      phone.leadId,
      { id: phoneId, number: phone.number, label: phone.label as any },
      authorId,
    );

    return this.getPhones(phone.leadId);
  }

  async markPrimaryPhone(phoneId: string, authorId?: string | null) {
    const phone = await this.prisma.leadPhone.findUnique({ where: { id: phoneId } });
    if (!phone) throw new Error('Phone not found');

    // Perform sequential updates to avoid transactions on Mongo
    await this.prisma.leadPhone.updateMany({
      where: { leadId: phone.leadId, NOT: { id: phoneId } },
      data: { isPrimary: false },
    });
    await this.prisma.leadPhone.update({ where: { id: phoneId }, data: { isPrimary: true } });

    await this.leadEvents.phoneMarkedPrimary(
      phone.leadId,
      { id: phoneId, number: phone.number, label: phone.label as any },
      authorId,
    );

    return this.getPhones(phone.leadId);
  }

  async setWhatsapp(phoneId: string, isWhatsapp: boolean, authorId?: string | null) {
    const phone = await this.prisma.leadPhone.findUnique({ where: { id: phoneId } });
    if (!phone) throw new Error('Phone not found');
    const updated = await this.prisma.leadPhone.update({
      where: { id: phoneId },
      data: { isWhatsapp },
    });
    await this.leadEvents.whatsappToggled(
      phone.leadId,
      { id: phoneId, number: phone.number },
      isWhatsapp,
      authorId,
    );
    return updated;
  }

  // --------------------------- Events & Updates ------------------------
  async addNote(leadId: string, text: string, tags: string[] = [], authorId?: string | null) {
    return this.leadEvents.addNote(leadId, text, tags, authorId);
  }

  async addInteraction(
    params: {
      leadId: string;
      text: string;
      tags?: string[];
      channel?: InteractionChannel | null;
      outcome?: InteractionOutcome | null;
      nextFollowUpAt?: Date | null;
      dormantReason?: DormantReason | null;
    },
    authorId?: string | null,
  ) {
    const { leadId, text, tags = [], channel, outcome, nextFollowUpAt, dormantReason } = params;

    const now = new Date();
    const prev = await this.prisma.ipkLeadd.findUnique({ where: { id: leadId }, select: { status: true, clientStage: true, approachAt: true, lastSeenAt: true, revisitCount: true } });

    const leadUpdate: Prisma.IpkLeaddUpdateInput = { lastSeenAt: now };
    if (nextFollowUpAt) {
      leadUpdate.approachAt = nextFollowUpAt;
    }

    // Outcome-based transitions
    if (outcome === InteractionOutcome.INTERESTED) {
      (leadUpdate as any).clientStage = $Enums.ClientStage.CLIENT_INTERESTED;
    } else if (outcome === InteractionOutcome.NOT_INTERESTED) {
      (leadUpdate as any).clientStage = $Enums.ClientStage.NOT_INTERESTED_DORMANT;
      (leadUpdate as any).status = $Enums.LeadStatus.ON_HOLD;
    } else if (outcome === InteractionOutcome.FOLLOW_UP_NEEDED) {
      (leadUpdate as any).clientStage = $Enums.ClientStage.FOLLOWING_UP;
    } else if (outcome === InteractionOutcome.NO_ANSWER || outcome === InteractionOutcome.WRONG_NUMBER) {
      (leadUpdate as any).revisitCount = { increment: 1 } as any;
    }

    const next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: leadUpdate });

    // Log interaction event first
    const interaction = await this.leadEvents.addInteraction(
      { leadId, text, tags, channel, outcome, nextFollowUpAt, dormantReason },
      authorId,
    );

    // If stage/status changed due to outcome, snapshot it
    if (prev && (prev.clientStage !== next.clientStage || prev.status !== next.status)) {
      await this.leadEvents.stageChangeSnapshot({
        leadId,
        summaryText: `Outcome transition: ${outcome ?? 'UNKNOWN'}`,
        tags: ['STAGE','OUTCOME', ...(channel ? [String(channel)] : [])],
        prev: { status: prev.status, clientStage: prev.clientStage, approachAt: prev.approachAt, lastSeenAt: prev.lastSeenAt },
        next: { status: next.status, clientStage: next.clientStage, approachAt: (next as any).approachAt, lastSeenAt: next.lastSeenAt },
        meta: { fromInteractionId: interaction.id, outcome: outcome ?? null, channel: channel ?? null },
        authorId,
      });
      // If status changed, also add a lightweight status-change event
      if (prev.status !== next.status) {
        await this.leadEvents.statusChanged(leadId, prev.status as any, next.status as any, authorId ?? null);
      }
    }

    return interaction;
  }

  async updateRemark(leadId: string, remark: string, authorId?: string | null) {
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { remark: true },
    });
    const next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: { remark } });
    await this.leadEvents.remarkUpdated(leadId, prev?.remark ?? null, next.remark ?? null, authorId);
    return next;
  }

  async updateBio(leadId: string, bioText: string, authorId?: string | null) {
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { bioText: true },
    });
    const next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: { bioText } });
    await this.leadEvents.bioUpdated(leadId, prev?.bioText ?? null, next.bioText ?? null, authorId);
    return next;
  }

  async updateStatus(leadId: string, status: $Enums.LeadStatus, authorId?: string | null) {
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { status: true },
    });
    const next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: { status } });
    await this.leadEvents.statusChanged(leadId, prev?.status ?? null, status, authorId);
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
    await this.leadEvents.assignment(leadId, user.id, user.name, authorId);
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
    await this.leadEvents.clientQaUpdated(leadId, prev?.clientQa ?? null, next.clientQa ?? null, authorId);
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
      `Stage: ${stage}`,
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
    await this.leadEvents.stageChangeSnapshot({
      leadId,
      summaryText,
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
      authorId,
    });

    // Optional: if you also want a lightweight interaction line
    if (note) {
      await this.leadEvents.addInteraction(
        { leadId, text: note, tags: channel ? [String(channel)] : [], channel },
        authorId,
      );
    }

    return next;
  }
  async listForRm(rmId: string, args: LeadListArgs) {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 10));

    const where: Prisma.IpkLeaddWhereInput = {
      archived: args.archived ?? false,
      status: args.status ?? undefined,
      assignedRmId: rmId, // ★ only the current RM’s leads
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

    // keep your existing dormant filter logic
    if (args.dormantOnly) {
      const dormantOr: Prisma.IpkLeaddWhereInput[] = [];
      const days = Number(args.dormantDays ?? 0);
      if (days > 0) {
        const cutoff = new Date(Date.now() - days * 86_400_000);
        dormantOr.push({
          OR: [
            { lastSeenAt: { lte: cutoff } },
            { AND: [{ lastSeenAt: null }, { updatedAt: { lte: cutoff } }] },
          ],
        });
      }
      dormantOr.push({ reenterCount: { gt: 0 } });
      where.AND = [{ OR: dormantOr }];
    }

    // Avoid Mongo transactions for read-only ops; run in parallel instead
    const [items, total] = await Promise.all([
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

  // --- Access helper: only Admin can see all; RM can see only their leads ---
  private ensureCanViewLead(
    user: { id: string; role: $Enums.UserRoles } | null | undefined,
    lead: { assignedRmId: string | null },
  ) {
    if (!user?.id) return; // let resolver's guard handle unauthenticated
    if (user.role === $Enums.UserRoles.ADMIN || user.role === $Enums.UserRoles.MARKETING) return;
    if (user.role === $Enums.UserRoles.RM && lead.assignedRmId === user.id) return;
    // STAFF or other RMs looking at someone else’s lead are blocked
    throw new Error('You do not have permission to view this lead');
  }

  // --- Read a single lead with nested detail for the profile page ---
  async getLeadDetailWithTimeline(params: { leadId: string; eventsLimit?: number }) {
    const { leadId, eventsLimit = 50 } = params;

    // Guard against invalid Mongo ObjectId to avoid Prisma P2023
    if (!this.isValidObjectId(leadId)) {
      throw new BadRequestException('Invalid leadId');
    }

    const lead = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      include: {
        assignedRm: { select: { id: true, name: true, email: true, phone: true } },
        phones: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        events: {
          orderBy: { occurredAt: 'desc' },
          take: Math.max(1, Math.min(200, eventsLimit)),
        },
      },
    });

    if (!lead) throw new Error('Lead not found');

    return lead;
  }
}
