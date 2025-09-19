import type { Prisma } from '@prisma/client';
import { DbSeqService } from './db-seq.service';

export type RmLite = { id: string; name: string | null };

export class RmRoundRobin {
  private readonly KEY = 'RM_ROUND_ROBIN_INDEX';

  constructor(
    private readonly dbseq: DbSeqService,
    private readonly tx: Prisma.TransactionClient,
  ) {}

  private async activeRms(): Promise<RmLite[]> {
    const rms = await this.tx.user.findMany({
      where: {
        archived: false,
        role: 'RM',
        status: 'ACTIVE',
      },
      orderBy: { name: 'asc' }, // deterministic order
      select: { id: true, name: true },
    });
    return rms;
  }

  async nextOne(): Promise<RmLite> {
    const [r] = await this.nextMany(1);
    return r;
  }

  async nextMany(k: number): Promise<RmLite[]> {
    const rms = await this.activeRms();
    if (rms.length === 0)
      return Array.from({ length: k }, () => ({ id: null as any, name: null }));

    // Reserve k positions in the RR pointer
    const { start } = await this.dbseq.nextRange(this.KEY, k, this.tx);

    // Map each position to an RM
    const out: RmLite[] = [];
    for (let i = 0; i < k; i++) {
      const idx = (start - 1 + i) % rms.length;
      out.push(rms[idx]);
    }
    return out;
  }
}
