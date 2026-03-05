import { Router } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { categoryService, CategoryError } from "../services/category.service.js";

const router = Router();

function handleCategoryError(err: unknown, next: (err: AppError) => void): void {
  if (err instanceof CategoryError) {
    next(new AppError(err.statusCode, err.message, err.code));
  } else {
    const msg = err instanceof Error ? err.message : String(err);
    next(new AppError(500, msg, "CATEGORY_ERROR"));
  }
}

// Get all categories
router.get("/", asyncHandler(async (_req, res) => {
  const categories = await categoryService.list();
  res.json({ success: true, data: categories });
}));

// Get category by ID
router.get("/:id", asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid category ID", "INVALID_ID"));
  }

  const category = await categoryService.getById(id);
  if (!category) {
    return next(new AppError(404, "Category not found", "CATEGORY_NOT_FOUND"));
  }
  res.json({ success: true, data: category });
}));

// Create category
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    if (!req.body.name) {
      return next(new AppError(400, "카테고리명은 필수입니다", "MISSING_NAME"));
    }
    const category = await categoryService.create(req.body);
    res.status(201).json({ success: true, data: category });
  }),
);

// Update category
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError(400, "Invalid category ID", "INVALID_ID"));
    }
    try {
      const category = await categoryService.update(id, req.body);
      res.json({ success: true, data: category });
    } catch (err) {
      handleCategoryError(err, next);
    }
  }),
);

// Delete category
router.delete("/:id", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError(400, "Invalid category ID", "INVALID_ID"));
  }
  try {
    await categoryService.delete(id);
    res.json({ success: true, message: "카테고리가 삭제되었습니다" });
  } catch (err) {
    handleCategoryError(err, next);
  }
}));

// Clear cache
router.delete("/cache", authenticate, authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (_req, res) => {
  await categoryService.clearAllCache();
  res.json({ success: true, message: "캐시가 초기화되었습니다" });
}));

export { router as categoriesRouter };
