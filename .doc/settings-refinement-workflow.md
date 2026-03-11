# 환경설정 정제화 — 구현 워크플로우

> 기준 문서: `.doc/settings-refinement-analysis.md`
> 작성일: 2026-03-11
> 최종 수정: 2026-03-11 (Sprint 1+2 완료, Sprint 2+3 통합 방식 채택)
> 총 변경: 438키 중 136키(31%) 이동/재분류, 23탭 → 20탭 (selfApple 삭제로 137→136)

---

## 전체 흐름 요약

```
┌─────────────────────────────────────────────────────────────────┐
│ Sprint 1: 미결사항 확정 + 프론트엔드 데이터 재구성              │
│  Phase 1 — 미결사항 결정 (selfApple, 알림탭 등)                 │
│  Phase 2 — settingsData.ts 재구성 (공통 설정)                   │
│  Phase 3 — deviceSettingsData.ts 재구성 (기기별 설정)           │
├─────────────────────────────────────────────────────────────────┤
│ Sprint 2: 프론트엔드 UI 변경 (기존 DB 키 유지)                  │
│  Phase 4 — SettingsView.vue 8탭 UI 변경                        │
│  Phase 5 — DevicesView.vue POS 5탭 + KIOSK 5탭 UI 변경         │
│  Phase 6 — 중간 검증 (기존 prefix로 로드/저장 정상 확인)        │
├─────────────────────────────────────────────────────────────────┤
│ Sprint 3: DB 마이그레이션 + 백엔드                              │
│  Phase 7 — Prisma migration SQL 작성 + 실행                    │
│  Phase 8 — 백엔드 카테고리 업데이트 + seed.ts                  │
│  Phase 9 — DB 마이그레이션 검증                                │
├─────────────────────────────────────────────────────────────────┤
│ Sprint 4: 프론트엔드 키 전환 + 정리                             │
│  Phase 10 — categoryMap prefix 최종 전환                       │
│  Phase 11 — settingsStore.get() 참조 갱신 (해당 시)            │
│  Phase 12 — 키오스크 뷰 selfUI 참조 전환                       │
│  Phase 13 — 최종 검증 + 문서 업데이트                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 의존 관계 다이어그램

```
Phase 1 (미결사항)
  ↓
Phase 2 ──→ Phase 3 (병렬 가능)
  ↓            ↓
Phase 4 ──→ Phase 5 (병렬 가능)
  ↓            ↓
  └────→ Phase 6 (중간 검증)
           ↓
         Phase 7 (DB 마이그레이션)
           ↓
         Phase 8 (백엔드)
           ↓
         Phase 9 (DB 검증)
           ↓
         Phase 10 ──→ Phase 11 ──→ Phase 12 (순차)
                                     ↓
                                   Phase 13 (최종 검증)
