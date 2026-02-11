<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "@/services/api/client";
import { showSuccessToast, showErrorToast } from "@/utils/AlertUtils";

// ─── 탭 ───
const activeTab = ref("sale");
const tabs = [
  { id: "sale", label: "판매 운영", icon: "cart" },
  { id: "payment", label: "결제 정책", icon: "card" },
  { id: "print", label: "출력 설정", icon: "printer" },
  { id: "point", label: "포인트/회원", icon: "point" },
  { id: "barcode", label: "바코드/중량", icon: "barcode" },
  { id: "system", label: "시스템", icon: "system" },
] as const;

// ─── 상태 ───
const isLoading = ref(false);
const isSaving = ref(false);

type SettingsRecord = Record<string, string>;

// ─── 판매 운영 (ASIS: [Sale] + [Other] 공통) ───
const saleConfig = ref({
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
});

// ─── 결제 정책 (ASIS: [Other] 카드/결제 + [Card] 공통 + [SuSu]) ───
const paymentConfig = ref({
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
});

// ─── 출력 설정 (ASIS: [Other] 인쇄 관련 공통) ───
const printConfig = ref({
  printVat: "1",
  printBarcode: "1",
  bottomPrint: "1",
  pointBillPrint: "1",
  reTranBillPrint: "0",
  memberReceiptPrint: "1",
  printerOffCheck: "0",
  slotAdd: "1",
  cutPosition: "0",
});

// ─── 포인트/회원 (ASIS: S_Config 포인트 관련 공통) ───
const pointConfig = ref({
  salePoint: "0",
  weightPoint: "0",
  memberAddScreen: "0",
  gradeMemo: "0",
  noBillMessage: "0",
  noBillSound: "0",
  noBillCusPoint: "0",
  // 고객 UI (키오스크) — ASIS: DevicesView selfUI → 매장 공통으로 이동
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
});

// ─── 바코드/중량 (ASIS: [Length] + S_Config) ───
const barcodeConfig = ref({
  barCodeLen: "95",
  scaleLen: "4",
  scaleStartChar: "28",
  scale18YN: "0",
  scalePriceCut: "0",
});

// ─── 시스템 (ASIS: [Other] 시스템 + [Application]) ───
const systemConfig = ref({
  errorLog: "1",
  mdbCompact: "0",
  masterDownEnabled: "1",
  masterDownWeek: "2",
  newItemUpdate: "0",
  scanRealCheck: "0",
  logoMinimize: "1",
  screenHide: "0",
  backupPath: "",
});

// ─── 카테고리별 설정 객체 매핑 ───
const categoryMap: Record<
  string,
  { ref: ReturnType<typeof ref<SettingsRecord>>; prefix: string; apiCategory: string }
> = {
  sale: {
    ref: saleConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "sale",
    apiCategory: "SALE",
  },
  payment: {
    ref: paymentConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "payment",
    apiCategory: "PAYMENT",
  },
  print: {
    ref: printConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "print",
    apiCategory: "PRINT",
  },
  point: {
    ref: pointConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "point",
    apiCategory: "POINT",
  },
  barcode: {
    ref: barcodeConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "barcode",
    apiCategory: "BARCODE",
  },
  system: {
    ref: systemConfig as ReturnType<typeof ref<SettingsRecord>>,
    prefix: "system",
    apiCategory: "SYSTEM",
  },
};

