import { ProductStatus, TaxType } from "@prisma/client";
import { prisma } from "../utils/db.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";

const CACHE_TTL = 300; // 5분

const productInclude = {
  categories: { select: { id: true, name: true } },
  purchaseProduct: {
    select: { id: true, barcode: true, name: true, stock: true, safeStock: true },
  },
  options: {
    include: {
      purchaseProduct: { select: { id: true, barcode: true, name: true, stock: true } },
    },
  },
};

export interface CreateProductInput {
  barcode?: string;
  purchaseProductId?: number;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  description?: string;
  sellPrice: number;
  isDiscount?: boolean;
  discountPrice?: number;
  taxType?: TaxType;
  status?: ProductStatus;
  categoryIds: number[];
  imageUrl?: string;
  kitchenCall?: boolean;
  isPopular?: boolean;
  options?: Array<{
    name: string;
    price: number;
    isRequired?: boolean;
    purchaseProductId?: number;
  }>;
}

export interface UpdateProductInput {
  barcode?: string;
  purchaseProductId?: number | null;
  name?: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  description?: string;
  sellPrice?: number;
  isDiscount?: boolean;
  discountPrice?: number | null;
  taxType?: TaxType;
  status?: ProductStatus;
  categoryIds?: number[];
  imageUrl?: string;
  kitchenCall?: boolean;
  isPopular?: boolean;
  isActive?: boolean;
}

export class ProductService {
  /**
   * 캐시 무효화 (상품 + 관련 카테고리)
   */
  async invalidateCache(categoryIds?: number[] | null): Promise<void> {
    await cacheService.del(CACHE_KEYS.PRODUCTS);
    if (categoryIds) {
      for (const id of categoryIds) {
        await cacheService.del(CACHE_KEYS.PRODUCTS_BY_CATEGORY(id));
      }
    }
  }

  /**
   * 전체 캐시 무효화
   */
  async invalidateAllCache(): Promise<void> {
    await cacheService.del(CACHE_KEYS.PRODUCTS);
    const categories = await prisma.category.findMany({ select: { id: true } });
    for (const cat of categories) {
      await cacheService.del(CACHE_KEYS.PRODUCTS_BY_CATEGORY(cat.id));
    }
  }