```

---

## Sprint 1: 미결사항 확정 + 프론트엔드 데이터 재구성

### Phase 1 — 미결사항 결정

> 구현 전에 반드시 확정해야 할 5가지 의사결정

| # | 미결사항 | 제안 | 결정 |
|---|---------|------|------|
| 1 | selfApple vs applePayEnabled 중복 여부 | VB6 원본 비교 → 동일이면 selfApple 삭제 | ✅ 동일 옵션 → selfApple 삭제 |
| 2 | 알림/통신 탭(7키) 독립 vs 포인트 내 섹션 | 독립 탭 권장 (확장성) | ✅ 독립 탭 |
| 3 | posPrint 76키 분류 정확성 | 현재 분류 기반 진행, 피드백 반영 | ✅ 현재 분류 기반 진행 |
| 4 | selfUI 공통↔기기별 관계 | DeviceSetting으로 이동, 초기값 공통 복사 | ✅ 기기별 옵션 우선 |
| 5 | Phase 1 임시 매핑 vs 동시 진행 | **임시 매핑 사용** (안전한 단계적 진행) | ✅ 동시 진행 (Sprint 2+3 통합) |

**산출물**: 미결사항 결정 기록 (이 표의 "결정" 열 업데이트)

---

### Phase 2 — settingsData.ts 재구성

> 공통 환경설정 데이터: 7탭 152키 → 8탭 162키 (selfApple 삭제)

**파일**: `frontend/src/renderer/src/views/admin/settingsData.ts`

#### Task 2-1: defaultPointConfig에서 selfUI 19키 분리

```
AS-IS: defaultPointConfig (56키 = 37 포인트 + 19 selfUI)
TO-BE: defaultPointConfig (37키), selfUI 19키 제거 (Phase 3에서 deviceSettingsData로 이동)
```

제거할 키 목록:
```typescript
// 이 19개 키를 defaultPointConfig에서 제거
selfSoundGuide, selfCusNum4, selfNoCustomer, selfCusSelect,
selfCusAddUse, selfCusAddEtc, selfCusTopMsg, selfCusBTMsg1,
selfCusBTMsg2, selfTouchSoundYN, selfMainPage, selfBTInit,
selfOneCancel, selfZHotKey, selfCountYN, selfStartHotKey,
selfPriceUse, selfPriceType, selfReader
```

#### Task 2-2: selfUIToggles 제거

```
AS-IS: selfUIToggles (11개 토글) in settingsData.ts
TO-BE: 삭제 (deviceSettingsData.ts로 이동)
```

#### Task 2-3: selfPoint 포인트정책 4키 추가

defaultPointConfig에 추가:
```typescript
selfNoAutoPoint: "0",   // from DeviceSetting SELF_POINT
selfPointZero: "0",
selfPointHidden: "0",
selfZero: "1",
```

#### Task 2-4: defaultNotificationConfig 신규 생성

```typescript
export const defaultNotificationConfig: SettingsRecord = {
  selfPointSMSUse: "0",
  selfUserCall: "0",
  selfSMSAdmin: "1",
  selfKakao: "1",
  selfCusAlarmUse: "1",
  selfCusAlarmTime: "0",
  selfSNSGubun: "0",
};
```

#### Task 2-5: defaultPrintConfig 확대 (16키 추가)

selfPrint 4키 + posPrint 공통 영수증 12키 추가:
```typescript
// from DeviceSetting SELF_PRINT
selfAutoPrint: "0",
selfStoPrint: "0",
selfPrintAddress: "0",
selfPrintPhon: "0",
// from DeviceSetting POS_PRINT (공통 영수증)
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
```

#### Task 2-6: defaultSaleConfig에 1키 추가

```typescript
selfNoAutoGoods: "0",  // from DeviceSetting SELF_ETC
```

#### Task 2-7: defaultPaymentConfig에 1키 추가

```typescript
selfAppCard: "0",   // from DeviceSetting SELF_ETC
// selfApple: 삭제 (미결사항 #1 → applePayEnabled과 동일, 삭제 확정)
```

#### Task 2-8: tabs 배열 + categoryMap 업데이트

```typescript
export const tabs = [
  { id: "sale", label: "판매 운영", icon: "cart" },
  { id: "payment", label: "결제 정책", icon: "card" },
  { id: "print", label: "영수증/출력", icon: "printer" },       // 이름 변경
  { id: "point", label: "포인트/회원", icon: "point" },
  { id: "notification", label: "알림/통신", icon: "bell" },     // 신규
  { id: "barcode", label: "바코드/중량", icon: "barcode" },
  { id: "system", label: "시스템", icon: "system" },
  { id: "accessibility", label: "접근성", icon: "a11y" },
] as const;

// categoryMap에 추가
notification: { prefix: "noti", apiCategory: "NOTIFICATION" },  // 신규
```

> ⚠️ **Phase 6까지는 임시 매핑 사용**: 새 탭(알림/통신)에 추가되는 키들은 **기존 DB prefix를 유지**해야 함. Phase 2에서는 `defaultNotificationConfig`의 키를 정의하되, `loadSettings()`에서 기존 `selfPoint.*` prefix로 로드하는 임시 매핑 필요.

#### Task 2-9: 토글 정의 업데이트

- `printToggles`: posPrint 공통 영수증 토글 12개 추가 (새로운 `printReceiptToggles` 배열)
- `notificationToggles`: 신규 생성 (7개 토글)
- `pointToggles`: selfUI 토글 제거, selfPoint 정책 토글 4개 추가

**Phase 2 검증**: ✅ 완료
- [x] 컴파일 에러 없음 (vue-tsc 통과)
- [x] 키 수: sale=33, payment=32, print=25, point=41, notification=7, barcode=5, system=9, a11y=10 = **162** (selfApple 삭제)

---

### Phase 3 — deviceSettingsData.ts 재구성

> 기기별 설정 데이터: POS 6탭 163키→5탭 151키, KIOSK 8탭 86키→5탭 87키

**파일**: `frontend/src/renderer/src/views/admin/deviceSettingsData.ts`

#### Task 3-1: KIOSK 탭 재구성

```typescript
// AS-IS
KIOSK: [terminal, van, selfCash, selfBag, selfAuto, selfPoint, selfPrint, selfEtc]

