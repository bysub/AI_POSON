<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { apiClient } from "@/services/api/client";
import { showSuccessToast, showErrorToast, showApiError, showConfirm } from "@/utils/AlertUtils";

// ─── 타입 ───
type DeviceType = "POS" | "KIOSK" | "KITCHEN";

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  isActive: boolean;
}

type SettingsRecord = Record<string, string>;

// ─── 기기 목록 상태 ───
const devices = ref<Device[]>([]);
const selectedDeviceId = ref("");
const currentDeviceId = ref(""); // POSON_DEVICE_ID 환경변수값
const isLoadingDevices = ref(false);

// ─── 기기 추가 모달 ───
const showAddModal = ref(false);
const newDevice = ref({ id: "", name: "", type: "POS" as DeviceType });

// ─── 설정 상태 ───
const activeTab = ref("terminal");
const isLoading = ref(false);
const isSaving = ref(false);

// ─── 선택된 기기 ───
const selectedDevice = computed(() => devices.value.find((d) => d.id === selectedDeviceId.value));

const deviceTypeLabel: Record<DeviceType, string> = {
  POS: "POS",
  KIOSK: "키오스크",
  KITCHEN: "주방",
};

// ─── 기기 유형별 탭 ───
const tabsByDevice = computed(() => {
  const type = selectedDevice.value?.type;
  if (!type) return [];

  const base = [{ id: "terminal", label: "터미널 HW" }];
  if (type === "POS") {
    return [
      ...base,
      { id: "van", label: "VAN 결제" },
      { id: "posPrint", label: "인쇄/출력" },
      { id: "posSale", label: "판매설정" },
    ];
  }
  if (type === "KIOSK") {
    return [
      ...base,
      { id: "van", label: "VAN 결제" },
      { id: "selfCash", label: "현금 결제" },
      { id: "selfBag", label: "봉투/저울" },
      { id: "selfAuto", label: "자동 운영" },
      { id: "selfPoint", label: "포인트/알림" },
      { id: "selfPrint", label: "인쇄/출력" },
      { id: "selfEtc", label: "기타" },
    ];
  }
  return [...base, { id: "kitchenMsg", label: "주방 메시지" }];
});

// ─── 설정 데이터 refs ───
const terminalConfig = ref({
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
});

const vanConfig = ref({
  vanSelect: "4",
  singPadPort: "0",
  logDelete: "1",
  vanIp: "",
  vanPort: "",
  danmalNo: "",
  snumber: "",
  singPadBps: "9600",
  usbYN: "0",
});

const selfCashConfig = ref({
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
});

const selfBagConfig = ref({
  selfBagPort: "0",
  selfStartBag: "0",
  selfMBagSell: "1",
  selfLastBag: "1",
  selfScalePort: "0",
  selfScaleLimitG: "0",
});

const selfAutoConfig = ref({
  autoOpenYN: "0",
  autoFinishYN: "0",
  autoDay: "",
  autoAP: "0",
  autoHH: "00",
  autoMM: "00",
  autoID: "1",
  autoPass: "1",
});

const selfPointConfig = ref({
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
});

const selfPrintConfig = ref({
  selfAutoPrint: "0",
  selfStoPrint: "0",
  selfPrintAddress: "0",
  selfPrintPhon: "0",
});

const selfEtcConfig = ref({
  selfJPYN: "0",
  selfBagJPPort: "0",
  selfNoAutoGoods: "0",
  selfAppCard: "0",
  selfApple: "0",
  selfCamUse: "1",
  selfICSiren: "0",
  selfGif: "",
});

const posPrintConfig = ref({
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
});

const posSaleConfig = ref({
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
});

const kitchenConfig = ref({
  kitchenPrint: "4",
  kitchenPrintPort: "7",
  kitchenPrintBps: "9600",
  kitchenFontsize: "0",
  kitchenMsg1: "",
  kitchenMsg2: "",
  kitchenMsg4: "",
});

// ─── 카테고리 매핑 ───
const categoryMap: Record<
  string,
  { ref: ReturnType<typeof ref<SettingsRecord>>; prefix: string; apiCategory: string }
