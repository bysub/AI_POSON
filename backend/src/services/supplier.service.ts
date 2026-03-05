import { SupplierType } from "@prisma/client";
import { prisma } from "../utils/db.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";

const CACHE_TTL = 300;

const supplierInclude = {
  _count: { select: { purchaseProducts: true } },
};

export interface CreateSupplierInput {
  name: string;
  type?: SupplierType;
  businessNumber?: string;
  businessType?: string;
  businessItem?: string;
  representative?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  addressDetail?: string;
  discountRate?: number;
  paymentTerms?: string;
  memo?: string;
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> {
  code?: string;
  isActive?: boolean;
}

export class SupplierService {
  async invalidateCache(id?: number): Promise<void> {
    await cacheService.del(CACHE_KEYS.SUPPLIERS);
    if (id) {
      await cacheService.del(CACHE_KEYS.SUPPLIER(id));
    }
  }

  async list(filters?: { search?: string; type?: string; active?: string }) {
    if (filters?.search || filters?.type || filters?.active !== undefined) {
      return prisma.supplier.findMany({
        where: {
          ...(filters.active !== undefined ? { isActive: filters.active === "true" } : {}),
          ...(filters.type ? { type: filters.type as SupplierType } : {}),
          ...(filters.search
            ? {
                OR: [
                  { name: { contains: filters.search, mode: "insensitive" as const } },
                  { code: { contains: filters.search, mode: "insensitive" as const } },
                  { businessNumber: { contains: filters.search } },
                  { contactName: { contains: filters.search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        include: supplierInclude,
        orderBy: { name: "asc" },
      });
    }

    return cacheService.getOrSet(
      CACHE_KEYS.SUPPLIERS,
      () => prisma.supplier.findMany({
        include: supplierInclude,
        orderBy: { name: "asc" },
      }),
      CACHE_TTL,
    );
  }

  async getById(id: number) {
    return cacheService.getOrSet(
      CACHE_KEYS.SUPPLIER(id),
      () => prisma.supplier.findUnique({
        where: { id },
        include: {
          purchaseProducts: {
            where: { isActive: true },
            select: { id: true, name: true, barcode: true, sellPrice: true, status: true },
            orderBy: { name: "asc" },
          },
          ...supplierInclude,
        },
      }),
      CACHE_TTL,
    );
  }

  async generateCode(): Promise<string> {
    const latest = await prisma.supplier.findFirst({
      where: { code: { startsWith: "S" } },
      orderBy: { code: "desc" },
      select: { code: true },
    });

    if (!latest) return "S001";
    const num = parseInt(latest.code.replace("S", ""), 10);
    return `S${String(num + 1).padStart(3, "0")}`;
  }

  async create(input: CreateSupplierInput) {
    // 사업자번호 중복 확인
    if (input.businessNumber) {
      const existing = await prisma.supplier.findUnique({ where: { businessNumber: input.businessNumber } });
      if (existing) {
        throw new SupplierError(409, "이미 등록된 사업자번호입니다", "SUPPLIER_BN_DUPLICATE");
      }
    }

    const code = await this.generateCode();

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name: input.name,
        type: input.type ?? "ETC",
        businessNumber: input.businessNumber || null,
        businessType: input.businessType,
        businessItem: input.businessItem,
        representative: input.representative,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        address: input.address,
        addressDetail: input.addressDetail,
        discountRate: input.discountRate ?? 0,
        paymentTerms: input.paymentTerms,
        memo: input.memo,
        isActive: true,
      },
      include: supplierInclude,
    });

    await this.invalidateCache();
    return supplier;
  }

  async update(id: number, input: UpdateSupplierInput) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new SupplierError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND");
    }

    // 코드 중복 확인
    if (input.code && input.code !== existing.code) {
      const codeExists = await prisma.supplier.findUnique({ where: { code: input.code } });
      if (codeExists) {
        throw new SupplierError(409, "이미 존재하는 거래처 코드입니다", "SUPPLIER_CODE_DUPLICATE");
      }
    }

    // 사업자번호 중복 확인
    if (input.businessNumber && input.businessNumber !== existing.businessNumber) {
      const bnExists = await prisma.supplier.findUnique({ where: { businessNumber: input.businessNumber } });
      if (bnExists) {
        throw new SupplierError(409, "이미 등록된 사업자번호입니다", "SUPPLIER_BN_DUPLICATE");
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.businessNumber !== undefined && { businessNumber: input.businessNumber || null }),
        ...(input.businessType !== undefined && { businessType: input.businessType }),
        ...(input.businessItem !== undefined && { businessItem: input.businessItem }),
        ...(input.representative !== undefined && { representative: input.representative }),
        ...(input.contactName !== undefined && { contactName: input.contactName }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.addressDetail !== undefined && { addressDetail: input.addressDetail }),
        ...(input.discountRate !== undefined && { discountRate: input.discountRate }),
        ...(input.paymentTerms !== undefined && { paymentTerms: input.paymentTerms }),
        ...(input.memo !== undefined && { memo: input.memo }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: supplierInclude,
    });

    await this.invalidateCache(id);
    return supplier;
  }

  async delete(id: number) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseProducts: { where: { isActive: true } } } } },
    });

    if (!existing) {
      throw new SupplierError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND");
    }

    if (existing._count.purchaseProducts > 0) {
      throw new SupplierError(400, "거래처에 연결된 매입상품이 있어 삭제할 수 없습니다. 먼저 상품의 거래처를 변경해주세요.", "SUPPLIER_HAS_PRODUCTS");
    }

    await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateCache(id);
  }
}

export class SupplierError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SupplierError";
  }
}

export const supplierService = new SupplierService();
