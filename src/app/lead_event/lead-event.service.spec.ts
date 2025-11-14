import { LeadEventService } from './lead-event.service';
import { PrismaService } from 'prisma/prisma.service';
import {
  InteractionChannel,
  InteractionOutcome,
  LeadEventType,
} from '../lead/enums/ipk-leadd.enum';
import { CallDirection, LogLeadCallInput } from './dto/lead-event.input';

const mockPrisma = {
  leadEvent: {
    create: jest.fn(),
  },
  ipkLeadd: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('LeadEventService', () => {
  let service: LeadEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockResolvedValue([
      { id: 'event-1', leadId: 'lead-1' },
      { id: 'lead-1' },
    ]);
    mockPrisma.leadEvent.create.mockResolvedValue({
      id: 'event-1',
      leadId: 'lead-1',
    });

    service = new LeadEventService(mockPrisma as unknown as PrismaService);
  });

  describe('logCall', () => {
    it('saves call meta, updates lead, and returns the created event', async () => {
      const userId = 'user-123';
      const input: LogLeadCallInput = {
        leadId: 'lead-1',
        phoneNumber: '+919999999999',
        direction: CallDirection.OUTGOING,
        durationSec: 214,
        occurredAt: new Date('2025-11-14T09:30:00.000Z'),
        text: 'Called to confirm documents',
        outcome: InteractionOutcome.ANSWERED,
      };

      const result = await service.logCall(userId, input);

      expect(mockPrisma.leadEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: input.leadId,
          authorId: userId,
          occurredAt: input.occurredAt,
          text: input.text,
          tags: [],
          meta: {
            channel: InteractionChannel.CALL,
            phoneNumber: input.phoneNumber,
            direction: input.direction,
            durationSec: input.durationSec,
            outcome: input.outcome,
          },
        }),
      });

      const createdArgs = mockPrisma.leadEvent.create.mock.calls[0][0].data;
      expect(createdArgs.type).toBe(LeadEventType.INTERACTION);

      expect(mockPrisma.ipkLeadd.update).toHaveBeenCalledWith({
        where: { id: input.leadId },
        data: {
          lastContactedAt: input.occurredAt,
          contactAttempts: { increment: 1 },
        },
      });

      expect(result).toEqual({ id: 'event-1', leadId: 'lead-1' });
    });
  });
});
