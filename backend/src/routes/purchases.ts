import { Router } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { purchaseService, PurchaseError } from "../services/purchase.service.js";

const router = Router();

function handlePurchaseError(err: unknown, next: (err: AppError) => void): void {
  if (err instanceof PurchaseError) {
    next(new AppError(err.statusCode, err.message, err.code));
  } else {
    const msg = err instanceof Error ? err.message : String(err);
    next(new AppError(500, msg, "PURCHASE_ERROR"));
  }
}

// Get all purchases (필터/페이지네이션)
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { page = "1", limit = "20", supplierId, status, startDate, endDate, search } = req.query;
  const result = await purchaseService.list({
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
    supplierId: supplierId as string | undefined,
    status: status as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    search: search as string | undefined,
  });
  res.json({ success: true, data: result.purchases, pagination: result.pagination });
}));

// 통계 API (/:id 보다 먼저 선언)
router.get("/stats/summary", authenticate, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await purchaseService.getStatsSummary({
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  res.json({ success: true, data });
}));

// 일별 매입 통계
router.get("/stats/daily", authenticate, asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return next(new AppError(400, "startDate, endDate는 필수입니다", "VALIDATION_ERROR"));
  }
  const data = await purchaseService.getDailyStats({
    startDate: startDate as string,
    endDate: endDate as string,
  });
  res.json({ success: true, data });
}));

// 거래처별 매입 통계
router.get("/stats/by-supplier", authenticate, asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return next(new AppError(400, "startDate, endDate는 필수입니다", "VALIDATION_ERROR"));
  }
  const data = await purchaseService.getBySupplierStats({
    startDate: startDate as string,
    endDate: endDate as string,
  });
  res.json({ success: true, data });
}));

// 상품별 매입 통계
router.get("/stats/by-product", authenticate, asyncHandler(async (req, res, next) => {
  const { startDate, endDate, limit } = req.query;
  if (!startDate || !endDate) {
    return next(new AppError(400, "startDate, endDate는 필수입니다", "VALIDATION_ERROR"));
  }
  const data = await purchaseService.getByProductStats({
    startDate: startDate as string,
    endDate: endDate as string,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });
  res.json({ success: true, data });
}));

// Get purchase by ID
router.get("/:id", authenticate, asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid purchase ID", "INVALID_ID"));
  }
  const purchase = await purchaseService.getById(id);
  if (!purchase) {
    return next(new AppError(404, "매입 내역을 찾을 수 없습니다", "PURCHASE_NOT_FOUND"));
  }
  res.json({ success: true, data: purchase });
}));

// Create purchase
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { supplierId, purchaseDate, items, memo, taxIncluded = true } = req.body;
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return next(new AppError(400, "거래처와 매입 상품은 필수입니다", "MISSING_FIELDS"));
    }
    try {
      const username = (req as unknown as { user: { username: string } }).user?.username ?? null;
      const purchase = await purchaseService.create({
        supplierId: parseInt(supplierId, 10),
        purchaseDate,
        items,
        memo,
        taxIncluded: !!taxIncluded,
        createdBy: username,
      });
      res.status(201).json({ success: true, data: purchase });
    } catch (err) {
      handlePurchaseError(err, next);
    }
  }),
);

// Update purchase
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid purchase ID", "INVALID_ID"));
    }
    try {
      const username = (req as unknown as { user: { username: string } }).user?.username ?? null;
      const { supplierId, purchaseDate, items, memo, status, taxIncluded } = req.body;
      const purchase = await purchaseService.update(id, {
        supplierId: supplierId !== undefined ? parseInt(supplierId, 10) : undefined,
        purchaseDate,
        items,
        memo,
        status,
        taxIncluded,
        createdBy: username,
      });
      res.json({ success: true, data: purchase });
    } catch (err) {
      handlePurchaseError(err, next);
    }
  }),
);

// Cancel purchase
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid purchase ID", "INVALID_ID"));
    }
    try {
      const username = (req as unknown as { user: { username: string } }).user?.username ?? null;
      await purchaseService.cancel(id, username);
      res.json({ success: true, message: "매입이 취소되었습니다" });
    } catch (err) {
      handlePurchaseError(err, next);
    }
  }),
);

export { router as purchasesRouter };
