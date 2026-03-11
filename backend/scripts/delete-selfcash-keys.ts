import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  for (const key of ["selfCash.self10000Use", "selfCash.selfNoCardUse"]) {
    const r = await prisma.deviceSetting.deleteMany({ where: { key } });
    console.log("Deleted", key, ":", r.count);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
