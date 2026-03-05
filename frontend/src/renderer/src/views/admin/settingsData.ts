// ─── Types ───
export type SettingsRecord = Record<string, string>;
export type ToggleItem = { key: string; title: string; desc: string };

// ─── Tabs ───
export const tabs = [
  { id: "sale", label: "판매 운영", icon: "cart" },
  { id: "payment", label: "결제 정책", icon: "card" },
  { id: "print", label: "출력 설정", icon: "printer" },
  { id: "point", label: "포인트/회원", icon: "point" },
  { id: "barcode", label: "바코드/중량", icon: "barcode" },
  { id: "system", label: "시스템", icon: "system" },
  { id: "accessibility", label: "접근성", icon: "a11y" },
] as const;

// ─── categoryMap (tab id → prefix + apiCategory) ───
export const categoryMap: Record<string, { prefix: string; apiCategory: string }> = {
  sale: { prefix: "sale", apiCategory: "SALE" },
  payment: { prefix: "payment", apiCategory: "PAYMENT" },
  print: { prefix: "print", apiCategory: "PRINT" },
  point: { prefix: "point", apiCategory: "POINT" },
  barcode: { prefix: "barcode", apiCategory: "BARCODE" },
  system: { prefix: "system", apiCategory: "SYSTEM" },
  accessibility: { prefix: "a11y", apiCategory: "ACCESSIBILITY" },
};

// ═══════════════════════════════════════════════
// Config Defaults
// ═══════════════════════════════════════════════

// ─── 판매 운영 (ASIS: [Sale] + [Other] 공통) ───
export const defaultSaleConfig: SettingsRecord = {
  // [Sale] 섹션
  openDay: "",
  finishDay: "",
  receiptSeq: "1",
  receiptNumber: "",
  startPrice: "0",
  beforTran: "0",
  // [Other] 판매 관련 공통
  priceEditable: "0",
  productSound: "1",
  maxPrice: "9999990",
  maxCashPrice: "9999990",
  saleView: "1",
  grouping: "0",
  totalQtyShow: "0",
  orderCallEnabled: "0",
  gridFix: "0",
  gridSaleEx: "0",
  freeOpt: "0",
  price11: "0",
  boryuEnabled: "0",
  boryuTranOpt: "0",
  infoDeskEnabled: "0",
  infoDeskViewAll: "1",
  allFinish: "1",
  saleFinishOpt: "0",
  dayFinishMsgOpt: "0",
  jobFinishCashdraw: "0",
  engEnabled: "0",
  scancop: "0",
  delay: "1",
  // 주방/테이블
  kitchenCallEnabled: "0",
  tableSelectEnabled: "0",
  tableCount: "0",
};

// ─── 결제 정책 (ASIS: [Other] 카드/결제 + [Card] 공통 + [SuSu]) ───
export const defaultPaymentConfig: SettingsRecord = {
  // 카드 결제 공통
  minCardPrice: "0",
  offCardCheck: "1",
  offCardKeyUse: "1",
  handCardEnabled: "0",
  cardTimerEnabled: "0",
  cardWavOpt: "0",
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
};

// ─── 출력 설정 (ASIS: [Other] 인쇄 관련 공통) ───
export const defaultPrintConfig: SettingsRecord = {
  printVat: "1",
  printBarcode: "1",
  bottomPrint: "1",
  pointBillPrint: "1",
  reTranBillPrint: "0",
  memberReceiptPrint: "1",
  printerOffCheck: "0",
  slotAdd: "1",
  cutPosition: "0",
};

// ─── 포인트/회원 (ASIS: S_Config 포인트 관련 공통) ───
export const defaultPointConfig: SettingsRecord = {
  salePoint: "0",
  weightPoint: "0",
  memberAddScreen: "0",
  gradeMemo: "0",
  noBillMessage: "0",
  noBillSound: "0",
  noBillCusPoint: "0",
  // 고객 UI (키오스크)
  selfSoundGuide: "1",
  selfCusNum4: "1",
  selfNoCustomer: "0",
  selfCusSelect: "1",
  selfCusAddUse: "0",
  selfCusAddEtc: "0",
  selfCusTopMsg: "",
  selfCusBTMsg1: "",
  selfCusBTMsg2: "",
  selfTouchSoundYN: "1",
  selfMainPage: "1",
  selfBTInit: "1",
  selfOneCancel: "1",
  selfZHotKey: "1",
  selfCountYN: "1",
  selfStartHotKey: "0",
  selfPriceUse: "0",
  selfPriceType: "0",
  selfReader: "2",
};

