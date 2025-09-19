import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { $Enums, Prisma } from '@prisma/client';
import { DbSeqService } from '../../common/db-seq.service';
import { makeMonthlyLeadKey, pad4 } from '../../common/leadcode.util';
import { CreateIpkLeaddInput } from './dto/create-lead.input';
import { LeadListArgs } from './dto/lead-list.args';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

@Injectable()
export class IpkLeaddService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbseq: DbSeqService,
  ) {}

  private buildName(f?: string | null, l?: string | null, fb?: string | null) {
    const s = [f, l].filter(Boolean).join(' ');
    return s || fb || undefined;
  }

  /** Create minimal OPEN (pending) lead. */
  async createPendingLead(input: CreateIpkLeaddInput) {
    return this.prisma.ipkLeadd.create({
      data: {
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        name:
          input.name ?? this.buildName(input.firstName, input.lastName, null),

        email: input.email ?? null,
        phone: input.phone, // required in schema
        leadSource: input.leadSource, // required in schema

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

        status: $Enums.LeadStatus.OPEN, // default is OPEN too
        archived: false,
      },
      include: { assignedRm: true },
    });
  }

  /** Pull active RMs and pick the next one using a global RR counter (no tx). */
  private async pickNextRm() {
    const rms = await this.prisma.user.findMany({
      where: {
        role: $Enums.UserRoles.RM,
        status: $Enums.Status.ACTIVE, // ✅ use Status enum, not active: true
        archived: false,
      },
      orderBy: { createdAt: 'asc' }, // stable list
      select: { id: true, name: true },
    });
    if (rms.length === 0)
      throw new Error('No active Relationship Managers found');

    // Global round-robin cursor (atomic increment handled by DbSeqService)
    const { start } = await this.dbseq.nextRange('RR_RM_ACTIVE', 1);
    const idx = (start - 1) % rms.length;
    return rms[idx];
  }

  /** Assign one lead (short path, no long transactions). */
  async assignLead(id: string) {
    // If already assigned, just return
    const existing = await this.prisma.ipkLeadd.findUnique({
      where: { id },
      include: { assignedRm: true },
    });
    if (!existing) throw new Error('Lead not found');

    if (existing.assignedRmId && existing.leadCode) {
      return existing;
    }

    const now = new Date();

    // 1) pick RM (outside tx)
    const rm = await this.pickNextRm();

    // 2) get code atomically (outside tx)
    const { key, prefix } = makeMonthlyLeadKey(now);
    const { start } = await this.dbseq.nextRange(key, 1);
    const leadCode = `${prefix}${pad4(start)}`; // e.g. IPK2509XXXX

    // 3) single write
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

  /**
   * Assign many by looping one-by-one with small concurrency.
   * Avoids a giant interactive transaction (source of P2028).
   */
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
        } catch (e) {
          // optionally log per-id failures
        }
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
      status: args.status ?? undefined,
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
  /** List: OPEN (pending) & not archived. Add paging if needed. */
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
}