> = {
  terminal: {
    ref: terminalConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "terminal",
    apiCategory: "TERMINAL",
  },
  van: {
    ref: vanConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "van",
    apiCategory: "VAN",
  },
  selfCash: {
    ref: selfCashConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "selfCash",
    apiCategory: "SELF_CASH",
  },
  selfBag: {
    ref: selfBagConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "selfBag",
    apiCategory: "SELF_BAG",
  },
  selfAuto: {
    ref: selfAutoConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "selfAuto",
    apiCategory: "SELF_AUTO",
  },
  selfPoint: {
    ref: selfPointConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "selfPoint",
    apiCategory: "SELF_POINT",
  },
  selfPrint: {
    ref: selfPrintConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "selfPrint",
    apiCategory: "SELF_PRINT",
  },
  selfEtc: {
    ref: selfEtcConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "selfEtc",
    apiCategory: "SELF_ETC",
  },
  posPrint: {
    ref: posPrintConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "posPrint",
    apiCategory: "POS_PRINT",
  },
  posSale: {
    ref: posSaleConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "posSale",
    apiCategory: "POS_SALE",
  },
  kitchenMsg: {
    ref: kitchenConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "kitchen",
    apiCategory: "KITCHEN",
  },
};

// ─── 토글 항목 정의 ───
type ToggleItem = { key: string; title: string; desc: string };

const terminalToggles: ToggleItem[] = [
  { key: "cashDraw", title: "캐시 드로워", desc: "현금함 사용" },
  { key: "touch", title: "터치스크린", desc: "터치 입력 사용" },
  { key: "dual", title: "듀얼 모니터", desc: "보조 모니터 사용" },
  { key: "cdpCashYN", title: "CDP 현금 표시", desc: "고객표시기 현금 표시" },
  { key: "printerCatUse", title: "CAT 프린터", desc: "CAT 프린터 사용" },
];

const selfCashToggles: ToggleItem[] = [
  { key: "selfCash", title: "현금 결제", desc: "현금 결제 사용" },
  { key: "selfNoHyunYoung", title: "실결제금액 숨김", desc: "실결제 금액 미표시" },
  { key: "selfOneHPUse", title: "1만원권 사용", desc: "현금기 1만원권 투입 허용" },
  { key: "self50HPUse", title: "5만원권 사용", desc: "현금기 5만원권 투입 허용" },
  { key: "self10000Use", title: "만원권 사용", desc: "만원권 사용 허용" },
  { key: "selfNoCardUse", title: "카드 결제 비활성", desc: "카드 결제 비활성화" },
];

const selfBagToggles: ToggleItem[] = [
  { key: "selfStartBag", title: "시작시 봉투", desc: "시작 시 봉투 선택 화면" },
  { key: "selfMBagSell", title: "복수 봉투 판매", desc: "봉투 여러 장 판매" },
  { key: "selfLastBag", title: "마지막 봉투", desc: "마지막에 봉투 추가" },
];

const selfAutoToggles: ToggleItem[] = [
  { key: "autoOpenYN", title: "자동 개점", desc: "설정 시간에 자동 개점" },
  { key: "autoFinishYN", title: "자동 마감", desc: "설정 시간에 자동 마감" },
];

const selfPointToggles: ToggleItem[] = [
  { key: "selfNoAutoPoint", title: "자동포인트 비활성", desc: "자동 포인트 적립 비활성" },
  { key: "selfPointZero", title: "포인트 초기화", desc: "포인트 0원 초기화" },
  { key: "selfPointHidden", title: "포인트 숨김", desc: "포인트 정보 미표시" },
  { key: "selfPointSMSUse", title: "포인트 SMS", desc: "포인트 SMS 발송" },
  { key: "selfUserCall", title: "직원 호출", desc: "직원 호출 기능 사용" },
  { key: "selfSMSAdmin", title: "관리자 SMS", desc: "관리자에게 SMS 알림" },
  { key: "selfKakao", title: "카카오 알림", desc: "카카오톡 알림 발송" },
  { key: "selfCusAlarmUse", title: "고객 알람", desc: "고객 알람 사용" },
];

const selfPrintToggles: ToggleItem[] = [
  { key: "selfAutoPrint", title: "자동 출력", desc: "결제 후 자동 영수증 출력" },
  { key: "selfStoPrint", title: "출력 중지", desc: "영수증 출력 중지" },
  { key: "selfPrintAddress", title: "주소 출력", desc: "영수증에 주소 출력" },
  { key: "selfPrintPhon", title: "전화번호 출력", desc: "영수증에 전화번호 출력" },
];

