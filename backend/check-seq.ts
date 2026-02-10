import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const maxId: any[] = await prisma.$queryRawUnsafe(
    "SELECT MAX(id)::int as max_id FROM purchase_products",
  );
  const seq: any[] = await prisma.$queryRawUnsafe(
    "SELECT last_value::int as last_val FROM purchase_products_id_seq",
  );
  console.log("Max ID in purchase_products:", maxId[0]?.max_id);
  console.log("Sequence last_value:", seq[0]?.last_val);

  if (maxId[0]?.max_id > seq[0]?.last_val) {
    console.log("** MISMATCH! Sequence is behind. Fixing...");
    await prisma.$queryRawUnsafe(
      `SELECT setval('purchase_products_id_seq', (SELECT MAX(id) FROM purchase_products))`,
    );
    console.log("Sequence fixed.");
  } else {
    console.log("Sequence is OK.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