// TO-BE (8→5)
KIOSK: [
  { id: "terminal", label: "터미널 HW" },
  { id: "van", label: "VAN 결제" },
  { id: "selfCash", label: "현금 결제" },
  { id: "selfBag", label: "봉투/저울" },
  { id: "selfUI", label: "키오스크 화면" },   // 신규
]
```

#### Task 3-2: defaultSelfUIConfig 신규 생성 (28키)

```typescript
export const defaultSelfUIConfig: SettingsRecord = {
  // from SystemSetting point.self* (19키)
  selfSoundGuide: "1", selfCusNum4: "1", selfNoCustomer: "0",
  selfCusSelect: "1", selfCusAddUse: "0", selfCusAddEtc: "0",
  selfCusTopMsg: "", selfCusBTMsg1: "", selfCusBTMsg2: "",
  selfTouchSoundYN: "1", selfMainPage: "1", selfBTInit: "1",
  selfOneCancel: "1", selfZHotKey: "1", selfCountYN: "1",
  selfStartHotKey: "0", selfPriceUse: "0", selfPriceType: "0",
  selfReader: "2",
  // from DeviceSetting selfAuto.* (8키)
  autoOpenYN: "0", autoFinishYN: "0", autoDay: "",
  autoAP: "0", autoHH: "00", autoMM: "00", autoID: "1", autoPass: "1",
  // from DeviceSetting selfEtc.selfGif (1키)
  selfGif: "",
};
```

#### Task 3-3: defaultTerminalConfig에 3키 추가 (KIOSK용)

```typescript
// from DeviceSetting selfEtc HW (3키)
selfJPYN: "0",      // 동전교환 HW
selfCamUse: "1",     // 카메라 HW
selfICSiren: "0",    // 알림장치 HW
```

#### Task 3-4: defaultSelfBagConfig에 1키 추가

```typescript
selfBagJPPort: "0",  // from DeviceSetting selfEtc.selfBagJPPort
```

#### Task 3-5: POS 탭 재구성

```typescript
// AS-IS
POS: [terminal, van, posPrint, posSale, posSettle, posReceipt]

