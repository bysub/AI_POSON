/**
 * DevicesView.vue에서 사용하는 설정 기본값, 토글 정의, 카테고리 매핑.
 * 순수 데이터만 포함 (Vue 반응성 없음).
 *
 * 정제화 결과: POS 6→5탭, KIOSK 8→5탭, KITCHEN 2탭(변경없음)
 */

// ─── 타입 ───
export type DeviceType = "POS" | "KIOSK" | "KITCHEN";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  isActive: boolean;
}

export type SettingsRecord = Record<string, string>;

export type ToggleItem = { key: string; title: string; desc: string };

export interface CategoryMapEntry {
  prefix: string;
  apiCategory: string;
}

// ─── 기기 유형 레이블 ───
export const deviceTypeLabel: Record<DeviceType, string> = {
  POS: "POS",
  KIOSK: "키오스크",
  KITCHEN: "주방",
};

// ─── 기기 유형별 탭 정의 ───
export const tabDefinitions: Record<DeviceType, { id: string; label: string }[]> = {
  POS: [
    { id: "terminal", label: "터미널 HW" },
    { id: "van", label: "VAN 결제" },
    { id: "posOp", label: "판매/동작" },
    { id: "posSettle", label: "정산/마감" },
    { id: "posReceipt", label: "영수증" },
  ],
  KIOSK: [
    { id: "terminal", label: "터미널 HW" },
    { id: "van", label: "VAN 결제" },
    { id: "selfCash", label: "현금 결제" },
    { id: "selfBag", label: "봉투/저울" },
    { id: "selfUI", label: "자동 운영" },
  ],
  KITCHEN: [
    { id: "terminal", label: "터미널 HW" },
    { id: "kitchenMsg", label: "주방 메시지" },
  ],
};

// ═══════════════════════════════════════════════
// Config 기본값
// ═══════════════════════════════════════════════

// ─── 터미널 HW (33키: 기존 30 + KIOSK HW 3) ───
export const defaultTerminalConfig: SettingsRecord = {
  terminalType: "0",
  posNo: "01",
  adminPosNo: "z",
  cashDraw: "1",
  dualType: "0",
  printer: "4",
  printerPort: "3",
  printerBps: "9600",
  scanName: "1",
  scanPort: "0",
  handScanPort: "0",
  msrPort: "0",
  msrBps: "9600",
  cdpName: "",
  cdpPort: "0",
  cdpLine: "1",
  cdpType: "",
  cdpBps: "9600",
  cdpCashYN: "0",
  coinName: "0",
  coinPort: "0",
  moniter: "0",
  sMoniter: "0",
  printerCatUse: "0",
  catPort: "0",
  catBps: "38400",
  cboScalePort: "1",
  supyoPort: "0",
  // KIOSK HW (from SELF_ETC)
  selfCamUse: "1",
  selfICSiren: "0",
};

// ─── VAN 결제 (9키: 변경없음) ───
export const defaultVanConfig: SettingsRecord = {
  vanSelect: "4",
  singPadPort: "0",
  logDelete: "1",
  vanIp: "",
  vanPort: "",
  danmalNo: "",
  snumber: "",
  singPadBps: "9600",
  usbYN: "0",
};

// ─── KIOSK: 현금 결제 (10키: 변경없음) ───
export const defaultSelfCashConfig: SettingsRecord = {
  selfCash: "1",
  selfCashPort: "0",
  selfCashSleep: "0",
  selfCashPhonNum: "",
  selfCashGubun: "1",
  selfNoHyunYoung: "0",
  selfOneHPUse: "0",
  self50HPUse: "0",
};

// ─── KIOSK: 봉투/저울 (7키: 기존 6 + selfBagJPPort) ───
export const defaultSelfBagConfig: SettingsRecord = {
  selfBagPort: "0",
  selfStartBag: "0",
  selfMBagSell: "1",
  selfLastBag: "1",
  selfScalePort: "0",
  selfScaleLimitG: "0",
  // from SELF_ETC
  selfBagJPPort: "0",
};

// ─── KIOSK: 자동 운영 (8키: 화면UI 19+selfGif 삭제) ───
export const defaultSelfUIConfig: SettingsRecord = {
  autoOpenYN: "0",
  autoFinishYN: "0",
  autoDay: "",
  autoAP: "0",
  autoHH: "00",
  autoMM: "00",
  autoID: "1",
  autoPass: "1",
};

