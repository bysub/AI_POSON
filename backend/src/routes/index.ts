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
import { purchaseProductsRouter } from "./purchase-products.js";
import { branchesRouter } from "./branches.js";
import { settingsRouter } from "./settings.js";
import { devicesRouter } from "./devices.js";
import { adminsRouter } from "./admins.js";
import { membersRouter } from "./members.js";
import { stockMovementsRouter } from "./stock-movements.js";

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
router.use("/v1/purchase-products", purchaseProductsRouter);
router.use("/v1/branches", branchesRouter);
router.use("/v1/settings", settingsRouter);
router.use("/v1/devices", devicesRouter);
router.use("/v1/admins", adminsRouter);
router.use("/v1/members", membersRouter);
router.use("/v1/stock-movements", stockMovementsRouter);

export { router as apiRouter };
