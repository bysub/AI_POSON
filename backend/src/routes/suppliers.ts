import { Router } from "express";
import { prisma } from "../utils/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { cacheService, CACHE_KEYS } from "../utils/cache.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

const CACHE_TTL = 300;

// Get all suppliers (검색/필터 지원)
router.get("/", authenticate, async (req, res) => {
  const { search, type, active } = req.query;

  // 검색/필터가 있으면 캐싱하지 않음
  if (search || type || active !== undefined) {
    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(active !== undefined ? { isActive: active === "true" } : {}),
        ...(type ? { type: type as string } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search as string, mode: "insensitive" } },
                { code: { contains: search as string, mode: "insensitive" } },
                { businessNumber: { contains: search as string } },
                { contactName: { contains: search as string, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: suppliers,
    });
  }

  // 기본 조회 (캐싱)
  const suppliers = await cacheService.getOrSet(
    CACHE_KEYS.SUPPLIERS,
    async () => {
      return prisma.supplier.findMany({
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { name: "asc" },
      });
    },
    CACHE_TTL,
  );

  res.json({
    success: true,
    data: suppliers,
  });
});

// Get supplier by ID
router.get("/:id", authenticate, async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid supplier ID", "INVALID_ID"));
  }

  const supplier = await cacheService.getOrSet(
    CACHE_KEYS.SUPPLIER(id),
    async () => {
      return prisma.supplier.findUnique({
        where: { id },
        include: {
          products: {
            where: { isActive: true },
            select: { id: true, name: true, barcode: true, sellPrice: true, status: true },
            orderBy: { name: "asc" },
          },
          _count: { select: { products: true } },
        },
      });
    },
    CACHE_TTL,
  );

  if (!supplier) {
    return next(new AppError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: supplier,
  });
});

// ========== 관리자 전용 API ==========

// 거래처 코드 자동생성 (S001, S002, ...)
async function generateSupplierCode(): Promise<string> {
  const latest = await prisma.supplier.findFirst({
    where: { code: { startsWith: "S" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  if (!latest) return "S001";

  const num = parseInt(latest.code.replace("S", ""), 10);
  const next = num + 1;
  return `S${String(next).padStart(3, "0")}`;
}

// Create supplier
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const {
      name,
      type,
      businessNumber,
      businessType,
      businessItem,
      representative,
      contactName,
      contactPhone,
      contactEmail,
      address,
      addressDetail,
      discountRate,
      paymentTerms,
      memo,
    } = req.body;

    if (!name) {
      return next(new AppError(400, "거래처명은 필수입니다", "MISSING_FIELDS"));
    }

    // 사업자번호 중복 확인
    if (businessNumber) {
      const existingBn = await prisma.supplier.findUnique({ where: { businessNumber } });
      if (existingBn) {
        return next(new AppError(409, "이미 등록된 사업자번호입니다", "SUPPLIER_BN_DUPLICATE"));
      }
    }

    const code = await generateSupplierCode();

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name,
        type: type ?? "ETC",
        businessNumber: businessNumber || null,
        businessType,
        businessItem,
        representative,
        contactName,
        contactPhone,
        contactEmail,
        address,
        addressDetail,
        discountRate: discountRate ?? 0,
        paymentTerms,
        memo,
        isActive: true,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    await invalidateSupplierCache();

    res.status(201).json({
      success: true,
      data: supplier,
    });
  },
);

// Update supplier
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res, next) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(new AppError(400, "Invalid supplier ID", "INVALID_ID"));
    }

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND"));
    }

    const {
      code,
      name,
      type,
      businessNumber,
      businessType,
      businessItem,
      representative,
      contactName,
      contactPhone,
      contactEmail,
      address,
      addressDetail,
      discountRate,
      paymentTerms,
      memo,
      isActive,
    } = req.body;

    // 코드 변경 시 중복 확인
    if (code && code !== existing.code) {
      const codeExists = await prisma.supplier.findUnique({ where: { code } });
      if (codeExists) {
        return next(
          new AppError(409, "이미 존재하는 거래처 코드입니다", "SUPPLIER_CODE_DUPLICATE"),
        );
      }
    }

    // 사업자번호 변경 시 중복 확인
    if (businessNumber && businessNumber !== existing.businessNumber) {
      const bnExists = await prisma.supplier.findUnique({ where: { businessNumber } });
      if (bnExists) {
        return next(new AppError(409, "이미 등록된 사업자번호입니다", "SUPPLIER_BN_DUPLICATE"));
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(businessNumber !== undefined && { businessNumber: businessNumber || null }),
        ...(businessType !== undefined && { businessType }),
        ...(businessItem !== undefined && { businessItem }),
        ...(representative !== undefined && { representative }),
        ...(contactName !== undefined && { contactName }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(address !== undefined && { address }),
        ...(addressDetail !== undefined && { addressDetail }),
        ...(discountRate !== undefined && { discountRate }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(memo !== undefined && { memo }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    await invalidateSupplierCache(id);

    res.json({
      success: true,
      data: supplier,
    });
  },
);

// Delete supplier (soft delete)
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return next(new AppError(400, "Invalid supplier ID", "INVALID_ID"));
  }

  const existing = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

  if (!existing) {
    return next(new AppError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND"));
  }

  // 연결된 상품이 있으면 삭제 불가
  if (existing._count.products > 0) {
    return next(
      new AppError(
        400,
        "거래처에 연결된 상품이 있어 삭제할 수 없습니다. 먼저 상품의 거래처를 변경해주세요.",
        "SUPPLIER_HAS_PRODUCTS",
      ),
    );
  }

  // Soft delete
  await prisma.supplier.update({
    where: { id },
    data: { isActive: false },
  });

  await invalidateSupplierCache(id);

  res.json({
    success: true,
    message: "거래처가 삭제되었습니다",
  });
});

// ========== 캐시 관리 ==========

async function invalidateSupplierCache(id?: number): Promise<void> {
  await cacheService.del(CACHE_KEYS.SUPPLIERS);
  if (id) {
    await cacheService.del(CACHE_KEYS.SUPPLIER(id));
  }
}

export { router as suppliersRouter };
