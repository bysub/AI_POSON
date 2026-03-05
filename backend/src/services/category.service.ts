import { prisma } from "../utils/db.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";

const CACHE_TTL = 300;

export interface CreateCategoryInput {
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  imageUrl?: string;
  isDiscount?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  imageUrl?: string;
  isDiscount?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export class CategoryService {
  async invalidateCache(id?: number): Promise<void> {
    await cacheService.del(CACHE_KEYS.CATEGORIES);
    if (id) {
      await cacheService.del(CACHE_KEYS.CATEGORY(id));
    }
  }

  async list() {
    return cacheService.getOrSet(
      CACHE_KEYS.CATEGORIES,
      () => prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      CACHE_TTL,
    );
  }

  async getById(id: number) {
    return cacheService.getOrSet(
      CACHE_KEYS.CATEGORY(id),
      () => prisma.category.findUnique({
        where: { id },
        include: {
          products: { where: { isActive: true }, orderBy: { name: "asc" } },
        },
      }),
      CACHE_TTL,
    );
  }

  async create(input: CreateCategoryInput) {
    const category = await prisma.category.create({
      data: {
        name: input.name,
        nameEn: input.nameEn,
        nameJa: input.nameJa,
        nameZh: input.nameZh,
        imageUrl: input.imageUrl,
        isDiscount: input.isDiscount ?? false,
        isPopular: input.isPopular ?? false,
        sortOrder: input.sortOrder ?? 0,
        isActive: true,
      },
    });

    await this.invalidateCache();
    return category;
  }

  async update(id: number, input: UpdateCategoryInput) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new CategoryError(404, "Category not found", "CATEGORY_NOT_FOUND");
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
        ...(input.nameJa !== undefined && { nameJa: input.nameJa }),
        ...(input.nameZh !== undefined && { nameZh: input.nameZh }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.isDiscount !== undefined && { isDiscount: input.isDiscount }),
        ...(input.isPopular !== undefined && { isPopular: input.isPopular }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await this.invalidateCache(id);
    return category;
  }

  async delete(id: number) {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { products: { where: { isActive: true }, take: 1 } },
    });

    if (!existing) {
      throw new CategoryError(404, "Category not found", "CATEGORY_NOT_FOUND");
    }

    if (existing.products.length > 0) {
      throw new CategoryError(400, "카테고리에 연결된 상품이 있어 삭제할 수 없습니다", "CATEGORY_HAS_PRODUCTS");
    }

    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateCache(id);
  }

  async clearAllCache() {
    await cacheService.deletePattern("categor*");
    await cacheService.deletePattern("product*");
  }
}

export class CategoryError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CategoryError";
  }
}

export const categoryService = new CategoryService();
