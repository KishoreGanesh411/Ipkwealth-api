// src/app/lead/assignment.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly META_KEY = 'RM_ROUND_ROBIN';

  /**
   * Returns the next active RM's userId in round-robin order, or null if none.
   * - Eligible RMs: User.role === RM, status === ACTIVE, archived === false
   * - Order: stable by createdAt ASC
   * - Pointer stored in AssignmentMeta.value (int), incremented atomically
   */
  async getNextRmId(): Promise<string | null> {
    // 1) Fetch eligible RMs in a stable order
    const rms = await this.prisma.user.findMany({
      where: {
        role: $Enums.UserRoles.RM,
        status: $Enums.Status.ACTIVE,
        archived: false,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (rms.length === 0) return null;

    // 2) Ensure the round-robin pointer exists
    const meta = await this.prisma.assignmentMeta.upsert({
      where: { name: AssignmentService.META_KEY },
      update: {}, // no change yet
      create: { name: AssignmentService.META_KEY, value: 0 },
    });

    // 3) Choose current index, then increment pointer for next call
    const currentIndex = meta.value % rms.length;

    await this.prisma.assignmentMeta.update({
      where: { name: AssignmentService.META_KEY },
      data: { value: { increment: 1 } },
    });

    return rms[currentIndex].id;
  }
}
