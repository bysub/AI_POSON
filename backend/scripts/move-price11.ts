import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async (tx) => {
    const old = await tx.systemSetting.findUnique({ where: { key: "sale.price11" } });
    if (!old) { console.log("sale.price11 not found"); return; }
    const exists = await tx.systemSetting.findUnique({ where: { key: "print.price11" } });
    if (!exists) {
      await tx.systemSetting.create({ data: { key: "print.price11", value: old.value, category: "PRINT" } });
    }
    await tx.systemSetting.delete({ where: { key: "sale.price11" } });
    console.log("Moved sale.price11 → print.price11 (value=" + old.value + ")");
  });
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