// ─── POS: 판매/동작 (55키: posPrint 판매동작 44 + posSale 11) ───
export const defaultPosOperationConfig: SettingsRecord = {
  // ── 판매 규칙 ──
  saleNewProduct: "1",
  exchangePassword: "0",
  zeroPriceInput: "0",
  saleCancelDisable: "0",
  cashForceInput: "1",
  costOverSellWarn: "0",
  disabledProductChange: "0",
  salePriceCompare: "0",
  categoryScaleInput: "0",
  shortcutFixedPrice: "0",
  shortcutNameProcess: "0",
  bulkPriceFit: "0",
  // ── 결제/카드 규칙 ──
  posNoCreditSale: "0",
  cardNoDrawer: "0",
  cashOnlyNoReturn: "0",
  cardReturnNoDrawer: "0",
  cardCardPayUse: "1",
  cashBackUse: "1",
  barcodeCardPayScreen: "0",
  cashChangeCardScreen: "0",
  giftCashReceiptInclude: "0",
  giftPointInclude: "0",
  // ── 할인/포인트 규칙 ──
  discountNoPoint: "0",
  weightNoPoint: "0",
  discountNoCashback: "0",
  barcodeGroupUse: "0",
  returnNoPassword: "0",
  deliveryPointAccrue: "1",
  // ── 배달 ──
  deliveryDisable: "0",
  deliveryNoPayClose: "0",
  deliveryNoPayReturn: "0",
  deliverySaleType: "0",
  deliveryNotePrint: "0",
  deliverySeqPrint: "0",
  deliveryReceiptManage: "0",
  deliveryDriverReceipt: "0",
  deliveryItemArchive: "0",
  deliverySeqMemberReceipt: "0",
  deliveryNoShift: "0",
  // ── 보류/기타 ──
  holdReceiptPrint: "0",
  holdReceiptDetail: "0",
  holdNoShift: "0",
  firstScanHoldMsg: "0",
  overdueCustomerWarn: "0",
  // ── posSale 통합 (11키) ──
  receiptDiscountDisplay: "0",
  totalRounding: "0",
  scaleRounding: "0",
  categoryPrintType: "0",
  deliveryPointRate: "0",
  creditPointRate: "0",
  minReceiptAmount: "0",
  minPointAmount: "0",
  bcPartner: "0",
  cardNoSignAmount: "50000",
  creditMemoUse: "0",
};

// ─── POS: 정산/마감 (37키: 기존 27 + posPrint 정산 10) ───
export const defaultPosSettleConfig: SettingsRecord = {
  // 담당자 정산서
  staffBottleSales: "0",
  staffTaxExempt: "0",
  staffDiscount: "0",
  staffCancel: "0",
  staffCreditCard: "1",
  staffCashReceipt: "0",
  staffPrize: "0",
  staffCardByIssuer: "0",
  staffOutstanding: "1",
  staffDeliveryDeposit: "1",
  staffEtcDiscount: "0",
  staffDeliveryCount: "1",
  staffSettleReport: "0",
  // 마감 정산서
  closeBottleSales: "1",
  closeTaxExempt: "1",
  closeDiscount: "0",
  closeCancel: "0",
  closeCreditCard: "1",
  closeCashReceipt: "0",
  closePrize: "0",
  closeCardByIssuer: "0",
  closeDeliveryCount: "0",
  closeSettleReport: "1",
  // 영수증 메시지
  receiptTopMsg: "",
  receiptBottomMsg1: "",
  receiptBottomMsg2: "",
  receiptBottomMsg3: "",
  // posPrint 정산 관련 (10키)
  settleCategoryPrint: "1",
  settleAmountPrint: "1",
  closeOutstandingPrint: "0",
  openShiftFiscalPrint: "0",
  cashbackQrPrint: "0",
  scale18Barcode: "0",
  archiveBarcodeNo: "0",
  eSignArchiveNo: "0",
  reissueBarcodeNo: "0",
  receiptNoOutstanding: "0",
};

