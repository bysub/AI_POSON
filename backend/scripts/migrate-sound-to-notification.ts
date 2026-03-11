import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Sound Keys → NOTIFICATION Migration ===");

  const moves = [
    { oldKey: "sale.productSound", newKey: "noti.productSound", oldCat: "SALE" },
    { oldKey: "payment.cardWavOpt", newKey: "noti.cardWavOpt", oldCat: "PAYMENT" },
    { oldKey: "point.noBillSound", newKey: "noti.noBillSound", oldCat: "POINT" },
  ];

  await prisma.$transaction(async (tx) => {
    for (const m of moves) {
      const existing = await tx.systemSetting.findUnique({ where: { key: m.oldKey } });
      if (!existing) {
        console.log(`  SKIP: ${m.oldKey} not found`);
        continue;
      }
      // Create new key
      const newExists = await tx.systemSetting.findUnique({ where: { key: m.newKey } });
      if (!newExists) {
        await tx.systemSetting.create({
          data: { key: m.newKey, value: existing.value, category: "NOTIFICATION" },
        });
        console.log(`  MOVED: ${m.oldKey} → ${m.newKey} (value=${existing.value})`);
      } else {
        console.log(`  EXISTS: ${m.newKey} already present`);
      }
      // Delete old key
      await tx.systemSetting.delete({ where: { key: m.oldKey } });
      console.log(`  DELETED: ${m.oldKey}`);
    }
  });

  // Verify
  const notiKeys = await prisma.systemSetting.findMany({
    where: { category: "NOTIFICATION" },
    select: { key: true, value: true },
  });
  console.log("\nNOTIFICATION keys after migration:");
  for (const k of notiKeys) console.log(`  ${k.key} = ${k.value}`);

  console.log("\n=== Migration complete ===");
}

main()
  .catch((e) => { console.error("Migration failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
