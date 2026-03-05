/**
 * DevicesView.vue에서 사용하는 설정 기본값, 토글 정의, 카테고리 매핑.
 * 순수 데이터만 포함 (Vue 반응성 없음).
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
    { id: "posPrint", label: "인쇄/출력" },
    { id: "posSale", label: "판매설정" },
    { id: "posSettle", label: "정산/마감" },
    { id: "posReceipt", label: "영수증" },
  ],
  KIOSK: [
    { id: "terminal", label: "터미널 HW" },
    { id: "van", label: "VAN 결제" },
    { id: "selfCash", label: "현금 결제" },
    { id: "selfBag", label: "봉투/저울" },
    { id: "selfAuto", label: "자동 운영" },
    { id: "selfPoint", label: "포인트/알림" },
    { id: "selfPrint", label: "인쇄/출력" },
    { id: "selfEtc", label: "기타" },
  ],
  KITCHEN: [
    { id: "terminal", label: "터미널 HW" },
    { id: "kitchenMsg", label: "주방 메시지" },
  ],
};

// ─── Config 기본값 ───
export const defaultTerminalConfig: SettingsRecord = {
  terminalType: "0",
  posNo: "01",
  adminPosNo: "z",
  cashDraw: "1",
  touch: "1",
  dual: "1",
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
};

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

export const defaultSelfCashConfig: SettingsRecord = {
  selfCash: "1",
  selfCashPort: "0",
  selfCashSleep: "0",
  selfCashPhonNum: "",
  selfCashGubun: "1",
  selfNoHyunYoung: "0",
  selfOneHPUse: "0",
  self50HPUse: "0",
  self10000Use: "0",
  selfNoCardUse: "0",
};

export const defaultSelfBagConfig: SettingsRecord = {
  selfBagPort: "0",
  selfStartBag: "0",
  selfMBagSell: "1",
  selfLastBag: "1",
  selfScalePort: "0",
  selfScaleLimitG: "0",
};

export const defaultSelfAutoConfig: SettingsRecord = {
  autoOpenYN: "0",
  autoFinishYN: "0",
  autoDay: "",
  autoAP: "0",
  autoHH: "00",
  autoMM: "00",
  autoID: "1",
  autoPass: "1",
};

export const defaultSelfPointConfig: SettingsRecord = {
  selfNoAutoPoint: "0",
  selfPointZero: "0",
  selfPointHidden: "0",
  selfPointSMSUse: "0",
  selfUserCall: "0",
  selfSMSAdmin: "1",
  selfKakao: "1",
  selfZero: "1",
  selfCusAlarmUse: "1",
  selfCusAlarmTime: "0",
  selfSNSGubun: "0",
};

export const defaultSelfPrintConfig: SettingsRecord = {
  selfAutoPrint: "0",
  selfStoPrint: "0",
  selfPrintAddress: "0",
  selfPrintPhon: "0",
};

export const defaultSelfEtcConfig: SettingsRecord = {
  selfJPYN: "0",
  selfBagJPPort: "0",
  selfNoAutoGoods: "0",
  selfAppCard: "0",
  selfApple: "0",
  selfCamUse: "1",
  selfICSiren: "0",
  selfGif: "",
};

export const defaultPosPrintConfig: SettingsRecord = {
  // 1~26
  settleCategoryPrint: "1",
  settleAmountPrint: "1",
  saleNewProduct: "1",
  receiptProductOneLine: "0",
  exchangePassword: "0",
  zeroPriceInput: "0",
  discountNoPoint: "0",
  weightNoPoint: "0",
  saleCancelDisable: "0",
  slipNoPrint: "0",
  deliveryDisable: "0",
  holdReceiptPrint: "0",
  cardNoDrawer: "0",
  cancelDetailPrint: "0",
  posNoCreditSale: "0",
  receiptBarcode: "0",
  receiptVat: "1",
  receiptBottleTotal: "0",
  cashBackUse: "1",
  noCostPriceShow: "1",
  barcodeGroupUse: "0",
  returnNoPassword: "0",
  memberTotalHide: "0",
  cardReceiptDetail: "0",
  checkResponsePrint: "1",
  deliveryPointAccrue: "1",
  // 27~42
  discountNoCashback: "0",
  cashForceInput: "1",
  archiveBarcodeNo: "0",
  eSignArchiveNo: "0",
  deliveryArchiveDouble: "0",
  reissueBarcodeNo: "0",
  slipNoHide: "0",
  visitDeliveryArchive: "0",
  deliveryNoPayClose: "0",
  closeOutstandingPrint: "0",
  overdueCustomerWarn: "0",
  holdNoShift: "0",
  deliveryNoShift: "0",
  receiptItemSeq: "0",
  cashOnlyNoReturn: "0",
  firstScanHoldMsg: "0",
  // 44~52
  scale18Barcode: "0",
  holdReceiptDetail: "0",
  cashReceiptAutoIssue: "0",
  costOverSellWarn: "0",
  saleMessageHide: "1",
  disabledProductChange: "0",
  deliveryArchiveSimple: "0",
  receiptNoOutstanding: "0",
  deliveryNoPayReturn: "0",
  // 53~54
  deliverySaleType: "0",
  salePriceCompare: "0",
  // 57~79
  categoryScaleInput: "0",
  deliveryNotePrint: "0",
  barcodeCardPayScreen: "0",
  cashChangeCardScreen: "0",
  shortcutFixedPrice: "0",
  giftCashReceiptInclude: "0",
  giftPointInclude: "0",
  openShiftFiscalPrint: "0",
  deliverySeqPrint: "0",
  deliveryReceiptManage: "0",
  deliveryDriverReceipt: "0",
  bulkPriceFit: "0",
  cashbackQrPrint: "0",
  receiptPhoneMask: "0",
  shortcutNameProcess: "0",
  eCouponNoReceipt: "0",
  deliveryItemArchive: "0",
  cashReceiptIdShow: "0",
  deliverySeqMemberReceipt: "0",
  receiptNameMask: "0",
  cardReturnNoDrawer: "0",
  cardCardPayUse: "1",
  deliveryArchiveNormal: "0",
};

export const defaultPosSaleConfig: SettingsRecord = {
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
};

export const defaultPosReceiptConfig: SettingsRecord = {
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
};

export const defaultKitchenConfig: SettingsRecord = {
  kitchenPrint: "4",
  kitchenPrintPort: "7",
  kitchenPrintBps: "9600",
  kitchenFontsize: "0",
  kitchenMsg1: "",
  kitchenMsg2: "",
  kitchenMsg4: "",
};

// ─── 카테고리 매핑 (탭ID → prefix + apiCategory) ───
export const categoryMap: Record<string, CategoryMapEntry> = {
  terminal: { prefix: "terminal", apiCategory: "TERMINAL" },
  van: { prefix: "van", apiCategory: "VAN" },
  selfCash: { prefix: "selfCash", apiCategory: "SELF_CASH" },
  selfBag: { prefix: "selfBag", apiCategory: "SELF_BAG" },
  selfAuto: { prefix: "selfAuto", apiCategory: "SELF_AUTO" },
  selfPoint: { prefix: "selfPoint", apiCategory: "SELF_POINT" },
  selfPrint: { prefix: "selfPrint", apiCategory: "SELF_PRINT" },
  selfEtc: { prefix: "selfEtc", apiCategory: "SELF_ETC" },
  posPrint: { prefix: "posPrint", apiCategory: "POS_PRINT" },
  posSale: { prefix: "posSale", apiCategory: "POS_SALE" },
  posSettle: { prefix: "posSettle", apiCategory: "POS_SETTLE" },
  posReceipt: { prefix: "posReceipt", apiCategory: "POS_RECEIPT" },
  kitchenMsg: { prefix: "kitchen", apiCategory: "KITCHEN" },
};

// ─── 토글 항목 정의 ───
export const terminalToggles: ToggleItem[] = [
  { key: "cashDraw", title: "캐시 드로워", desc: "현금함 사용" },
  { key: "touch", title: "터치스크린", desc: "터치 입력 사용" },
  { key: "dual", title: "듀얼 모니터", desc: "보조 모니터 사용" },
  { key: "cdpCashYN", title: "CDP 현금 표시", desc: "고객표시기 현금 표시" },
  { key: "printerCatUse", title: "CAT 프린터", desc: "CAT 프린터 사용" },
];

export const selfCashToggles: ToggleItem[] = [
  { key: "selfCash", title: "현금 결제", desc: "현금 결제 사용" },
  { key: "selfNoHyunYoung", title: "실결제금액 숨김", desc: "실결제 금액 미표시" },
  { key: "selfOneHPUse", title: "1만원권 사용", desc: "현금기 1만원권 투입 허용" },
  { key: "self50HPUse", title: "5만원권 사용", desc: "현금기 5만원권 투입 허용" },
  { key: "self10000Use", title: "만원권 사용", desc: "만원권 사용 허용" },
  { key: "selfNoCardUse", title: "카드 결제 비활성", desc: "카드 결제 비활성화" },
];

export const selfBagToggles: ToggleItem[] = [
  { key: "selfStartBag", title: "시작시 봉투", desc: "시작 시 봉투 선택 화면" },
  { key: "selfMBagSell", title: "복수 봉투 판매", desc: "봉투 여러 장 판매" },
  { key: "selfLastBag", title: "마지막 봉투", desc: "마지막에 봉투 추가" },
];

export const selfAutoToggles: ToggleItem[] = [
  { key: "autoOpenYN", title: "자동 개점", desc: "설정 시간에 자동 개점" },
  { key: "autoFinishYN", title: "자동 마감", desc: "설정 시간에 자동 마감" },
];

export const selfPointToggles: ToggleItem[] = [
  { key: "selfNoAutoPoint", title: "자동포인트 비활성", desc: "자동 포인트 적립 비활성" },
  { key: "selfPointZero", title: "포인트 초기화", desc: "포인트 0원 초기화" },
  { key: "selfPointHidden", title: "포인트 숨김", desc: "포인트 정보 미표시" },
  { key: "selfPointSMSUse", title: "포인트 SMS", desc: "포인트 SMS 발송" },
  { key: "selfUserCall", title: "직원 호출", desc: "직원 호출 기능 사용" },
  { key: "selfSMSAdmin", title: "관리자 SMS", desc: "관리자에게 SMS 알림" },
  { key: "selfKakao", title: "카카오 알림", desc: "카카오톡 알림 발송" },
  { key: "selfCusAlarmUse", title: "고객 알람", desc: "고객 알람 사용" },
];

export const selfPrintToggles: ToggleItem[] = [
  { key: "selfAutoPrint", title: "자동 출력", desc: "결제 후 자동 영수증 출력" },
  { key: "selfStoPrint", title: "출력 중지", desc: "영수증 출력 중지" },
  { key: "selfPrintAddress", title: "주소 출력", desc: "영수증에 주소 출력" },
  { key: "selfPrintPhon", title: "전화번호 출력", desc: "영수증에 전화번호 출력" },
];

export const selfEtcToggles: ToggleItem[] = [
  { key: "selfJPYN", title: "일본 모드", desc: "동전교환 일본 모드" },
  { key: "selfNoAutoGoods", title: "자동상품 비활성", desc: "자동 상품 등록 비활성" },
  { key: "selfAppCard", title: "앱카드", desc: "앱카드 결제 사용" },
  { key: "selfApple", title: "애플페이", desc: "Apple Pay 사용" },
  { key: "selfCamUse", title: "카메라", desc: "카메라 사용" },
  { key: "selfICSiren", title: "IC 사이렌", desc: "IC 사이렌 알림" },
];

export const posPrintToggles: ToggleItem[] = [
  // 1~26
  { key: "settleCategoryPrint", title: "1. 정산 분류별 매출 출력", desc: "정산시 분류별 매출 출력" },
  { key: "settleAmountPrint", title: "2. 정산 금액단위별 수량", desc: "정산시 금액 단위별 수량 출력" },
  { key: "saleNewProduct", title: "3. 신상품 등록 가능", desc: "판매시 신상품 등록 가능" },
  { key: "receiptProductOneLine", title: "4. 상품정보 1줄 표시", desc: "영수증에 상품정보 1줄 표시" },
  { key: "exchangePassword", title: "5. 환전 비밀번호", desc: "환전 시 비밀번호 사용" },
  { key: "zeroPriceInput", title: "6. 0원 상품 입력", desc: "가격 0인 상품 POS에서 입력" },
  { key: "discountNoPoint", title: "7. 할인상품 적립 안함", desc: "할인상품 포인트 적립 안함" },
  { key: "weightNoPoint", title: "8. 중량상품 적립 안함", desc: "중량상품 포인트 적립 안함" },
  { key: "saleCancelDisable", title: "9. 전체취소 비활성", desc: "판매시 전체취소 기능 사용 안함" },
  { key: "slipNoPrint", title: "10. 전표번호 미출력", desc: "매출전표 번호 출력 안하기" },
  { key: "deliveryDisable", title: "11. 배달기능 비활성", desc: "배달기능 사용안함" },
  { key: "holdReceiptPrint", title: "12. 보류 영수증 출력", desc: "보류시 보류 영수증 출력" },
  { key: "cardNoDrawer", title: "13. 카드 시 금고 안열기", desc: "카드매출시 금고 열지 않음" },
  {
    key: "cancelDetailPrint",
    title: "14. 취소 내역 출력",
    desc: "전체취소시 취소내역 출력(취소사유)",
  },
  { key: "posNoCreditSale", title: "15. 외상 매출 불가", desc: "POS 외상 매출 불가 설정" },
  { key: "receiptBarcode", title: "16. 영수증 바코드", desc: "영수증에 바코드 표시" },
  { key: "receiptVat", title: "17. 영수증 부가세", desc: "영수증에 부가세 표시" },
  { key: "receiptBottleTotal", title: "18. 공병합계 표시", desc: "영수증에 공병합계 금액 표시" },
  { key: "cashBackUse", title: "19. 캐쉬백 사용", desc: "캐쉬백 기능 사용" },
  { key: "noCostPriceShow", title: "20. 매입가 미표시", desc: "가격확인시 매입가 표시안함" },
  { key: "barcodeGroupUse", title: "21. 바코드별 상품 묶기", desc: "바코드별 상품 묶기 사용" },
  { key: "returnNoPassword", title: "22. 반품 비밀번호 미사용", desc: "반품시 비밀번호 사용안함" },
  { key: "memberTotalHide", title: "23. 회원 구매금액 숨김", desc: "회원 총 구매금액 숨기기" },
  {
    key: "cardReceiptDetail",
    title: "24. 카드 보관용 상세인쇄",
    desc: "카드매출시 보관용영수증 상세내역 인쇄",
  },
  { key: "checkResponsePrint", title: "25. 수표 응답 인쇄", desc: "수표조회시 응답값 인쇄" },
  {
    key: "deliveryPointAccrue",
    title: "26. 배달 포인트 적립",
    desc: "배달판매시 포인트 적립(미체크:입금시)",
  },
  // 27~42
  {
    key: "discountNoCashback",
    title: "27. 할인상품 캐쉬백 안함",
    desc: "할인상품 캐쉬백 적립 안함",
  },
  { key: "cashForceInput", title: "28. 받은돈 무조건 입력", desc: "현금처리시 받은돈 무조건 입력" },
  { key: "archiveBarcodeNo", title: "29. 보관용 바코드 안함", desc: "보관용전표 바코드출력 안함" },
  {
    key: "eSignArchiveNo",
    title: "30. 전자서명 보관전표 안함",
    desc: "전자서명시 보관용전표 출력안함",
  },
  { key: "deliveryArchiveDouble", title: "31. 배달 보관전표 2장", desc: "배달보관용전표 2장 출력" },
  {
    key: "reissueBarcodeNo",
    title: "32. 재발행 바코드 안함",
    desc: "영수증재발행시 바코드 출력안함",
  },
  { key: "slipNoHide", title: "33. 전표번호 숨기기", desc: "판매화면 전표번호 숨기기" },
  {
    key: "visitDeliveryArchive",
    title: "34. 내방배달 보관전표",
    desc: "내방배달시 보관용전표 출력",
  },
  { key: "deliveryNoPayClose", title: "35. 배달미입금 마감불가", desc: "배달미입금시 마감불가" },
  {
    key: "closeOutstandingPrint",
    title: "36. 마감시 외상입금 출력",
    desc: "포스마감시 회원외상 입금내역 출력",
  },
  {
    key: "overdueCustomerWarn",
    title: "37. 미수고객 경고창",
    desc: "미수고객 호출시 경고창 보여주기",
  },
  { key: "holdNoShift", title: "38. 보류시 교대 불가", desc: "보류 뒤 미처리시 교대 불가" },
  { key: "deliveryNoShift", title: "39. 배달미처리 교대 불가", desc: "배달 미처리시 교대 불가" },
  { key: "receiptItemSeq", title: "40. 상품순번 출력", desc: "영수증에 상품순번 출력(2줄식)" },
  {
    key: "cashOnlyNoReturn",
    title: "41. 현금전용 반품 불가",
    desc: "현금으로만 결제시 전표반품 불가",
  },
  {
    key: "firstScanHoldMsg",
    title: "42. 스캔시 보류 메시지",
    desc: "첫 상품 스캔시 보류메세지 보여주기",
  },
  // 44~52
  { key: "scale18Barcode", title: "44. 18행 중량바코드", desc: "저울 18행 중량바코드 사용" },
  { key: "holdReceiptDetail", title: "45. 보류 영수증 상세", desc: "보류 영수증 상세 출력" },
  {
    key: "cashReceiptAutoIssue",
    title: "46. 현금영수증 자진발급",
    desc: "현금영수증 자진발급 사용",
  },
  {
    key: "costOverSellWarn",
    title: "47. 매입>판매 경고",
    desc: "판매시 매입액>판매액크면 경고창 보여주기",
  },
  { key: "saleMessageHide", title: "48. 판매메세지 숨김", desc: "판매메세지 숨기기" },
  {
    key: "disabledProductChange",
    title: "49. 중지상품 변경사용",
    desc: "판매시 사용중지상품 변경사용",
  },
  { key: "deliveryArchiveSimple", title: "50. 배달 약식 출력", desc: "배달 보관용 전표 약식 출력" },
  {
    key: "receiptNoOutstanding",
    title: "51. 미수금 출력 안함",
    desc: "영수증에 고객 미수금 출력 안함",
  },
  {
    key: "deliveryNoPayReturn",
    title: "52. 배달미입금 반품 가능",
    desc: "배달 미입금 전표 반품 가능",
  },
  // 53~54
  {
    key: "deliverySaleType",
    title: "53. 배달판매 구분",
    desc: "배달판매구분(미체크:내방, 체크:전화)",
  },
  { key: "salePriceCompare", title: "54. 가격비교 사용", desc: "판매 가격비교 사용" },
  // 57~79
  {
    key: "categoryScaleInput",
    title: "57. 부류/저울 판매가 입력",
    desc: "부류/저울상품 판매가 입력 화면 사용",
  },
  { key: "deliveryNotePrint", title: "58. 배달 비고란 출력", desc: "배달판매시 비고란 출력" },
  {
    key: "barcodeCardPayScreen",
    title: "59. 바코드 카드결제 화면",
    desc: "판매 바코드입력에서 카드/외상 결제 화면 사용",
  },
  {
    key: "cashChangeCardScreen",
    title: "60. 잔액 카드결제 화면",
    desc: "현금 결제 후 잔액 카드/외상 결제 화면 사용",
  },
  {
    key: "shortcutFixedPrice",
    title: "61. 단축키 고정판매가",
    desc: "판매 단축키 부류/저울 상품 고정판매가 사용",
  },
  {
    key: "giftCashReceiptInclude",
    title: "62. 상품권 현금영수증 포함",
    desc: "상품권 결제시 현금영수증/캐쉬백 발행액 포함",
  },
  {
    key: "giftPointInclude",
    title: "63. 상품권 포인트 포함",
    desc: "상품권 결제시 포인트 적립 포함",
  },
  {
    key: "openShiftFiscalPrint",
    title: "64. 개점/교대 재정정보",
    desc: "개점/교대 등록시 재정정보 출력",
  },
  { key: "deliverySeqPrint", title: "65. 배달 순번 출력", desc: "배달 판매 순번 출력 사용" },
  {
    key: "deliveryReceiptManage",
    title: "66. 배달 영수증 관리",
    desc: "배달 판매 영수증 관리 사용",
  },
  {
    key: "deliveryDriverReceipt",
    title: "67. 기사용 영수증 출력",
    desc: "배달 판매 기사용 영수증 출력 사용",
  },
  {
    key: "bulkPriceFit",
    title: "68. 벌크상품 합계 맞춤",
    desc: "판매시 벌크상품 판매가 합계 맞추기 사용",
  },
  {
    key: "cashbackQrPrint",
    title: "69. 캐쉬백 QR 인쇄",
    desc: "판매시 캐쉬백 적립 QR코드 인쇄 사용",
  },
  {
    key: "receiptPhoneMask",
    title: "70. 전화번호 마스킹",
    desc: "영수증 회원 전화번호 마스킹 처리 사용",
  },
  { key: "shortcutNameProcess", title: "71. 단축키 마포이름", desc: "단축키 마포이름 처리 사용" },
  {
    key: "eCouponNoReceipt",
    title: "72. e-쿠폰 영수증 안함",
    desc: "e-쿠폰 사용 영수증 출력 안함",
  },
  {
    key: "deliveryItemArchive",
    title: "73. 배달 개별상품 보관용",
    desc: "배달 판매 개별상품 보관용영수증에 출력",
  },
  {
    key: "cashReceiptIdShow",
    title: "74. 현금영수증 고객표시",
    desc: "현금영수증 신분정보 고객모니터에 보여주기",
  },
  {
    key: "deliverySeqMemberReceipt",
    title: "75. 배달순번 회원영수증",
    desc: "배달 순번 출력 사용시 회원 구분 영수증 출력",
  },
  { key: "receiptNameMask", title: "76. 회원명 마스킹", desc: "영수증 회원명 마스킹 처리 사용" },
  {
    key: "cardReturnNoDrawer",
    title: "77. 카드반품 돈통 안열기",
    desc: "카드매출 전표반품시 돈통 열지 않기 사용",
  },
  { key: "cardCardPayUse", title: "78. 카드+카드 결제", desc: "카드+카드 결제 사용(+ 4,x,x)" },
  {
    key: "deliveryArchiveNormal",
    title: "79. 배달 보관 일반설정",
    desc: "배달 보관 영수증 상품정보 일반영수증 설정 적용",
  },
];

export const posSaleToggles: ToggleItem[] = [
  { key: "bcPartner", title: "BC 파트너스", desc: "BC 파트너스 가맹점 여부" },
  { key: "creditMemoUse", title: "외상결제 메모", desc: "판매>외상결제시 메모 기능 사용" },
];

export const staffSettleToggles: ToggleItem[] = [
  { key: "staffBottleSales", title: "공병 매출", desc: "담당자 정산서에 공병 매출 포함" },
  { key: "staffTaxExempt", title: "과/면세 내역", desc: "담당자 정산서에 과/면세 내역 포함" },
  { key: "staffDiscount", title: "할인 내역", desc: "담당자 정산서에 할인 내역 포함" },
  { key: "staffCancel", title: "취소 내역", desc: "담당자 정산서에 취소 내역 포함" },
  { key: "staffCreditCard", title: "신용카드 내역", desc: "담당자 정산서에 신용카드 내역 포함" },
  {
    key: "staffCashReceipt",
    title: "현금영수증 내역",
    desc: "담당자 정산서에 현금영수증 내역 포함",
  },
  { key: "staffPrize", title: "경품지급 내역", desc: "담당자 정산서에 경품지급 내역 포함" },
  {
    key: "staffCardByIssuer",
    title: "매입사별 카드매출",
    desc: "담당자 정산서에 매입사별 카드매출 포함",
  },
  { key: "staffOutstanding", title: "외상 입금 내역", desc: "담당자 정산서에 외상 입금 내역 포함" },
  {
    key: "staffDeliveryDeposit",
    title: "전배달 입금 내역",
    desc: "담당자 정산서에 전배달 입금 내역 포함",
  },
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
  {
    key: "closeCardByIssuer",
    title: "매입사별 카드매출",
    desc: "마감 정산서에 매입사별 카드매출 포함",
  },
  { key: "closeDeliveryCount", title: "배달건수 출력", desc: "마감 정산서에 배달건수 출력" },
  { key: "closeSettleReport", title: "정산서 출력", desc: "마감 정산서 출력" },
];

export const posReceiptToggles: ToggleItem[] = [
  { key: "receiptOffDelivery", title: "배달시 출력 안함", desc: "배달(내방/전화)시 출력 안함" },
  { key: "receiptOffCredit", title: "외상시 출력 안함", desc: "외상시 출력 안함" },
  { key: "receiptOffPoint", title: "포인트 사용 출력 안함", desc: "포인트 사용 출력 안함" },
  { key: "receiptOffGift", title: "상품권 사용 출력 안함", desc: "상품권 사용 출력 안함" },
  { key: "receiptOffEcoupon", title: "e쿠폰 사용 출력 안함", desc: "e쿠폰 사용 출력 안함" },
  { key: "receiptOffQrms", title: "QRMS 사용 출력 안함", desc: "QRMS 사용시 출력 안함" },
  {
    key: "receiptOffCardOnce",
    title: "카드 일시불 출력 안함",
    desc: "카드 일시불/OFF 결제시 출력 안함",
  },
  {
    key: "receiptOffCardInstall",
    title: "카드 할부 출력 안함",
    desc: "카드 할부 결제시 출력 안함",
  },
  {
    key: "receiptOffCashReceipt",
    title: "현금영수증 출력 안함",
    desc: "현금영수증 결제시 출력 안함",
  },
  { key: "receiptOffReturn", title: "전표반품 출력 안함", desc: "전표반품시 출력 안함" },
];