// ─── POS: 영수증 (20키: 기존 10 + posPrint 인쇄 10) ───
export const defaultPosReceiptConfig: SettingsRecord = {
  // 기존 영수증 출력 제어
  receiptOffDelivery: "0",
  receiptOffCredit: "1",
  receiptOffPoint: "1",
  receiptOffGift: "1",
  receiptOffEcoupon: "0",
  receiptOffQrms: "1",
  receiptOffCardOnce: "0",
  receiptOffCardInstall: "1",
  receiptOffCashReceipt: "0",
  receiptOffReturn: "1",
  // posPrint 인쇄 관련 (10키)
  slipNoPrint: "0",
  slipNoHide: "0",
  cancelDetailPrint: "0",
  cardReceiptDetail: "0",
  checkResponsePrint: "1",
  eCouponNoReceipt: "0",
  deliveryArchiveDouble: "0",
  deliveryArchiveSimple: "0",
  deliveryArchiveNormal: "0",
  visitDeliveryArchive: "0",
};

// ─── KITCHEN: 주방 메시지 (7키: 변경없음) ───
export const defaultKitchenConfig: SettingsRecord = {
  kitchenPrint: "4",
  kitchenPrintPort: "7",
  kitchenPrintBps: "9600",
  kitchenFontsize: "0",
  kitchenMsg1: "",
  kitchenMsg2: "",
  kitchenMsg4: "",
};

// ═══════════════════════════════════════════════
// 카테고리 매핑 (탭ID → prefix + apiCategory)
// ═══════════════════════════════════════════════
export const categoryMap: Record<string, CategoryMapEntry> = {
  terminal: { prefix: "terminal", apiCategory: "TERMINAL" },
  van: { prefix: "van", apiCategory: "VAN" },
  selfCash: { prefix: "selfCash", apiCategory: "SELF_CASH" },
  selfBag: { prefix: "selfBag", apiCategory: "SELF_BAG" },
  selfUI: { prefix: "selfUI", apiCategory: "SELF_UI" },
  posOp: { prefix: "posOp", apiCategory: "POS_OPERATION" },
  posSettle: { prefix: "posSettle", apiCategory: "POS_SETTLE" },
  posReceipt: { prefix: "posReceipt", apiCategory: "POS_RECEIPT" },
  kitchenMsg: { prefix: "kitchen", apiCategory: "KITCHEN" },
};

// ═══════════════════════════════════════════════
// 토글 항목 정의
// ═══════════════════════════════════════════════

export const terminalToggles: ToggleItem[] = [
  { key: "cashDraw", title: "캐시 드로워", desc: "현금함 사용" },
  { key: "cdpCashYN", title: "CDP 현금 표시", desc: "고객표시기 현금 표시" },
  { key: "printerCatUse", title: "CAT 프린터", desc: "CAT 프린터 사용" },
];

export const terminalKioskHwToggles: ToggleItem[] = [
  { key: "selfCamUse", title: "카메라", desc: "카메라 사용" },
  { key: "selfICSiren", title: "IC 사이렌", desc: "IC 사이렌 알림" },
];

export const selfCashToggles: ToggleItem[] = [
  { key: "selfCash", title: "현금 결제", desc: "현금 결제 사용" },
  { key: "selfNoHyunYoung", title: "실결제금액 숨김", desc: "실결제 금액 미표시" },
  { key: "selfOneHPUse", title: "1만원권 사용", desc: "현금기 1만원권 투입 허용" },
  { key: "self50HPUse", title: "5만원권 사용", desc: "현금기 5만원권 투입 허용" },
];

export const selfBagToggles: ToggleItem[] = [
  { key: "selfStartBag", title: "시작시 봉투", desc: "시작 시 봉투 선택 화면" },
  { key: "selfMBagSell", title: "복수 봉투 판매", desc: "봉투 여러 장 판매" },
  { key: "selfLastBag", title: "마지막 봉투", desc: "마지막에 봉투 추가" },
];

export const selfUIAutoToggles: ToggleItem[] = [
  { key: "autoOpenYN", title: "자동 개점", desc: "설정 시간에 자동 개점" },
  { key: "autoFinishYN", title: "자동 마감", desc: "설정 시간에 자동 마감" },
];