const selfEtcToggles: ToggleItem[] = [
  { key: "selfJPYN", title: "일본 모드", desc: "동전교환 일본 모드" },
  { key: "selfNoAutoGoods", title: "자동상품 비활성", desc: "자동 상품 등록 비활성" },
  { key: "selfAppCard", title: "앱카드", desc: "앱카드 결제 사용" },
  { key: "selfApple", title: "애플페이", desc: "Apple Pay 사용" },
  { key: "selfCamUse", title: "카메라", desc: "카메라 사용" },
  { key: "selfICSiren", title: "IC 사이렌", desc: "IC 사이렌 알림" },
];

const posPrintToggles: ToggleItem[] = [
  // 1~26
  {
    key: "settleCategoryPrint",
    title: "1. 정산 분류별 매출 출력",
    desc: "정산시 분류별 매출 출력",
  },
  {
    key: "settleAmountPrint",
    title: "2. 정산 금액단위별 수량",
    desc: "정산시 금액 단위별 수량 출력",
  },
  { key: "saleNewProduct", title: "3. 신상품 등록 가능", desc: "판매시 신상품 등록 가능" },
  {
    key: "receiptProductOneLine",
    title: "4. 상품정보 1줄 표시",
    desc: "영수증에 상품정보 1줄 표시",
  },
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

const posSaleToggles: ToggleItem[] = [
  { key: "bcPartner", title: "BC 파트너스", desc: "BC 파트너스 가맹점 여부" },
  { key: "creditMemoUse", title: "외상결제 메모", desc: "판매>외상결제시 메모 기능 사용" },
];

const currentTabLabel = computed(
  () => tabsByDevice.value.find((t) => t.id === activeTab.value)?.label ?? "",
);

// ─── API: 기기 목록 ───
async function loadDevices(): Promise<void> {
  isLoadingDevices.value = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: Device[] }>("/api/v1/devices");
    if (res.data.success) {
      devices.value = res.data.data;
    }
  } catch (err) {
    console.error("Failed to load devices:", err);
  } finally {
    isLoadingDevices.value = false;
  }
}

async function addDevice(): Promise<void> {
  if (!newDevice.value.id || !newDevice.value.name) return;
  try {
    const res = await apiClient.post<{ success: boolean; data: Device }>(
      "/api/v1/devices",
      newDevice.value,
    );
    if (res.data.success) {
      devices.value.push(res.data.data);
      selectedDeviceId.value = res.data.data.id;
      showAddModal.value = false;
      newDevice.value = { id: "", name: "", type: "POS" };
    }
  } catch (err: unknown) {
    showApiError(err, "기기 등록에 실패했습니다");
  }
}

async function deleteDevice(id: string): Promise<void> {
  const { isConfirmed } = await showConfirm("삭제", "delete");
  if (!isConfirmed) return;
  try {
    await apiClient.delete(`/api/v1/devices/${id}`);
    devices.value = devices.value.filter((d) => d.id !== id);
    if (selectedDeviceId.value === id) {
      selectedDeviceId.value = devices.value[0]?.id ?? "";
    }
  } catch (err) {
    console.error("Failed to delete device:", err);
  }
}

// ─── API: 기기별 설정 ───
function resetConfigs(): void {
  for (const cat of Object.values(categoryMap)) {
    const cfg = cat.ref.value as SettingsRecord;
    // 기본값 유지를 위해 여기서는 리셋하지 않음 (새 기기 선택 시 기본값으로 폴백)
    void cfg;
  }
}

async function loadDeviceSettings(): Promise<void> {
  if (!selectedDeviceId.value) return;
  isLoading.value = true;
  try {
    const relevantTabs = tabsByDevice.value.map((t) => t.id);
    const categories = relevantTabs.map((id) => categoryMap[id]).filter(Boolean);

    const responses = await Promise.all(
      categories.map((c) =>
        apiClient.get<{ success: boolean; data: SettingsRecord }>(
          `/api/v1/devices/${selectedDeviceId.value}/settings/${c.apiCategory.toLowerCase()}`,
        ),
      ),
    );
    responses.forEach((res, i) => {
      if (res.data.success && Object.keys(res.data.data).length > 0) {
        const d = res.data.data;
        const cfg = categories[i].ref.value as SettingsRecord;
        const prefix = categories[i].prefix;
        for (const key of Object.keys(cfg)) {
          const dbKey = `${prefix}.${key}`;
          if (d[dbKey] !== undefined) cfg[key] = d[dbKey];
        }
      }
    });
  } catch (err) {
    console.error("Failed to load device settings:", err);
  } finally {
    isLoading.value = false;
  }
}

