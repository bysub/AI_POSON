import { prisma } from "../utils/db.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";

const purchaseInclude = {
  supplier: {
    select: { id: true, code: true, name: true, type: true },
  },
  _count: { select: { items: true } },
};

const purchaseDetailInclude = {
  supplier: {
    select: { id: true, code: true, name: true, type: true },
  },
  items: {
    include: {
      purchaseProduct: {
        select: { id: true, barcode: true, name: true, sellPrice: true, costPrice: true },
      },
    },
    orderBy: { id: "asc" as const },
  },
};

export interface PurchaseListFilters {
  page: number;
  limit: number;
  supplierId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PurchaseItemInput {
  purchaseProductId: number;
  quantity: number;
  unitPrice: number;
  sellPrice: number;
}

export interface CreatePurchaseInput {
  supplierId: number;
  purchaseDate?: string;
  items: PurchaseItemInput[];
  memo?: string;
  taxIncluded?: boolean;
  createdBy?: string | null;
}

export interface UpdatePurchaseInput {
  supplierId?: number;
  purchaseDate?: string;
  items?: PurchaseItemInput[];
  memo?: string;
  status?: string;
  taxIncluded?: boolean;
  createdBy?: string | null;
}

export class PurchaseService {
  async invalidateCache(id?: number): Promise<void> {
    await cacheService.del(CACHE_KEYS.PURCHASES);
    if (id) {
      await cacheService.del(CACHE_KEYS.PURCHASE(id));
    }
  }

  /** 매입 코드 자동생성 (P20260206-001 형식) */
  async generatePurchaseCode(): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");
    const prefix = `P${dateStr}`;

    const latest = await prisma.purchase.findFirst({
      where: { purchaseCode: { startsWith: prefix } },
      orderBy: { purchaseCode: "desc" },
      select: { purchaseCode: true },
    });

    if (!latest) return `${prefix}-001`;

    const seq = parseInt(latest.purchaseCode.split("-")[1], 10);
    return `${prefix}-${String(seq + 1).padStart(3, "0")}`;
  }

