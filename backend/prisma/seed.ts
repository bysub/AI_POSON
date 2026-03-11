import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Admin 생성
  const adminPassword = await bcrypt.hash("admin123", 12);
  const managerPassword = await bcrypt.hash("manager123", 12);

  const admins = await Promise.all([
    prisma.admin.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        passwordHash: adminPassword,
        name: "시스템 관리자",
        role: "ADMIN",
        isActive: true,
      },
    }),
    prisma.admin.upsert({
      where: { username: "manager" },
      update: {},
      create: {
        username: "manager",
        passwordHash: managerPassword,
        name: "매장 관리자",
        role: "MANAGER",
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${admins.length} admins`);

  // 2. 카테고리 생성
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: "커피",
        nameEn: "Coffee",
        nameJa: "コーヒー",
        nameZh: "咖啡",
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: "음료",
        nameEn: "Beverage",
        nameJa: "飲み物",
        nameZh: "饮料",
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: "디저트",
        nameEn: "Dessert",
        nameJa: "デザート",
        nameZh: "甜点",
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: "베이커리",
        nameEn: "Bakery",
        nameJa: "ベーカリー",
        nameZh: "面包",
        sortOrder: 4,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: "MD상품",
        nameEn: "Merchandise",
        nameJa: "グッズ",
        nameZh: "商品",
        sortOrder: 5,
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${categories.length} categories`);

  // 3. 상품 생성
  const products = await Promise.all([
    // 커피
    prisma.product.upsert({
      where: { barcode: "COFFEE001" },
      update: {},
      create: {
        barcode: "COFFEE001",
        name: "아메리카노",
        nameEn: "Americano",
        nameJa: "アメリカーノ",
        nameZh: "美式咖啡",
        description: "깔끔한 맛의 아메리카노",
        sellPrice: 4500,
        costPrice: 1200,

        categoryId: 1,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "COFFEE002" },
      update: {},
      create: {
        barcode: "COFFEE002",
        name: "카페라떼",
        nameEn: "Cafe Latte",
        nameJa: "カフェラテ",
        nameZh: "拿铁咖啡",
        description: "부드러운 우유와 에스프레소의 조화",
        sellPrice: 5000,
        costPrice: 1500,

        categoryId: 1,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "COFFEE003" },
      update: {},
      create: {
        barcode: "COFFEE003",
        name: "카푸치노",
        nameEn: "Cappuccino",
        nameJa: "カプチーノ",
        nameZh: "卡布奇诺",
        description: "풍성한 우유 거품의 카푸치노",
        sellPrice: 5000,
        costPrice: 1500,

        categoryId: 1,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "COFFEE004" },
      update: {},
      create: {
        barcode: "COFFEE004",
        name: "바닐라 라떼",
        nameEn: "Vanilla Latte",
        nameJa: "バニララテ",
        nameZh: "香草拿铁",
        description: "달콤한 바닐라 향의 라떼",
        sellPrice: 5500,
        costPrice: 1700,

        categoryId: 1,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "COFFEE005" },
      update: {},
      create: {
        barcode: "COFFEE005",
        name: "카라멜 마키아또",
        nameEn: "Caramel Macchiato",
        nameJa: "キャラメルマキアート",
        nameZh: "焦糖玛奇朵",
        description: "달콤한 카라멜 소스가 올라간 마키아또",
        sellPrice: 5800,
        costPrice: 1800,

        categoryId: 1,
        isActive: true,
      },
    }),
    // 음료
    prisma.product.upsert({
      where: { barcode: "BEV001" },
      update: {},
      create: {
        barcode: "BEV001",
        name: "녹차",
        nameEn: "Green Tea",
        nameJa: "緑茶",
        nameZh: "绿茶",
        description: "깊은 맛의 녹차",
        sellPrice: 4500,
        costPrice: 1000,

        categoryId: 2,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "BEV002" },
      update: {},
      create: {
        barcode: "BEV002",
        name: "유자차",
        nameEn: "Yuzu Tea",
        nameJa: "ゆず茶",
        nameZh: "柚子茶",
        description: "상큼한 유자차",
        sellPrice: 5000,
        costPrice: 1200,

        categoryId: 2,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "BEV003" },
      update: {},
      create: {
        barcode: "BEV003",
        name: "아이스티",
        nameEn: "Iced Tea",
        nameJa: "アイスティー",
        nameZh: "冰茶",
        description: "시원한 아이스티",
        sellPrice: 4000,
        costPrice: 800,

        categoryId: 2,
        isActive: true,
      },
    }),
    // 디저트
    prisma.product.upsert({
      where: { barcode: "DESSERT001" },
      update: {},
      create: {
        barcode: "DESSERT001",
        name: "티라미수",
        nameEn: "Tiramisu",
        nameJa: "ティラミス",
        nameZh: "提拉米苏",
        description: "진한 마스카포네 티라미수",
        sellPrice: 6500,
        costPrice: 2500,

        categoryId: 3,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "DESSERT002" },
      update: {},
      create: {
        barcode: "DESSERT002",
        name: "치즈케이크",
        nameEn: "Cheesecake",
        nameJa: "チーズケーキ",
        nameZh: "芝士蛋糕",
        description: "부드러운 뉴욕 치즈케이크",
        sellPrice: 6000,
        costPrice: 2200,

        categoryId: 3,
        isActive: true,
      },
    }),
    // 베이커리
    prisma.product.upsert({
      where: { barcode: "BAKERY001" },
      update: {},
      create: {
        barcode: "BAKERY001",
        name: "크루아상",
        nameEn: "Croissant",
        nameJa: "クロワッサン",
        nameZh: "可颂",
        description: "바삭한 버터 크루아상",
        sellPrice: 3500,
        costPrice: 1200,

        categoryId: 4,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { barcode: "BAKERY002" },
      update: {},
      create: {
        barcode: "BAKERY002",
        name: "소금빵",
        nameEn: "Salt Bread",
        nameJa: "塩パン",
        nameZh: "盐面包",
        description: "바삭하고 고소한 소금빵",
        sellPrice: 3000,
        costPrice: 900,

        categoryId: 4,
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${products.length} products`);

  // 4. 상품 옵션 생성 (기존 옵션이 없는 경우에만)
  const coffeeProducts = products.filter((p) => p.barcode.startsWith("COFFEE"));
  for (const product of coffeeProducts) {
    // 해당 상품의 기존 옵션 확인
    const existingOptions = await prisma.productOption.findMany({
      where: { productId: product.id },
    });

    // 옵션이 없을 때만 생성
    if (existingOptions.length === 0) {
      await prisma.productOption.createMany({
        data: [
          { productId: product.id, name: "ICE", price: 0, isRequired: false },
          { productId: product.id, name: "HOT", price: 0, isRequired: false },
          { productId: product.id, name: "사이즈업 (L)", price: 500, isRequired: false },
          { productId: product.id, name: "샷 추가", price: 500, isRequired: false },
        ],
      });
    }
  }
  console.log("Created product options");

  // 5. 키오스크 설정
  const kiosks = await Promise.all([
    prisma.kiosk.upsert({
      where: { kioskCode: "KIOSK-001" },
      update: {},
      create: {
        kioskCode: "KIOSK-001",
        name: "키오스크 1번",
        location: "1층 입구",
        vanProvider: "NICE",
        isActive: true,
      },
    }),
    prisma.kiosk.upsert({
      where: { kioskCode: "KIOSK-002" },
      update: {},
      create: {
        kioskCode: "KIOSK-002",
        name: "키오스크 2번",
        location: "2층 로비",
        vanProvider: "KICC",
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${kiosks.length} kiosks`);

  // 6. 기기 등록
  const devices = await Promise.all([
    prisma.device.upsert({
      where: { id: "POS-001" },
      update: {},
      create: { id: "POS-001", name: "POS 1번", type: "POS", isActive: true },
    }),
    prisma.device.upsert({
      where: { id: "KIOSK-001" },
      update: {},
      create: { id: "KIOSK-001", name: "키오스크 1번", type: "KIOSK", isActive: true },
    }),
    prisma.device.upsert({
      where: { id: "KIOSK-002" },
      update: {},
      create: { id: "KIOSK-002", name: "키오스크 2번", type: "KIOSK", isActive: true },
    }),
    prisma.device.upsert({
      where: { id: "KITCHEN-001" },
      update: {},
      create: { id: "KITCHEN-001", name: "주방 디스플레이", type: "KITCHEN", isActive: true },
    }),
  ]);
  console.log(`Created ${devices.length} devices`);

  // 7. 시스템 설정 (공통 환경설정 — 8개 카테고리)
  const systemSettingsData: { key: string; value: string; category: string }[] = [
    // 매장 기본
    { key: "store.name", value: "POSON 카페", category: "STORE" },
    { key: "store.businessNumber", value: "123-45-67890", category: "STORE" },
    { key: "store.address", value: "서울시 강남구 테헤란로 123", category: "STORE" },
    // SALE (판매 운영) — 주요 키만 시드
    { key: "sale.taxRate", value: "10", category: "SALE" },
    { key: "sale.tableSelectEnabled", value: "0", category: "SALE" },
    // CLOSING (마감)
    { key: "closing.openDay", value: "", category: "CLOSING" },
    { key: "closing.startPrice", value: "0", category: "CLOSING" },
    { key: "closing.allFinish", value: "1", category: "CLOSING" },
    { key: "closing.jobFinishCashdraw", value: "0", category: "CLOSING" },
    // PAYMENT (결제 정책) — 주요 키만 시드
    { key: "payment.defaultVan", value: "NICE", category: "PAYMENT" },
    { key: "payment.timeout", value: "30000", category: "PAYMENT" },
    { key: "payment.cardEnabled", value: "1", category: "PAYMENT" },
    { key: "payment.cashEnabled", value: "1", category: "PAYMENT" },
    { key: "payment.applePayEnabled", value: "0", category: "PAYMENT" },
    { key: "payment.selfAppCard", value: "0", category: "PAYMENT" },
    // PRINT (영수증/출력)
    { key: "print.printWidth", value: "42", category: "PRINT" },
    { key: "print.headerLine1", value: "POSON 카페", category: "PRINT" },
    { key: "print.receiptVat", value: "1", category: "PRINT" },
    { key: "print.selfAutoPrint", value: "0", category: "PRINT" },
    // POINT (포인트/회원)
    { key: "point.salePoint", value: "5", category: "POINT" },
    { key: "point.selfNoAutoPoint", value: "0", category: "POINT" },
    { key: "point.selfPointZero", value: "0", category: "POINT" },
    // NOTIFICATION (알림/통신)
    { key: "noti.selfPointSMSUse", value: "0", category: "NOTIFICATION" },
    { key: "noti.selfUserCall", value: "0", category: "NOTIFICATION" },
    { key: "noti.selfSMSAdmin", value: "1", category: "NOTIFICATION" },
    { key: "noti.selfKakao", value: "1", category: "NOTIFICATION" },
    { key: "noti.selfCusAlarmUse", value: "1", category: "NOTIFICATION" },
    { key: "noti.selfCusAlarmTime", value: "0", category: "NOTIFICATION" },
    { key: "noti.selfSNSGubun", value: "0", category: "NOTIFICATION" },
    // 소리/효과음 (from SALE, PAYMENT, POINT)
    { key: "noti.productSound", value: "1", category: "NOTIFICATION" },
    { key: "noti.cardWavOpt", value: "0", category: "NOTIFICATION" },
    { key: "noti.noBillSound", value: "0", category: "NOTIFICATION" },
    // SYSTEM
    { key: "system.logLevel", value: "1", category: "SYSTEM" },
    { key: "system.autoBackup", value: "1", category: "SYSTEM" },
  ];

  for (const s of systemSettingsData) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`Created ${systemSettingsData.length} system settings`);

  // 8. 기기별 설정 (DeviceSetting — 새 카테고리 체계)
  const deviceSettingsData: { deviceId: string; key: string; value: string; category: string }[] = [
    // POS-01: TERMINAL
    { deviceId: "POS-001", key: "terminal.posNo", value: "1", category: "TERMINAL" },
    { deviceId: "POS-001", key: "terminal.printerPort", value: "COM1", category: "TERMINAL" },
    { deviceId: "POS-001", key: "terminal.drawerPort", value: "COM2", category: "TERMINAL" },
    // POS-01: VAN
    { deviceId: "POS-001", key: "van.vanSelect", value: "4", category: "VAN" },
    { deviceId: "POS-001", key: "van.vanIp", value: "127.0.0.1", category: "VAN" },
    { deviceId: "POS-001", key: "van.vanPort", value: "9100", category: "VAN" },
    // POS-01: POS_OPERATION (판매/동작)
    { deviceId: "POS-001", key: "posOp.saleNewProduct", value: "1", category: "POS_OPERATION" },
    { deviceId: "POS-001", key: "posOp.cashBackUse", value: "1", category: "POS_OPERATION" },
    { deviceId: "POS-001", key: "posOp.cashForceInput", value: "1", category: "POS_OPERATION" },
    // POS-01: POS_SETTLE
    { deviceId: "POS-001", key: "posSettle.settleCategoryPrint", value: "1", category: "POS_SETTLE" },
    // POS-01: POS_RECEIPT
    { deviceId: "POS-001", key: "posReceipt.checkResponsePrint", value: "1", category: "POS_RECEIPT" },
    // KIOSK-01: TERMINAL
    { deviceId: "KIOSK-001", key: "terminal.posNo", value: "101", category: "TERMINAL" },
    { deviceId: "KIOSK-001", key: "terminal.printerPort", value: "COM1", category: "TERMINAL" },
    { deviceId: "KIOSK-001", key: "terminal.selfJPYN", value: "0", category: "TERMINAL" },
    { deviceId: "KIOSK-001", key: "terminal.selfCamUse", value: "1", category: "TERMINAL" },
    { deviceId: "KIOSK-001", key: "terminal.selfICSiren", value: "0", category: "TERMINAL" },
    // KIOSK-01: VAN
    { deviceId: "KIOSK-001", key: "van.vanSelect", value: "4", category: "VAN" },
    { deviceId: "KIOSK-001", key: "van.vanIp", value: "127.0.0.1", category: "VAN" },
    // KIOSK-01: SELF_CASH
    { deviceId: "KIOSK-001", key: "selfCash.selfCash", value: "1", category: "SELF_CASH" },
    // KIOSK-01: SELF_BAG
    { deviceId: "KIOSK-001", key: "selfBag.selfBagUse", value: "0", category: "SELF_BAG" },
    // KIOSK-01: SELF_UI (키오스크 화면)
    { deviceId: "KIOSK-001", key: "selfUI.selfSoundGuide", value: "1", category: "SELF_UI" },
    { deviceId: "KIOSK-001", key: "selfUI.selfTouchSoundYN", value: "1", category: "SELF_UI" },
    { deviceId: "KIOSK-001", key: "selfUI.selfMainPage", value: "1", category: "SELF_UI" },
    { deviceId: "KIOSK-001", key: "selfUI.autoOpenYN", value: "0", category: "SELF_UI" },
    // KIOSK-02: 최소 설정 (독립 기기별 값)
    { deviceId: "KIOSK-002", key: "terminal.posNo", value: "102", category: "TERMINAL" },
    { deviceId: "KIOSK-002", key: "van.vanSelect", value: "4", category: "VAN" },
    { deviceId: "KIOSK-002", key: "selfUI.selfSoundGuide", value: "0", category: "SELF_UI" },
    { deviceId: "KIOSK-002", key: "selfUI.selfMainPage", value: "2", category: "SELF_UI" },
    // KITCHEN-01: TERMINAL
    { deviceId: "KITCHEN-001", key: "terminal.posNo", value: "201", category: "TERMINAL" },
    // KITCHEN-01: KITCHEN
    { deviceId: "KITCHEN-001", key: "kitchen.msgLine1", value: "주문번호", category: "KITCHEN" },
  ];

  for (const ds of deviceSettingsData) {
    await prisma.deviceSetting.upsert({
      where: { deviceId_key: { deviceId: ds.deviceId, key: ds.key } },
      update: {},
      create: ds,
    });
  }
  console.log(`Created ${deviceSettingsData.length} device settings`);

  // 7. 거래처 생성
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { code: "S001" },
      update: {},
      create: {
        code: "S001",
        name: "대한커피무역",
        type: "FOOD",
        businessNumber: "1234567890",
        representative: "김대한",
        contactName: "이승기",
        contactPhone: "010-1111-2222",
        contactEmail: "daehan@coffee.com",
        address: "서울시 강남구 테헤란로 100",
        discountRate: 5,
        paymentTerms: "월말 정산",
        memo: "원두 주요 공급처",
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: "S002" },
      update: {},
      create: {
        code: "S002",
        name: "서울우유",
        type: "BEVERAGE",
        businessNumber: "2345678901",
        representative: "박서울",
        contactName: "최영호",
        contactPhone: "010-3333-4444",
        contactEmail: "seoul@milk.co.kr",
        address: "경기도 양주시 광적면 덕도리 303",
        discountRate: 3,
        paymentTerms: "주 2회 정산",
        memo: "우유, 크림 공급",
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: "S003" },
      update: {},
      create: {
        code: "S003",
        name: "해피베이커리",
        type: "FOOD",
        businessNumber: "3456789012",
        representative: "정해피",
        contactName: "강미래",
        contactPhone: "010-5555-6666",
        contactEmail: "happy@bakery.com",
        address: "서울시 마포구 합정동 123",
        discountRate: 8,
        paymentTerms: "익월 10일 정산",
        memo: "빵, 디저트 반제품 공급",
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: "S004" },
      update: {},
      create: {
        code: "S004",
        name: "그린팩 포장",
        type: "PACKAGING",
        businessNumber: "4567890123",
        representative: "윤그린",
        contactName: "한지수",
        contactPhone: "010-7777-8888",
        contactEmail: "green@pack.com",
        address: "인천시 남동구 남동공단 456",
        discountRate: 10,
        paymentTerms: "월말 정산",
        memo: "컵, 빨대, 포장지 공급",
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: "S005" },
      update: {},
      create: {
        code: "S005",
        name: "클린서플라이",
        type: "SUPPLIES",
        businessNumber: "5678901234",
        representative: "송클린",
        contactName: "임도현",
        contactPhone: "010-9999-0000",
        contactEmail: "clean@supply.kr",
        address: "서울시 영등포구 여의도동 789",
        discountRate: 0,
        paymentTerms: "즉시 결제",
        memo: "세제, 위생용품 공급",
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${suppliers.length} suppliers`);

  // 8. 테스트 회원
  const members = await Promise.all([
    prisma.member.upsert({
      where: { code: "M0001" },
      update: {},
      create: {
        code: "M0001",
        name: "홍길동",
        phone: "010-1234-5678",
        points: 5000,
        grade: "GOLD",
        isActive: true,
      },
    }),
    prisma.member.upsert({
      where: { code: "M0002" },
      update: {},
      create: {
        code: "M0002",
        name: "김철수",
        phone: "010-9876-5432",
        points: 1500,
        grade: "SILVER",
        isActive: true,
      },
    }),
    prisma.member.upsert({
      where: { code: "M0003" },
      update: {},
      create: {
        code: "M0003",
        name: "이영희",
        phone: "010-5555-5555",
        points: 500,
        grade: "NORMAL",
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${members.length} members`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
