// src/app/lead/rr.util.ts
import { Prisma, $Enums } from '@prisma/client';

type PickedRm = { id: string; name: string | null };

export class RmRoundRobin {
  private readonly META = 'RM_ROUND_ROBIN';

  constructor(private tx: Prisma.TransactionClient) {}

  /** One RM */
  async nextActiveRm(): Promise<PickedRm | null> {
    const rms = await this.tx.user.findMany({
      where: {
        archived: false,
        role: $Enums.UserRoles.RM,
        status: $Enums.Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (rms.length === 0) return null;

    const meta = await this.tx.assignmentMeta.upsert({
      where: { name: this.META },
      create: { name: this.META, value: 0 },
      update: {},
      select: { value: true },
    });

    const index = meta.value % rms.length;
    const chosen = rms[index];

    await this.tx.assignmentMeta.update({
      where: { name: this.META },
      data: { value: { increment: 1 } },
    });

    // keep a touch for debugging/fairness
    await this.tx.user.update({
      where: { id: chosen.id },
      data: { lastAssignedAt: new Date() },
    });

    return { id: chosen.id, name: chosen.name ?? null };
  }

  /** K RMs – returns an array of RMs in rotation order */
  async nextKRms(k: number): Promise<PickedRm[]> {
    const K = Math.max(0, k | 0);
    if (K <= 0) return [];

    const rms = await this.tx.user.findMany({
      where: {
        archived: false,
        role: $Enums.UserRoles.RM,
        status: $Enums.Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (rms.length === 0) return [];

    const meta = await this.tx.assignmentMeta.upsert({
      where: { name: this.META },
      create: { name: this.META, value: 0 },
      update: {},
      select: { value: true },
    });

    const start = meta.value;
    await this.tx.assignmentMeta.update({
      where: { name: this.META },
      data: { value: { increment: K } },
    });

    const out: PickedRm[] = [];
    for (let i = 0; i < K; i++) {
      const idx = (start + i) % rms.length;
      out.push({ id: rms[idx].id, name: rms[idx].name ?? null });
    }

    const now = new Date();
    await this.tx.user.updateMany({
      where: { id: { in: out.map((r) => r.id) } },
      data: { lastAssignedAt: now },
    });

    return out;
  }
}
