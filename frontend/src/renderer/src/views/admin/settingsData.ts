// ─── Types ───
export type SettingsRecord = Record<string, string>;
export type ToggleItem = { key: string; title: string; desc: string };

// ─── Tabs (9개: 마감 탭 추가) ───
export const tabs = [
  { id: "sale", label: "판매 운영", icon: "cart" },
  { id: "closing", label: "마감", icon: "lock" },
  { id: "payment", label: "결제 정책", icon: "card" },
  { id: "print", label: "영수증/출력", icon: "printer" },
  { id: "point", label: "포인트/회원", icon: "point" },
  { id: "notification", label: "알림/통신", icon: "bell" },
  { id: "barcode", label: "바코드/중량", icon: "barcode" },
  { id: "system", label: "시스템", icon: "system" },
  { id: "accessibility", label: "접근성", icon: "a11y" },
] as const;

// ─── categoryMap (tab id → prefix + apiCategory) ───
export const categoryMap: Record<string, { prefix: string; apiCategory: string }> = {
  sale: { prefix: "sale", apiCategory: "SALE" },
  closing: { prefix: "closing", apiCategory: "CLOSING" },
  payment: { prefix: "payment", apiCategory: "PAYMENT" },
  print: { prefix: "print", apiCategory: "PRINT" },
  point: { prefix: "point", apiCategory: "POINT" },
  notification: { prefix: "noti", apiCategory: "NOTIFICATION" },
  barcode: { prefix: "barcode", apiCategory: "BARCODE" },
  system: { prefix: "system", apiCategory: "SYSTEM" },
  accessibility: { prefix: "a11y", apiCategory: "ACCESSIBILITY" },
};

// ═══════════════════════════════════════════════
// Config Defaults
// ═══════════════════════════════════════════════

// ─── 판매 운영 (19키: 마감 8키 → closing 탭 이동) ───
export const defaultSaleConfig: SettingsRecord = {
  // [Sale] 섹션
  receiptSeq: "1",
  receiptNumber: "",
  // [Other] 판매 관련 공통
  priceEditable: "0",
  maxPrice: "9999990",
  maxCashPrice: "9999990",
  saleView: "1",
  grouping: "0",
  totalQtyShow: "0",
  gridSaleEx: "0",
  freeOpt: "0",
  boryuEnabled: "0",
  boryuTranOpt: "0",
  infoDeskViewAll: "1",
  scancop: "0",
  delay: "1",
  // 주방/테이블
  kitchenCallEnabled: "0",
  tableSelectEnabled: "0",
  tableCount: "0",
};

// ─── 마감 (8키: sale에서 이동) ───
export const defaultClosingConfig: SettingsRecord = {
  openDay: "",
  finishDay: "",
  startPrice: "0",
  beforTran: "0",
  allFinish: "1",
  saleFinishOpt: "0",
  dayFinishMsgOpt: "0",
  jobFinishCashdraw: "0",
};

// ─── 결제 정책 (31키: cardWavOpt → 알림/통신 이동) ───
export const defaultPaymentConfig: SettingsRecord = {
  // 결제 수단 on/off
  cardEnabled: "1",
  mobileEnabled: "1",
  cashEnabled: "1",
  scannerEnabled: "1",
  applePayEnabled: "0",
  foreignCardEnabled: "0",
  paycoEnabled: "0",
  wechatPayEnabled: "0",
  alipayEnabled: "0",
  storePointEnabled: "0",
  // 카드 결제 공통
  minCardPrice: "0",
  offCardCheck: "1",
  offCardKeyUse: "1",
  handCardEnabled: "0",
  cardTimerEnabled: "0",
  cardView: "0",
  eCardEnabled: "1",
  noCvmBillPrint: "0",
  // VAN 공통
  cashBackEnabled: "1",
  oCashScreen: "0",
  // 상품권
  giftInputEnabled: "0",
  giftBillEtc: "0",
  // 환불
  rePoint: "0",
  reTax: "0",
  reCashBack: "0",
  // 수수료
  commCard: "0",
  commPoint: "0",
  commCashBack: "0",
  commCash: "0",
  commCashRate: "0",
  // 키오스크 앱카드 (from DeviceSetting SELF_ETC)
  selfAppCard: "0",
};

