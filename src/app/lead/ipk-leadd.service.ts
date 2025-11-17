// src/app/lead/app/ipk-leadd.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { DbSeqService } from '../../common/db-seq.service';
import { makeMonthlyLeadKey, pad4 } from '../../common/leadcode.util';
import { normalizePhone, parseApproachAt } from '../common/phone.util';
import { AssignMode } from '../lead/enums/ipk-leadd.enum';
import { LeadEventService } from '../lead_event/lead-event.service';
import { ChangeStageInput } from './dto/change-stage.input';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateIpkLeaddInput } from './dto/create-lead.input';
import { LeadListArgs } from './dto/lead-list.args';
import { LeadPhoneInput } from './dto/lead-phone.input';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { appendRemarkHistory, buildRemarkHistoryEntry, RemarkHistoryEntry } from './remark.util';
import {
  DormantReason,
  InteractionChannel,
  InteractionOutcome,
  ClientStage as GqlClientStage,
} from './enums/ipk-leadd.enum';

@Injectable()
export class IpkLeaddService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbseq: DbSeqService,
    private readonly leadEvents: LeadEventService,
  ) {}

  private buildName(f?: string | null, l?: string | null, fb?: string | null) {
    const s = [f, l].filter(Boolean).join(' ');
    return s || fb || undefined;
  }

  // Mongo ObjectId strings are 24 hex characters
  private isValidObjectId(id: string | null | undefined): boolean {
    if (!id || typeof id !== 'string') return false;
    return /^[a-fA-F0-9]{24}$/.test(id);
  }

  /** Convert lead code prefix from IPK… to IDEL… (idempotent). */
  private toIdelLeadCode(code?: string | null): string | null {
    if (!code) return null;
    if (code.startsWith('IDEL')) return code;
    if (code.startsWith('IPK')) return `IDEL${code.slice(3)}`;
    return code;
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
    const { remark, ...rest } = input as UpdateLeadDto & { remark?: string | null };
    const data = this.buildLeadUpdateData(rest as UpdateLeadDto);

    // If no fields to update and no remark provided, just return current
    if (Object.keys(data).length === 0 && remark === undefined) {
      return this.findLeadById(id);
    }

    let next =
      Object.keys(data).length > 0
        ? await this.prisma.ipkLeadd.update({
            where: { id },
            data,
            include: { assignedRm: true },
          })
        : await this.findLeadById(id);

    if (remark !== undefined) {
      next = await this.updateRemark(id, remark, null, null);
    }

    return next;
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
    if (input.referralName !== undefined) data.referralName = input.referralName ?? null;
    if (input.gender !== undefined) data.gender = (input.gender as $Enums.Gender | null) ?? null;
    if (input.age !== undefined) data.age = input.age ?? null;
    if (input.location !== undefined) data.location = input.location ?? null;
    // Single profession/companyName/designation removed; use occupations[]
    if (input.product !== undefined)
      data.product = (input.product as $Enums.Product | null) ?? null;
    if (input.investmentRange !== undefined) data.investmentRange = input.investmentRange ?? null;
    if (input.sipAmount !== undefined) data.sipAmount = input.sipAmount ?? null;
    if (input.clientTypes !== undefined) data.clientTypes = input.clientTypes ?? null;
    if (input.remark !== undefined) {
      const text = String(input.remark ?? '').trim();
      const entry = buildRemarkHistoryEntry(text);
      data.remark = appendRemarkHistory(null, entry) as unknown as Prisma.InputJsonValue;
    }
    if (input.bioText !== undefined) data.bioText = input.bioText ?? null;

    if (input.phone !== undefined) {
      data.phone = input.phone ?? null;
      data.phoneNormalized = normalizePhone(input.phone) ?? null;
    }

    if (input.approachAt !== undefined) {
      data.approachAt = parseApproachAt(input.approachAt) ?? null;
    }

    if (input.clientQa !== undefined) {
      data.clientQa = (input.clientQa ?? null) as unknown as Prisma.InputJsonValue;
    }

    if (input.occupations !== undefined) {
      const occs = this.sanitizeOccupations(input.occupations);
      data.occupations = occs ?? [];
    }

    // New: RM intent/priority filter
    if ((input as unknown as { stageFilter?: unknown }).stageFilter !== undefined) {
      const sf = (input as unknown as { stageFilter?: string | null }).stageFilter;
      data.stageFilter = (sf as unknown as $Enums.LeadStageFilter | null) ?? null;
    }

    return data;
  }

  /** Update lead basic details (excluding leadCode and leadSource) */
  async updateLeadDetails(
    input: {
      leadId: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
      gender?: string;
      age?: number;
      occupations?: Array<{
        profession?: string | null;
        companyName?: string | null;
        designation?: string | null;
        startedAt?: Date | string | null;
        endedAt?: Date | string | null;
      }>;
      product?: string;
      investmentRange?: string;
      sipAmount?: number;
      referralCode?: string;
      referralName?: string;
      bioText?: string;
      remark?: string | null;
      approachAt?: Date | string | null;
    },
    authorId?: string | null,
    authorName?: string | null,
  ) {
    const leadId = input.leadId;
    const prev = await this.prisma.ipkLeadd.findUnique({ where: { id: leadId } });
    if (!prev) throw new BadRequestException('Lead not found');

    // Build patch via existing helper by casting into UpdateLeadDto-compatible shape
    const patchLike = {
      firstName: input.firstName,
      lastName: input.lastName,
      name: input.name,
      email: input.email,
      phone: input.phone,
      location: input.location,
      gender: input.gender,
      age: input.age,
      product: input.product,
      investmentRange: input.investmentRange,
      sipAmount: input.sipAmount,
      referralCode: input.referralCode,
      referralName: input.referralName,
      bioText: input.bioText,
      approachAt: input.approachAt as unknown as string,
      stageFilter: (input as unknown as { stageFilter?: string }).stageFilter,
      clientQa: undefined,
      clientTypes: undefined,
      remark: undefined,
      leadSource: undefined,
      occupations: input.occupations,
    };
    const patch = this.buildLeadUpdateData(patchLike as unknown as UpdateLeadDto);

    // If nothing to change, just return current
    if (Object.keys(patch).length === 0) return prev;

    let next = await this.prisma.ipkLeadd.update({ where: { id: leadId }, data: patch });

    // Emit a compact snapshot for audit trail
    try {
      const changed: Record<string, { from: unknown; to: unknown }> = {};
      const watchedKeys = [
        'firstName',
        'lastName',
        'name',
        'email',
        'phone',
        'phoneNormalized',
        'location',
        'gender',
        'age',
        'product',
        'investmentRange',
        'sipAmount',
        'referralCode',
        'referralName',
        'bioText',
        'approachAt',
        'occupations',
      ];
      const prevRec = prev as unknown as Record<string, unknown>;
      const nextRec = next as unknown as Record<string, unknown>;
      for (const k of watchedKeys) {
        if (JSON.stringify(prevRec[k]) !== JSON.stringify(nextRec[k])) {
          changed[k] = { from: prevRec[k] ?? null, to: nextRec[k] ?? null };
        }
      }
      if (Object.keys(changed).length > 0) {
        await this.leadEvents.stageChangeSnapshot({
          leadId,
          summaryText: 'Lead details updated',
          tags: ['DETAILS'],
          prev: {
            id: leadId,
            ...Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.from])),
          },
          next: {
            id: leadId,
            ...Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.to])),
          },
          meta: { keys: Object.keys(changed) },
          authorId: authorId ?? null,
        });
      }
    } catch {
      // non-blocking
    }

    if (input.remark !== undefined) {
      next = await this.updateRemark(leadId, input.remark, authorId ?? null, authorName ?? null);
    }

    return next;
  }

  private sanitizeOccupations(
    occs?: Array<{
      profession?: string | null;
      companyName?: string | null;
      designation?: string | null;
      startedAt?: Date | string | null;
      endedAt?: Date | string | null;
    }> | null,
  ): Prisma.OccupationCreateInput[] | null {
    if (!occs || !Array.isArray(occs)) return null;
    const toDate = (v: unknown) => {
      if (!v) return undefined;
      if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
      if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      }
      // unsupported type
      return undefined;
    };
    const mapped = occs
      .map((o) => ({
        profession: (o.profession as unknown as $Enums.Profession | undefined) ?? undefined,
        companyName: o.companyName ?? undefined,
        designation: o.designation ?? undefined,
        startedAt: toDate(o.startedAt),
        endedAt: toDate(o.endedAt),
      }))
      .filter((o) => !!o.profession) as Array<
      Required<Pick<Prisma.OccupationCreateInput, 'profession'>> &
        Omit<Prisma.OccupationCreateInput, 'profession'>
    >;
    return mapped as Prisma.OccupationCreateInput[];
  }

  /** Create OPEN lead if new; if same phone exists, treat as RE-ENTRY */
  async createPendingLead(input: CreateIpkLeaddInput) {
    const pn = normalizePhone(input.phone);
    const approachAt = parseApproachAt(input.approachAt);
    const clientQa = input.clientQa ?? null;
    const occupations = this.sanitizeOccupations(input.occupations) ?? [];
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

      // Normalize incoming remark, if any
      const hasRemark = input.remark !== undefined && input.remark !== null;
      const normalizedRemark = hasRemark ? String(input.remark ?? '').trim() : null;
      const remarkEntry = normalizedRemark ? buildRemarkHistoryEntry(normalizedRemark) : null;
      const nextRemarkJson = hasRemark
        ? (appendRemarkHistory(
            existing.remark ?? null,
            remarkEntry!,
          ) as unknown as Prisma.InputJsonValue)
        : (existing.remark as unknown as Prisma.InputJsonValue);

      const previousHistory = Array.isArray(existing.history)
        ? (existing.history as unknown[])
        : [];
      const historyEntry = normalizedRemark
        ? {
            id: `remark-${Date.now()}`,
            type: 'REMARK_UPDATED',
            text: normalizedRemark,
            at: remarkEntry!.at,
            authorId: null,
            authorName: null,
          }
        : null;
      const nextHistoryJson = historyEntry
        ? ([historyEntry, ...previousHistory] as unknown as Prisma.InputJsonValue)
        : (existing.history as unknown as Prisma.InputJsonValue);

      return this.prisma.ipkLeadd.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName ?? existing.firstName,
          lastName: input.lastName ?? existing.lastName,
          name: mergedName,
          email: input.email ?? existing.email,
          location: input.location ?? existing.location,
          referralCode: input.referralCode ?? existing.referralCode ?? null,
          referralName: input.referralName ?? existing.referralName ?? null,
          gender: (input.gender as $Enums.Gender) ?? existing.gender ?? null,
          age: (input.age as number | null) ?? existing.age ?? null,
          product: (input.product as $Enums.Product) ?? existing.product ?? null,
          investmentRange: input.investmentRange ?? existing.investmentRange,
          sipAmount: (input.sipAmount as number | null) ?? existing.sipAmount ?? null,
          clientTypes: input.clientTypes ?? existing.clientTypes,
          remark: nextRemarkJson,
          history: nextHistoryJson,
          bioText: input.bioText ?? existing.bioText,
          ...(input.occupations !== undefined ? { occupations } : {}),

          phoneNormalized: pn ?? existing.phoneNormalized,
          archived: false,
          status:
            existing.status === $Enums.LeadStatus.CLOSED ? $Enums.LeadStatus.OPEN : existing.status,

          reenterCount: { increment: 1 },
          lastSeenAt: new Date(),
          approachAt: approachAt ?? existing.approachAt ?? null,
          clientQa:
            input.clientQa !== undefined
              ? (input.clientQa as unknown as Prisma.InputJsonValue)
              : (existing.clientQa as unknown as Prisma.InputJsonValue | null),
          // update stageFilter if provided on re-entry
          ...(input.stageFilter !== undefined
            ? { stageFilter: (input.stageFilter as unknown as $Enums.LeadStageFilter) ?? null }
            : {}),
        },
        include: { assignedRm: true },
      });
    }

    // Normalize initial remark, if any
    const hasRemark = input.remark !== undefined && input.remark !== null;
    const normalizedRemark = hasRemark ? String(input.remark ?? '').trim() : null;
    const remarkEntry = normalizedRemark ? buildRemarkHistoryEntry(normalizedRemark) : null;
    const remarkJson = remarkEntry
      ? (appendRemarkHistory(null, remarkEntry) as unknown as Prisma.InputJsonValue)
      : null;
    const historyJson = remarkEntry
      ? ([
          {
            id: `remark-${Date.now()}`,
            type: 'REMARK_UPDATED',
            text: normalizedRemark,
            at: remarkEntry.at,
            authorId: null,
            authorName: null,
          },
        ] as unknown as Prisma.InputJsonValue)
      : null;

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
        referralName: input.referralName ?? null,

        gender: (input.gender as $Enums.Gender) ?? null,
        age: (input.age as number | null) ?? null,
        location: input.location ?? null,
        product: (input.product as $Enums.Product) ?? null,
        investmentRange: input.investmentRange ?? null,
        sipAmount: (input.sipAmount as number | null) ?? null,

        clientTypes: input.clientTypes ?? null,
        remark: remarkJson,
        history: historyJson,
        bioText: input.bioText ?? null,
        occupations,

        leadCode: null,
        assignedRmId: null,
        assignedRM: null,

        status: $Enums.LeadStatus.PENDING,
        clientStage: $Enums.ClientStage.NEW_LEAD,
        archived: false,

        reenterCount: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        approachAt: approachAt ?? null,
        clientQa: clientQa ? (clientQa as unknown as Prisma.InputJsonValue) : null,
        stageFilter: (input.stageFilter as unknown as $Enums.LeadStageFilter) ?? null,
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

  private async ensureLeadCode(existingCode?: string | null, at = new Date()): Promise<string> {
    if (existingCode) return existingCode;
    const { key, prefix } = makeMonthlyLeadKey(at);
    const { start } = await this.dbseq.nextRange(key, 1);
    return `${prefix}${pad4(start)}`;
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

    const leadCode = await this.ensureLeadCode(existing.leadCode, now);

    const updated = await this.prisma.ipkLeadd.update({
      where: { id },
      data: {
        leadCode,
        assignedRmId: rm.id,
        assignedRM: rm.name,
        // keep existing status (often PENDING) until first contact
        clientStage: existing.clientStage ?? $Enums.ClientStage.NEW_LEAD,
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
    const results: unknown[] = [];
    let i = 0;
    const worker = async () => {
      while (true) {
        const myIndex = i++;
        if (myIndex >= ids.length) break;
        const id = ids[myIndex];
        try {
          const r = await this.assignLead(id);
          results.push(r);
        } catch {
          // ignore individual failures; continue assigning others
        }
      }
    };
    const n = Math.min(concurrency, ids.length);
    await Promise.all(Array.from({ length: n }, () => worker()));
    return results;
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
      } catch (e: unknown) {
        const msg =
          typeof e === 'object' && e && 'message' in e
            ? String((e as { message?: unknown }).message)
            : 'Unknown error';
        errors.push(`Row ${i + 1}: ${msg}`);
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
      {
        id: created.id,
        number: created.number,
        normalized: created.normalized,
        label: String(created.label),
      },
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
      { id: phoneId, number: phone.number, label: String(phone.label) },
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
      { id: phoneId, number: phone.number, label: String(phone.label) },
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
    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: {
        status: true,
        clientStage: true,
        approachAt: true,
        lastSeenAt: true,
        revisitCount: true,
      },
    });

    const leadUpdate: Prisma.IpkLeaddUpdateInput = { lastSeenAt: now };
    if (nextFollowUpAt) {
      leadUpdate.approachAt = nextFollowUpAt;
    }

    // Outcome-based transitions
    if (outcome === InteractionOutcome.INTERESTED) {
      leadUpdate.clientStage = $Enums.ClientStage.CLIENT_INTERESTED;
    } else if (outcome === InteractionOutcome.NOT_INTERESTED) {
      leadUpdate.clientStage = $Enums.ClientStage.NOT_INTERESTED_DORMANT;
      leadUpdate.status = $Enums.LeadStatus.ON_HOLD;
    } else if (outcome === InteractionOutcome.FOLLOW_UP_NEEDED) {
      leadUpdate.clientStage = $Enums.ClientStage.FOLLOWING_UP;
    } else if (
      outcome === InteractionOutcome.NO_ANSWER ||
      outcome === InteractionOutcome.WRONG_NUMBER
    ) {
      const nextCount = (prev?.revisitCount ?? 0) + 1;
      leadUpdate.revisitCount = { increment: 1 } as Prisma.IntFieldUpdateOperationsInput;
      // Auto-dormant after 3 consecutive no-answers/invalid contact
      if (nextCount >= 3) {
        leadUpdate.clientStage = $Enums.ClientStage.NO_RESPONSE_DORMANT;
        leadUpdate.status = $Enums.LeadStatus.ON_HOLD;
      }
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
        tags: ['STAGE', 'OUTCOME', ...(channel ? [String(channel)] : [])],
        prev: {
          status: prev.status,
          clientStage: prev.clientStage,
          approachAt: prev.approachAt,
          lastSeenAt: prev.lastSeenAt,
        },
        next: {
          status: next.status,
          clientStage: next.clientStage,
          approachAt: next.approachAt,
          lastSeenAt: next.lastSeenAt,
        },
        meta: {
          fromInteractionId: interaction.id,
          outcome: outcome ?? null,
          channel: channel ?? null,
        },
        authorId,
      });
      // If status changed, also add a lightweight status-change event
      if (prev.status !== next.status) {
        await this.leadEvents.statusChanged(leadId, prev.status, next.status, authorId ?? null);
      }
    }

    return interaction;
  }

  async updateRemark(
    leadId: string,
    remarkText: string | null | undefined,
    authorId?: string | null,
    authorName?: string | null,
  ) {
    const normalized = remarkText ? remarkText.trim() : '';

    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { remark: true, history: true },
    });

    const entry = buildRemarkHistoryEntry(normalized, authorId, authorName);
    const nextRemark = appendRemarkHistory(prev?.remark ?? null, entry);

    const previousHistory = Array.isArray(prev?.history)
      ? (prev?.history as unknown[])
      : [];
    const historyEntry = {
      id: `remark-${Date.now()}`,
      type: 'REMARK_UPDATED',
      text: normalized,
      at: entry.at,
      authorId: authorId ?? null,
      authorName: authorName ?? null,
    };
    const nextHistory = [historyEntry, ...previousHistory];

    const next = await this.prisma.ipkLeadd.update({
      where: { id: leadId },
      data: {
        remark: nextRemark as unknown as Prisma.InputJsonValue,
        history: nextHistory as unknown as Prisma.InputJsonValue,
      },
      include: { assignedRm: true },
    });

    await this.leadEvents.remarkUpdated({
      leadId,
      prevRemark: prev?.remark ?? null,
      nextRemark,
      authorId,
      authorName,
    });

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
      select: { status: true, clientStage: true, leadCode: true },
    });
    const shouldFlip =
      status === $Enums.LeadStatus.CLOSED &&
      prev?.clientStage === $Enums.ClientStage.ACCOUNT_OPENED;
    const next = await this.prisma.ipkLeadd.update({
      where: { id: leadId },
      data: {
        status,
        ...(shouldFlip ? { leadCode: this.toIdelLeadCode(prev?.leadCode ?? null) } : {}),
      },
    });
    await this.leadEvents.statusChanged(leadId, prev?.status ?? null, status, authorId);
    return next;
  }

  async reassignLeadToUser(leadId: string, newRmId: string, authorId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: newRmId },
      select: { id: true, name: true, role: true, status: true, archived: true },
    });
    if (!user) throw new Error('RM user not found');
    if (user.role !== $Enums.UserRoles.RM) {
      throw new BadRequestException('Selected user is not an RM');
    }
    if (user.archived || user.status !== $Enums.Status.ACTIVE) {
      throw new BadRequestException('Selected RM is not active');
    }
    const lead = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: { leadCode: true, clientStage: true },
    });
    if (!lead) throw new Error('Lead not found');
    const leadCode = await this.ensureLeadCode(lead.leadCode);

    const next = await this.prisma.ipkLeadd.update({
      where: { id: leadId },
      data: {
        assignedRmId: user.id,
        assignedRM: user.name,
        status: $Enums.LeadStatus.ASSIGNED,
        leadCode,
        clientStage: lead.clientStage ?? $Enums.ClientStage.NEW_LEAD,
      },
      include: { assignedRm: true },
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
      data: { clientQa: items as unknown as Prisma.InputJsonValue },
    });
    await this.leadEvents.clientQaUpdated(
      leadId,
      prev?.clientQa ?? null,
      next.clientQa ?? null,
      authorId,
    );
    return next;
  }
  async changeStage(input: ChangeStageInput, authorId?: string | null) {
    const { leadId, stage, productExplained, channel, nextFollowUpAt, note, stageFilter } = input;

    const prev = await this.prisma.ipkLeadd.findUnique({
      where: { id: leadId },
      select: {
        status: true,
        clientStage: true,
        stageFilter: true,
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
        stageFilter:
          (stageFilter as unknown as $Enums.LeadStageFilter | null | undefined) === undefined
            ? undefined
            : ((stageFilter as unknown as $Enums.LeadStageFilter | null) ?? null),
        ...(stage === GqlClientStage.ACCOUNT_OPENED && prev.status === $Enums.LeadStatus.CLOSED
          ? { leadCode: this.toIdelLeadCode(prev.leadCode) }
          : {}),
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
        stageFilter: prev.stageFilter,
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
        stageFilter: (next as unknown as { stageFilter?: unknown }).stageFilter,
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

    // apply stageFilter if provided
    if (args.stageFilter) {
      (where as unknown as { stageFilter?: $Enums.LeadStageFilter }).stageFilter =
        (args.stageFilter as unknown as $Enums.LeadStageFilter) ?? undefined;
    }

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

  async listActiveRms() {
    return this.prisma.user.findMany({
      where: { role: $Enums.UserRoles.RM, status: $Enums.Status.ACTIVE, archived: false },
      select: { id: true, name: true, email: true, phone: true, lastAssignedAt: true },
      orderBy: [{ name: 'asc' }],
    });
  }
  async assignLeadWithMode(params: {
    leadId: string;
    mode: AssignMode;
    rmId?: string;
    authorId?: string | null;
  }) {
    const { leadId, mode, rmId, authorId } = params;

    if (mode === AssignMode.MANUAL) {
      if (!rmId) throw new Error('rmId required for MANUAL assignment');
      const next = await this.reassignLeadToUser(leadId, rmId, authorId);
      return { lead: next, message: `Lead reassigned to ${next.assignedRM}` };
    }

    // AUTO
    const next = await this.assignLead(leadId);
    return { lead: next, message: `Lead auto-assigned to ${next.assignedRM}` };
  }

  async assignLeadsWithMode(params: {
    leadIds: string[];
    mode: AssignMode;
    rmId?: string;
    authorId?: string | null;
  }) {
    const { leadIds, mode, rmId, authorId } = params;
    if (!leadIds?.length) return { items: [], assigned: 0, failed: 0, errors: [] as string[] };

    const results: { id: string; ok: boolean; msg: string }[] = [];
    for (const leadId of leadIds) {
      try {
        let assignedTo = '';
        if (mode === AssignMode.MANUAL) {
          if (!rmId) throw new Error('rmId required for MANUAL assignment');
          const r = await this.reassignLeadToUser(leadId, rmId, authorId);
          assignedTo = r.assignedRM ?? '';
        } else {
          const r = await this.assignLead(leadId);
          assignedTo = r.assignedRM ?? '';
        }
        results.push({ id: leadId, ok: true, msg: `Assigned to ${assignedTo}` });
      } catch (e: unknown) {
        const msg =
          typeof e === 'object' && e && 'message' in e
            ? String((e as { message?: unknown }).message)
            : 'Unknown error';
        results.push({ id: leadId, ok: false, msg });
      }
    }

    const assigned = results.filter((r) => r.ok).length;
    const failed = results.length - assigned;
    return {
      items: results,
      assigned,
      failed,
      errors: results.filter((r) => !r.ok).map((r) => r.msg),
    };
  }
  async stageSummary() {
    const rows = await this.prisma.ipkLeadd.groupBy({
      by: ['clientStage'],
      where: { archived: false },
      _count: { _all: true },
    });
    const total = await this.prisma.ipkLeadd.count({ where: { archived: false } });
    const typedRows = rows as Array<{
      clientStage: $Enums.ClientStage | null;
      _count: { _all: number };
    }>;
    return {
      items: typedRows.map((r) => ({ stage: r.clientStage ?? null, count: r._count._all })),
      total,
    };
  }
  async list(args: LeadListArgs) {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 10));

    const andParts: Prisma.IpkLeaddWhereInput[] = [];

    const where: Prisma.IpkLeaddWhereInput = {
      archived: args.archived ?? false,

      // status
      ...(args.status ? { status: args.status as unknown as $Enums.LeadStatus } : {}),
      // no statusIn in LeadListArgs; keep single-status filter only

      // stage
      ...(args.clientStage
        ? { clientStage: args.clientStage as unknown as $Enums.ClientStage }
        : {}),
      ...(args.stageIn?.length
        ? { clientStage: { in: args.stageIn as unknown as $Enums.ClientStage[] } }
        : {}),

      // RM scope
      ...(args.assignedRmId ? { assignedRmId: args.assignedRmId } : {}),

      // lead stage filter (RM intent/priority)
      ...(args.stageFilter
        ? { stageFilter: args.stageFilter as unknown as $Enums.LeadStageFilter }
        : {}),

      // text search
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

    // createdAt range
    if (args.createdAfter || args.createdBefore) {
      andParts.push({
        createdAt: {
          ...(args.createdAfter ? { gte: args.createdAfter } : {}),
          ...(args.createdBefore ? { lte: args.createdBefore } : {}),
        },
      });
    }

    // follow-up due (approachAt <= now)
    if (args.followUpDueOnly) {
      andParts.push({ approachAt: { lte: new Date() } });
    }

    // no contact since N days
    if (args.lastSeenBeforeDays && args.lastSeenBeforeDays > 0) {
      const cutoff = new Date(Date.now() - args.lastSeenBeforeDays * 86_400_000);
      andParts.push({
        OR: [
          { lastSeenAt: { lte: cutoff } },
          { AND: [{ lastSeenAt: null }, { updatedAt: { lte: cutoff } }] },
        ],
      });
    }

    // your existing dormantOnly block (unchanged)
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
      andParts.push({ OR: dormantOr });
    }

    if (andParts.length) {
      where.AND = andParts;
    }

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

  // --- RM First Contact workflow ---
  async rmFirstContact(
    input: {
      leadId: string;
      productExplained: boolean;
      channel: $Enums.InteractionChannel;
      notExplainedReason?: string | null;
      note?: string | null;
      nextFollowUpAt?: Date | null;
    },
    user: { id: string; role: $Enums.UserRoles; name?: string | null },
  ) {
    // 1) Own-lead check
    const lead = await this.prisma.ipkLeadd.findUnique({
      where: { id: input.leadId },
      select: {
        id: true,
        assignedRmId: true,
        clientStage: true,
        status: true,
        approachAt: true,
        lastSeenAt: true,
        leadCode: true,
        name: true,
        phone: true,
        leadSource: true,
        product: true,
        clientTypes: true,
        remark: true,
        assignedRM: true,
      },
    });
    if (!lead) throw new BadRequestException('Lead not found');
    if (user.role !== $Enums.UserRoles.ADMIN && user.role !== $Enums.UserRoles.MARKETING) {
      if (!(user.role === $Enums.UserRoles.RM && lead.assignedRmId === user.id)) {
        throw new BadRequestException('You do not have permission to update this lead');
      }
    }

    // Enforce: First contact is only for NEW_LEAD stage
    if (lead.clientStage && lead.clientStage !== $Enums.ClientStage.NEW_LEAD) {
      throw new BadRequestException('First contact is allowed only for NEW_LEAD stage');
    }

    const now = new Date();
    const byName = user.name ?? null;

    // Require follow-up when product explained
    if (input.productExplained && !input.nextFollowUpAt) {
      throw new BadRequestException('Next follow-up date is required when product is explained');
    }

    // 2) Build update based on product explained flag
    const updateData: Prisma.IpkLeaddUpdateInput = {
      lastSeenAt: now,
      lastContactedAt: now,
      approachAt: input.nextFollowUpAt ?? lead.approachAt ?? null,
      nextActionDueAt: input.nextFollowUpAt ?? null,
    };

    if (input.productExplained) {
      // Product was explained: move to FIRST_TALK_DONE and mark as OPEN
      updateData.clientStage = $Enums.ClientStage.FIRST_TALK_DONE;
      updateData.status = $Enums.LeadStatus.OPEN;
    } else {
      // Not explained: keep stage NEW_LEAD, mark as PENDING, save follow-up
      updateData.clientStage = lead.clientStage ?? $Enums.ClientStage.NEW_LEAD;
      updateData.status = $Enums.LeadStatus.PENDING;
    }

    // Append structured remark entries
    const nowIso = now.toISOString();
    const prevRemarkArr: Array<RemarkHistoryEntry & Record<string, unknown>> = Array.isArray(
      lead.remark,
    )
      ? (lead.remark as Array<RemarkHistoryEntry & Record<string, unknown>>)
      : typeof lead.remark === 'string' && lead.remark.trim().length > 0
      ? [
          {
            ...buildRemarkHistoryEntry(String(lead.remark).trim()),
            at: nowIso,
          },
        ]
      : [];
    const remarkEntries: Array<RemarkHistoryEntry & Record<string, unknown>> = [
      ...prevRemarkArr,
    ];
    const note = (input.note || '').trim();
    if (input.productExplained) {
      const entry = buildRemarkHistoryEntry('First contact: product explained', user.id, byName);
      remarkEntries.push({
        ...entry,
        at: nowIso,
        kind: 'FIRST_CONTACT',
        productExplained: true,
        channel: input.channel,
        nextFollowUpAt: input.nextFollowUpAt ? input.nextFollowUpAt.toISOString() : null,
      });
    } else {
      const entry = buildRemarkHistoryEntry('First contact: product not explained', user.id, byName);
      remarkEntries.push({
        ...entry,
        at: nowIso,
        kind: 'FIRST_CONTACT',
        productExplained: false,
        reason: input.notExplainedReason || null,
        nextFollowUpAt: input.nextFollowUpAt ? input.nextFollowUpAt.toISOString() : null,
      });
    }
    if (note) {
      const entry = buildRemarkHistoryEntry(note, user.id, byName);
      remarkEntries.push({ ...entry, at: nowIso, kind: 'NOTE' });
    }
    updateData.remark = remarkEntries as unknown as Prisma.InputJsonValue;

    const next = await this.prisma.ipkLeadd.update({
      where: { id: input.leadId },
      data: updateData,
    });

    // 3) One rich event capturing the form submission
    const summaryText = [
      'First contact saved',
      `Product explained: ${input.productExplained ? 'Yes' : 'No'}`,
      `Channel: ${String(input.channel)}`,
      input.nextFollowUpAt ? `Next follow-up: ${input.nextFollowUpAt.toISOString()}` : null,
      !input.productExplained && input.notExplainedReason
        ? `Reason: ${input.notExplainedReason}`
        : null,
      input.note ? `Note: ${input.note}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const tags = [
      ...(input.productExplained ? ['STAGE'] : []),
      'FIRST_CONTACT',
      String(input.channel),
      input.productExplained ? 'PRODUCT_EXPLAINED' : 'PRODUCT_NOT_EXPLAINED',
    ];

    await this.leadEvents.stageChangeSnapshot({
      leadId: input.leadId,
      summaryText,
      tags,
      prev: {
        status: lead.status,
        clientStage: lead.clientStage,
        approachAt: lead.approachAt,
        lastSeenAt: lead.lastSeenAt,
        assignedRM: lead.assignedRM,
        leadCode: lead.leadCode,
        name: lead.name,
        phone: lead.phone,
        leadSource: lead.leadSource,
        product: lead.product,
        clientTypes: lead.clientTypes,
        remark: lead.remark,
      },
      next: {
        status: next.status,
        clientStage: next.clientStage,
        approachAt: next.approachAt,
        lastSeenAt: next.lastSeenAt,
        assignedRM: next.assignedRM,
        leadCode: next.leadCode,
        name: lead.name,
        phone: lead.phone,
        leadSource: lead.leadSource,
        product: lead.product,
        clientTypes: lead.clientTypes,
        remark: (updateData.remark as unknown) ?? lead.remark,
      },
      meta: input.productExplained
        ? ({ productExplained: true, channel: input.channel } as Record<string, unknown>)
        : ({ productExplained: false, reason: input.notExplainedReason ?? null } as Record<
            string,
            unknown
          >),
      authorId: user.id,
    });

    // Emit an additional note interaction if provided
    if (input.note) {
      await this.leadEvents.addInteraction(
        {
          leadId: input.leadId,
          text: input.note,
          tags: ['FIRST_CONTACT', String(input.channel)],
          channel: input.channel as InteractionChannel,
        },
        user.id,
      );
    }

    // If remark changed, emit remark-updated event
    if (JSON.stringify(lead.remark ?? null) !== JSON.stringify(updateData.remark ?? null)) {
      await this.leadEvents.remarkUpdated({
        leadId: input.leadId,
        prevRemark: lead.remark ?? null,
        nextRemark: remarkEntries,
        authorId: user.id,
        authorName: byName,
      });
    }

    return next;
  }
}