// TO-BE (6→5)
POS: [
  { id: "terminal", label: "터미널 HW" },
  { id: "van", label: "VAN 결제" },
  { id: "posOp", label: "판매/동작" },        // 신규 (posPrint+posSale 통합)
  { id: "posSettle", label: "정산/마감" },
  { id: "posReceipt", label: "영수증" },
]
```

#### Task 3-6: defaultPosOperationConfig 신규 생성 (55키)

posPrint 판매동작 44키 + posSale 11키 통합:
```typescript
export const defaultPosOperationConfig: SettingsRecord = {
  // posPrint에서 44키 (판매동작/배달)
  saleNewProduct: "1", exchangePassword: "0", zeroPriceInput: "0",
  discountNoPoint: "0", weightNoPoint: "0", saleCancelDisable: "0",
  cashBackUse: "1", barcodeGroupUse: "0", returnNoPassword: "0",
  cashForceInput: "1", costOverSellWarn: "0", disabledProductChange: "0",
  salePriceCompare: "0", categoryScaleInput: "0", shortcutFixedPrice: "0",
  shortcutNameProcess: "0", bulkPriceFit: "0", posNoCreditSale: "0",
  discountNoCashback: "0", cardNoDrawer: "0", cashOnlyNoReturn: "0",
  cardReturnNoDrawer: "0", cardCardPayUse: "1", giftCashReceiptInclude: "0",
  giftPointInclude: "0", deliveryPointAccrue: "1", barcodeCardPayScreen: "0",
  cashChangeCardScreen: "0", deliveryDisable: "0", deliveryNoPayClose: "0",
  deliveryNoPayReturn: "0", deliverySaleType: "0", deliveryNotePrint: "0",
  deliverySeqPrint: "0", deliveryReceiptManage: "0", deliveryDriverReceipt: "0",
  deliveryItemArchive: "0", deliverySeqMemberReceipt: "0",
  holdNoShift: "0", holdReceiptPrint: "0", holdReceiptDetail: "0",
  deliveryNoShift: "0", firstScanHoldMsg: "0", overdueCustomerWarn: "0",
  // posSale에서 11키
  receiptDiscountDisplay: "0", totalRounding: "0", scaleRounding: "0",
  categoryPrintType: "0", deliveryPointRate: "0", creditPointRate: "0",
  minReceiptAmount: "0", minPointAmount: "0", bcPartner: "0",
  cardNoSignAmount: "50000", creditMemoUse: "0",
};
```

#### Task 3-7: defaultPosSettleConfig에 10키 추가

posPrint 정산관련 10키 추가:
```typescript
settleCategoryPrint: "1", settleAmountPrint: "1",
closeOutstandingPrint: "0", openShiftFiscalPrint: "0",
cashbackQrPrint: "0", scale18Barcode: "0",
archiveBarcodeNo: "0", eSignArchiveNo: "0",
reissueBarcodeNo: "0", receiptNoOutstanding: "0",
```

#### Task 3-8: defaultPosReceiptConfig에 10키 추가

posPrint 인쇄전용 10키 추가:
```typescript
slipNoPrint: "0", slipNoHide: "0",
cancelDetailPrint: "0", cardReceiptDetail: "0",
checkResponsePrint: "1", eCouponNoReceipt: "0",
deliveryArchiveDouble: "0", deliveryArchiveSimple: "0",
deliveryArchiveNormal: "0", visitDeliveryArchive: "0",
```

#### Task 3-9: 구 config/toggle 삭제

- `defaultPosPrintConfig` 삭제 (76키 → 3분할 + 공통 이동)
- `defaultPosSaleConfig` 삭제 (11키 → posOp 흡수)
- `defaultSelfAutoConfig` 삭제 (8키 → selfUI 흡수)
- `defaultSelfPointConfig` 삭제 (11키 → 공통 이동)
- `defaultSelfPrintConfig` 삭제 (4키 → 공통 이동)
- `defaultSelfEtcConfig` 삭제 (8키 → 분산)
- 대응 토글 배열 삭제/재구성

#### Task 3-10: categoryMap 업데이트

```typescript
export const categoryMap: Record<string, CategoryMapEntry> = {
  terminal: { prefix: "terminal", apiCategory: "TERMINAL" },
  van: { prefix: "van", apiCategory: "VAN" },
  selfCash: { prefix: "selfCash", apiCategory: "SELF_CASH" },
  selfBag: { prefix: "selfBag", apiCategory: "SELF_BAG" },
  selfUI: { prefix: "selfUI", apiCategory: "SELF_UI" },           // 신규
  posOp: { prefix: "posOp", apiCategory: "POS_OPERATION" },       // 신규
  posSettle: { prefix: "posSettle", apiCategory: "POS_SETTLE" },
  posReceipt: { prefix: "posReceipt", apiCategory: "POS_RECEIPT" },
  kitchenMsg: { prefix: "kitchen", apiCategory: "KITCHEN" },
  // 삭제: selfAuto, selfPoint, selfPrint, selfEtc, posPrint, posSale
};
```

#### Task 3-11: 토글 재구성

- `posOpToggles` 신규 (판매동작 + 배달 토글)
- `selfUIToggles` 신규 (settingsData.ts에서 이동 + selfAuto 토글 통합)
- `posSettleNewToggles` (기존 + 정산 10키 토글 추가)
- `posReceiptNewToggles` (기존 + 인쇄 10키 토글 추가)
- 구 토글 삭제: posPrintToggles, posSaleToggles, selfAutoToggles, selfPointToggles, selfPrintToggles, selfEtcToggles

**Phase 3 검증**: ✅ 완료
- [x] 컴파일 에러 없음 (vue-tsc 통과)
- [x] POS 키 수: terminal=30, van=9, posOp=55, posSettle=37, posReceipt=20 = 151
- [x] KIOSK 키 수: terminal=33, van=9, selfCash=10, selfBag=7, selfUI=28 = 87
- [x] KITCHEN: terminal=30, kitchen=7 = 37

---

## Sprint 2: 프론트엔드 UI 변경

### Phase 4 — SettingsView.vue 8탭 UI

**파일**: `frontend/src/renderer/src/views/admin/SettingsView.vue` (1153줄)

#### Task 4-1: 임시 prefix 매핑 구현

> DB 마이그레이션 전이므로 기존 DB 키로 로드해야 함

`loadSettings()`에 임시 매핑 추가:
```typescript
// Phase 6까지만 사용, Phase 10에서 제거
const legacyPrefixMap: Record<string, string> = {
  // 새 탭의 키 → 기존 DB prefix
  'noti.selfPointSMSUse': 'selfPoint.selfPointSMSUse',  // DeviceSetting에서 로드 불가
  // ... selfPoint 알림 7키는 아직 DeviceSetting에 있으므로
  // loadSettings()에서는 로드하지 않고 빈 상태로 둠
};
```

> **핵심 판단**: 알림/통신(7키)과 포인트정책(4키)은 아직 DeviceSetting에 있으므로, Phase 7 DB 마이그레이션 전까지는 **빈 기본값으로 표시**. 이 탭들은 DB 마이그레이션 후에 활성화됨.

#### Task 4-2: 알림/통신 탭 UI 추가

```vue
<template v-if="activeTab === 'notification'">
  <!-- 7개 알림 설정 토글 + 입력 필드 -->
  <ToggleGrid :items="notificationToggles" :config="configRefs.notification" />