  /** 매입 목록 조회 (필터/페이지네이션) */
  async list(filters: PurchaseListFilters) {
    const pageNum = Math.max(1, filters.page || 1);
    const limitNum = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (filters.supplierId) {
      where.supplierId = parseInt(filters.supplierId, 10);
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      where.purchaseDate = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }
    if (filters.search) {
      where.OR = [
        { purchaseCode: { contains: filters.search, mode: "insensitive" } },
        { supplier: { name: { contains: filters.search, mode: "insensitive" } } },
        { memo: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: purchaseInclude,
        orderBy: { purchaseDate: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.purchase.count({ where }),
    ]);

    return {
      purchases,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /** 매입 통계 요약 */
  async getStatsSummary(filters?: { startDate?: string; endDate?: string }) {
    const where: Record<string, unknown> = {
      status: { not: "CANCELLED" },
    };

    if (filters?.startDate || filters?.endDate) {
      where.purchaseDate = {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      };
    }

    const [totalResult, count] = await Promise.all([
      prisma.purchase.aggregate({
        where,
        _sum: { totalAmount: true, taxAmount: true },
      }),
      prisma.purchase.count({ where }),
    ]);

    return {
      totalAmount: totalResult._sum.totalAmount ?? 0,
      taxAmount: totalResult._sum.taxAmount ?? 0,
      count,
    };
  }

  /** 일별 매입 집계 */
  async getDailyStats(filters: { startDate: string; endDate: string }) {
    const start = new Date(`${filters.startDate}T00:00:00+09:00`);
    const end = new Date(`${filters.endDate}T23:59:59.999+09:00`);

    const purchases = await prisma.purchase.findMany({
      where: {
        status: { not: "CANCELLED" },
        purchaseDate: { gte: start, lte: end },
      },
      select: { purchaseDate: true, totalAmount: true },
    });

    // KST 기준 날짜 키 생성 (UTC → KST +9h)
    const toKstDateKey = (d: Date) => {
      const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      return kst.toISOString().split("T")[0];
    };

    const dailyMap = new Map<string, { count: number; totalAmount: number }>();
    const cursorDate = new Date(`${filters.startDate}T00:00:00+09:00`);
    const endDate = new Date(`${filters.endDate}T00:00:00+09:00`);
    while (cursorDate <= endDate) {
      dailyMap.set(toKstDateKey(cursorDate), { count: 0, totalAmount: 0 });
      cursorDate.setDate(cursorDate.getDate() + 1);
    }

    for (const p of purchases) {
      const dateKey = toKstDateKey(p.purchaseDate);
      const current = dailyMap.get(dateKey);
      if (current) {
        current.count++;
        current.totalAmount += Number(p.totalAmount);
      }
    }

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** 거래처별 매입 집계 */
  async getBySupplierStats(filters: { startDate: string; endDate: string }) {
    const start = new Date(`${filters.startDate}T00:00:00+09:00`);
    const end = new Date(`${filters.endDate}T23:59:59.999+09:00`);

    const result = await prisma.purchase.groupBy({
      by: ["supplierId"],
      where: {
        status: { not: "CANCELLED" },
        purchaseDate: { gte: start, lte: end },
      },
      _count: true,
      _sum: { totalAmount: true },
    });

    // 거래처명 매핑
    const supplierIds = result.map((r) => r.supplierId);
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true },
    });
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

    return result
      .map((r) => ({
        supplierId: r.supplierId,
        supplierName: supplierMap.get(r.supplierId) ?? "-",
        count: r._count,
        totalAmount: Number(r._sum.totalAmount ?? 0),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /** 상품별 매입 통계 */
  async getByProductStats(filters: { startDate: string; endDate: string; limit?: number }) {
    const start = new Date(`${filters.startDate}T00:00:00+09:00`);
    const end = new Date(`${filters.endDate}T23:59:59.999+09:00`);
    const limit = filters.limit ?? 20;

    const result = await prisma.purchaseItem.groupBy({
      by: ["purchaseProductId"],
      where: {
        purchase: {
          status: { not: "CANCELLED" },
          purchaseDate: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true, amount: true },
      _count: true,
    });

    const productIds = result.map((r) => r.purchaseProductId);
    const products = await prisma.purchaseProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, barcode: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return result
      .map((r) => ({
        purchaseProductId: r.purchaseProductId,
        productName: productMap.get(r.purchaseProductId)?.name ?? "-",
        barcode: productMap.get(r.purchaseProductId)?.barcode ?? "-",
        totalQuantity: r._sum.quantity ?? 0,
        totalAmount: Number(r._sum.amount ?? 0),
        count: r._count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }

  /** 매입 상세 조회 */
  async getById(id: number) {
    return prisma.purchase.findUnique({
      where: { id },
      include: purchaseDetailInclude,
    });
  }

  /** 매입 등록 (재고 증가 + 이동 기록) */
  async create(input: CreatePurchaseInput) {
    // 거래처 존재 확인
    const supplier = await prisma.supplier.findUnique({
      where: { id: input.supplierId },
    });
    if (!supplier) {
      throw new PurchaseError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND");
    }

    // 매입상품 존재 확인
    const purchaseProductIds = input.items.map((item) => item.purchaseProductId);
    const purchaseProducts = await prisma.purchaseProduct.findMany({
      where: { id: { in: purchaseProductIds } },
      select: { id: true },
    });
    const existingIds = new Set(purchaseProducts.map((p) => p.id));
    const missingIds = purchaseProductIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new PurchaseError(
        404,
        `존재하지 않는 매입상품이 포함되어 있습니다 (ID: ${missingIds.join(", ")})`,
        "PURCHASE_PRODUCT_NOT_FOUND",
      );
    }

    const purchaseCode = await this.generatePurchaseCode();

    // 합계 계산
    let totalAmount = 0;
    const purchaseItems = input.items.map((item) => {
      const amount = item.quantity * item.unitPrice;
      totalAmount += amount;
      return {
        purchaseProductId: item.purchaseProductId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sellPrice: item.sellPrice ?? 0,
        amount,
      };
    });

    const taxIncluded = input.taxIncluded ?? true;
    const taxAmount = taxIncluded
      ? Math.round(totalAmount / 11)
      : Math.round(totalAmount * 0.1);

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          purchaseCode,
          supplierId: input.supplierId,
          purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
          totalAmount,
          taxAmount,
          taxIncluded,
          status: "CONFIRMED",
          memo: input.memo || null,
          createdBy: input.createdBy ?? null,
          items: { create: purchaseItems },
        },
        include: purchaseDetailInclude,
      });

      // 매입 확정 시 재고 증가 + 이동 기록
      for (const item of purchaseItems) {
        const product = await tx.purchaseProduct.findUniqueOrThrow({
          where: { id: item.purchaseProductId },
          select: { stock: true },
        });
        const stockBefore = product.stock;

        await tx.purchaseProduct.update({
          where: { id: item.purchaseProductId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            purchaseProductId: item.purchaseProductId,
            type: "PURCHASE_IN",
            quantity: item.quantity,
            stockBefore,
            stockAfter: stockBefore + item.quantity,
            purchaseId: created.id,
            createdBy: input.createdBy ?? null,
          },
        });
      }

      return created;
    });

    await this.invalidateCache();
    return purchase;
  }

  /** 매입 수정 (재고 연동) */
  async update(id: number, input: UpdatePurchaseInput) {
    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) {
      throw new PurchaseError(404, "매입 내역을 찾을 수 없습니다", "PURCHASE_NOT_FOUND");
    }
    if (existing.status === "CANCELLED") {
      throw new PurchaseError(400, "취소된 매입은 수정할 수 없습니다", "PURCHASE_CANCELLED");
    }

    const updateData: Record<string, unknown> = {};
    if (input.supplierId !== undefined) updateData.supplierId = input.supplierId;
    if (input.purchaseDate !== undefined) updateData.purchaseDate = new Date(input.purchaseDate);
    if (input.memo !== undefined) updateData.memo = input.memo || null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.taxIncluded !== undefined) updateData.taxIncluded = !!input.taxIncluded;

    // 상품 항목 업데이트 (재고 연동)
    if (input.items && Array.isArray(input.items)) {
      const oldItems = await prisma.purchaseItem.findMany({
        where: { purchaseId: id },
        select: { purchaseProductId: true, quantity: true },
      });

      let totalAmount = 0;
      const purchaseItems = input.items.map((item) => {
        const amount = item.quantity * item.unitPrice;
        totalAmount += amount;
        return {
          purchaseId: id,
          purchaseProductId: item.purchaseProductId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sellPrice: item.sellPrice ?? 0,
          amount,
        };
      });

      updateData.totalAmount = totalAmount;
      const isTaxIncluded = input.taxIncluded !== undefined ? !!input.taxIncluded : existing.taxIncluded;
      updateData.taxAmount = isTaxIncluded
        ? Math.round(totalAmount / 11)
        : Math.round(totalAmount * 0.1);

      await prisma.$transaction(async (tx) => {
        // 기존 항목 재고 차감 + PURCHASE_CANCEL 이동 기록
        for (const old of oldItems) {
          const product = await tx.purchaseProduct.findUniqueOrThrow({
            where: { id: old.purchaseProductId },
            select: { stock: true },
          });
          const stockBefore = product.stock;

          await tx.purchaseProduct.update({
            where: { id: old.purchaseProductId },
            data: { stock: { decrement: old.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              purchaseProductId: old.purchaseProductId,
              type: "PURCHASE_CANCEL",
              quantity: -old.quantity,
              stockBefore,
              stockAfter: stockBefore - old.quantity,
              purchaseId: id,
              createdBy: input.createdBy ?? null,
            },
          });
        }

        // 기존 항목 삭제 → 새 항목 생성
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
        await tx.purchaseItem.createMany({ data: purchaseItems });

        // 새 항목 재고 증가 + PURCHASE_IN 이동 기록
        for (const item of purchaseItems) {
          const product = await tx.purchaseProduct.findUniqueOrThrow({
            where: { id: item.purchaseProductId },
            select: { stock: true },
          });
          const stockBefore = product.stock;

          await tx.purchaseProduct.update({
            where: { id: item.purchaseProductId },
            data: { stock: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              purchaseProductId: item.purchaseProductId,
              type: "PURCHASE_IN",
              quantity: item.quantity,
              stockBefore,
              stockAfter: stockBefore + item.quantity,
              purchaseId: id,
              createdBy: input.createdBy ?? null,
            },
          });
        }
      });
    }

    const purchase = await prisma.purchase.update({
      where: { id },
      data: updateData,
      include: purchaseDetailInclude,
    });

    await this.invalidateCache(id);
    return purchase;
  }

  /** 매입 취소 (재고 차감) */
  async cancel(id: number, createdBy?: string | null) {
    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) {
      throw new PurchaseError(404, "매입 내역을 찾을 수 없습니다", "PURCHASE_NOT_FOUND");
    }
    if (existing.status === "CANCELLED") {
      throw new PurchaseError(400, "이미 취소된 매입입니다", "PURCHASE_ALREADY_CANCELLED");
    }

    const purchaseItems = await prisma.purchaseItem.findMany({
      where: { purchaseId: id },
      select: { purchaseProductId: true, quantity: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      for (const item of purchaseItems) {
        const product = await tx.purchaseProduct.findUniqueOrThrow({
          where: { id: item.purchaseProductId },
          select: { stock: true },
        });
        const stockBefore = product.stock;

        await tx.purchaseProduct.update({
          where: { id: item.purchaseProductId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            purchaseProductId: item.purchaseProductId,
            type: "PURCHASE_CANCEL",
            quantity: -item.quantity,
            stockBefore,
            stockAfter: stockBefore - item.quantity,
            purchaseId: id,
            createdBy: createdBy ?? null,
          },
        });
      }
    });

    await this.invalidateCache(id);
  }
}

export class PurchaseError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "PurchaseError";
  }
}

export const purchaseService = new PurchaseService();
