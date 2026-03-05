import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";

function toMap(settings: { key: string; value: string }[]): Record<string, string> {
  const data: Record<string, string> = {};
  for (const s of settings) data[s.key] = s.value;
  return data;
}

export class DeviceService {
  /** 전체 기기 목록 */
  static async findAll() {
    return prisma.device.findMany({
      orderBy: [{ type: "asc" }, { id: "asc" }],
    });
  }

  /** 기기 단건 조회 */
  static async findById(id: string) {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) throw new AppError(404, "기기를 찾을 수 없습니다", "DEVICE_NOT_FOUND");
    return device;
  }

  /** 기기 등록 */
  static async create(data: { id: string; name: string; type: string }) {
    const { id, name, type } = data;

    if (!id || !name || !type) {
      throw new AppError(400, "id, name, type은 필수입니다", "VALIDATION_ERROR");
    }
    if (!["POS", "KIOSK", "KITCHEN"].includes(type)) {
      throw new AppError(400, "type은 POS, KIOSK, KITCHEN 중 하나여야 합니다", "VALIDATION_ERROR");
    }

    const existing = await prisma.device.findUnique({ where: { id } });
    if (existing) throw new AppError(409, "이미 존재하는 기기 ID입니다", "DEVICE_EXISTS");

    return prisma.device.create({ data: { id, name, type } });
  }

  /** 기기 삭제 (설정 cascade) */
  static async delete(id: string) {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "기기를 찾을 수 없습니다", "DEVICE_NOT_FOUND");
    await prisma.device.delete({ where: { id } });
  }

  /** 기기별 전체 설정 조회 */
  static async getSettings(deviceId: string) {
    const settings = await prisma.deviceSetting.findMany({ where: { deviceId } });
    return toMap(settings);
  }

  /** 기기별 카테고리 설정 조회 */
  static async getSettingsByCategory(deviceId: string, category: string) {
    const settings = await prisma.deviceSetting.findMany({
      where: { deviceId, category: category.toUpperCase() },
    });
    return toMap(settings);
  }

  /** 기기별 카테고리 설정 일괄 저장 */
  static async saveSettings(deviceId: string, category: string, entries: Record<string, string>) {
    const cat = category.toUpperCase();

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new AppError(404, "기기를 찾을 수 없습니다", "DEVICE_NOT_FOUND");

    const upserts = Object.entries(entries).map(([key, value]) =>
      prisma.deviceSetting.upsert({
        where: { deviceId_key: { deviceId, key } },
        update: { value: String(value ?? ""), category: cat },
        create: { deviceId, key, value: String(value ?? ""), category: cat },
      }),
    );
    await prisma.$transaction(upserts);

    return this.getSettingsByCategory(deviceId, cat);
  }
}
