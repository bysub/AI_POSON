import bcrypt from "bcrypt";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";

const ADMIN_SELECT = {
  id: true, username: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true,
} as const;

export class AdminService {
  /** 관리자 목록 */
  static async findAll() {
    return prisma.admin.findMany({
      select: ADMIN_SELECT,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }

  /** 관리자 등록 */
  static async create(data: { username: string; password: string; name: string; role?: string }) {
    const { username, password, name, role } = data;

    if (!username || !password || !name) {
      throw new AppError(400, "username, password, name은 필수입니다", "VALIDATION_ERROR");
    }

    const validRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"];
    if (role && !validRoles.includes(role)) {
      throw new AppError(400, "유효하지 않은 권한입니다", "VALIDATION_ERROR");
    }

    const existing = await prisma.admin.findUnique({ where: { username } });
    if (existing) throw new AppError(409, "이미 존재하는 사용자명입니다", "ADMIN_EXISTS");

    const passwordHash = await bcrypt.hash(password, 10);
    return prisma.admin.create({
      data: { username, passwordHash, name, role: (role as never) ?? "STAFF" },
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  /** 관리자 수정 */
  static async update(id: string, data: { name?: string; role?: string; isActive?: boolean; password?: string }) {
    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "사용자를 찾을 수 없습니다", "ADMIN_NOT_FOUND");

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.admin.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  /** 관리자 삭제 */
  static async delete(id: string) {
    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "사용자를 찾을 수 없습니다", "ADMIN_NOT_FOUND");

    await prisma.admin.delete({ where: { id } });
  }
}