// ─── POS: 판매/동작 토글 ───
export const posOpSaleToggles: ToggleItem[] = [
  { key: "saleNewProduct", title: "신상품 등록", desc: "판매시 신상품 등록 가능" },
  { key: "exchangePassword", title: "환전 비밀번호", desc: "환전 시 비밀번호 사용" },
  { key: "zeroPriceInput", title: "0원 상품 입력", desc: "가격 0인 상품 입력" },
  { key: "saleCancelDisable", title: "전체취소 비활성", desc: "판매시 전체취소 기능 사용 안함" },
  { key: "cashForceInput", title: "받은돈 무조건 입력", desc: "현금처리시 받은돈 무조건 입력" },
  { key: "costOverSellWarn", title: "매입>판매 경고", desc: "매입액>판매액 시 경고" },
  { key: "disabledProductChange", title: "중지상품 변경사용", desc: "사용중지상품 변경사용" },
  { key: "salePriceCompare", title: "가격비교 사용", desc: "판매 가격비교 사용" },
  { key: "categoryScaleInput", title: "부류/저울 판매가 입력", desc: "부류/저울 판매가 입력 사용" },
  { key: "shortcutFixedPrice", title: "단축키 고정판매가", desc: "단축키 부류/저울 고정판매가" },
  { key: "shortcutNameProcess", title: "단축키 마포이름", desc: "단축키 마포이름 처리" },
  { key: "bulkPriceFit", title: "벌크상품 합계 맞춤", desc: "벌크상품 판매가 합계 맞추기" },
];

export const posOpCardToggles: ToggleItem[] = [
  { key: "posNoCreditSale", title: "외상 매출 불가", desc: "POS 외상 매출 불가" },
  { key: "cardNoDrawer", title: "카드 시 금고 안열기", desc: "카드매출시 금고 열지 않음" },
  { key: "cashOnlyNoReturn", title: "현금전용 반품 불가", desc: "현금으로만 결제시 전표반품 불가" },
  { key: "cardReturnNoDrawer", title: "카드반품 돈통 안열기", desc: "카드매출 전표반품시 돈통 안열기" },
  { key: "cardCardPayUse", title: "카드+카드 결제", desc: "카드+카드 결제 사용" },
  { key: "cashBackUse", title: "캐쉬백 사용", desc: "캐쉬백 기능 사용" },
  { key: "barcodeCardPayScreen", title: "바코드 카드결제 화면", desc: "바코드입력에서 카드/외상 결제 화면" },
  { key: "cashChangeCardScreen", title: "잔액 카드결제 화면", desc: "현금 후 잔액 카드/외상 결제 화면" },
  { key: "giftCashReceiptInclude", title: "상품권 현금영수증 포함", desc: "상품권 현금영수증/캐쉬백 포함" },
  { key: "giftPointInclude", title: "상품권 포인트 포함", desc: "상품권 결제시 포인트 적립 포함" },
];

export const posOpDiscountToggles: ToggleItem[] = [
  { key: "discountNoPoint", title: "할인상품 적립 안함", desc: "할인상품 포인트 적립 안함" },
  { key: "weightNoPoint", title: "중량상품 적립 안함", desc: "중량상품 포인트 적립 안함" },
  { key: "discountNoCashback", title: "할인상품 캐쉬백 안함", desc: "할인상품 캐쉬백 적립 안함" },
  { key: "barcodeGroupUse", title: "바코드별 상품 묶기", desc: "바코드별 상품 묶기 사용" },
  { key: "returnNoPassword", title: "반품 비밀번호 미사용", desc: "반품시 비밀번호 사용안함" },
  { key: "deliveryPointAccrue", title: "배달 포인트 적립", desc: "배달판매시 포인트 적립" },
];

export const posOpDeliveryToggles: ToggleItem[] = [
  { key: "deliveryDisable", title: "배달기능 비활성", desc: "배달기능 사용안함" },
  { key: "deliveryNoPayClose", title: "배달미입금 마감불가", desc: "배달미입금시 마감불가" },
  { key: "deliveryNoPayReturn", title: "배달미입금 반품 가능", desc: "배달 미입금 전표 반품 가능" },
  { key: "deliverySaleType", title: "배달판매 구분", desc: "배달판매구분(미체크:내방, 체크:전화)" },
  { key: "deliveryNotePrint", title: "배달 비고란 출력", desc: "배달판매시 비고란 출력" },
  { key: "deliverySeqPrint", title: "배달 순번 출력", desc: "배달 판매 순번 출력" },
  { key: "deliveryReceiptManage", title: "배달 영수증 관리", desc: "배달 영수증 관리 사용" },
  { key: "deliveryDriverReceipt", title: "기사용 영수증 출력", desc: "배달 기사용 영수증 출력" },
  { key: "deliveryItemArchive", title: "배달 개별상품 보관용", desc: "배달 개별상품 보관용영수증 출력" },
  { key: "deliverySeqMemberReceipt", title: "배달순번 회원영수증", desc: "배달 순번 회원 구분 영수증" },
  { key: "deliveryNoShift", title: "배달미처리 교대 불가", desc: "배달 미처리시 교대 불가" },
];

