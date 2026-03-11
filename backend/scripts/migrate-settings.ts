import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Settings Refinement Migration ===");

  await prisma.$transaction(async (tx) => {
    // ═══ Phase 1: DeviceSetting → SystemSetting ═══

    // 1-1. selfPoint 포인트정책(4키) → SystemSetting POINT
    const pointPolicyKeys = ["selfNoAutoPoint", "selfPointZero", "selfPointHidden", "selfZero"];
    const spEntries = await tx.deviceSetting.findMany({
      where: {
        deviceId: "KIOSK-002",
        category: "SELF_POINT",
        key: { in: pointPolicyKeys.map((k) => "selfPoint." + k) },
      },
    });
    for (const e of spEntries) {
      const newKey = "point." + e.key.split(".")[1];
      const exists = await tx.systemSetting.findUnique({ where: { key: newKey } });
      if (!exists) {
        await tx.systemSetting.create({ data: { key: newKey, value: e.value, category: "POINT" } });
        console.log("  Created SystemSetting:", newKey);
      }
    }

    // 1-2. selfPoint 알림(7키) → SystemSetting NOTIFICATION
    const notiKeys = [
      "selfPointSMSUse",
      "selfUserCall",
      "selfSMSAdmin",
      "selfKakao",
      "selfCusAlarmUse",
      "selfCusAlarmTime",
      "selfSNSGubun",
    ];
    const notiEntries = await tx.deviceSetting.findMany({
      where: {
        deviceId: "KIOSK-002",
        category: "SELF_POINT",
        key: { in: notiKeys.map((k) => "selfPoint." + k) },
      },
    });
    for (const e of notiEntries) {
      const newKey = "noti." + e.key.split(".")[1];
      const exists = await tx.systemSetting.findUnique({ where: { key: newKey } });
      if (!exists) {
        await tx.systemSetting.create({
          data: { key: newKey, value: e.value, category: "NOTIFICATION" },
        });
        console.log("  Created SystemSetting:", newKey);
      }
    }

    // 1-3. selfEtc 공통(2키) → SystemSetting
    const etcCommon = await tx.deviceSetting.findMany({
      where: {
        deviceId: "KIOSK-002",
        key: { in: ["selfEtc.selfNoAutoGoods", "selfEtc.selfAppCard"] },
      },
    });
    for (const e of etcCommon) {
      const kn = e.key.split(".")[1];
      const newKey = kn === "selfNoAutoGoods" ? "sale.selfNoAutoGoods" : "payment.selfAppCard";
      const cat = kn === "selfNoAutoGoods" ? "SALE" : "PAYMENT";
      const exists = await tx.systemSetting.findUnique({ where: { key: newKey } });
      if (!exists) {
        await tx.systemSetting.create({ data: { key: newKey, value: e.value, category: cat } });
        console.log("  Created SystemSetting:", newKey);
      }
    }

    // selfApple 삭제
    const delApple = await tx.deviceSetting.deleteMany({ where: { key: "selfEtc.selfApple" } });
    console.log("  Deleted selfApple:", delApple.count);

    // 1-4. posPrint 공통영수증(12키) → SystemSetting PRINT
    const receiptKeys = [
      "receiptProductOneLine",
      "receiptBarcode",
      "receiptVat",
      "receiptBottleTotal",
      "receiptItemSeq",
      "receiptPhoneMask",
      "receiptNameMask",
      "cashReceiptAutoIssue",
      "cashReceiptIdShow",
      "saleMessageHide",
      "noCostPriceShow",
      "memberTotalHide",
    ];
    const receiptEntries = await tx.deviceSetting.findMany({
      where: {
        deviceId: "POS-001",
        category: "POS_PRINT",
        key: { in: receiptKeys.map((k) => "posPrint." + k) },
      },
    });
    for (const e of receiptEntries) {
      const newKey = "print." + e.key.split(".")[1];
      const exists = await tx.systemSetting.findUnique({ where: { key: newKey } });
      if (!exists) {
        await tx.systemSetting.create({ data: { key: newKey, value: e.value, category: "PRINT" } });
        console.log("  Created SystemSetting:", newKey);
      }
    }
    console.log("Phase 1 complete");

    // ═══ Phase 2: SystemSetting selfUI 19키 → KIOSK-002 DeviceSetting ═══
    const selfUIKeyNames = [
      "selfSoundGuide",
      "selfCusNum4",
      "selfNoCustomer",
      "selfCusSelect",
      "selfCusAddUse",
      "selfCusAddEtc",
      "selfCusTopMsg",
      "selfCusBTMsg1",
      "selfCusBTMsg2",
      "selfTouchSoundYN",
      "selfMainPage",
      "selfBTInit",
      "selfOneCancel",
      "selfZHotKey",
      "selfCountYN",
      "selfStartHotKey",
      "selfPriceUse",
      "selfPriceType",
      "selfReader",
    ];
    for (const kn of selfUIKeyNames) {
      const ssKey = "point." + kn;
      const ss = await tx.systemSetting.findUnique({ where: { key: ssKey } });
      if (ss) {
        const dsKey = "selfUI." + kn;
        const exists = await tx.deviceSetting.findUnique({
          where: { deviceId_key: { deviceId: "KIOSK-002", key: dsKey } },
        });
        if (!exists) {
          await tx.deviceSetting.create({
            data: { deviceId: "KIOSK-002", key: dsKey, value: ss.value, category: "SELF_UI" },
          });
        }
      }
    }
    console.log("Phase 2 complete (KIOSK-002 selfUI)");

    // ═══ Phase 3: DeviceSetting 내 prefix 변경 ═══

    // 3-1. selfAuto → selfUI
    const selfAutoRemain = await tx.deviceSetting.findMany({ where: { category: "SELF_AUTO" } });
    for (const e of selfAutoRemain) {
      const newKey = "selfUI." + e.key.split(".")[1];
      const exists = await tx.deviceSetting.findUnique({
        where: { deviceId_key: { deviceId: e.deviceId, key: newKey } },
      });
      if (!exists) {
        await tx.deviceSetting.create({
          data: { deviceId: e.deviceId, key: newKey, value: e.value, category: "SELF_UI" },
        });
      }
      await tx.deviceSetting.delete({
        where: { deviceId_key: { deviceId: e.deviceId, key: e.key } },
      });
    }
    console.log("  selfAuto migrated:", selfAutoRemain.length);

    // 3-2. selfEtc 남은 키 재분류
    const selfEtcRemain = await tx.deviceSetting.findMany({ where: { category: "SELF_ETC" } });
    for (const e of selfEtcRemain) {
      const kn = e.key.split(".")[1];
      let newKey: string, newCat: string;
      if (["selfJPYN", "selfCamUse", "selfICSiren"].includes(kn)) {
        newKey = "terminal." + kn;
        newCat = "TERMINAL";
      } else if (kn === "selfBagJPPort") {
        newKey = "selfBag." + kn;
        newCat = "SELF_BAG";
      } else if (kn === "selfGif") {
        newKey = "selfUI." + kn;
        newCat = "SELF_UI";
      } else {
        // selfNoAutoGoods, selfAppCard → already in SystemSetting
        await tx.deviceSetting.delete({
          where: { deviceId_key: { deviceId: e.deviceId, key: e.key } },
        });
        continue;
      }
      const exists = await tx.deviceSetting.findUnique({
        where: { deviceId_key: { deviceId: e.deviceId, key: newKey } },
      });
      if (!exists) {
        await tx.deviceSetting.create({
          data: { deviceId: e.deviceId, key: newKey, value: e.value, category: newCat },
        });
      }
      await tx.deviceSetting.delete({
        where: { deviceId_key: { deviceId: e.deviceId, key: e.key } },
      });
    }
    console.log("  selfEtc migrated:", selfEtcRemain.length);

    // 3-3. posPrint → posOp/posSettle/posReceipt
    const posOpKeyNames = [
      "saleNewProduct",
      "exchangePassword",
      "zeroPriceInput",
      "discountNoPoint",
      "weightNoPoint",
      "saleCancelDisable",
      "cashBackUse",
      "barcodeGroupUse",
      "returnNoPassword",
      "cashForceInput",
      "costOverSellWarn",
      "disabledProductChange",
      "salePriceCompare",
      "categoryScaleInput",
      "shortcutFixedPrice",
      "shortcutNameProcess",
      "bulkPriceFit",
      "posNoCreditSale",
      "discountNoCashback",
      "cardNoDrawer",
      "cashOnlyNoReturn",
      "cardReturnNoDrawer",
      "cardCardPayUse",
      "giftCashReceiptInclude",
      "giftPointInclude",
      "deliveryPointAccrue",
      "barcodeCardPayScreen",
      "cashChangeCardScreen",
      "deliveryDisable",
      "deliveryNoPayClose",
      "deliveryNoPayReturn",
      "deliverySaleType",
      "deliveryNotePrint",
      "deliverySeqPrint",
      "deliveryReceiptManage",
      "deliveryDriverReceipt",
      "deliveryItemArchive",
      "deliverySeqMemberReceipt",
      "holdNoShift",
      "holdReceiptPrint",
      "holdReceiptDetail",
      "deliveryNoShift",
      "firstScanHoldMsg",
      "overdueCustomerWarn",
    ];
    const posSettleKeyNames = [
      "settleCategoryPrint",
      "settleAmountPrint",
      "closeOutstandingPrint",
      "openShiftFiscalPrint",
      "cashbackQrPrint",
      "scale18Barcode",
      "archiveBarcodeNo",
      "eSignArchiveNo",
      "reissueBarcodeNo",
      "receiptNoOutstanding",
    ];
    const posReceiptKeyNames = [
      "slipNoPrint",
      "slipNoHide",
      "cancelDetailPrint",
      "cardReceiptDetail",
      "checkResponsePrint",
      "eCouponNoReceipt",
      "deliveryArchiveDouble",
      "deliveryArchiveSimple",
      "deliveryArchiveNormal",
      "visitDeliveryArchive",
    ];

    const posPrintAll = await tx.deviceSetting.findMany({ where: { category: "POS_PRINT" } });
    let migrated = 0;
    for (const e of posPrintAll) {
      const kn = e.key.split(".")[1];
      let newPrefix: string, newCat: string;
      if (posOpKeyNames.includes(kn)) {
        newPrefix = "posOp";
        newCat = "POS_OPERATION";
      } else if (posSettleKeyNames.includes(kn)) {
        newPrefix = "posSettle";
        newCat = "POS_SETTLE";
      } else if (posReceiptKeyNames.includes(kn)) {
        newPrefix = "posReceipt";
        newCat = "POS_RECEIPT";
      } else if (receiptKeys.includes(kn)) {
        // 공통 영수증 → SystemSetting에 이동 완료, DeviceSetting 삭제
        await tx.deviceSetting.delete({
          where: { deviceId_key: { deviceId: e.deviceId, key: e.key } },
        });
        migrated++;
        continue;
      } else {
        console.log("  Unknown posPrint key:", kn);
        continue;
      }
      const newKey = newPrefix + "." + kn;
      const exists = await tx.deviceSetting.findUnique({
        where: { deviceId_key: { deviceId: e.deviceId, key: newKey } },
      });
      if (!exists) {
        await tx.deviceSetting.create({
          data: { deviceId: e.deviceId, key: newKey, value: e.value, category: newCat },
        });
      }
      await tx.deviceSetting.delete({
        where: { deviceId_key: { deviceId: e.deviceId, key: e.key } },
      });
      migrated++;
    }
    console.log("  posPrint migrated:", migrated, "/", posPrintAll.length);

    // ═══ Phase 4: 원본 삭제 ═══
    const spDel = await tx.deviceSetting.deleteMany({ where: { category: "SELF_POINT" } });
    console.log("  Deleted SELF_POINT:", spDel.count);

    const sprintDel = await tx.deviceSetting.deleteMany({ where: { category: "SELF_PRINT" } });
    console.log("  Deleted SELF_PRINT:", sprintDel.count);

    // SystemSetting point.self* UI키 삭제
    for (const kn of selfUIKeyNames) {
      await tx.systemSetting.deleteMany({ where: { key: "point." + kn } });
    }
    console.log("  Deleted SystemSetting point.self* UI keys");

    // 잔여 구 카테고리 정리
    const oldCats = ["POS_PRINT", "POS_SALE", "SELF_POINT", "SELF_PRINT", "SELF_AUTO", "SELF_ETC"];
    const residual = await tx.deviceSetting.deleteMany({
      where: { category: { in: oldCats } },
    });
    console.log("  Residual old categories cleaned:", residual.count);
  });

  // ═══ Phase 5: 검증 ═══
  console.log("\n=== Verification ===");

  const oldCheck = await prisma.deviceSetting.count({
    where: {
      category: {
        in: ["POS_PRINT", "POS_SALE", "SELF_POINT", "SELF_PRINT", "SELF_AUTO", "SELF_ETC"],
      },
    },
  });
  console.log("Old categories remaining:", oldCheck, oldCheck === 0 ? "✓" : "✗ FAIL");

  type CatCount = { category: string; cnt: number };
  const sysCats = await prisma.$queryRaw<CatCount[]>`
    SELECT category, COUNT(*)::int as cnt FROM system_settings GROUP BY category ORDER BY category
  `;
  console.log("\nSystemSetting categories:");
  for (const c of sysCats) console.log(`  ${c.category}: ${c.cnt}`);

  const devCats = await prisma.$queryRaw<CatCount[]>`
    SELECT ds.category, COUNT(*)::int as cnt
    FROM device_settings ds GROUP BY ds.category ORDER BY ds.category
  `;
  console.log("\nDeviceSetting categories:");
  for (const c of devCats) console.log(`  ${c.category}: ${c.cnt}`);

  type DevTypeCat = { type: string; category: string; cnt: number };
  const devTypeCats = await prisma.$queryRaw<DevTypeCat[]>`
    SELECT d.type, ds.category, COUNT(*)::int as cnt
    FROM device_settings ds JOIN devices d ON d.id = ds.device_id
    GROUP BY d.type, ds.category ORDER BY d.type, ds.category
  `;
  console.log("\nDeviceSetting by device type:");
  for (const c of devTypeCats) console.log(`  ${c.type} > ${c.category}: ${c.cnt}`);

  console.log("\n=== Migration complete ===");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