function buildPayload(prefix: string, obj: SettingsRecord): SettingsRecord {
  const payload: SettingsRecord = {};
  for (const [key, value] of Object.entries(obj)) {
    payload[`${prefix}.${key}`] = String(value ?? "");
  }
  return payload;
}

async function saveCurrentTab(): Promise<void> {
  if (!selectedDeviceId.value) return;
  const cat = categoryMap[activeTab.value];
  if (!cat) return;
  isSaving.value = true;
  try {
    await apiClient.put(
      `/api/v1/devices/${selectedDeviceId.value}/settings/${cat.apiCategory.toLowerCase()}`,
      buildPayload(cat.prefix, cat.ref.value as unknown as SettingsRecord),
    );
    showSuccessToast("저장되었습니다");
  } catch (err) {
    showErrorToast(`저장 실패: ${err instanceof Error ? err.message : "오류 발생"}`);
  } finally {
    isSaving.value = false;
  }
}

function toggleValue(obj: Record<string, string>, key: string): void {
  obj[key] = obj[key] === "1" ? "0" : "1";
}

function selectDevice(id: string): void {
  selectedDeviceId.value = id;
  activeTab.value = "terminal";
}

// 기기 선택 변경 시 설정 로드
watch(selectedDeviceId, () => {
  resetConfigs();
  loadDeviceSettings();
});

