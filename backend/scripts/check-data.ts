import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== 데이터베이스 현황 ===\n");

  // 테이블별 카운트
  const counts = {
    admins: await prisma.admin.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    productOptions: await prisma.productOption.count(),
    kiosks: await prisma.kiosk.count(),
    systemSettings: await prisma.systemSetting.count(),
    members: await prisma.member.count(),
  };

  console.log("테이블별 레코드 수:");
  console.table(counts);

  // 관리자 목록
  console.log("\n관리자 목록:");
  const admins = await prisma.admin.findMany({
    select: { username: true, name: true, role: true },
  });
  console.table(admins);

  // 카테고리 목록
  console.log("\n카테고리 목록:");
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, nameEn: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  console.table(categories);

  // 상품 일부
  console.log("\n상품 목록 (상위 5개):");
  const products = await prisma.product.findMany({
    take: 5,
    select: {
      id: true,
      barcode: true,
      name: true,
      sellPrice: true,
      stock: true,
    },
  });
  console.table(
    products.map((p) => ({
      ...p,
      sellPrice: Number(p.sellPrice),
    })),
  );

  // 회원 목록
  console.log("\n회원 목록:");
  const members = await prisma.member.findMany({
    select: { code: true, name: true, phone: true, points: true, grade: true },
  });
  console.table(members);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