// ─── 영수증/출력 (25키: 기존 9 + selfPrint 4 + posPrint 공통 12) ───
export const defaultPrintConfig: SettingsRecord = {
  // 기존 공통 출력
  printVat: "1",
  printBarcode: "1",
  bottomPrint: "1",
  pointBillPrint: "1",
  reTranBillPrint: "0",
  memberReceiptPrint: "1",
  printerOffCheck: "0",
  slotAdd: "1",
  cutPosition: "0",
  // 키오스크 출력 (from DeviceSetting SELF_PRINT)
  selfAutoPrint: "0",
  selfStoPrint: "0",
  selfPrintAddress: "0",
  selfPrintPhon: "0",
  // 가격 표시 (from SALE)
  price11: "0",
  // POS 공통 영수증 (from DeviceSetting POS_PRINT)
  receiptProductOneLine: "0",
  receiptBarcode: "0",
  receiptVat: "1",
  receiptBottleTotal: "0",
  receiptItemSeq: "0",
  receiptPhoneMask: "0",
  receiptNameMask: "0",
  cashReceiptAutoIssue: "0",
  cashReceiptIdShow: "0",
  saleMessageHide: "1",
  noCostPriceShow: "1",
  memberTotalHide: "0",
};

// ─── 포인트/회원 (40키: noBillSound → 알림/통신 이동) ───
export const defaultPointConfig: SettingsRecord = {
  salePoint: "0",
  weightPoint: "0",
  memberAddScreen: "0",
  gradeMemo: "0",
  noBillMessage: "0",
  noBillCusPoint: "0",
  // ── 포인트 적립 설정 ──
  pointEarnEnabled: "0",
  pointEarnType: "rate",
  pointEarnRate: "1",
  pointEarnFixed: "100",
  pointEarnUnit: "1000",
  pointEarnRound: "floor",
  pointMinEarn: "1",
  pointMinPurchase: "1000",
  pointAutoEarn: "1",
  // 등급별 차등 적립
  pointGradeEnabled: "0",
  pointGradeNormalRate: "1",
  pointGradeSilverRate: "2",
  pointGradeGoldRate: "3",
  pointGradeVipRate: "5",
  // 결제 수단별 적립
  pointCardEarnEnabled: "1",
  pointCashEarnEnabled: "1",
  // ── 포인트 사용 설정 ──
  pointUseEnabled: "0",
  pointUseMinBalance: "1000",
  pointUseMaxRate: "100",
  pointUseSplitEnabled: "1",
  pointUseSplitMethod: "card",
  // ── 등급 변경 기준 ──
  gradeAutoEnabled: "0",
  gradeCriteria: "totalPoints",
  gradeSilverThreshold: "10000",
  gradeGoldThreshold: "50000",
  gradeVipThreshold: "100000",
  gradePeriod: "all",
  gradeDownEnabled: "0",
  // ── 포인트 만료 (향후) ──
  pointExpireEnabled: "0",
  pointExpireMonths: "12",
  // ── 키오스크 포인트 정책 (from DeviceSetting SELF_POINT) ──
  selfNoAutoPoint: "0",
  selfPointZero: "0",
  selfPointHidden: "0",
  selfZero: "1",
};

// ─── 알림/통신 (10키: 기존 7 + 소리 3키 이동) ───
export const defaultNotificationConfig: SettingsRecord = {
  selfPointSMSUse: "0",
  selfUserCall: "0",
  selfSMSAdmin: "1",
  selfKakao: "1",
  selfCusAlarmUse: "1",
  selfCusAlarmTime: "0",
  selfSNSGubun: "0",
  // 소리/효과음 (from SALE, PAYMENT, POINT)
  productSound: "1",
  cardWavOpt: "0",
  noBillSound: "0",
};

// ─── 바코드/중량 (5키: 변경없음) ───
export const defaultBarcodeConfig: SettingsRecord = {
  barCodeLen: "95",
  scaleLen: "4",
  scaleStartChar: "28",
  scale18YN: "0",
  scalePriceCut: "0",
};

// ─── 시스템 (9키: 변경없음) ───
export const defaultSystemConfig: SettingsRecord = {
  errorLog: "1",
  mdbCompact: "0",
  masterDownEnabled: "1",
  masterDownWeek: "2",
  newItemUpdate: "0",
  scanRealCheck: "0",
  logoMinimize: "1",
  screenHide: "0",
  backupPath: "",
};

