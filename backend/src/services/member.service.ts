import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";

const MEMBER_SELECT = { id: true, name: true, phone: true, points: true, grade: true } as const;

export class MemberService {
  /** 전화번호로 회원 조회 (키오스크용) */
  static async lookupByPhone(phone: string) {
    if (!phone || phone.length < 10) {
      throw new AppError(400, "유효한 전화번호를 입력해주세요", "VALIDATION_ERROR");
    }
    return prisma.member.findFirst({
      where: { phone, isActive: true },
      select: MEMBER_SELECT,
    });
  }

  /** 간편 회원 등록 (키오스크용) */
  static async register(phone: string, name?: string) {
    if (!phone || phone.length < 10) {
      throw new AppError(400, "전화번호는 필수입니다", "VALIDATION_ERROR");
    }

    const existing = await prisma.member.findFirst({ where: { phone } });
    if (existing) {
      return {
        member: { id: existing.id, name: existing.name, phone: existing.phone, points: existing.points, grade: existing.grade },
        isExisting: true,
      };
    }

    const code = `M${Date.now().toString(36).toUpperCase()}`;
    const member = await prisma.member.create({
      data: { code, name: name || "회원", phone },
      select: MEMBER_SELECT,
    });
    return { member, isExisting: false };
  }

  /** 회원 목록 (검색) */
  static async findAll(search?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { code: { contains: search } },
      ];
    }
    return prisma.member.findMany({ where, orderBy: { name: "asc" } });
  }

  /** 회원 등록 (관리자용) */
  static async create(data: { code: string; name: string; phone: string; grade?: string }) {
    const { code, name, phone, grade } = data;
    if (!code || !name || !phone) {
      throw new AppError(400, "code, name, phone은 필수입니다", "VALIDATION_ERROR");
    }

    const existing = await prisma.member.findUnique({ where: { code } });
    if (existing) throw new AppError(409, "이미 존재하는 회원코드입니다", "MEMBER_EXISTS");

    const validGrades = ["NORMAL", "SILVER", "GOLD", "VIP"];
    return prisma.member.create({
      data: { code, name, phone, grade: (validGrades.includes(grade ?? "") ? grade : "NORMAL") as never },
    });
  }

  /** 회원 수정 */
  static async update(id: number, data: Record<string, unknown>) {
    if (isNaN(id)) throw new AppError(400, "유효하지 않은 ID입니다", "VALIDATION_ERROR");

    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "고객을 찾을 수 없습니다", "MEMBER_NOT_FOUND");

    const updateData: Record<string, unknown> = {};
    for (const key of ["name", "phone", "grade", "points", "isActive"]) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    return prisma.member.update({ where: { id }, data: updateData });
  }

  /** 회원 삭제 (비활성) */
  static async delete(id: number) {
    if (isNaN(id)) throw new AppError(400, "유효하지 않은 ID입니다", "VALIDATION_ERROR");

    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "고객을 찾을 수 없습니다", "MEMBER_NOT_FOUND");

    await prisma.member.update({ where: { id }, data: { isActive: false } });
  }
}
