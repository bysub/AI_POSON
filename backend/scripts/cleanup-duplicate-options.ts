import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupDuplicateOptions() {
  console.log("Cleaning up duplicate product options...");

  // 모든 상품 옵션 조회
  const allOptions = await prisma.productOption.findMany({
    orderBy: [{ productId: "asc" }, { name: "asc" }, { id: "asc" }],
  });

  // productId + name 별로 그룹화
  const optionGroups = new Map<string, number[]>();
  for (const option of allOptions) {
    const key = `${option.productId}-${option.name}`;
    if (!optionGroups.has(key)) {
      optionGroups.set(key, []);
    }
    optionGroups.get(key)!.push(option.id);
  }

  // 중복된 항목 삭제 (첫 번째 항목만 남기고)
  const idsToDelete: number[] = [];
  for (const [key, ids] of optionGroups) {
    if (ids.length > 1) {
      console.log(`Duplicate found for ${key}: ${ids.length} items`);
      // 첫 번째 제외하고 나머지 삭제
      idsToDelete.push(...ids.slice(1));
    }
  }

  if (idsToDelete.length > 0) {
    const result = await prisma.productOption.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    console.log(`Deleted ${result.count} duplicate options`);
  } else {
    console.log("No duplicates found");
  }

  // 결과 확인
  const remainingOptions = await prisma.productOption.count();
  console.log(`Remaining options: ${remainingOptions}`);
}

cleanupDuplicateOptions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
