/**
 * DB Migration: sale.* → closing.* 키 이동 (SystemSetting)
 * 8 keys: openDay, finishDay, startPrice, beforTran, allFinish, saleFinishOpt, dayFinishMsgOpt, jobFinishCashdraw
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEYS_TO_MOVE = [
  "openDay",
  "finishDay",
  "startPrice",
  "beforTran",
  "allFinish",
  "saleFinishOpt",
  "dayFinishMsgOpt",
  "jobFinishCashdraw",
];

async function main() {
  console.log("=== Move sale.* → closing.* (SystemSetting) ===");

  await prisma.$transaction(async (tx) => {
    for (const key of KEYS_TO_MOVE) {
      const oldKey = `sale.${key}`;
      const newKey = `closing.${key}`;

      // Check if old key exists
      const existing = await tx.systemSetting.findUnique({ where: { key: oldKey } });

      if (existing) {
        // Delete old, create new with same value
        await tx.systemSetting.delete({ where: { key: oldKey } });
        await tx.systemSetting.create({
          data: {
            key: newKey,
            value: existing.value,
            category: "CLOSING",
          },
        });
        console.log(`  ✓ ${oldKey} → ${newKey} (value: ${existing.value})`);
      } else {
        console.log(`  - ${oldKey} not found, skipping`);
      }
    }
  });

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