export const posOpHoldToggles: ToggleItem[] = [
  { key: "holdReceiptPrint", title: "보류 영수증 출력", desc: "보류시 보류 영수증 출력" },
  { key: "holdReceiptDetail", title: "보류 영수증 상세", desc: "보류 영수증 상세 출력" },
  { key: "holdNoShift", title: "보류시 교대 불가", desc: "보류 미처리시 교대 불가" },
  { key: "firstScanHoldMsg", title: "스캔시 보류 메시지", desc: "첫 상품 스캔시 보류메세지" },
  { key: "overdueCustomerWarn", title: "미수고객 경고창", desc: "미수고객 호출시 경고창" },
];

export const posOpSaleExtraToggles: ToggleItem[] = [
  { key: "bcPartner", title: "BC 파트너스", desc: "BC 파트너스 가맹점 여부" },
  { key: "creditMemoUse", title: "외상결제 메모", desc: "외상결제시 메모 기능 사용" },
];

// ─── POS: 정산/마감 토글 ───
export const staffSettleToggles: ToggleItem[] = [
  { key: "staffBottleSales", title: "공병 매출", desc: "담당자 정산서에 공병 매출 포함" },
  { key: "staffTaxExempt", title: "과/면세 내역", desc: "담당자 정산서에 과/면세 내역 포함" },
  { key: "staffDiscount", title: "할인 내역", desc: "담당자 정산서에 할인 내역 포함" },
  { key: "staffCancel", title: "취소 내역", desc: "담당자 정산서에 취소 내역 포함" },
  { key: "staffCreditCard", title: "신용카드 내역", desc: "담당자 정산서에 신용카드 내역 포함" },
  { key: "staffCashReceipt", title: "현금영수증 내역", desc: "담당자 정산서에 현금영수증 내역 포함" },
  { key: "staffPrize", title: "경품지급 내역", desc: "담당자 정산서에 경품지급 내역 포함" },
  { key: "staffCardByIssuer", title: "매입사별 카드매출", desc: "담당자 정산서에 매입사별 카드매출 포함" },
  { key: "staffOutstanding", title: "외상 입금 내역", desc: "담당자 정산서에 외상 입금 내역 포함" },
  { key: "staffDeliveryDeposit", title: "전배달 입금 내역", desc: "담당자 정산서에 전배달 입금 내역 포함" },
  { key: "staffEtcDiscount", title: "기타 할인 내역", desc: "담당자 정산서에 기타 할인 내역 포함" },
  { key: "staffDeliveryCount", title: "배달건수 출력", desc: "담당자 정산서에 배달건수 출력" },
  { key: "staffSettleReport", title: "정산서 출력", desc: "담당자 정산서 출력" },
];

export const closeSettleToggles: ToggleItem[] = [
  { key: "closeBottleSales", title: "공병 매출", desc: "마감 정산서에 공병 매출 포함" },
  { key: "closeTaxExempt", title: "과/면세 내역", desc: "마감 정산서에 과/면세 내역 포함" },
  { key: "closeDiscount", title: "할인 내역", desc: "마감 정산서에 할인 내역 포함" },
  { key: "closeCancel", title: "취소 내역", desc: "마감 정산서에 취소 내역 포함" },
  { key: "closeCreditCard", title: "신용카드 내역", desc: "마감 정산서에 신용카드 내역 포함" },
  { key: "closeCashReceipt", title: "현금영수증 내역", desc: "마감 정산서에 현금영수증 내역 포함" },
  { key: "closePrize", title: "경품지급 내역", desc: "마감 정산서에 경품지급 내역 포함" },
  { key: "closeCardByIssuer", title: "매입사별 카드매출", desc: "마감 정산서에 매입사별 카드매출 포함" },
  { key: "closeDeliveryCount", title: "배달건수 출력", desc: "마감 정산서에 배달건수 출력" },
  { key: "closeSettleReport", title: "정산서 출력", desc: "마감 정산서 출력" },
];