</template>
```

#### Task 4-3: 영수증/출력 탭 UI 확대

기존 PRINT 9키 → 25키로 확대:
- 기존 출력 옵션 섹션 유지
- 키오스크 출력 섹션 추가 (selfPrint 4키)
- POS 공통 영수증 섹션 추가 (posPrint 12키)

#### Task 4-4: 포인트/회원 탭에서 selfUI 섹션 제거

- lines 773-860의 selfUI 관련 UI 코드 제거
- selfPoint 정책 4키 섹션 추가

#### Task 4-5: 판매 운영 + 결제 정책 탭에 추가 키 반영

- 판매 운영: selfNoAutoGoods 토글 추가
- 결제 정책: selfAppCard, selfApple 토글 추가

**Phase 4 검증**: ✅ 완료 (Sprint 2+3 통합 방식)
- [x] 8개 탭 모두 렌더링 코드 구현
- [x] SettingsView.vue imports/configRefs/template 업데이트
- [x] 알림/통신 탭 UI 추가, 영수증/출력 확대, 포인트 selfUI 제거

---

### Phase 5 — DevicesView.vue POS 5탭 + KIOSK 5탭

**파일**: `frontend/src/renderer/src/views/admin/DevicesView.vue` (1040줄)

#### Task 5-1: 임시 prefix 매핑 (기존 DB 키 호환)

`loadDeviceSettings()`에 임시 매핑:
```typescript
// selfUI 탭: 아직 DB에 selfUI.* 키가 없으므로
// selfAuto.*, selfEtc.selfGif, point.self* (SystemSetting) 키에서 로드
const legacyDevicePrefixMap = {
  selfUI: [
    { legacyPrefix: 'selfAuto', keys: ['autoOpenYN','autoFinishYN',...] },
    { legacyPrefix: 'selfEtc', keys: ['selfGif'] },
    // point.self* 19키는 SystemSetting에 있으므로 별도 API 호출 필요
  ],
  posOp: [
    { legacyPrefix: 'posPrint', keys: [/* 44키 */] },
    { legacyPrefix: 'posSale', keys: [/* 11키 */] },
  ],
};
```

> **복잡도 경고**: selfUI 탭은 3개 소스(selfAuto + selfEtc + SystemSetting)에서 데이터를 모아야 함. DB 마이그레이션 전 임시 매핑의 복잡도가 높아 **Phase 5와 Phase 7을 동시 진행하는 것이 더 효율적**일 수 있음. (미결사항 #5 참조)

#### Task 5-2: KIOSK 5탭 UI 구현

- 제거: selfAuto, selfPoint, selfPrint, selfEtc 탭
- 추가: selfUI (키오스크 화면) 탭 — 28키
  - 화면 UI 섹션 (selfUI 19키)
  - 자동 운영 섹션 (selfAuto 8키)
  - 기타 UI (selfGif 1키)

#### Task 5-3: POS 5탭 UI 구현

- 제거: posPrint, posSale 탭
- 추가: posOp (판매/동작) 탭 — 55키
  - 판매 규칙 섹션
  - 배달 설정 섹션
  - 판매 옵션 섹션 (구 posSale)
- 변경: posSettle 탭 확대 (+10키), posReceipt 탭 확대 (+10키)

#### Task 5-4: configRefs 매핑 업데이트

```typescript
const configRefs = computed(() => ({
  terminal: terminalConfig,
  van: vanConfig,
  selfCash: selfCashConfig,
  selfBag: selfBagConfig,
  selfUI: selfUIConfig,       // 신규
  posOp: posOpConfig,         // 신규
  posSettle: posSettleConfig,
  posReceipt: posReceiptConfig,
  kitchenMsg: kitchenConfig,
}));
```

---

### Phase 6 — 중간 검증 (Sprint 2 완료 시점)

| 검증 항목 | 방법 | 기대 결과 |
|----------|------|----------|
| 공통 설정 8탭 렌더링 | 관리자 > 환경설정 접근 | 8개 탭 모두 표시 |
| 기존 키 로드/저장 | 판매/결제/바코드/시스템/접근성 탭 | 값 변경 후 새로고침해도 유지 |
| POS 5탭 렌더링 | 관리자 > 기기설정 > POS 선택 | 5개 탭, posOp 55키 표시 |
| KIOSK 5탭 렌더링 | 관리자 > 기기설정 > KIOSK 선택 | 5개 탭, selfUI 28키 표시 |
| KITCHEN 2탭 렌더링 | 관리자 > 기기설정 > KITCHEN 선택 | 2개 탭 변경 없음 |
| 알림/통신 탭 | DB 마이그레이션 전이므로 | 빈 기본값 표시 (정상) |

> Phase 6 통과 후 Sprint 3로 진행

---

## Sprint 3: DB 마이그레이션 + 백엔드

### Phase 7 — Prisma migration SQL

**파일**: `backend/prisma/migrations/{timestamp}_settings_refinement/migration.sql`

#### Task 7-1: 마이그레이션 파일 생성

```bash
cd backend
npx prisma migrate dev --name settings_refinement --create-only
```

#### Task 7-2: migration.sql 작성

> `settings-refinement-analysis.md` Section 8.2의 SQL을 사용

5개 Phase 순서:
1. **Phase 0**: 백업 테이블 생성
2. **Phase 1**: DeviceSetting → SystemSetting 이동 (29키, selfApple 삭제)
3. **Phase 2**: SystemSetting → DeviceSetting 이동 (19키 × KIOSK 기기 수)
4. **Phase 3**: DeviceSetting 내 prefix 변경 (88키)
5. **Phase 4**: 이동 완료된 원본 키 삭제
6. **Phase 5**: 검증 쿼리

#### Task 7-3: 마이그레이션 실행

```bash
npx prisma migrate dev
```

#### Task 7-4: 마이그레이션 결과 확인

```sql
-- 잔여 구 카테고리 0건 확인
SELECT COUNT(*) FROM device_settings
WHERE category IN ('POS_PRINT','SELF_POINT','SELF_PRINT','SELF_ETC','SELF_AUTO','POS_SALE');
-- 기대: 0

