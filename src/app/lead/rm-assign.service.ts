import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { $Enums } from '@prisma/client';

const RR_NAME = 'RM_ROUND_ROBIN_INDEX';

@Injectable()
export class RmAssignService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the next RM { userId, displayName } or nulls if none available */
  async pickNext(): Promise<{ userId?: string; displayName?: string }> {
    const rms = await this.prisma.user.findMany({
      where: {
        archived: false,
        role: 'RM' as $Enums.UserRoles,
        status: 'ACTIVE' as $Enums.Status,
      },
      orderBy: { name: 'asc' }, // deterministic order is important
      select: { id: true, name: true },
    });

    if (rms.length === 0) {
      return { userId: undefined, displayName: undefined };
    }

    // Upsert round-robin pointer (index)
    const meta = await this.prisma.assignmentMeta.upsert({
      where: { name: RR_NAME },
      update: {},
      create: { name: RR_NAME, value: 0 },
    });

    const idx = meta.value % rms.length;
    const chosen = rms[idx];

    // Increment pointer atomically for next call
    await this.prisma.assignmentMeta.update({
      where: { name: RR_NAME },
      data: { value: { increment: 1 } },
    });

    return { userId: chosen.id, displayName: chosen.name };
  }
}
