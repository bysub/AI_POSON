import { TaxType } from "@prisma/client";
import { prisma } from "../utils/db.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";

const purchaseProductInclude = {
  supplier: { select: { id: true, code: true, name: true, type: true } },
};

export interface CreatePurchaseProductInput {
  barcode: string;
  name: string;
  sellPrice: number;
  costPrice?: number;
  taxType: string;
  supplierId?: number;
  lCode: string;
  mCode?: string;
  sCode?: string;
  spec?: string;
  productType: string;
  purchaseCost?: number;
  vatAmount?: number;
  isActive?: boolean;
  usePurchase?: boolean;
  useOrder?: boolean;
  useSales?: boolean;
  useInventory?: boolean;
  safeStock?: number;
}

export interface UpdatePurchaseProductInput {
  barcode?: string;
  name?: string;
  sellPrice?: number;
  costPrice?: number;
  taxType?: string;
  supplierId?: number | null;
  isActive?: boolean;
  lCode?: string;
  mCode?: string;
  sCode?: string;
  spec?: string;
  productType?: string;
  purchaseCost?: number;
  vatAmount?: number;
  usePurchase?: boolean;
  useOrder?: boolean;
  useSales?: boolean;
  useInventory?: boolean;
  safeStock?: number;
}

export class PurchaseProductService {
  async invalidateCache(): Promise<void> {
    await cacheService.del(CACHE_KEYS.PURCHASE_PRODUCTS);
  }