-- 새 카테고리 키 수 확인
SELECT category, COUNT(*) FROM system_settings GROUP BY category ORDER BY category;
-- 기대: NOTIFICATION=7, PAYMENT=33, PRINT=25, POINT=41, SALE=33, ...

SELECT category, COUNT(*) FROM device_settings GROUP BY category ORDER BY category;
-- 기대: POS_OPERATION, POS_SETTLE, POS_RECEIPT, SELF_UI, TERMINAL, VAN, ...
```

---

### Phase 8 — 백엔드 카테고리 업데이트

> **핵심 발견**: 백엔드에 카테고리 검증이 없음 (any string 허용). 따라서 백엔드 코드 변경은 최소화됨.

**파일 목록**:

| 파일 | 변경 내용 |
|------|----------|
| `backend/prisma/seed.ts` | 신규 카테고리 시드 데이터 + 키 prefix 업데이트 |
| `backend/src/services/setting.service.ts` | (변경 없음 — any category 허용) |
| `backend/src/services/device.service.ts` | (변경 없음 — any category 허용) |
| `backend/src/routes/settings.ts` | (변경 없음 — category는 라우트 파라미터) |
| `backend/src/routes/devices.ts` | (변경 없음 — category는 라우트 파라미터) |

#### Task 8-1: seed.ts 업데이트

기존 시드 데이터의 키를 새 prefix 체계로 변경:
- 구 `posPrint.*` → `posOp.*`, `posSettle.*`, `posReceipt.*`, `print.*`
- 구 `selfPoint.*` → `point.*`, `noti.*`
- 구 `selfAuto.*` → `selfUI.*`
- 신규 카테고리 시드 추가: NOTIFICATION, SELF_UI, POS_OPERATION

#### Task 8-2 (선택): 백엔드 카테고리 상수 추가

> 필수는 아니지만 권장. 향후 잘못된 카테고리 방지.

```typescript
// backend/src/constants/categories.ts (신규)
export const SYSTEM_CATEGORIES = [
  'SALE','PAYMENT','PRINT','POINT','NOTIFICATION',
  'BARCODE','SYSTEM','ACCESSIBILITY'
] as const;

