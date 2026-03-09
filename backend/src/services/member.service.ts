import type { MemberGrade } from "@prisma/client";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";

type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const MEMBER_SELECT = { id: true, name: true, phone: true, points: true, grade: true } as const;

const GRADE_ORDER: Record<string, number> = { NORMAL: 0, SILVER: 1, GOLD: 2, VIP: 3 };

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

  /** 포인트 이력 조회 */
  static async getPointHistories(memberId: number, limit = 50) {
    return prisma.pointHistory.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** 포인트 수동 조정 (관리자) */
  static async adjustPoints(
    memberId: number,
    amount: number,
    description: string,
  ) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new AppError(404, "고객을 찾을 수 없습니다", "MEMBER_NOT_FOUND");

    const newBalance = member.points + amount;
    if (newBalance < 0) throw new AppError(400, "포인트가 부족합니다", "INSUFFICIENT_POINTS");

    return prisma.$transaction(async (tx) => {
      const updated = await tx.member.update({
        where: { id: memberId },
        data: { points: { increment: amount } },
      });

      await tx.pointHistory.create({
        data: {
          memberId,
          type: "ADJUST",
          amount: Math.abs(amount),
          balance: updated.points,
          description: description || (amount > 0 ? "관리자 수동 적립" : "관리자 수동 차감"),
        },
      });

      return updated;
    });
  }

  /** 회원 삭제 (비활성) */
  static async delete(id: number) {
    if (isNaN(id)) throw new AppError(400, "유효하지 않은 ID입니다", "VALIDATION_ERROR");

    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "고객을 찾을 수 없습니다", "MEMBER_NOT_FOUND");

    await prisma.member.update({ where: { id }, data: { isActive: false } });
  }

  /** 포인트 적립 (트랜잭션 내에서 호출) */
  static async earnPoints(
    tx: PrismaTransactionClient,
    memberId: number,
    orderId: string,
    earnableAmount: number,
    originalTotal: number,
    paymentType: string,
    settings: Record<string, string>,
  ): Promise<{ earned: number; newBalance: number; gradeChanged: boolean }> {
    const member = await tx.member.findUnique({ where: { id: memberId } });
    if (!member) return { earned: 0, newBalance: 0, gradeChanged: false };

    // settings 키에 "point." prefix가 있을 수 있으므로 양쪽 모두 지원
    const s = (key: string) => settings[`point.${key}`] ?? settings[key];

    if (s("pointEarnEnabled") !== "1") return { earned: 0, newBalance: member.points, gradeChanged: false };

    // POINT 결제 시 적립 제외 (무한 루프 방지)
    if (paymentType === "POINT") return { earned: 0, newBalance: member.points, gradeChanged: false };

    if (paymentType === "CARD" && s("pointCardEarnEnabled") !== "1") {
      return { earned: 0, newBalance: member.points, gradeChanged: false };
    }
    if (paymentType === "CASH" && s("pointCashEarnEnabled") !== "1") {
      return { earned: 0, newBalance: member.points, gradeChanged: false };
    }

    const minPurchase = parseInt(s("pointMinPurchase") || "1000");
    if (earnableAmount < minPurchase) return { earned: 0, newBalance: member.points, gradeChanged: false };

    // calculateEarnPoints와 checkAndUpdateGrade에도 prefix 보정된 settings 전달
    const normalizedSettings: Record<string, string> = {};
    for (const [k, v] of Object.entries(settings)) {
      normalizedSettings[k] = v;
      if (k.startsWith("point.")) normalizedSettings[k.slice(6)] = v;
    }

    const earned = MemberService.calculateEarnPoints(earnableAmount, member.grade as MemberGrade, normalizedSettings);
    if (earned <= 0) return { earned: 0, newBalance: member.points, gradeChanged: false };

    const updated = await tx.member.update({
      where: { id: memberId },
      data: {
        points: { increment: earned },
        totalEarned: { increment: earned },
        totalPurchase: { increment: originalTotal },
      },
    });

    await tx.pointHistory.create({
      data: {
        memberId,
        type: "EARN",
        amount: earned,
        balance: updated.points,
        orderId,
        description: `주문 적립 (${earnableAmount.toLocaleString()}원)`,
      },
    });

    let gradeChanged = false;
    if (normalizedSettings["gradeAutoEnabled"] === "1") {
      gradeChanged = await MemberService.checkAndUpdateGrade(tx, memberId, updated, normalizedSettings);
    }

    return { earned, newBalance: updated.points, gradeChanged };
  }

  /** 적립 포인트 계산 */
  static calculateEarnPoints(
    amount: number,
    grade: MemberGrade,
    settings: Record<string, string>,
  ): number {
    const earnType = settings["pointEarnType"] || "rate";

    if (earnType === "fixed") {
      return parseInt(settings["pointEarnFixed"] || "100");
    }

    let rate: number;
    if (settings["pointGradeEnabled"] === "1") {
      const gradeRateMap: Record<string, string> = {
        NORMAL: "pointGradeNormalRate",
        SILVER: "pointGradeSilverRate",
        GOLD: "pointGradeGoldRate",
        VIP: "pointGradeVipRate",
      };
      rate = parseFloat(settings[gradeRateMap[grade]] || "1");
    } else {
      rate = parseFloat(settings["pointEarnRate"] || "1");
    }

    const unit = parseInt(settings["pointEarnUnit"] || "1000");
    const baseAmount = Math.floor(amount / unit) * unit;
    const rawPoints = baseAmount * (rate / 100);

    const round = settings["pointEarnRound"] || "floor";
    let earned: number;
    if (round === "ceil") earned = Math.ceil(rawPoints);
    else if (round === "round") earned = Math.round(rawPoints);
    else earned = Math.floor(rawPoints);

    const minEarn = parseInt(settings["pointMinEarn"] || "1");
    return earned >= minEarn ? earned : 0;
  }

  /** 등급 자동 변경 확인 */
  static async checkAndUpdateGrade(
    tx: PrismaTransactionClient,
    memberId: number,
    member: { totalEarned: number; totalPurchase: number; grade: string },
    settings: Record<string, string>,
  ): Promise<boolean> {
    const criteria = settings["gradeCriteria"] || "totalPoints";
    const value = criteria === "totalPurchase" ? member.totalPurchase : member.totalEarned;

    const vipThreshold = parseInt(settings["gradeVipThreshold"] || "100000");
    const goldThreshold = parseInt(settings["gradeGoldThreshold"] || "50000");
    const silverThreshold = parseInt(settings["gradeSilverThreshold"] || "10000");

    let newGrade: MemberGrade;
    if (value >= vipThreshold) newGrade = "VIP";
    else if (value >= goldThreshold) newGrade = "GOLD";
    else if (value >= silverThreshold) newGrade = "SILVER";
    else newGrade = "NORMAL";

    if (settings["gradeDownEnabled"] !== "1") {
      if (GRADE_ORDER[newGrade] <= GRADE_ORDER[member.grade]) return false;
    }

    if (newGrade !== member.grade) {
      await tx.member.update({ where: { id: memberId }, data: { grade: newGrade } });
      return true;
    }
    return false;
  }
}