// ─── 접근성 (10키: 변경없음) ───
export const defaultAccessibilityConfig: SettingsRecord = {
  enabled: "1",
  ttsEnabled: "1",
  defaultFontScale: "standard",
  defaultContrast: "default",
  ttsRate: "1.0",
  ttsVolume: "0.8",
  voiceEnabled: "0",
  voiceTimeout: "10",
  voiceConfidence: "0.4",
  sttModel: "small",
};

// ═══════════════════════════════════════════════
// Toggle Definitions
// ═══════════════════════════════════════════════

export const saleToggles: ToggleItem[] = [
  { key: "priceEditable", title: "가격 수정 허용", desc: "판매 시 상품 가격 수정 가능" },
  { key: "totalQtyShow", title: "총 수량 표시", desc: "판매 화면에 총 수량 표시" },
  { key: "grouping", title: "상품 그룹핑", desc: "동일 상품 자동 합산" },
  { key: "boryuEnabled", title: "보류 기능", desc: "거래 보류 기능 사용" },
  { key: "freeOpt", title: "무료 옵션", desc: "무료 상품 처리 옵션" },
];

export const closingToggles: ToggleItem[] = [
  { key: "allFinish", title: "전체 마감", desc: "전체 마감 기능 사용" },
  { key: "saleFinishOpt", title: "판매 마감 옵션", desc: "판매 마감 시 추가 옵션" },
  { key: "dayFinishMsgOpt", title: "일마감 메시지", desc: "일 마감 시 메시지 표시" },
  { key: "jobFinishCashdraw", title: "마감시 현금함", desc: "업무 마감 시 현금함 열기" },
];

export const paymentMethodToggles: ToggleItem[] = [
  { key: "cardEnabled", title: "카드 결제", desc: "신용/체크카드 결제 허용" },
  { key: "mobileEnabled", title: "간편결제", desc: "삼성페이, 카카오페이 등 모바일 결제" },
  { key: "cashEnabled", title: "현금 결제", desc: "현금 결제 허용" },
  { key: "scannerEnabled", title: "바코드/QR", desc: "바코드 또는 QR 스캔 결제" },
  { key: "applePayEnabled", title: "애플페이", desc: "Apple Pay 결제 허용" },
  { key: "foreignCardEnabled", title: "해외카드", desc: "해외 발급 카드 결제 허용" },
  { key: "paycoEnabled", title: "페이코", desc: "PAYCO 결제 허용" },
  { key: "wechatPayEnabled", title: "위챗페이", desc: "WeChat Pay 결제 허용" },
  { key: "alipayEnabled", title: "알리페이", desc: "Alipay 결제 허용" },
  { key: "storePointEnabled", title: "매장 포인트", desc: "매장 포인트 결제 허용" },
  { key: "selfAppCard", title: "앱카드 (키오스크)", desc: "키오스크 앱카드 결제 사용" },
];

export const paymentToggles: ToggleItem[] = [
  { key: "offCardCheck", title: "오프라인 카드 결제", desc: "서버 미연결 시 카드 결제 허용" },
  { key: "offCardKeyUse", title: "오프라인 카드 키", desc: "오프라인 카드 키 사용" },
  { key: "handCardEnabled", title: "수기 카드 입력", desc: "카드번호 직접 입력 허용" },
  { key: "cardTimerEnabled", title: "카드 타이머", desc: "카드 결제 타임아웃 사용" },
  { key: "cardView", title: "카드 정보 표시", desc: "카드 정보 화면 표시" },
  { key: "eCardEnabled", title: "전자카드 사용", desc: "전자카드 결제 사용" },
  { key: "noCvmBillPrint", title: "비CVM 영수증", desc: "비CVM 거래 영수증 출력" },
  { key: "cashBackEnabled", title: "캐시백 사용", desc: "카드 캐시백 기능 사용" },
  { key: "oCashScreen", title: "현금영수증 화면", desc: "현금영수증 입력 화면 표시" },
  { key: "giftInputEnabled", title: "상품권 입력", desc: "상품권 수기 입력 허용" },
  { key: "giftBillEtc", title: "상품권 기타 처리", desc: "상품권 기타 결제 처리" },
  { key: "rePoint", title: "환불 포인트 재계산", desc: "환불시 포인트 재계산" },
  { key: "reTax", title: "환불 세금 재계산", desc: "환불시 세금 재계산" },
  { key: "reCashBack", title: "환불 캐시백 재계산", desc: "환불시 캐시백 재계산" },
];

