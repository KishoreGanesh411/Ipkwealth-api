import { PrismaClient, Status, UserRoles } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const rms = [
    { name: 'Bharath', email: 'bharath@ipkwealth.com' },
    { name: 'Ramya', email: 'ramya@ipkwealth.com' },
    { name: 'Haripriya', email: 'haripriya@ipkwealth.com' }
  ];

  for (const rm of rms) {
    await prisma.user.upsert({
      where: { email: rm.email },
      update: { status: Status.ACTIVE, archived: false, role: UserRoles.RM, name: rm.name },
      create: {
        name: rm.name,
        email: rm.email,
        role: UserRoles.RM,
        status: Status.ACTIVE
      }
    });
  }

  console.log('Seeded RM users.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