  /** 다음 바코드 번호 자동 생성 */
  async getNextBarcode(productType?: string) {
    const isWeight = productType === "WEIGHT";

    const settingKeys = isWeight
      ? ["barcode.scaleStartChar", "barcode.scaleLen"]
      : ["barcode.barCodeLen"];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: settingKeys } },
    });
    const settingMap: Record<string, string> = {};
    for (const s of settings) settingMap[s.key] = s.value;

    let prefix: string;
    let totalLen: number;

    if (isWeight) {
      prefix = settingMap["barcode.scaleStartChar"] || "28";
      const codeLen = parseInt(settingMap["barcode.scaleLen"] || "4", 10);
      totalLen = prefix.length + codeLen;
    } else {
      prefix = settingMap["barcode.barCodeLen"] || "95";
      totalLen = 12;
    }

    const lastProduct = await prisma.purchaseProduct.findFirst({
      where: { barcode: { startsWith: prefix } },
      orderBy: { barcode: "desc" },
      select: { barcode: true },
    });

    let nextBarcode: string;
    if (lastProduct) {
      const codePartLen = totalLen - prefix.length;
      const codePart = lastProduct.barcode.substring(prefix.length, prefix.length + codePartLen);
      const nextNum = parseInt(codePart, 10) + 1;
      nextBarcode = prefix + String(nextNum).padStart(codePartLen, "0");
    } else {
      const padLen = totalLen - prefix.length;
      nextBarcode = prefix + "0".repeat(padLen - 1) + "1";
    }

    return { barcode: nextBarcode, prefix, productType: isWeight ? "WEIGHT" : "GENERAL" };
  }

  /** 매입상품 목록 (거래처별 필터, 검색) */
  async list(filters?: {
    supplierId?: string;
    search?: string;
    taxType?: string;
    lCode?: string;
    mCode?: string;
    sCode?: string;
  }) {
    const where: Record<string, unknown> = { isActive: true };

    if (filters?.supplierId) {
      where.supplierId = parseInt(filters.supplierId, 10);
    }
    if (filters?.taxType) {
      where.taxType = filters.taxType;
    }
    if (filters?.lCode) where.lCode = filters.lCode;
    if (filters?.mCode) where.mCode = filters.mCode;
    if (filters?.sCode) where.sCode = filters.sCode;

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { barcode: { contains: filters.search } },
      ];
    }

    return prisma.purchaseProduct.findMany({
      where,
      include: purchaseProductInclude,
      orderBy: { name: "asc" },
    });
  }

  /** 매입상품 상세 조회 */
  async getById(id: number) {
    return prisma.purchaseProduct.findUnique({
      where: { id },
      include: purchaseProductInclude,
    });
  }

  /** 매입상품 등록 */
  async create(input: CreatePurchaseProductInput) {
    // 바코드 중복 확인
    const existing = await prisma.purchaseProduct.findUnique({ where: { barcode: input.barcode } });
    if (existing) {
      throw new PurchaseProductError(409, "이미 존재하는 바코드입니다", "BARCODE_DUPLICATE");
    }

    const product = await prisma.purchaseProduct.create({
      data: {
        barcode: input.barcode,
        name: input.name,
        sellPrice: input.sellPrice,
        costPrice: input.costPrice ?? 0,
        spec: input.spec || null,
        productType: input.productType || null,
        purchaseCost: input.purchaseCost ?? 0,
        vatAmount: input.vatAmount ?? 0,
        taxType: (input.taxType ?? "TAXABLE") as TaxType,
        supplierId: input.supplierId ?? null,
        lCode: input.lCode || null,
        mCode: input.mCode || null,
        sCode: input.sCode || null,
        isActive: input.isActive ?? true,
        usePurchase: input.usePurchase ?? true,
        useOrder: input.useOrder ?? true,
        useSales: input.useSales ?? true,
        useInventory: input.useInventory ?? true,
        safeStock: input.safeStock ?? 0,
      },
      include: purchaseProductInclude,
    });

    await this.invalidateCache();
    return product;
  }

  /** 매입상품 수정 */
  async update(id: number, input: UpdatePurchaseProductInput) {
    const existing = await prisma.purchaseProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new PurchaseProductError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND");
    }

    // 바코드, 상품구분은 수정 불가
    if (input.barcode !== undefined && input.barcode !== existing.barcode) {
      throw new PurchaseProductError(400, "바코드는 수정할 수 없습니다", "BARCODE_IMMUTABLE");
    }
    if (input.productType !== undefined && input.productType !== existing.productType) {
      throw new PurchaseProductError(400, "상품구분은 수정할 수 없습니다", "PRODUCT_TYPE_IMMUTABLE");
    }

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.sellPrice !== undefined) updateData.sellPrice = input.sellPrice;
    if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
    if (input.spec !== undefined) updateData.spec = input.spec || null;
    if (input.purchaseCost !== undefined) updateData.purchaseCost = input.purchaseCost;
    if (input.vatAmount !== undefined) updateData.vatAmount = input.vatAmount;
    if (input.taxType !== undefined) updateData.taxType = input.taxType;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.usePurchase !== undefined) updateData.usePurchase = input.usePurchase;
    if (input.useOrder !== undefined) updateData.useOrder = input.useOrder;
    if (input.useSales !== undefined) updateData.useSales = input.useSales;
    if (input.useInventory !== undefined) updateData.useInventory = input.useInventory;
    if (input.safeStock !== undefined) updateData.safeStock = input.safeStock;
    if (input.lCode !== undefined) updateData.lCode = input.lCode || null;
    if (input.mCode !== undefined) updateData.mCode = input.mCode || null;
    if (input.sCode !== undefined) updateData.sCode = input.sCode || null;

    // supplierId: Prisma relation connect/disconnect 패턴
    if (input.supplierId !== undefined) {
      if (input.supplierId === null || input.supplierId === 0) {
        updateData.supplier = { disconnect: true };
      } else {
        updateData.supplier = { connect: { id: input.supplierId } };
      }
    }

    const product = await prisma.purchaseProduct.update({
      where: { id },
      data: updateData,
      include: purchaseProductInclude,
    });

    await this.invalidateCache();
    return product;
  }

  /** 매입상품 삭제 (soft delete) */
  async delete(id: number) {
    const existing = await prisma.purchaseProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new PurchaseProductError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND");
    }

    await prisma.purchaseProduct.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateCache();
  }

  /** 재고 동기화 (확정된 매입 데이터 기반으로 stock 재계산) */
  async syncStock(createdBy?: string | null) {
    const allProducts = await prisma.purchaseProduct.findMany({
      select: { id: true, stock: true },
    });

    const stockSums = await prisma.purchaseItem.groupBy({
      by: ["purchaseProductId"],
      where: {
        purchase: { status: { not: "CANCELLED" } },
      },
      _sum: { quantity: true },
    });

    const newStockMap = new Map(
      stockSums.map((item) => [item.purchaseProductId, item._sum.quantity ?? 0]),
    );

    await prisma.$transaction(async (tx) => {
      await tx.purchaseProduct.updateMany({
        data: { stock: 0 },
      });

      for (const item of stockSums) {
        if (item._sum.quantity) {
          await tx.purchaseProduct.update({
            where: { id: item.purchaseProductId },
            data: { stock: item._sum.quantity },
          });
        }
      }

      for (const product of allProducts) {
        const newStock = newStockMap.get(product.id) ?? 0;
        if (product.stock !== newStock) {
          await tx.stockMovement.create({
            data: {
              purchaseProductId: product.id,
              type: "SYNC",
              quantity: newStock - product.stock,
              stockBefore: product.stock,
              stockAfter: newStock,
              reason: "sync",
              createdBy: createdBy ?? null,
            },
          });
        }
      }
    });

    await this.invalidateCache();
    return { count: stockSums.length };
  }
}

export class PurchaseProductError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "PurchaseProductError";
  }
}

export const purchaseProductService = new PurchaseProductService();
