import { Router } from "express";
import { prisma } from "../utils/db.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// 카테고리별 설정 조회
router.get("/:category", authenticate, async (req, res) => {
  const { category } = req.params;

  const settings = await prisma.systemSetting.findMany({
    where: { category: category.toUpperCase() },
  });

  // key-value 맵으로 변환
  const data: Record<string, string> = {};
  for (const s of settings) {
    data[s.key] = s.value;
  }

  res.json({ success: true, data });
});

// 카테고리별 설정 일괄 저장 (upsert)
router.put(
  "/:category",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  async (req, res) => {
    const category = req.params.category.toUpperCase();
    const entries = req.body as Record<string, string>;

    const upserts = Object.entries(entries).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value ?? ""), category },
        create: { key, value: String(value ?? ""), category },
      }),
    );

    await prisma.$transaction(upserts);

    // 저장 후 다시 조회해서 반환
    const settings = await prisma.systemSetting.findMany({
      where: { category },
    });

    const data: Record<string, string> = {};
    for (const s of settings) {
      data[s.key] = s.value;
    }

    res.json({ success: true, data });
  },
);

export { router as settingsRouter };
