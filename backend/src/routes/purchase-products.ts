import { Router } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { purchaseProductService, PurchaseProductError } from "../services/purchase-product.service.js";

const router = Router();

function handlePurchaseProductError(err: unknown, next: (err: AppError) => void): void {
  if (err instanceof PurchaseProductError) {
    next(new AppError(err.statusCode, err.message, err.code));
  } else {
    const msg = err instanceof Error ? err.message : String(err);
    next(new AppError(500, msg, "PURCHASE_PRODUCT_ERROR"));
  }
}

// 다음 바코드 번호 자동 생성
router.get("/next-barcode", authenticate, asyncHandler(async (req, res) => {
  const productType = (req.query.productType as string) || "";
  const data = await purchaseProductService.getNextBarcode(productType);
  res.json({ success: true, data });
}));

// 매입상품 목록
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { supplierId, search, taxType, lCode, mCode, sCode } = req.query;
  const products = await purchaseProductService.list({
    supplierId: supplierId as string | undefined,
    search: search as string | undefined,
    taxType: taxType as string | undefined,
    lCode: lCode as string | undefined,
    mCode: mCode as string | undefined,
    sCode: sCode as string | undefined,
  });
  res.json({ success: true, data: products });
}));

// 매입상품 상세 조회
router.get("/:id", authenticate, asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid purchase product ID", "INVALID_ID"));
  }
  const product = await purchaseProductService.getById(id);
  if (!product) {
    return next(new AppError(404, "매입상품을 찾을 수 없습니다", "PURCHASE_PRODUCT_NOT_FOUND"));
  }
  res.json({ success: true, data: product });
}));

// 매입상품 등록
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { barcode, name, sellPrice, taxType, productType, lCode } = req.body;
    if (!barcode || !name || sellPrice === undefined) {
      return next(new AppError(400, "바코드, 상품명, 판매가는 필수입니다", "MISSING_FIELDS"));
    }
    if (!productType) {
      return next(new AppError(400, "상품구분은 필수입니다", "MISSING_FIELDS"));
    }
    if (!lCode) {
      return next(new AppError(400, "분류코드는 필수입니다", "MISSING_FIELDS"));
    }
    if (!taxType) {
      return next(new AppError(400, "과세유형은 필수입니다", "MISSING_FIELDS"));
    }
    try {
      const product = await purchaseProductService.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      handlePurchaseProductError(err, next);
    }
  }),
);

// 매입상품 수정
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid purchase product ID", "INVALID_ID"));
    }
    try {
      const product = await purchaseProductService.update(id, req.body);
      res.json({ success: true, data: product });
    } catch (err) {
      handlePurchaseProductError(err, next);
    }
  }),
);

// 매입상품 삭제 (soft delete)
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid purchase product ID", "INVALID_ID"));
    }
    try {
      await purchaseProductService.delete(id);
      res.json({ success: true, message: "매입상품이 삭제되었습니다" });
    } catch (err) {
      handlePurchaseProductError(err, next);
    }
  }),
);

// 재고 동기화
router.post(
  "/sync-stock",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res) => {
    const username = (req as unknown as { user: { username: string } }).user?.username ?? null;
    const result = await purchaseProductService.syncStock(username);
    res.json({
      success: true,
      message: `${result.count}개 상품의 재고가 동기화되었습니다`,
    });
  }),
);

export { router as purchaseProductsRouter };