export const printToggles: ToggleItem[] = [
  { key: "printVat", title: "부가세 인쇄", desc: "영수증에 부가세 정보 인쇄" },
  { key: "printBarcode", title: "바코드 인쇄", desc: "영수증에 바코드 인쇄" },
  { key: "bottomPrint", title: "하단 문구 인쇄", desc: "영수증 하단 문구 인쇄" },
  { key: "pointBillPrint", title: "포인트 영수증", desc: "포인트 내역 영수증 인쇄" },
  { key: "reTranBillPrint", title: "재거래 영수증", desc: "재거래 시 영수증 인쇄" },
  { key: "memberReceiptPrint", title: "회원 미수 인쇄", desc: "회원 미수 잔액 영수증 인쇄" },
  { key: "printerOffCheck", title: "프린터 오프 체크", desc: "프린터 미연결 시 경고" },
  { key: "slotAdd", title: "용지 슬롯 추가", desc: "영수증 슬롯(여백) 추가" },
  { key: "price11", title: "3단 가격 표시", desc: "3단 가격 적용" },
];

export const selfPrintToggles: ToggleItem[] = [
  { key: "selfAutoPrint", title: "자동 출력 (키오스크)", desc: "결제 후 자동 영수증 출력" },
  { key: "selfStoPrint", title: "출력 중지 (키오스크)", desc: "영수증 출력 중지" },
  { key: "selfPrintAddress", title: "주소 출력 (키오스크)", desc: "영수증에 주소 출력" },
  { key: "selfPrintPhon", title: "전화번호 출력 (키오스크)", desc: "영수증에 전화번호 출력" },
];

export const printReceiptToggles: ToggleItem[] = [
  { key: "receiptProductOneLine", title: "상품정보 1줄 표시", desc: "영수증에 상품정보 1줄 표시" },
  { key: "receiptBarcode", title: "영수증 바코드", desc: "영수증에 바코드 표시" },
  { key: "receiptVat", title: "영수증 부가세", desc: "영수증에 부가세 표시" },
  { key: "receiptBottleTotal", title: "공병합계 표시", desc: "영수증에 공병합계 금액 표시" },
  { key: "receiptItemSeq", title: "상품순번 출력", desc: "영수증에 상품순번 출력" },
  { key: "receiptPhoneMask", title: "전화번호 마스킹", desc: "영수증 회원 전화번호 마스킹" },
  { key: "receiptNameMask", title: "회원명 마스킹", desc: "영수증 회원명 마스킹" },
  { key: "cashReceiptAutoIssue", title: "현금영수증 자진발급", desc: "현금영수증 자진발급 사용" },
  { key: "cashReceiptIdShow", title: "현금영수증 고객표시", desc: "현금영수증 신분정보 고객모니터 표시" },
  { key: "saleMessageHide", title: "판매메시지 숨김", desc: "판매메시지 숨기기" },
  { key: "noCostPriceShow", title: "매입가 미표시", desc: "가격확인시 매입가 표시안함" },
  { key: "memberTotalHide", title: "회원 구매금액 숨김", desc: "회원 총 구매금액 숨기기" },
];

export const pointToggles: ToggleItem[] = [
  { key: "salePoint", title: "판매 포인트 (레거시)", desc: "POS 판매 시 포인트 적립 (레거시)" },
  { key: "memberAddScreen", title: "회원 추가 화면", desc: "판매 시 회원 등록 화면" },
  { key: "gradeMemo", title: "등급 메모", desc: "회원 등급 메모 표시" },
  { key: "noBillMessage", title: "무영수증 메시지", desc: "무영수증 시 메시지 표시" },
  { key: "noBillCusPoint", title: "무영수증 포인트", desc: "무영수증 시 포인트 적용" },
];