// ─── API ───
async function loadSettings(): Promise<void> {
  isLoading.value = true;
  try {
    const categories = Object.values(categoryMap);
    const responses = await Promise.all(
      categories.map((c) =>
        apiClient.get<{ success: boolean; data: SettingsRecord }>(
          `/api/v1/settings/${c.apiCategory.toLowerCase()}`,
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
    console.error("Failed to load settings:", err);
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
  const cat = categoryMap[activeTab.value];
  if (!cat) return;
  isSaving.value = true;
  try {
    await apiClient.put(
      `/api/v1/settings/${cat.apiCategory.toLowerCase()}`,
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

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── 토글 항목 정의 ───
type ToggleItem = { key: string; title: string; desc: string };

const saleToggles: ToggleItem[] = [
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

const paymentToggles: ToggleItem[] = [
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

const printToggles: ToggleItem[] = [
  { key: "printVat", title: "부가세 인쇄", desc: "영수증에 부가세 정보 인쇄" },
  { key: "printBarcode", title: "바코드 인쇄", desc: "영수증에 바코드 인쇄" },
  { key: "bottomPrint", title: "하단 문구 인쇄", desc: "영수증 하단 문구 인쇄" },
  { key: "pointBillPrint", title: "포인트 영수증", desc: "포인트 내역 영수증 인쇄" },
  { key: "reTranBillPrint", title: "재거래 영수증", desc: "재거래 시 영수증 인쇄" },
  { key: "memberReceiptPrint", title: "회원 미수 인쇄", desc: "회원 미수 잔액 영수증 인쇄" },
  { key: "printerOffCheck", title: "프린터 오프 체크", desc: "프린터 미연결 시 경고" },
  { key: "slotAdd", title: "용지 슬롯 추가", desc: "영수증 슬롯(여백) 추가" },
];

const pointToggles: ToggleItem[] = [
  { key: "salePoint", title: "판매 포인트", desc: "판매 시 포인트 적립" },
  { key: "memberAddScreen", title: "회원 추가 화면", desc: "판매 시 회원 등록 화면" },
  { key: "gradeMemo", title: "등급 메모", desc: "회원 등급 메모 표시" },
  { key: "noBillMessage", title: "무영수증 메시지", desc: "무영수증 시 메시지 표시" },
  { key: "noBillSound", title: "무영수증 소리", desc: "무영수증 시 효과음" },
  { key: "noBillCusPoint", title: "무영수증 포인트", desc: "무영수증 시 포인트 적용" },
];

const selfUIToggles: ToggleItem[] = [
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

const systemToggles: ToggleItem[] = [
  { key: "errorLog", title: "오류 로그 기록", desc: "시스템 오류 로그 자동 기록" },
  { key: "mdbCompact", title: "DB 자동 컴팩트", desc: "데이터베이스 자동 최적화" },
  { key: "masterDownEnabled", title: "마스터 자동 다운", desc: "마스터 데이터 자동 다운로드" },
  { key: "newItemUpdate", title: "신규상품 업데이트", desc: "새 상품 자동 반영" },
  { key: "scanRealCheck", title: "실시간 스캔 체크", desc: "스캔 데이터 실시간 검증" },
  { key: "logoMinimize", title: "로고 최소화", desc: "상단 로고를 작은 크기로 표시" },
  { key: "screenHide", title: "화면 숨김", desc: "작업표시줄 숨김 모드" },
];

const currentTabLabel = computed(() => tabs.find((t) => t.id === activeTab.value)?.label ?? "");

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800">공통 환경설정</h2>
        <p class="mt-0.5 text-sm text-slate-500">전 기기에서 공유하는 매장 공통 설정입니다</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          :disabled="isSaving || isLoading"
          @click="saveCurrentTab"
        >
          {{ isSaving ? "저장 중..." : `${currentTabLabel} 저장` }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        v-for="tab in tabs"
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
      <!-- ═══════ TAB: 판매 운영 ═══════ -->
      <div
        v-show="activeTab === 'sale'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">판매 운영 설정</h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Sale] + [Other] 공통 항목 (전 기기 공유)
        </p>

        <!-- 영업 관리 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">영업 관리</h4>
        <div class="mb-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">영업 시작일</label>
            <div class="flex gap-2">
              <input
                v-model="saleConfig.openDay"
                type="date"
                class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                @click="saleConfig.openDay = getTodayDate()"
              >
                오늘
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">마감일</label>
            <input
              v-model="saleConfig.finishDay"
              type="date"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">전표 시퀀스</label>
            <input
              v-model="saleConfig.receiptSeq"
              type="number"
              min="1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">시재금</label>
            <input
              v-model="saleConfig.startPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <!-- 가격/금액 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">가격/금액</h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">최대 결제금액</label>
            <input
              v-model="saleConfig.maxPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">최대 현금금액</label>
            <input
              v-model="saleConfig.maxCashPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">지연 설정</label>
            <input
              v-model="saleConfig.delay"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <!-- 주방/테이블 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">주방 / 테이블</h4>
        <div class="mb-6 grid gap-3 md:grid-cols-2">
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <p class="text-sm font-medium text-slate-800">주방 호출</p>
              <p class="text-xs text-slate-500">주문 완료 시 주방으로 호출 전송</p>
            </div>
            <button
              class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
              :class="saleConfig.kitchenCallEnabled === '1' ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="toggleValue(saleConfig as SettingsRecord, 'kitchenCallEnabled')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="saleConfig.kitchenCallEnabled === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <p class="text-sm font-medium text-slate-800">테이블 선택</p>
              <p class="text-xs text-slate-500">주문 시 테이블 번호 선택 화면 표시</p>
            </div>
            <button
              class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
              :class="saleConfig.tableSelectEnabled === '1' ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="toggleValue(saleConfig as SettingsRecord, 'tableSelectEnabled')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="saleConfig.tableSelectEnabled === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>
        <div v-if="saleConfig.tableSelectEnabled === '1'" class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">테이블 갯수</label>
            <input
              v-model="saleConfig.tableCount"
              type="number"
              min="0"
              max="999"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p class="mt-1 text-xs text-slate-400">매장에 배치된 테이블 수 (0: 미사용)</p>
          </div>
        </div>

        <!-- 판매 옵션 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">판매 옵션</h4>
        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="item in saleToggles"
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
                (saleConfig as SettingsRecord)[item.key] === '1' ? 'bg-indigo-600' : 'bg-slate-300'
              "
              @click="toggleValue(saleConfig as SettingsRecord, item.key)"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="(saleConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 결제 정책 ═══════ -->
      <div
        v-show="activeTab === 'payment'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">결제 정책 설정</h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Other] 카드/결제 + [Card] 공통 + [SuSu] (전 기기 공유)
        </p>

        <!-- 카드 결제 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">카드/결제 정책</h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">카드 최소금액</label>
            <input
              v-model="paymentConfig.minCardPrice"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p class="mt-1 text-xs text-slate-400">0: 제한없음</p>
          </div>
        </div>

        <div class="mb-6 grid gap-3 md:grid-cols-2">
          <div
            v-for="item in paymentToggles"
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
                (paymentConfig as SettingsRecord)[item.key] === '1'
                  ? 'bg-indigo-600'
                  : 'bg-slate-300'
              "
              @click="toggleValue(paymentConfig as SettingsRecord, item.key)"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="(paymentConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>

        <!-- 수수료 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">수수료 설정</h4>
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">카드 수수료 (%)</label>
            <input
              v-model="paymentConfig.commCard"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">포인트 수수료 (%)</label>
            <input
              v-model="paymentConfig.commPoint"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">캐시백 수수료 (%)</label>
            <input
              v-model="paymentConfig.commCashBack"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">현금 수수료 (%)</label>
            <input
              v-model="paymentConfig.commCash"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">현금 비율 (%)</label>
            <input
              v-model="paymentConfig.commCashRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 출력 설정 ═══════ -->
      <div
        v-show="activeTab === 'print'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">출력 설정</h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Other] 인쇄 관련 + S_Config (전 기기 공유)
        </p>

        <div class="mb-6 grid gap-3 md:grid-cols-2">
          <div
            v-for="item in printToggles"
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
                (printConfig as SettingsRecord)[item.key] === '1' ? 'bg-indigo-600' : 'bg-slate-300'
              "
              @click="toggleValue(printConfig as SettingsRecord, item.key)"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="(printConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>

        <h4 class="mb-3 text-sm font-semibold text-slate-600">용지 절단</h4>
        <div class="grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">절단 위치</label>
            <select
              v-model="printConfig.cutPosition"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">기본</option>
              <option value="1">위</option>
              <option value="2">아래</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 포인트/회원 ═══════ -->
      <div
        v-show="activeTab === 'point'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">포인트/회원 설정</h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: S_Config + INI [Other] 회원 관련 (전 기기 공유)
        </p>

        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">중량 상품 포인트</label>
            <select
              v-model="pointConfig.weightPoint"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">일반 적립</option>
              <option value="1">미적립</option>
              <option value="2">별도 적립률</option>
            </select>
          </div>
        </div>

        <div class="mb-6 grid gap-3 md:grid-cols-2">
          <div
            v-for="item in pointToggles"
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
                (pointConfig as SettingsRecord)[item.key] === '1' ? 'bg-indigo-600' : 'bg-slate-300'
              "
              @click="toggleValue(pointConfig as SettingsRecord, item.key)"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="(pointConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>

        <!-- 고객 UI (키오스크) -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">고객 인터페이스 (키오스크)</h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">상단 메시지</label>
            <input
              v-model="pointConfig.selfCusTopMsg"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">버튼 메시지 1</label>
            <input
              v-model="pointConfig.selfCusBTMsg1"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">버튼 메시지 2</label>
            <input
              v-model="pointConfig.selfCusBTMsg2"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">고객 선택 방식</label>
            <select
              v-model="pointConfig.selfCusSelect"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">방식 0</option>
              <option value="1">방식 1</option>
              <option value="2">방식 2</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">ID 리더기 유형</label>
            <select
              v-model="pointConfig.selfReader"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">바코드</option>
              <option value="2">RF</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">시작 핫키</label>
            <select
              v-model="pointConfig.selfStartHotKey"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">사용</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">가격 표시 유형</label>
            <select
              v-model="pointConfig.selfPriceType"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">기본</option>
              <option value="1">유형 1</option>
              <option value="2">유형 2</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">고객추가 기타</label>
            <select
              v-model="pointConfig.selfCusAddEtc"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">사용</option>
            </select>
          </div>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="item in selfUIToggles"
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
                (pointConfig as SettingsRecord)[item.key] === '1' ? 'bg-indigo-600' : 'bg-slate-300'
              "
              @click="toggleValue(pointConfig as SettingsRecord, item.key)"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="(pointConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 바코드/중량 ═══════ -->
      <div
        v-show="activeTab === 'barcode'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">바코드 / 중량 설정</h3>
        <p class="mb-4 text-sm text-slate-500">ASIS: INI [Length] + S_Config (전 기기 공유)</p>

        <!-- 바코드 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">바코드 자동부여</h4>
        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700"
              >바코드 자동부여 숫자</label
            >
            <input
              v-model="barcodeConfig.barCodeLen"
              type="text"
              maxlength="4"
              placeholder="95"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p class="mt-1 text-xs text-slate-400">
              자동 생성 바코드 앞자리 (예: 95 -> 950000000001)
            </p>
          </div>
        </div>

        <!-- 중량 -->
        <h4 class="mb-3 text-sm font-semibold text-slate-600">중량상품 설정</h4>
        <div class="mb-4 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700"
              >중량상품 코드 길이</label
            >
            <input
              v-model="barcodeConfig.scaleLen"
              type="text"
              maxlength="2"
              placeholder="4"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p class="mt-1 text-xs text-slate-400">중량 바코드 상품코드 자릿수</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">중량상품 시작문자</label>
            <input
              v-model="barcodeConfig.scaleStartChar"
              type="text"
              maxlength="4"
              placeholder="28"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p class="mt-1 text-xs text-slate-400">중량 바코드 시작 식별자 (예: 28, 29)</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">중량 가격 절사</label>
            <select
              v-model="barcodeConfig.scalePriceCut"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="0">미사용</option>
              <option value="1">10원 단위 절사</option>
              <option value="2">100원 단위 절사</option>
            </select>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <p class="text-sm font-medium text-slate-800">18자리 중량 바코드</p>
              <p class="text-xs text-slate-500">18자리 중량 바코드 형식 사용 (기본: 13자리)</p>
            </div>
            <button
              class="relative h-6 w-10 flex-shrink-0 rounded-full transition-colors"
              :class="barcodeConfig.scale18YN === '1' ? 'bg-indigo-600' : 'bg-slate-300'"
              @click="toggleValue(barcodeConfig, 'scale18YN')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="barcodeConfig.scale18YN === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: 시스템 ═══════ -->
      <div
        v-show="activeTab === 'system'"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-6 text-base font-semibold text-slate-800">시스템 설정</h3>
        <p class="mb-4 text-sm text-slate-500">
          ASIS: INI [Other] 시스템 + [Application] + [Backup] (전 기기 공유)
        </p>

        <div class="mb-6 grid gap-5 md:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700"
              >마스터 다운 주기 (주)</label
            >
            <input
              v-model="systemConfig.masterDownWeek"
              type="number"
              min="0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">백업 경로</label>
            <input
              v-model="systemConfig.backupPath"
              type="text"
              placeholder="백업 경로 (예: D:\backup)"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="item in systemToggles"
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
                (systemConfig as SettingsRecord)[item.key] === '1'
                  ? 'bg-indigo-600'
                  : 'bg-slate-300'
              "
              @click="toggleValue(systemConfig as SettingsRecord, item.key)"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="(systemConfig as SettingsRecord)[item.key] === '1' ? 'translate-x-4' : ''"
              />
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
