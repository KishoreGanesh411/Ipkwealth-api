import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  DormantReason,
  InteractionChannel,
  InteractionOutcome,
  LeadEventType,
} from '../lead/enums/ipk-leadd.enum';
import { LogLeadCallInput } from './dto/lead-event.input';

@Injectable()
export class LeadEventService {
  constructor(private readonly prisma: PrismaService) {}

  // ----- Queries -----
  getEvents(leadId: string, limit = 100) {
    return this.prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  // ----- Generic factory -----
  createEvent(data: {
    leadId: string;
    authorId?: string | null;
    type: $Enums.LeadEventType;
    text?: string | null;
    tags?: string[];
    prev?: Prisma.InputJsonValue | null;
    next?: Prisma.InputJsonValue | null;
    meta?: Prisma.InputJsonValue | null;
  }) {
    const { leadId, authorId = null, type, text, tags, prev, next, meta } = data;
    return this.prisma.leadEvent.create({
      data: {
        leadId,
        authorId,
        type,
        text: text ?? null,
        tags: tags ?? [],
        prev: prev ?? undefined,
        next: next ?? undefined,
        meta: meta ?? undefined,
      },
    });
  }

  // ----- Convenience helpers for common events -----

  addNote(leadId: string, text: string, tags: string[] = [], authorId?: string | null) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.NOTE as unknown as $Enums.LeadEventType,
      text,
      tags,
    });
  }

  addInteraction(
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

    const autoTags = [
      ...(channel ? [String(channel)] : []),
      ...(outcome ? [`OUTCOME_${outcome}`] : []),
    ];
    const normalizedTags = Array.from(new Set([...tags, ...autoTags]));

    const meta: Record<string, unknown> = {};
    if (channel) meta.channel = channel;
    if (outcome) meta.outcome = outcome;
    if (nextFollowUpAt) meta.nextFollowUpAt = nextFollowUpAt.toISOString();
    if (dormantReason) meta.dormantReason = dormantReason;

    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.INTERACTION as unknown as $Enums.LeadEventType,
      text,
      tags: normalizedTags,
      meta:
        (Object.keys(meta).length > 0 ? (meta as Prisma.InputJsonValue) : undefined) ?? undefined,
    });
  }

  remarkUpdated(params: {
    leadId: string;
    prevRemark: unknown;
    nextRemark: unknown;
    authorId?: string | null;
    authorName?: string | null;
  }) {
    const { leadId, prevRemark, nextRemark, authorId, authorName } = params;

    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.REMARK_UPDATED as unknown as $Enums.LeadEventType,
      text: 'Remark updated',
      tags: ['REMARK'],
      prev: { remark: prevRemark ?? null } as Prisma.InputJsonValue,
      next: { remark: nextRemark ?? null } as Prisma.InputJsonValue,
      meta: {
        authorName: authorName ?? null,
        authorId: authorId ?? null,
      } as Prisma.InputJsonValue,
    });
  }

  bioUpdated(
    leadId: string,
    prevBio: string | null | undefined,
    nextBio: string | null | undefined,
    authorId?: string | null,
  ) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.BIO_UPDATED as unknown as $Enums.LeadEventType,
      text: 'Bio updated',
      prev: { bioText: prevBio ?? null } as Prisma.InputJsonValue,
      next: { bioText: nextBio ?? null } as Prisma.InputJsonValue,
    });
  }

  statusChanged(
    leadId: string,
    prevStatus: $Enums.LeadStatus | null | undefined,
    nextStatus: $Enums.LeadStatus,
    authorId?: string | null,
  ) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.STATUS_CHANGE as unknown as $Enums.LeadEventType,
      text: `Status: ${prevStatus ?? 'UNKNOWN'} -> ${nextStatus}`,
      tags: ['STATUS'],
      prev: { status: prevStatus ?? null } as Prisma.InputJsonValue,
      next: { status: nextStatus } as Prisma.InputJsonValue,
    });
  }

  assignment(leadId: string, assignedRmId: string, assignedRM: string, authorId?: string | null) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.ASSIGNMENT as unknown as $Enums.LeadEventType,
      text: `Assigned to ${assignedRM}`,
      tags: ['ASSIGNMENT'],
      next: { assignedRmId, assignedRM } as Prisma.InputJsonValue,
    });
  }

  clientQaUpdated(
    leadId: string,
    prevClientQa: unknown,
    nextClientQa: unknown,
    authorId?: string | null,
  ) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.HISTORY_SNAPSHOT as unknown as $Enums.LeadEventType,
      text: 'Client Q&A updated',
      tags: ['CLIENT_QA'],
      prev: { clientQa: prevClientQa ?? null } as Prisma.InputJsonValue,
      next: { clientQa: nextClientQa ?? null } as Prisma.InputJsonValue,
    });
  }

  stageChangeSnapshot(params: {
    leadId: string;
    summaryText: string;
    tags: string[];
    prev: Record<string, unknown>;
    next: Record<string, unknown>;
    meta?: Record<string, unknown>;
    authorId?: string | null;
  }) {
    const { leadId, summaryText, tags, prev, next, meta, authorId } = params;
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.HISTORY_SNAPSHOT as unknown as $Enums.LeadEventType,
      text: summaryText || 'Stage updated',
      tags,
      prev: prev as Prisma.InputJsonValue,
      next: next as Prisma.InputJsonValue,
      meta: (meta ? (meta as Prisma.InputJsonValue) : undefined) ?? undefined,
    });
  }

  // ----- Phone-related events -----

  async logCall(userId: string, input: LogLeadCallInput) {
    const occurredAt = input.occurredAt ?? new Date();

    const meta: Record<string, unknown> = {
      channel: InteractionChannel.CALL,
      phoneNumber: input.phoneNumber,
      direction: input.direction,
      durationSec: input.durationSec,
    };

    if (input.outcome) {
      meta.outcome = input.outcome;
    }

    const [event] = await this.prisma.$transaction([
      this.prisma.leadEvent.create({
        data: {
          leadId: input.leadId,
          authorId: userId,
          type: LeadEventType.INTERACTION as unknown as $Enums.LeadEventType,
          occurredAt,
          text: input.text ?? null,
          tags: [],
          meta: meta as Prisma.InputJsonValue,
        },
      }),
      this.prisma.ipkLeadd.update({
        where: { id: input.leadId },
        data: {
          lastContactedAt: occurredAt,
          contactAttempts: { increment: 1 },
        },
      }),
    ]);

    return event;
  }

  phoneAdded(
    leadId: string,
    phone: { id: string; number: string; normalized: string; label: string },
    authorId?: string | null,
  ) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.PHONE_ADDED as unknown as $Enums.LeadEventType,
      text: `Added phone ${phone.number}`,
      tags: [phone.label],
      meta: { phoneId: phone.id, normalized: phone.normalized } as Prisma.InputJsonValue,
    });
  }

  phoneRemoved(
    leadId: string,
    phone: { id: string; number: string; label: string },
    authorId?: string | null,
  ) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.PHONE_REMOVED as unknown as $Enums.LeadEventType,
      text: `Removed phone ${phone.number}`,
      tags: [phone.label],
      meta: { phoneId: phone.id } as Prisma.InputJsonValue,
    });
  }

  phoneMarkedPrimary(
    leadId: string,
    phone: { id: string; number: string; label: string },
    authorId?: string | null,
  ) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.PHONE_MARKED_PRIMARY as unknown as $Enums.LeadEventType,
      text: `Marked primary ${phone.number}`,
      tags: [phone.label],
      meta: { phoneId: phone.id } as Prisma.InputJsonValue,
    });
  }

  whatsappToggled(
    leadId: string,
    phone: { id: string; number: string },
    isWhatsapp: boolean,
    authorId?: string | null,
  ) {
    return this.createEvent({
      leadId,
      authorId,
      type: LeadEventType.NOTE as unknown as $Enums.LeadEventType,
      text: `${isWhatsapp ? 'Enabled' : 'Disabled'} WhatsApp on ${phone.number}`,
      tags: ['WHATSAPP'],
      meta: { phoneId: phone.id } as Prisma.InputJsonValue,
    });
  }
}
