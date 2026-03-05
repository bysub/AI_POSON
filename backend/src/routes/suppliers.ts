import { Router } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { supplierService, SupplierError } from "../services/supplier.service.js";

const router = Router();

function handleSupplierError(err: unknown, next: (err: AppError) => void): void {
  if (err instanceof SupplierError) {
    next(new AppError(err.statusCode, err.message, err.code));
  } else {
    const msg = err instanceof Error ? err.message : String(err);
    next(new AppError(500, msg, "SUPPLIER_ERROR"));
  }
}

// Get all suppliers
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { search, type, active } = req.query;
  const suppliers = await supplierService.list({
    search: search as string | undefined,
    type: type as string | undefined,
    active: active as string | undefined,
  });
  res.json({ success: true, data: suppliers });
}));

// Get supplier by ID
router.get("/:id", authenticate, asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid supplier ID", "INVALID_ID"));
  }

  const supplier = await supplierService.getById(id);
  if (!supplier) {
    return next(new AppError(404, "거래처를 찾을 수 없습니다", "SUPPLIER_NOT_FOUND"));
  }
  res.json({ success: true, data: supplier });
}));

// Create supplier
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    if (!req.body.name) {
      return next(new AppError(400, "거래처명은 필수입니다", "MISSING_FIELDS"));
    }
    try {
      const supplier = await supplierService.create(req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (err) {
      handleSupplierError(err, next);
    }
  }),
);

// Update supplier
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid supplier ID", "INVALID_ID"));
    }
    try {
      const supplier = await supplierService.update(id, req.body);
      res.json({ success: true, data: supplier });
    } catch (err) {
      handleSupplierError(err, next);
    }
  }),
);

// Delete supplier
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid supplier ID", "INVALID_ID"));
  }
  try {
    await supplierService.delete(id);
    res.json({ success: true, message: "거래처가 삭제되었습니다" });
  } catch (err) {
    handleSupplierError(err, next);
  }
}));

export { router as suppliersRouter };
