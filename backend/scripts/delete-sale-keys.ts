import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const keys = ["sale.engEnabled", "sale.gridFix", "sale.selfNoAutoGoods", "sale.infoDeskEnabled", "sale.orderCallEnabled"];
  for (const key of keys) {
    const r = await prisma.systemSetting.deleteMany({ where: { key } });
    console.log("Deleted", key, ":", r.count);
  }
  const remaining = await prisma.systemSetting.count({ where: { category: "SALE" } });
  console.log("SALE keys remaining:", remaining);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
