import { Router } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { productService, ProductError } from "../services/product.service.js";
import type { AuthenticatedRequest } from "../types/auth.js";

const router = Router();

/** ProductError → AppError 변환 헬퍼 */
function handleProductError(err: unknown, next: (err: AppError) => void): void {
  if (err instanceof ProductError) {
    next(new AppError(err.statusCode, err.message, err.code));
  } else {
    const msg = err instanceof Error ? err.message : String(err);
    next(new AppError(500, msg, "PRODUCT_ERROR"));
  }
}

// Get all products
router.get("/", optionalAuth, asyncHandler(async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const { categoryId, search, admin } = req.query;
  const isAdminMode = admin === "true";

  // admin=true는 인증된 사용자만 허용 (S-11)
  if (isAdminMode && !authReq.user) {
    return next(new AppError(401, "관리자 모드 조회는 인증이 필요합니다", "UNAUTHORIZED"));
  }

  const catId = categoryId ? parseInt(categoryId as string) : undefined;

  if (search) {
    const products = await productService.search(search as string, { categoryId: catId, adminMode: isAdminMode });
    return res.json({ success: true, data: products });
  }

  const products = isAdminMode
    ? await productService.listForAdmin(catId)
    : await productService.listForKiosk(catId);

  res.json({ success: true, data: products });
}));

// Get product by barcode
router.get("/barcode/:barcode", asyncHandler(async (req, res, next) => {
  const product = await productService.getByBarcode(req.params.barcode);
  if (!product) {
    return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
  }
  res.json({ success: true, data: product });
}));

// Get product by ID
router.get("/:id", asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
  }

  const product = await productService.getById(id);
  if (!product) {
    return next(new AppError(404, "Product not found", "PRODUCT_NOT_FOUND"));
  }
  res.json({ success: true, data: product });
}));

// ========== 관리자 전용 API ==========

// Create product
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { name, sellPrice, categoryIds } = req.body;
    if (!name || sellPrice === undefined || !categoryIds?.length) {
      return next(new AppError(400, "필수 필드가 누락되었습니다 (name, sellPrice, categoryIds)", "MISSING_FIELDS"));
    }

    try {
      const product = await productService.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      handleProductError(err, next);
    }
  }),
);

// Update product
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
    }

    try {
      const product = await productService.update(id, req.body);
      res.json({ success: true, data: product });
    } catch (err) {
      handleProductError(err, next);
    }
  }),
);

// Delete product (soft delete)
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
  }

  try {
    await productService.delete(id);
    res.json({ success: true, message: "상품이 삭제되었습니다" });
  } catch (err) {
    handleProductError(err, next);
  }
}));

// ========== 상품 옵션 API ==========

// Add option
router.post(
  "/:id/options",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
    }

    const { name, price } = req.body;
    if (!name || price === undefined) {
      return next(new AppError(400, "필수 필드가 누락되었습니다 (name, price)", "MISSING_FIELDS"));
    }

    try {
      const option = await productService.createOption(productId, req.body);
      res.status(201).json({ success: true, data: option });
    } catch (err) {
      handleProductError(err, next);
    }
  }),
);

// Update option
router.patch(
  "/:id/options/:optionId",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const productId = parseInt(req.params.id);
    const optionId = parseInt(req.params.optionId);
    if (isNaN(productId) || isNaN(optionId)) {
      return next(new AppError(400, "Invalid ID", "INVALID_ID"));
    }

    try {
      const option = await productService.updateOption(productId, optionId, req.body);
      res.json({ success: true, data: option });
    } catch (err) {
      handleProductError(err, next);
    }
  }),
);

// Delete option
router.delete(
  "/:id/options/:optionId",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const productId = parseInt(req.params.id);
    const optionId = parseInt(req.params.optionId);
    if (isNaN(productId) || isNaN(optionId)) {
      return next(new AppError(400, "Invalid ID", "INVALID_ID"));
    }

    try {
      await productService.deleteOption(productId, optionId);
      res.json({ success: true, message: "옵션이 삭제되었습니다" });
    } catch (err) {
      handleProductError(err, next);
    }
  }),
);

// Update product status
router.patch(
  "/:id/status",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid product ID", "INVALID_ID"));
    }

    const { status } = req.body;
    if (!status) {
      return next(new AppError(400, "상태를 지정해주세요", "MISSING_STATUS"));
    }

    try {
      const updated = await productService.updateStatus(id, status);
      res.json({ success: true, data: updated });
    } catch (err) {
      handleProductError(err, next);
    }
  }),
);

// Clear product cache
router.delete("/cache", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (_req, res) => {
  await productService.invalidateAllCache();
  res.json({ success: true, message: "상품 캐시가 초기화되었습니다" });
}));

export { router as productsRouter };
