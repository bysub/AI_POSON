import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const keys = ["terminal.touch", "terminal.dual", "terminal.selfJPYN"];
  for (const key of keys) {
    const r = await prisma.deviceSetting.deleteMany({ where: { key } });
    console.log("Deleted", key, ":", r.count);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