// ─── 초기화 ───
onMounted(async () => {
  // 환경변수로 현재 기기 ID 감지
  try {
    if (window.api?.getEnv) {
      currentDeviceId.value = await window.api.getEnv("POSON_DEVICE_ID");
    }
  } catch {
    // 환경변수 없으면 무시
  }

  await loadDevices();

  // 현재 기기가 목록에 있으면 자동 선택
  if (currentDeviceId.value && devices.value.some((d) => d.id === currentDeviceId.value)) {
    selectedDeviceId.value = currentDeviceId.value;
  } else if (devices.value.length > 0) {
    selectedDeviceId.value = devices.value[0].id;
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">기기별 설정</h2>
        <p class="mt-0.5 text-sm text-slate-500">등록된 기기별로 개별 설정을 관리합니다</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="selectedDevice"
          class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          :disabled="isSaving || isLoading"
          @click="saveCurrentTab"
        >
          {{ isSaving ? "저장 중..." : `${currentTabLabel} 저장` }}
        </button>
      </div>
    </div>

    <div class="flex gap-4">
      <!-- ═══════ 좌측: 기기 목록 ═══════ -->
      <div class="w-56 flex-shrink-0 space-y-2">
        <button
          class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
          @click="showAddModal = true"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v12m6-6H6"
            />
          </svg>
          기기 추가
        </button>

        <div v-if="isLoadingDevices" class="flex items-center justify-center py-8">
          <div
            class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
          />
        </div>

        <div
          v-for="device in devices"
          :key="device.id"
          class="group relative cursor-pointer rounded-xl border p-3 transition-colors"
          :class="
            selectedDeviceId === device.id
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300'
          "
          @click="selectDevice(device.id)"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0">
              <p
                class="truncate text-sm font-semibold"
                :class="selectedDeviceId === device.id ? 'text-indigo-700' : 'text-slate-800'"
              >
                {{ device.name }}
              </p>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ device.id }}
              </p>
            </div>
            <button
              class="flex-shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              title="삭제"
              @click.stop="deleteDevice(device.id)"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="mt-1.5 flex items-center gap-1.5">
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="{
                'bg-blue-100 text-blue-700': device.type === 'POS',
                'bg-amber-100 text-amber-700': device.type === 'KIOSK',
                'bg-emerald-100 text-emerald-700': device.type === 'KITCHEN',
              }"
            >
              {{ deviceTypeLabel[device.type] }}
            </span>
            <span
              v-if="device.id === currentDeviceId"
              class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
            >
              현재 기기
            </span>
          </div>
        </div>

        <div
          v-if="!isLoadingDevices && devices.length === 0"
          class="py-8 text-center text-sm text-slate-400"
        >
          등록된 기기가 없습니다
        </div>
      </div>

      <!-- ═══════ 우측: 선택된 기기 설정 ═══════ -->
      <div class="min-w-0 flex-1">
        <!-- 기기 미선택 -->
        <div
          v-if="!selectedDevice"
          class="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20"
        >
          <p class="text-sm text-slate-400">좌측에서 기기를 선택하세요</p>
        </div>

        <template v-else>
          <!-- 탭 -->
          <div
            class="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1"
          >
            <button
              v-for="tab in tabsByDevice"
              :key="tab.id"
              class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              :class="
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              "
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Loading -->
          <div v-if="isLoading" class="flex items-center justify-center py-12">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
            />
          </div>

          <template v-else>
            <!-- ═══ 터미널 HW ═══ -->
            <div
              v-show="activeTab === 'terminal'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">터미널 하드웨어</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 종류</label>
                  <select
                    v-model="terminalConfig.terminalType"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">일반 POS</option>
                    <option value="1">셀프 키오스크</option>
                    <option value="2">주방 디스플레이</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">POS 번호</label>
                  <input
                    v-model="terminalConfig.posNo"
                    type="text"
                    maxlength="2"
                    placeholder="01"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >관리자 POS번호</label
                  >
                  <input
                    v-model="terminalConfig.adminPosNo"
                    type="text"
                    maxlength="2"
                    placeholder="z"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">프린터</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">프린터 종류</label>
                  <select
                    v-model="terminalConfig.printer"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">미사용</option>
                    <option value="1">시리얼</option>
                    <option value="2">패러럴</option>
                    <option value="3">USB</option>
                    <option value="4">네트워크</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">프린터 포트</label>
                  <input
                    v-model="terminalConfig.printerPort"
                    type="text"
                    placeholder="COM3"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">전송 속도</label>
                  <select
                    v-model="terminalConfig.printerBps"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="9600">9600</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="115200">115200</option>
                  </select>
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">스캐너 / 카드리더</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">스캐너 포트</label>
                  <input
                    v-model="terminalConfig.scanPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >핸드스캐너 포트</label
                  >
                  <input
                    v-model="terminalConfig.handScanPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">MSR 포트</label>
                  <input
                    v-model="terminalConfig.msrPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in terminalToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (terminalConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(terminalConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (terminalConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ VAN 결제 ═══ -->
            <div
              v-show="activeTab === 'van'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">VAN 결제 설정</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">VAN사 선택</label>
                  <select
                    v-model="vanConfig.vanSelect"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">KSNET</option>
                    <option value="1">KIS</option>
                    <option value="2">KMPS</option>
                    <option value="3">SMARTRO</option>
                    <option value="4">NICE</option>
                    <option value="5">JTNet</option>
                    <option value="6">KICC</option>
                    <option value="7">KCB</option>
                    <option value="8">KOVAN</option>
                    <option value="9">KOCES</option>
                    <option value="10">KCP</option>
                    <option value="11">KFTC</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >서명패드 포트</label
                  >
                  <input
                    v-model="vanConfig.singPadPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >서명패드 속도</label
                  >
                  <select
                    v-model="vanConfig.singPadBps"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="9600">9600</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="115200">115200</option>
                  </select>
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">VAN 연결 정보</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">VAN IP</label>
                  <input
                    v-model="vanConfig.vanIp"
                    type="text"
                    placeholder="211.33.136.2"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">VAN Port</label>
                  <input
                    v-model="vanConfig.vanPort"
                    type="text"
                    placeholder="7709"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">단말기 정보 (기기별 고유)</h4>
              <div class="grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">단말기 번호</label>
                  <input
                    v-model="vanConfig.danmalNo"
                    type="text"
                    placeholder="DANMALNO"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">시리얼 번호</label>
                  <input
                    v-model="vanConfig.snumber"
                    type="text"
                    placeholder="Snumber"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            <!-- ═══ POS: 인쇄/출력 ═══ -->
            <div
              v-show="activeTab === 'posPrint'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">POS 인쇄/출력</h3>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in posPrintToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (posPrintConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(posPrintConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (posPrintConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ POS: 판매설정 ═══ -->
            <div
              v-show="activeTab === 'posSale'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">POS 판매설정</h3>

              <!-- 드롭다운 설정 -->
              <h4 class="mb-3 text-sm font-semibold text-slate-600">영수증/절사 설정</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >할인상품 표시</label
                  >
                  <select
                    v-model="posSaleConfig.receiptDiscountDisplay"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">할인금액만 표시</option>
                    <option value="1">원가+할인 모두 표시</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >총매출금액 절사</label
                  >
                  <select
                    v-model="posSaleConfig.totalRounding"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">원단위 절사</option>
                    <option value="1">십단위 절사</option>
                    <option value="2">백단위 절사</option>
                    <option value="3">절사 안함</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >저울상품 절사</label
                  >
                  <select
                    v-model="posSaleConfig.scaleRounding"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">원단위 절사</option>
                    <option value="1">십단위 절사</option>
                    <option value="2">백단위 절사</option>
                    <option value="3">절사 안함</option>
                  </select>
                </div>
              </div>

              <!-- 분류별 매출 출력 -->
              <h4 class="mb-3 text-sm font-semibold text-slate-600">분류별 매출 출력</h4>
              <div class="mb-6">
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2">
                    <input
                      v-model="posSaleConfig.categoryPrintType"
                      type="radio"
                      value="0"
                      class="h-4 w-4 text-indigo-600"
                    />
                    <span class="text-sm text-slate-700">대분류</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      v-model="posSaleConfig.categoryPrintType"
                      type="radio"
                      value="1"
                      class="h-4 w-4 text-indigo-600"
                    />
                    <span class="text-sm text-slate-700">중분류</span>
                  </label>
                </div>
              </div>

              <!-- 포인트/금액 설정 -->
              <h4 class="mb-3 text-sm font-semibold text-slate-600">포인트/금액 설정</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >배달판매 포인트 적립율 (%)</label
                  >
                  <input
                    v-model="posSaleConfig.deliveryPointRate"
                    type="number"
                    min="0"
                    max="100"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >외상판매 포인트 적립율 (%)</label
                  >
                  <input
                    v-model="posSaleConfig.creditPointRate"
                    type="number"
                    min="0"
                    max="100"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >영수증 미발행 기준 (원 미만)</label
                  >
                  <input
                    v-model="posSaleConfig.minReceiptAmount"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >포인트 미적립 기준 (원 미만)</label
                  >
                  <input
                    v-model="posSaleConfig.minPointAmount"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >카드 무서명 금액 (원 이하)</label
                  >
                  <input
                    v-model="posSaleConfig.cardNoSignAmount"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <!-- 토글 설정 -->
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in posSaleToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (posSaleConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(posSaleConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (posSaleConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ 셀프: 현금 결제 ═══ -->
            <div
              v-show="activeTab === 'selfCash'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">현금 결제 설정</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">현금기 포트</label>
                  <input
                    v-model="selfCashConfig.selfCashPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >대기시간 (ms)</label
                  >
                  <input
                    v-model="selfCashConfig.selfCashSleep"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">현금기 종류</label>
                  <select
                    v-model="selfCashConfig.selfCashGubun"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="1">종류 1</option>
                    <option value="2">종류 2</option>
                  </select>
                </div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in selfCashToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (selfCashConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(selfCashConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (selfCashConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ 셀프: 봉투/저울 ═══ -->
            <div
              v-show="activeTab === 'selfBag'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">봉투/저울 설정</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >봉투 감지 포트</label
                  >
                  <input
                    v-model="selfBagConfig.selfBagPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">저울 포트</label>
                  <input
                    v-model="selfBagConfig.selfScalePort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >저울 무게 한도 (g)</label
                  >
                  <input
                    v-model="selfBagConfig.selfScaleLimitG"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in selfBagToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (selfBagConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(selfBagConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (selfBagConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ 셀프: 자동 운영 ═══ -->
            <div
              v-show="activeTab === 'selfAuto'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">자동 운영 (무인 모드)</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >자동 운영 날짜</label
                  >
                  <input
                    v-model="selfAutoConfig.autoDay"
                    type="date"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">AM/PM</label>
                  <select
                    v-model="selfAutoConfig.autoAP"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">AM</option>
                    <option value="1">PM</option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">시</label>
                    <input
                      v-model="selfAutoConfig.autoHH"
                      type="text"
                      maxlength="2"
                      placeholder="00"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-slate-700">분</label>
                    <input
                      v-model="selfAutoConfig.autoMM"
                      type="text"
                      maxlength="2"
                      placeholder="00"
                      class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >자동 로그인 ID</label
                  >
                  <input
                    v-model="selfAutoConfig.autoID"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >자동 로그인 PW</label
                  >
                  <input
                    v-model="selfAutoConfig.autoPass"
                    type="password"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in selfAutoToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (selfAutoConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(selfAutoConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (selfAutoConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ 셀프: 포인트/알림 ═══ -->
            <div
              v-show="activeTab === 'selfPoint'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">포인트/알림</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >고객 알람 시간 (초)</label
                  >
                  <input
                    v-model="selfPointConfig.selfCusAlarmTime"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">SNS 구분</label>
                  <select
                    v-model="selfPointConfig.selfSNSGubun"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">미사용</option>
                    <option value="1">카카오</option>
                    <option value="2">SMS</option>
                  </select>
                </div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in selfPointToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (selfPointConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(selfPointConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (selfPointConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ 셀프: 인쇄/출력 ═══ -->
            <div
              v-show="activeTab === 'selfPrint'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">인쇄/출력</h3>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in selfPrintToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (selfPrintConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(selfPrintConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (selfPrintConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ 셀프: 기타 ═══ -->
            <div
              v-show="activeTab === 'selfEtc'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">기타</h3>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >JP 봉투 포트</label
                  >
                  <input
                    v-model="selfEtcConfig.selfBagJPPort"
                    type="text"
                    placeholder="COM0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >GIF 파일 경로</label
                  >
                  <input
                    v-model="selfEtcConfig.selfGif"
                    type="text"
                    placeholder="경로"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="item in selfEtcToggles"
                  :key="item.key"
                  class="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-800">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.desc }}
                    </p>
                  </div>
                  <button
                    class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
                    :class="
                      (selfEtcConfig as SettingsRecord)[item.key] === '1'
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    "
                    @click="toggleValue(selfEtcConfig as SettingsRecord, item.key)"
                  >
                    <span
                      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="
                        (selfEtcConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''
                      "
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ═══ 주방 메시지 ═══ -->
            <div
              v-show="activeTab === 'kitchenMsg'"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 class="mb-4 text-base font-semibold text-slate-800">주방 디스플레이</h3>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">주방 프린터</h4>
              <div class="mb-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >주방프린터 종류</label
                  >
                  <select
                    v-model="kitchenConfig.kitchenPrint"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="0">미사용</option>
                    <option value="1">시리얼</option>
                    <option value="4">네트워크</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700"
                    >주방프린터 포트</label
                  >
                  <input
                    v-model="kitchenConfig.kitchenPrintPort"
                    type="text"
                    placeholder="COM7"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">전송 속도</label>
                  <select
                    v-model="kitchenConfig.kitchenPrintBps"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="9600">9600</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="115200">115200</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">폰트 크기</label>
                  <input
                    v-model="kitchenConfig.kitchenFontsize"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <h4 class="mb-3 text-sm font-semibold text-slate-600">주방 메시지</h4>
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">메시지 1</label>
                  <input
                    v-model="kitchenConfig.kitchenMsg1"
                    type="text"
                    placeholder="주방 표시 메시지 1"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">메시지 2</label>
                  <input
                    v-model="kitchenConfig.kitchenMsg2"
                    type="text"
                    placeholder="주방 표시 메시지 2"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">메시지 4</label>
                  <input
                    v-model="kitchenConfig.kitchenMsg4"
                    type="text"
                    placeholder="주방 표시 메시지 4"
                    class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- ═══════ 기기 추가 모달 ═══════ -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showAddModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">기기 추가</h3>
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 ID</label>
            <input
              v-model="newDevice.id"
              type="text"
              placeholder="예: POS-01, KIOSK-02"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 이름</label>
            <input
              v-model="newDevice.name"
              type="text"
              placeholder="예: 1번 POS, 입구 키오스크"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">기기 유형</label>
            <select
              v-model="newDevice.type"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="POS">POS</option>
              <option value="KIOSK">키오스크</option>
              <option value="KITCHEN">주방</option>
            </select>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            @click="showAddModal = false"
          >
            취소
          </button>
          <button
            class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="!newDevice.id || !newDevice.name"
            @click="addDevice"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
