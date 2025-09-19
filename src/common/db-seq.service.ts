// src/common/db-seq.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import type { Prisma } from '@prisma/client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class DbSeqService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically increment a named counter by `size` and return { start, end }.
   * Retries on P2034 (Mongo write-conflict/deadlock).
   */
  async nextRange(
    key: string,
    size = 1,
    client?: Prisma.TransactionClient | PrismaService,
  ): Promise<{ start: number; end: number }> {
    const c = (client ?? this.prisma) as any;
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // ensure doc exists (idempotent)
        await c.counter.upsert({
          where: { key },
          update: {},
          create: { key, current: 0 },
        });

        // single atomic increment; Prisma returns *new* value
        const updated = await c.counter.update({
          where: { key },
          data: { current: { increment: size } },
          select: { current: true },
        });

        const end = updated.current;
        const start = end - size + 1;
        return { start, end };
      } catch (e: any) {
        if (e?.code === 'P2034') {
          await sleep(Math.min(25 * (attempt + 1) ** 2, 300)); // small backoff
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Counter contention for ${key}: exhausted retries`);
  }
}
