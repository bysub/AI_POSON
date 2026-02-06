import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { categoriesRouter } from "./categories.js";
import { productsRouter } from "./products.js";
import { ordersRouter } from "./orders.js";
import { paymentsRouter } from "./payments.js";
import { uploadsRouter } from "./uploads.js";
import { suppliersRouter } from "./suppliers.js";
import { purchasesRouter } from "./purchases.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/v1/auth", authRouter);
router.use("/v1/categories", categoriesRouter);
router.use("/v1/products", productsRouter);
router.use("/v1/orders", ordersRouter);
router.use("/v1/payments", paymentsRouter);
router.use("/v1/uploads", uploadsRouter);
router.use("/v1/suppliers", suppliersRouter);
router.use("/v1/purchases", purchasesRouter);

export { router as apiRouter };
