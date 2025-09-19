// // src/common/counter.util.ts
// type CounterClient = {
//   counter: {
//     upsert: Function;
//     findUnique: Function;
//   };
// };

// export class CounterUtil {
//   /** Atomic ++ for a named counter key. Returns the incremented value. */
//   static async next(prisma: CounterClient, key: string) {
//     const updated = await prisma.counter.upsert({
//       where: { key },
//       update: { current: { increment: 1 } },
//       create: { key, current: 1 },
//     });
//     return updated.current as number;
//   }

//   static async peek(prisma: CounterClient, key: string) {
//     const doc = await prisma.counter.findUnique({ where: { key } });
//     return (doc?.current as number | undefined) ?? 0;
//   }
// }