export const posSettleExtraToggles: ToggleItem[] = [
  { key: "settleCategoryPrint", title: "정산 분류별 매출 출력", desc: "정산시 분류별 매출 출력" },
  { key: "settleAmountPrint", title: "정산 금액단위별 수량", desc: "정산시 금액 단위별 수량 출력" },
  { key: "closeOutstandingPrint", title: "마감시 외상입금 출력", desc: "마감시 회원외상 입금내역 출력" },
  { key: "openShiftFiscalPrint", title: "개점/교대 재정정보", desc: "개점/교대 등록시 재정정보 출력" },
  { key: "cashbackQrPrint", title: "캐쉬백 QR 인쇄", desc: "캐쉬백 적립 QR코드 인쇄" },
  { key: "scale18Barcode", title: "18행 중량바코드", desc: "저울 18행 중량바코드 사용" },
  { key: "archiveBarcodeNo", title: "보관용 바코드 안함", desc: "보관용전표 바코드출력 안함" },
  { key: "eSignArchiveNo", title: "전자서명 보관전표 안함", desc: "전자서명시 보관용전표 출력안함" },
  { key: "reissueBarcodeNo", title: "재발행 바코드 안함", desc: "영수증재발행시 바코드 출력안함" },
  { key: "receiptNoOutstanding", title: "미수금 출력 안함", desc: "영수증에 고객 미수금 출력 안함" },
];

// ─── POS: 영수증 토글 ───
export const posReceiptToggles: ToggleItem[] = [
  { key: "receiptOffDelivery", title: "배달시 출력 안함", desc: "배달(내방/전화)시 출력 안함" },
  { key: "receiptOffCredit", title: "외상시 출력 안함", desc: "외상시 출력 안함" },
  { key: "receiptOffPoint", title: "포인트 사용 출력 안함", desc: "포인트 사용 출력 안함" },
  { key: "receiptOffGift", title: "상품권 사용 출력 안함", desc: "상품권 사용 출력 안함" },
  { key: "receiptOffEcoupon", title: "e쿠폰 사용 출력 안함", desc: "e쿠폰 사용 출력 안함" },
  { key: "receiptOffQrms", title: "QRMS 사용 출력 안함", desc: "QRMS 사용시 출력 안함" },
  { key: "receiptOffCardOnce", title: "카드 일시불 출력 안함", desc: "카드 일시불/OFF 결제시 출력 안함" },
  { key: "receiptOffCardInstall", title: "카드 할부 출력 안함", desc: "카드 할부 결제시 출력 안함" },
  { key: "receiptOffCashReceipt", title: "현금영수증 출력 안함", desc: "현금영수증 결제시 출력 안함" },
  { key: "receiptOffReturn", title: "전표반품 출력 안함", desc: "전표반품시 출력 안함" },
];

export const posReceiptExtraToggles: ToggleItem[] = [
  { key: "slipNoPrint", title: "전표번호 미출력", desc: "매출전표 번호 출력 안하기" },
  { key: "slipNoHide", title: "전표번호 숨기기", desc: "판매화면 전표번호 숨기기" },
  { key: "cancelDetailPrint", title: "취소 내역 출력", desc: "전체취소시 취소내역 출력" },
  { key: "cardReceiptDetail", title: "카드 보관용 상세인쇄", desc: "카드매출시 보관용영수증 상세내역 인쇄" },
  { key: "checkResponsePrint", title: "수표 응답 인쇄", desc: "수표조회시 응답값 인쇄" },
  { key: "eCouponNoReceipt", title: "e-쿠폰 영수증 안함", desc: "e-쿠폰 사용 영수증 출력 안함" },
  { key: "deliveryArchiveDouble", title: "배달 보관전표 2장", desc: "배달보관용전표 2장 출력" },
  { key: "deliveryArchiveSimple", title: "배달 약식 출력", desc: "배달 보관용 전표 약식 출력" },
  { key: "deliveryArchiveNormal", title: "배달 보관 일반설정", desc: "배달 보관 영수증 일반영수증 설정 적용" },
  { key: "visitDeliveryArchive", title: "내방배달 보관전표", desc: "내방배달시 보관용전표 출력" },
];