// ─── 바코드/중량 (ASIS: [Length] + S_Config) ───
export const defaultBarcodeConfig: SettingsRecord = {
  barCodeLen: "95",
  scaleLen: "4",
  scaleStartChar: "28",
  scale18YN: "0",
  scalePriceCut: "0",
};

// ─── 시스템 (ASIS: [Other] 시스템 + [Application]) ───
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

// ─── 접근성 (키오스크 접근성 기본값) ───
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
  { key: "productSound", title: "상품 스캔 소리", desc: "상품 스캔/등록 시 효과음" },
  { key: "orderCallEnabled", title: "주문 호출", desc: "주문 완료 시 호출 알림" },
  { key: "totalQtyShow", title: "총 수량 표시", desc: "판매 화면에 총 수량 표시" },
  { key: "grouping", title: "상품 그룹핑", desc: "동일 상품 자동 합산" },
  { key: "boryuEnabled", title: "보류 기능", desc: "거래 보류 기능 사용" },
  { key: "infoDeskEnabled", title: "안내데스크 모드", desc: "안내 데스크 모드 사용" },
  { key: "allFinish", title: "전체 마감", desc: "전체 마감 기능 사용" },
  { key: "jobFinishCashdraw", title: "마감시 현금함", desc: "업무 마감 시 현금함 열기" },
  { key: "freeOpt", title: "무료 옵션", desc: "무료 상품 처리 옵션" },
  { key: "price11", title: "3단 가격 표시", desc: "3단 가격 적용" },
  { key: "engEnabled", title: "영어 모드", desc: "영문 인터페이스 사용" },
  { key: "gridFix", title: "그리드 고정", desc: "테이블 컬럼 너비 고정" },
];

export const paymentToggles: ToggleItem[] = [
  { key: "offCardCheck", title: "오프라인 카드 결제", desc: "서버 미연결 시 카드 결제 허용" },
  { key: "offCardKeyUse", title: "오프라인 카드 키", desc: "오프라인 카드 키 사용" },
  { key: "handCardEnabled", title: "수기 카드 입력", desc: "카드번호 직접 입력 허용" },
  { key: "cardTimerEnabled", title: "카드 타이머", desc: "카드 결제 타임아웃 사용" },
  { key: "cardWavOpt", title: "카드 결제 소리", desc: "카드 결제 시 효과음" },
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
];

export const pointToggles: ToggleItem[] = [
  { key: "salePoint", title: "판매 포인트", desc: "판매 시 포인트 적립" },
  { key: "memberAddScreen", title: "회원 추가 화면", desc: "판매 시 회원 등록 화면" },
  { key: "gradeMemo", title: "등급 메모", desc: "회원 등급 메모 표시" },
  { key: "noBillMessage", title: "무영수증 메시지", desc: "무영수증 시 메시지 표시" },
  { key: "noBillSound", title: "무영수증 소리", desc: "무영수증 시 효과음" },
  { key: "noBillCusPoint", title: "무영수증 포인트", desc: "무영수증 시 포인트 적용" },
];

export const selfUIToggles: ToggleItem[] = [
  { key: "selfSoundGuide", title: "음성 안내", desc: "음성 안내 사용" },
  { key: "selfCusNum4", title: "회원번호 4자리", desc: "4자리 회원번호 입력" },
  { key: "selfNoCustomer", title: "비회원 판매", desc: "비회원 판매 허용" },
  { key: "selfCusAddUse", title: "고객 추가", desc: "고객 추가 기능 사용" },
  { key: "selfTouchSoundYN", title: "터치 소리", desc: "터치 시 효과음" },
  { key: "selfMainPage", title: "메인페이지 표시", desc: "메인 페이지 표시" },
  { key: "selfBTInit", title: "초기화 버튼", desc: "초기화 버튼 표시" },
  { key: "selfOneCancel", title: "개별 취소", desc: "개별 상품 취소 버튼" },
  { key: "selfZHotKey", title: "Z 핫키", desc: "Z 핫키 사용" },
  { key: "selfCountYN", title: "계수 버튼", desc: "계수 버튼 표시" },
  { key: "selfPriceUse", title: "가격 조정", desc: "가격 조정 기능 사용" },
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
