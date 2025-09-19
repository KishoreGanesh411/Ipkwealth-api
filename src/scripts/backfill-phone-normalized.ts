import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function normalizePhone(raw?: string | null) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, '');
  return digits.slice(-12); // keep last 10-12 digits
}

async function main() {
  const batch = 500;
  let skip = 0;
  while (true) {
    const rows = await prisma.ipkLeadd.findMany({
      skip,
      take: batch,
      select: { id: true, phone: true, phoneNormalized: true },
    });
    if (!rows.length) break;

    const ops = rows
      .filter((r) => !r.phoneNormalized && r.phone)
      .map((r) =>
        prisma.ipkLeadd.update({
          where: { id: r.id },
          data: { phoneNormalized: normalizePhone(r.phone) },
        }),
      );

    if (ops.length) await prisma.$transaction(ops);
    skip += batch;
    console.log(`Processed ${skip}`);
  }
}

main().finally(() => prisma.$disconnect());