  /**
   * 키오스크용 상품 목록 (캐시 적용, HIDDEN 제외)
   */
  async listForKiosk(categoryId?: number) {
    const categoryFilter = categoryId
      ? { categories: { some: { id: categoryId } } }
      : {};

    const cacheKey = categoryId
      ? CACHE_KEYS.PRODUCTS_BY_CATEGORY(categoryId)
      : CACHE_KEYS.PRODUCTS;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return prisma.product.findMany({
          where: {
            isActive: true,
            status: { in: ["SELLING", "SOLD_OUT", "PENDING"] },
            ...categoryFilter,
          },
          include: productInclude,
          orderBy: { name: "asc" },
        });
      },
      CACHE_TTL,
    );
  }

  /**
   * 관리자용 상품 목록 (캐시 없음, 모든 상태)
   */
  async listForAdmin(categoryId?: number) {
    const categoryFilter = categoryId
      ? { categories: { some: { id: categoryId } } }
      : {};

    return prisma.product.findMany({
      where: { isActive: true, ...categoryFilter },
      include: productInclude,
      orderBy: { name: "asc" },
    });
  }

  /**
   * 상품 검색
   */
  async search(query: string, options?: { categoryId?: number; adminMode?: boolean }) {
    const categoryFilter = options?.categoryId
      ? { categories: { some: { id: options.categoryId } } }
      : {};

    return prisma.product.findMany({
      where: {
        isActive: true,
        ...(!options?.adminMode && { status: "SELLING" }),
        ...categoryFilter,
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { barcode: { contains: query } },
        ],
      },
      include: productInclude,
      orderBy: { name: "asc" },
    });
  }

  /**
   * 바코드로 상품 조회 (캐시 적용)
   */
  async getByBarcode(barcode: string) {
    return cacheService.getOrSet(
      CACHE_KEYS.PRODUCT_BY_BARCODE(barcode),
      async () => {
        return prisma.product.findFirst({
          where: { barcode, isActive: true, status: "SELLING" },
          include: productInclude,
        });
      },
      CACHE_TTL,
    );
  }

  /**
   * ID로 상품 조회 (캐시 적용)
   */
  async getById(id: number) {
    return cacheService.getOrSet(
      CACHE_KEYS.PRODUCT(id),
      async () => {
        return prisma.product.findUnique({
          where: { id },
          include: productInclude,
        });
      },
      CACHE_TTL,
    );
  }

  /**
   * 상품 생성
   */
  async create(input: CreateProductInput) {
    // purchaseProductId 검증 및 바코드 자동 설정
    let resolvedBarcode = input.barcode ?? "";
    if (input.purchaseProductId) {
      const pp = await prisma.purchaseProduct.findUnique({ where: { id: input.purchaseProductId } });
      if (!pp) {
        throw new ProductError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND");
      }
      if (!resolvedBarcode) {
        resolvedBarcode = pp.barcode;
      }
    }

    // 카테고리 존재 확인
    await this.validateCategoryIds(input.categoryIds);

    const product = await prisma.product.create({
      data: {
        barcode: resolvedBarcode,
        purchaseProductId: input.purchaseProductId ?? null,
        name: input.name,
        nameEn: input.nameEn,
        nameJa: input.nameJa,
        nameZh: input.nameZh,
        description: input.description,
        sellPrice: input.sellPrice,
        isDiscount: input.isDiscount ?? false,
        discountPrice: input.isDiscount ? (input.discountPrice ?? null) : null,
        taxType: input.taxType ?? "TAXABLE",
        status: input.status ?? "SELLING",
        categories: { connect: input.categoryIds.map((id) => ({ id })) },
        imageUrl: input.imageUrl,
        kitchenCall: input.kitchenCall ?? false,
        isPopular: input.isPopular ?? false,
        isActive: true,
        options: input.options?.length
          ? {
              create: input.options.map((opt) => ({
                name: opt.name,
                price: opt.price,
                isRequired: opt.isRequired ?? false,
                purchaseProductId: opt.purchaseProductId ?? null,
              })),
            }
          : undefined,
      },
      include: productInclude,
    });

    await this.invalidateCache(input.categoryIds);
    return product;
  }

  /**
   * 상품 수정
   */
  async update(id: number, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new ProductError(404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    // purchaseProductId 변경 시 검증
    if (input.purchaseProductId !== undefined && input.purchaseProductId !== null) {
      const pp = await prisma.purchaseProduct.findUnique({ where: { id: input.purchaseProductId } });
      if (!pp) {
        throw new ProductError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND");
      }
    }

    // 카테고리 변경 시 검증
    if (input.categoryIds !== undefined) {
      if (!Array.isArray(input.categoryIds) || input.categoryIds.length === 0) {
        throw new ProductError(400, "카테고리를 1개 이상 선택해야 합니다", "MISSING_CATEGORIES");
      }
      await this.validateCategoryIds(input.categoryIds);
    }

    // 기존 카테고리 조회 (캐시 무효화용)
    const existingWithCats = await prisma.product.findUnique({
      where: { id },
      include: { categories: { select: { id: true } } },
    });
    const oldCategoryIds = existingWithCats?.categories.map((c) => c.id) ?? [];

    // Prisma update data 구성
    const updateData: Record<string, unknown> = {};
    if (input.barcode !== undefined) updateData.barcode = input.barcode;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.nameEn !== undefined) updateData.nameEn = input.nameEn;
    if (input.nameJa !== undefined) updateData.nameJa = input.nameJa;
    if (input.nameZh !== undefined) updateData.nameZh = input.nameZh;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sellPrice !== undefined) updateData.sellPrice = input.sellPrice;
    if (input.isDiscount !== undefined) updateData.isDiscount = input.isDiscount;
    if (input.discountPrice !== undefined) updateData.discountPrice = input.isDiscount ? input.discountPrice : null;
    if (input.taxType !== undefined) updateData.taxType = input.taxType;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.kitchenCall !== undefined) updateData.kitchenCall = input.kitchenCall;
    if (input.isPopular !== undefined) updateData.isPopular = input.isPopular;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    // purchaseProductId 처리 (Prisma relation connect/disconnect 패턴)
    if (input.purchaseProductId !== undefined) {
      if (input.purchaseProductId === null) {
        updateData.purchaseProduct = { disconnect: true };
      } else {
        updateData.purchaseProduct = { connect: { id: input.purchaseProductId } };
      }
    }

    // 카테고리 연결
    if (input.categoryIds !== undefined) {
      updateData.categories = { set: input.categoryIds.map((cid) => ({ id: cid })) };
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: productInclude,
    });

    const allCategoryIds = [...new Set([...oldCategoryIds, ...(input.categoryIds ?? [])])];
    await this.invalidateCache(allCategoryIds);

    return product;
  }

  /**
   * 상품 삭제 (soft delete)
   */
  async delete(id: number) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { categories: { select: { id: true } } },
    });
    if (!existing) {
      throw new ProductError(404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateCache(existing.categories.map((c) => c.id));
  }

  /**
   * 상품 상태 변경
   */
  async updateStatus(id: number, status: string) {
    const validStatuses: ProductStatus[] = ["SELLING", "SOLD_OUT", "PENDING", "HIDDEN"];
    if (!validStatuses.includes(status as ProductStatus)) {
      throw new ProductError(400, "유효하지 않은 상태입니다 (SELLING, SOLD_OUT, PENDING, HIDDEN)", "INVALID_STATUS");
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { categories: { select: { id: true } } },
    });
    if (!product) {
      throw new ProductError(404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: status as ProductStatus },
      select: { id: true, name: true, status: true },
    });

    await this.invalidateCache(product.categories.map((c) => c.id));
    return updated;
  }

  // ========== 옵션 관리 ==========

  async createOption(productId: number, data: { name: string; price: number; isRequired?: boolean; purchaseProductId?: number }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new ProductError(404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    const option = await prisma.productOption.create({
      data: {
        productId,
        name: data.name,
        price: data.price,
        isRequired: data.isRequired ?? false,
        purchaseProductId: data.purchaseProductId ?? null,
      },
    });

    await this.invalidateCacheForProduct(productId);
    return option;
  }

  async updateOption(productId: number, optionId: number, data: { name?: string; price?: number; isRequired?: boolean; purchaseProductId?: number }) {
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, productId },
    });
    if (!option) {
      throw new ProductError(404, "Option not found", "OPTION_NOT_FOUND");
    }

    const updated = await prisma.productOption.update({
      where: { id: optionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.purchaseProductId !== undefined && { purchaseProductId: data.purchaseProductId }),
      },
    });

    await this.invalidateCacheForProduct(productId);
    return updated;
  }

  async deleteOption(productId: number, optionId: number) {
    const option = await prisma.productOption.findFirst({
      where: { id: optionId, productId },
    });
    if (!option) {
      throw new ProductError(404, "Option not found", "OPTION_NOT_FOUND");
    }

    await prisma.productOption.delete({ where: { id: optionId } });
    await this.invalidateCacheForProduct(productId);
  }

  // ========== 내부 헬퍼 ==========

  private async validateCategoryIds(categoryIds: number[]): Promise<void> {
    const existing = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });
    if (existing.length !== categoryIds.length) {
      throw new ProductError(404, "일부 카테고리를 찾을 수 없습니다", "CATEGORY_NOT_FOUND");
    }
  }

  private async invalidateCacheForProduct(productId: number): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { categories: { select: { id: true } } },
    });
    await this.invalidateCache(product?.categories.map((c) => c.id) ?? []);
  }
}

export class ProductError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ProductError";
  }
}

export const productService = new ProductService();
