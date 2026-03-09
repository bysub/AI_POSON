import { Router } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../utils/db.js";

const router = Router();

// 손익분석 API
router.get(
  "/profit-loss",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return next(new AppError(400, "startDate, endDate는 필수입니다", "VALIDATION_ERROR"));
    }

    const start = new Date(`${startDate}T00:00:00+09:00`);
    const end = new Date(`${endDate}T23:59:59.999+09:00`);

    // 매출 일별 집계
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ["PAID", "PREPARING", "COMPLETED"] },
      },
      select: { createdAt: true, totalAmount: true },
    });

    // 매입 일별 집계
    const purchases = await prisma.purchase.findMany({
      where: {
        purchaseDate: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      },
      select: { purchaseDate: true, totalAmount: true },
    });

    // KST 기준 날짜 키 생성 (UTC → KST +9h)
    const toKstDateKey = (d: Date) => {
      const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      return kst.toISOString().split("T")[0];
    };

    // 날짜별 맵 구축
    const dailyMap = new Map<string, { sales: number; purchases: number }>();
    const cursorDate = new Date(`${startDate}T00:00:00+09:00`);
    const endDate_ = new Date(`${endDate}T00:00:00+09:00`);
    while (cursorDate <= endDate_) {
      dailyMap.set(toKstDateKey(cursorDate), { sales: 0, purchases: 0 });
      cursorDate.setDate(cursorDate.getDate() + 1);
    }

    for (const o of orders) {
      const key = toKstDateKey(o.createdAt);
      const entry = dailyMap.get(key);
      if (entry) entry.sales += Number(o.totalAmount);
    }

    for (const p of purchases) {
      const key = toKstDateKey(p.purchaseDate);
      const entry = dailyMap.get(key);
      if (entry) entry.purchases += Number(p.totalAmount);
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, d]) => ({
        date,
        sales: d.sales,
        purchases: d.purchases,
        profit: d.sales - d.purchases,
        rate: d.sales > 0 ? Math.round(((d.sales - d.purchases) / d.sales) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalSales = daily.reduce((s, d) => s + d.sales, 0);
    const totalPurchases = daily.reduce((s, d) => s + d.purchases, 0);
    const grossProfit = totalSales - totalPurchases;
    const profitRate = totalSales > 0 ? Math.round((grossProfit / totalSales) * 1000) / 10 : 0;

    res.json({
      success: true,
      data: {
        summary: { totalSales, totalPurchases, grossProfit, profitRate },
        daily,
      },
    });
  }),
);

export { router as statsRouter };