export const DEVICE_CATEGORIES = [
  'TERMINAL','VAN','SELF_CASH','SELF_BAG','SELF_UI',
  'POS_OPERATION','POS_SETTLE','POS_RECEIPT','KITCHEN'
] as const;
```

---

### Phase 9 — DB 마이그레이션 검증

| 검증 항목 | SQL/명령 | 기대 결과 |
|----------|---------|----------|
| 백업 테이블 존재 | `SELECT COUNT(*) FROM system_settings_backup` | > 0 |
| 구 카테고리 잔여 | `SELECT COUNT(*) FROM device_settings WHERE category IN (...)` | 0 |
| SystemSetting 합계 | `SELECT COUNT(*) FROM system_settings` | 163 (또는 162) |
| NOTIFICATION 키 수 | `SELECT COUNT(*) FROM system_settings WHERE category='NOTIFICATION'` | 7 |
| SELF_UI 키 수 (per device) | `... WHERE category='SELF_UI' GROUP BY device_id` | 28 per KIOSK |
| POS_OPERATION 키 수 | `... WHERE category='POS_OPERATION' GROUP BY device_id` | 55 per POS |
| Prisma Studio 확인 | `npm run db:studio` | 데이터 시각적 확인 |

---

## Sprint 4: 프론트엔드 키 전환 + 정리

### Phase 10 — categoryMap prefix 최종 전환

> Phase 4-5에서 사용한 임시 매핑을 제거하고 최종 prefix로 전환

**파일**: `settingsData.ts`, `deviceSettingsData.ts`, `SettingsView.vue`, `DevicesView.vue`

#### Task 10-1: settingsData.ts categoryMap 최종화

```typescript
// 임시 매핑 없이 최종 prefix 사용
notification: { prefix: "noti", apiCategory: "NOTIFICATION" },
```

#### Task 10-2: deviceSettingsData.ts categoryMap 최종화

```typescript
selfUI: { prefix: "selfUI", apiCategory: "SELF_UI" },
posOp: { prefix: "posOp", apiCategory: "POS_OPERATION" },
```

#### Task 10-3: SettingsView.vue 임시 매핑 코드 제거

- legacyPrefixMap 삭제
- loadSettings()의 임시 로드 로직 제거 → 표준 `${prefix}.${key}` 패턴으로 복원

#### Task 10-4: DevicesView.vue 임시 매핑 코드 제거

- legacyDevicePrefixMap 삭제
- loadDeviceSettings()의 임시 로드 로직 제거

---

### Phase 11 — settingsStore.get() 참조 갱신

> 분석 결과: 이동 대상 키를 직접 참조하는 뷰가 **없음** (안전)

**확인 완료된 참조** (모두 이동 대상 아님):

| 파일 | 참조 키 | 영향 |
|------|---------|------|
| accessibility.ts | `a11y.*` | 없음 |
| PaymentView.vue | `sale.taxRate`, `point.pointUseSplitMethod` | 없음 |
| OrderConfirmView.vue | `sale.tableSelectEnabled`, `point.salePoint` | 없음 |
| PointSelectView.vue | `point.salePoint` | 없음 |
| PointPayment.vue | `point.pointUseMinBalance` | 없음 |

**추가 확인 필요** (Phase 11 실행 시):
```bash
# selfUI 키를 직접 참조하는 코드가 키오스크 뷰에 있는지 최종 확인
grep -rn "selfSoundGuide\|selfTouchSoundYN\|selfMainPage\|selfCusNum4" \
  frontend/src/renderer/src/views/kiosk/ --include="*.vue" --include="*.ts"
