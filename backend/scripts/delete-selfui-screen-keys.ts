import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const keys = [
    "selfUI.selfSoundGuide", "selfUI.selfCusNum4", "selfUI.selfNoCustomer",
    "selfUI.selfCusSelect", "selfUI.selfCusAddUse", "selfUI.selfCusAddEtc",
    "selfUI.selfCusTopMsg", "selfUI.selfCusBTMsg1", "selfUI.selfCusBTMsg2",
    "selfUI.selfTouchSoundYN", "selfUI.selfMainPage", "selfUI.selfBTInit",
    "selfUI.selfOneCancel", "selfUI.selfZHotKey", "selfUI.selfCountYN",
    "selfUI.selfStartHotKey", "selfUI.selfPriceUse", "selfUI.selfPriceType",
    "selfUI.selfReader", "selfUI.selfGif",
  ];
  let total = 0;
  for (const key of keys) {
    const r = await prisma.deviceSetting.deleteMany({ where: { key } });
    if (r.count > 0) { console.log("Deleted", key, ":", r.count); total += r.count; }
  }
  console.log("Total deleted:", total);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