export const pointEarnToggles: ToggleItem[] = [
  { key: "pointEarnEnabled", title: "포인트 적립", desc: "결제 완료 시 포인트 자동 적립" },
  { key: "pointAutoEarn", title: "자동 적립 (키오스크)", desc: "키오스크에서 자동 포인트 적립" },
  { key: "pointCardEarnEnabled", title: "카드 결제 적립", desc: "카드 결제 시 포인트 적립" },
  { key: "pointCashEarnEnabled", title: "현금 결제 적립", desc: "현금 결제 시 포인트 적립" },
  { key: "pointGradeEnabled", title: "등급별 차등 적립", desc: "회원 등급별 다른 적립률 적용" },
];

export const pointUseToggles: ToggleItem[] = [
  { key: "pointUseEnabled", title: "포인트 사용", desc: "포인트로 결제 기능 활성화" },
  { key: "pointUseSplitEnabled", title: "분할 결제 허용", desc: "포인트 + 카드/현금 분할 결제" },
];

export const gradeToggles: ToggleItem[] = [
  { key: "gradeAutoEnabled", title: "자동 등급 변경", desc: "기준 충족 시 등급 자동 승급" },
  { key: "gradeDownEnabled", title: "등급 하향 허용", desc: "기준 미달 시 등급 강등 허용" },
];

export const selfPointPolicyToggles: ToggleItem[] = [
  { key: "selfNoAutoPoint", title: "자동포인트 비활성 (키오스크)", desc: "키오스크 자동 포인트 적립 비활성" },
  { key: "selfPointZero", title: "포인트 초기화 (키오스크)", desc: "키오스크 포인트 0원 초기화" },
  { key: "selfPointHidden", title: "포인트 숨김 (키오스크)", desc: "키오스크 포인트 정보 미표시" },
  { key: "selfZero", title: "잔액 처리 (키오스크)", desc: "키오스크 잔액 처리 방식" },
];

export const notificationToggles: ToggleItem[] = [
  { key: "selfPointSMSUse", title: "포인트 SMS", desc: "포인트 적립/사용 SMS 발송" },
  { key: "selfUserCall", title: "직원 호출", desc: "키오스크 직원 호출 기능" },
  { key: "selfSMSAdmin", title: "관리자 SMS", desc: "관리자에게 SMS 알림" },
  { key: "selfKakao", title: "카카오 알림", desc: "카카오톡 알림 발송" },
  { key: "selfCusAlarmUse", title: "고객 알람", desc: "고객 알람 사용" },
  { key: "selfSNSGubun", title: "알림 채널 구분", desc: "SMS/카카오 알림 채널 선택" },
];

export const soundToggles: ToggleItem[] = [
  { key: "productSound", title: "상품 스캔 소리", desc: "상품 스캔/등록 시 효과음" },
  { key: "cardWavOpt", title: "카드 결제 소리", desc: "카드 결제 시 효과음" },
  { key: "noBillSound", title: "무영수증 소리", desc: "무영수증 시 효과음" },
];

export const systemToggles: ToggleItem[] = [
  { key: "errorLog", title: "오류 로그 기록", desc: "시스템 오류 로그 자동 기록" },
  { key: "mdbCompact", title: "DB 자동 컴팩트", desc: "데이터베이스 자동 최적화" },
  { key: "masterDownEnabled", title: "마스터 자동 다운", desc: "마스터 데이터 자동 다운로드" },
  { key: "newItemUpdate", title: "신규상품 업데이트", desc: "새 상품 자동 반영" },
  { key: "scanRealCheck", title: "실시간 스캔 체크", desc: "스캔 데이터 실시간 검증" },
  { key: "logoMinimize", title: "로고 최소화", desc: "상단 로고를 작은 크기로 표시" },
  { key: "screenHide", title: "화면 숨김", desc: "작업표시줄 숨김 모드" },
];

export const accessibilityToggles: ToggleItem[] = [
  { key: "enabled", title: "접근성 기능 활성화", desc: "키오스크 접근성 기능 전체 ON/OFF" },
  { key: "ttsEnabled", title: "음성 안내 (TTS)", desc: "시각장애인을 위한 음성 안내 기본 활성화" },
  { key: "voiceEnabled", title: "음성 인식 (STT)", desc: "마이크 버튼으로 음성 주문 기능 활성화" },
];
