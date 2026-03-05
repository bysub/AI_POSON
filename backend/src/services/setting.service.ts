import { prisma } from "../utils/db.js";

function toMap(settings: { key: string; value: string }[]): Record<string, string> {
  const data: Record<string, string> = {};
  for (const s of settings) data[s.key] = s.value;
  return data;
}

export class SettingService {
  /** 전체 설정 조회 */
  static async findAll() {
    const settings = await prisma.systemSetting.findMany();
    return toMap(settings);
  }

  /** 카테고리별 설정 조회 */
  static async findByCategory(category: string) {
    const settings = await prisma.systemSetting.findMany({
      where: { category: category.toUpperCase() },
    });
    return toMap(settings);
  }

  /** 카테고리별 설정 일괄 저장 (upsert) */
  static async saveByCategory(category: string, entries: Record<string, string>) {
    const cat = category.toUpperCase();

    const upserts = Object.entries(entries).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value ?? ""), category: cat },
        create: { key, value: String(value ?? ""), category: cat },
      }),
    );
    await prisma.$transaction(upserts);

    return this.findByCategory(cat);
  }
}