```

> 만약 키오스크 뷰에서 `settingsStore.get("point.selfSoundGuide")` 패턴이 발견되면, `settingsStore.getDevice("selfUI.selfSoundGuide")`로 변경 필요.

---

### Phase 12 — 키오스크 뷰 selfUI 참조 전환

> selfUI 19키가 SystemSetting → DeviceSetting으로 이동했으므로, 키오스크 뷰에서 이 키들을 사용하는 경우 접근 방식 변경 필요

#### Task 12-1: settingsStore 사용 패턴 확인

```
AS-IS: settingsStore.get("point.selfSoundGuide")     // SystemSetting에서 조회
TO-BE: settingsStore.getDevice("selfUI.selfSoundGuide")  // DeviceSetting에서 조회
```

> 키오스크는 `POSON_DEVICE_ID` 환경변수로 자동 식별되므로, `getDevice()` 호출 시 현재 기기의 DeviceSetting에서 값을 가져옴.

#### Task 12-2: settingsStore.ts initialize() 업데이트

현재 `initialize()`는 SystemSetting만 로드. DeviceSetting도 로드하도록 이미 구현되어 있음 (`fetchDeviceSettings()`). SELF_UI 카테고리가 DeviceSetting으로 이동했으므로 자동으로 동작함.

---

### Phase 13 — 최종 검증 + 문서 업데이트

#### Task 13-1: E2E 검증

| 시나리오 | 순서 | 기대 결과 |
|---------|------|----------|
| 공통 설정 전체 | 8탭 순회, 값 변경 → 저장 → 새로고침 | 모든 값 유지 |
| POS 기기 설정 | 5탭 순회, posOp 55키 변경 | 저장/로드 정상 |
| KIOSK 기기 설정 | 5탭 순회, selfUI 28키 변경 | 저장/로드 정상 |
| KIOSK 2대 독립 | KIOSK-01/02 각각 selfUI 다른 값 | 기기별 독립 저장 |
| 키오스크 화면 | selfUI 설정 변경 후 키오스크 뷰 확인 | 설정 반영 |
| 기존 키 호환 | 판매/결제/바코드/시스템/접근성 | 마이그레이션 전과 동일 |

#### Task 13-2: 문서 업데이트

| 문서 | 변경 내용 |
|------|----------|
| `.doc/settings-refinement-analysis.md` | 미결사항 결정 기록, 구현 완료 표시 |
| `.doc/settings-asis-mapping.md` | TO-BE 매핑으로 갱신 |
| `CLAUDE.md` | 2계층 설정 시스템 섹션 업데이트 (카테고리 목록) |

#### Task 13-3: 백업 테이블 정리

```sql
-- 모든 검증 완료 후 (운영 안정화 이후)
DROP TABLE IF EXISTS system_settings_backup;
DROP TABLE IF EXISTS device_settings_backup;
```

---

## 작업 수량 요약

| Sprint | Phase | Task 수 | 주요 파일 | 상태 |
|--------|-------|---------|----------|------|
| 1 | 1-3 | 22 | settingsData.ts, deviceSettingsData.ts | ✅ 완료 |
| 2+3 통합 | 4-9 | 12 | Vue 2개 + migration + seed.ts | ✅ 완료 |
| 4 | 10-13 | 8 | grep 검증 + 문서 | ✅ 완료 (변경 불필요) |
| **합계** | **13** | **42** | | **✅ 전체 완료** |

---

## 리스크 및 완화 전략 — 결과

| 리스크 | 결과 |
|--------|------|
| Sprint 2 임시 매핑의 복잡도 | ✅ Sprint 2+3 동시 진행으로 회피 |
| selfUI 테이블 이동 시 다중 KIOSK 값 차이 | ✅ KIOSK-001 이미 처리됨, KIOSK-002 마이그레이션 완료 |
| posPrint 76키 분류 오류 | ✅ 76/76 정확히 이동 (12+44+10+10=76 검증) |
| 마이그레이션 중 서비스 중단 | ✅ Prisma $transaction 단일 트랜잭션, 백업 테이블 생성 |
| 키오스크 뷰 selfUI 참조 누락 | ✅ grep 전수 검사 결과 참조 0건 (변경 불필요) |

---

## ✅ 채택됨: Sprint 2+3 동시 진행 (임시 매핑 생략)

> **결정**: 미결사항 #5에 따라 이 방식을 채택. 임시 매핑 코드 없이 최종 prefix를 직접 사용.

임시 매핑의 복잡도가 높으므로, Phase 4-5와 Phase 7-8을 **동시에 진행**하는 방법:

```
Sprint 1: Phase 1-3 (데이터 재구성)
  ↓
Sprint 2+3 통합: Phase 4+7 → Phase 5+8 → Phase 6+9 (UI + DB 동시)
  ↓
Sprint 4: Phase 10-13 (전환 + 정리) — 임시 매핑 불필요
```

**장점**: 임시 매핑 코드 불필요, 코드 단순
**단점**: 실패 시 롤백 범위가 넓음 (UI + DB 동시 변경)
**권장**: DB가 개발 환경이므로 동시 진행이 더 효율적
