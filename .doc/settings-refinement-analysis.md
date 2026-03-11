# 환경설정 / 기기설정 정제화 분석

> 분석일: 2026-03-11
> 최종 수정: 2026-03-11 (selfApple 합계 일관성, SQL 트랜잭션/충돌가드, 백엔드 변경 상세화)
> 목표: 중복 제거, 공통/기기별 분류 재정립, 가독성 향상, 키 식별자 안전 이관

---

## 1. 현재 구조 (AS-IS) — 실제 코드 기준 정확한 키 수

### DB 키 저장 형식

```
┌─────────────────────────────────────────────────────────────┐
│ 테이블: system_settings                                      │
│ PK: key (VARCHAR 100)                                        │
│ 저장 형식: "{prefix}.{keyName}"                              │
│ 예: "sale.openDay", "point.selfSoundGuide"                   │
│ category 컬럼으로 그룹핑 (SALE, PAYMENT, POINT 등)            │
├─────────────────────────────────────────────────────────────┤
│ 테이블: device_settings                                      │
│ PK: [device_id, key] (복합키)                                │
│ 저장 형식: "{prefix}.{keyName}"                              │
│ 예: "terminal.posNo", "posPrint.settleCategoryPrint"         │
│ category 컬럼으로 그룹핑 (TERMINAL, POS_PRINT 등)             │
└─────────────────────────────────────────────────────────────┘
```

> ⚠️ **핵심**: prefix는 탭의 `categoryMap[tabId].prefix`에서 결정됨. 설정을 다른 탭으로 이동하면 prefix가 바뀌므로 **DB 키 자체가 변경**됨.

### 공통 환경설정 (SettingsView) — 7탭, 152키

> 소스: `settingsData.ts` defaultConfig 객체 키 수 기준

| # | 탭 | API 카테고리 | prefix | 키 수 | 토글 수 | 비고 |
|---|-----|-------------|--------|-------|---------|------|
| 1 | 판매 운영 | SALE | `sale` | **32** | 13 | 영업 기본 + 주방/테이블 |
| 2 | 결제 정책 | PAYMENT | `payment` | **31** | 25 (10+15) | 결제수단 on/off + 카드/VAN/환불/수수료 |
| 3 | 출력 설정 | PRINT | `print` | **9** | 8 | 영수증 기본 옵션 + cutPosition |
| 4 | 포인트/회원 | POINT | `point` | **56** | 24 (6+5+2+2+11) | 적립/사용/등급 + **셀프UI 19개 혼재** |
| 5 | 바코드/중량 | BARCODE | `barcode` | **5** | 0 | 바코드/저울 파싱 (입력 필드만) |
| 6 | 시스템 | SYSTEM | `system` | **9** | 7 | 로그/백업/마스터 + backupPath |
| 7 | 접근성 | ACCESSIBILITY | `a11y` | **10** | 3 | TTS/음성주문/폰트/대비 |

### 기기별 설정 (DevicesView)

> 소스: `deviceSettingsData.ts` defaultConfig 객체 키 수 기준

**POS** — 6탭, **163**키

| # | 탭 | API 카테고리 | prefix | 키 수 | 토글 수 | 성격 |
|---|-----|-------------|--------|-------|---------|------|
| 1 | 터미널 HW | TERMINAL | `terminal` | 30 | 5 | 하드웨어 (포트, 장치) |
| 2 | VAN 결제 | VAN | `van` | 9 | 0 | VAN 통신 설정 (입력 필드) |
| 3 | **인쇄/출력** | POS_PRINT | `posPrint` | **76** | 76 | 영수증 + **판매/결제 정책 혼재** |
| 4 | 판매설정 | POS_SALE | `posSale` | 11 | 2 | POS 판매 옵션 |
| 5 | 정산/마감 | POS_SETTLE | `posSettle` | **27** | 23 (13+10) | 정산서 항목 + 영수증 메시지 4개 |
| 6 | 영수증 | POS_RECEIPT | `posReceipt` | 10 | 10 | 결제수단별 출력 skip |

> 합계: 30+9+76+11+27+10 = **163**키

**KIOSK** — 8탭, **86**키

| # | 탭 | API 카테고리 | prefix | 키 수 | 토글 수 | 성격 |
|---|-----|-------------|--------|-------|---------|------|
| 1 | 터미널 HW | TERMINAL | `terminal` | 30 | 5 | 하드웨어 |
| 2 | VAN 결제 | VAN | `van` | 9 | 0 | VAN 통신 |
| 3 | 현금 결제 | SELF_CASH | `selfCash` | 10 | 6 | 현금기 HW + 정책 |
| 4 | 봉투/저울 | SELF_BAG | `selfBag` | 6 | 3 | 봉투기/저울 HW |
| 5 | 자동 운영 | SELF_AUTO | `selfAuto` | 8 | 2 | 자동 개점/마감 |
| 6 | **포인트/알림** | SELF_POINT | `selfPoint` | **11** | 8 | 포인트 정책 + 알림 |
| 7 | **인쇄/출력** | SELF_PRINT | `selfPrint` | **4** | 4 | 영수증 출력 정책 |
| 8 | **기타** | SELF_ETC | `selfEtc` | **8** | 6 | 잡항목 (HW + 결제 혼재) |

> 합계: 30+9+10+6+8+11+4+8 = **86**키 (터미널/VAN은 POS와 공유)

**KITCHEN** — 2탭, 37키

| # | 탭 | API 카테고리 | prefix | 키 수 |
|---|-----|-------------|--------|-------|
| 1 | 터미널 HW | TERMINAL | `terminal` | 30 |
| 2 | 주방 메시지 | KITCHEN | `kitchen` | 7 |

### 전체 합계

| 구분 | 탭 수 | 키 수 |
|------|-------|-------|
| 공통 | 7 | 152 |
| POS 기기 | 6 | 163 |
| KIOSK 기기 | 8 | 86 (터미널/VAN 공유) |
| KITCHEN 기기 | 2 | 37 (터미널 공유) |
| **총계** | **23** | **438** (공유 제외 실질 **369**) |

> 공유 제외 계산: 152 + (163-39) + (86-39) + (37-30) + 39 = 369 (terminal 30 + VAN 9 = 39 공유)

---

## 2. 문제점 분석

### 문제 1: 공통 POINT 탭에 셀프 UI 설정 19키 혼재 (Critical)

`defaultPointConfig`(56키) 내부 구성:

| 구분 | 키 수 | DB 키 예시 |
|------|-------|-----------|
| 포인트 기본 | 7 | `point.salePoint`, `point.memberAddScreen` |
| 포인트 적립 | 9 | `point.pointEarnEnabled`, `point.pointEarnRate` |
| 등급별 차등 | 5 | `point.pointGradeEnabled`, `point.pointGradeNormalRate` |
| 결제수단별 적립 | 2 | `point.pointCardEarnEnabled` |
| 포인트 사용 | 5 | `point.pointUseEnabled`, `point.pointUseMinBalance` |
| 등급 변경 | 7 | `point.gradeAutoEnabled`, `point.gradeCriteria` |
| 포인트 만료 | 2 | `point.pointExpireEnabled` |
| **셀프 UI (키오스크)** | **19** | `point.selfSoundGuide`, `point.selfCusNum4` |

→ 56키 중 **19키(34%)가 포인트와 무관한 키오스크 화면 설정**. 이 키들의 DB 키는 `point.*` prefix를 사용 중.

### 문제 2: POS posPrint 76키가 단일 탭에 밀집 (Critical)

76개 토글을 성격별로 분류하면:

| 성격 | 키 수 | DB 키 예시 |
|------|-------|-----------|
| 영수증 레이아웃 | ~12 | `posPrint.receiptBarcode`, `posPrint.receiptVat` |
| 판매 동작/규칙 | ~28 | `posPrint.saleCancelDisable`, `posPrint.zeroPriceInput` |
| 배달 관련 | ~16 | `posPrint.deliveryDisable`, `posPrint.deliverySeqPrint` |
| 결제 정책 | ~10 | `posPrint.discountNoPoint`, `posPrint.cashBackUse` |
| 정산/보관 | ~10 | `posPrint.settleCategoryPrint`, `posPrint.archiveBarcodeNo` |

→ VB6 `POS_Set[101]` comma-separated 배열의 1:1 매핑. 모든 키의 DB prefix가 `posPrint.*`

### 문제 3: KIOSK selfPoint — 포인트 정책과 알림이 혼재

| 포인트 정책 (4키) | 알림/SMS (7키) |
|-------------------|---------------|
| `selfPoint.selfNoAutoPoint` | `selfPoint.selfPointSMSUse` |
| `selfPoint.selfPointZero` | `selfPoint.selfUserCall` |
| `selfPoint.selfPointHidden` | `selfPoint.selfSMSAdmin` |
| `selfPoint.selfZero` | `selfPoint.selfKakao` |
| | `selfPoint.selfCusAlarmUse` |
| | `selfPoint.selfCusAlarmTime` |
| | `selfPoint.selfSNSGubun` |

### 문제 4: KIOSK selfPrint(4키) — 공통 PRINT(9키)에 흡수 가능

두 탭 모두 "영수증 출력 정책"이며, 키오스크 전용이 아닌 매장 공통 정책:
- `selfPrint.selfAutoPrint` → 전 기기 공통 출력 정책
- `selfPrint.selfStoPrint` → 전 기기 공통
- `selfPrint.selfPrintAddress` / `selfPrint.selfPrintPhon` → 전 기기 공통

### 문제 5: KIOSK selfEtc(8키) — 성격별 분류 부재

| 키 | 현재 DB 키 | 실제 성격 | 적합 위치 |
|----|-----------|----------|----------|
| selfJPYN | `selfEtc.selfJPYN` | 동전교환 HW | KIOSK > 터미널 HW |
| selfBagJPPort | `selfEtc.selfBagJPPort` | 봉투 자판기 포트 | KIOSK > 봉투/저울 |
| selfNoAutoGoods | `selfEtc.selfNoAutoGoods` | 상품 운영 정책 | 공통 > 판매 운영 |
| selfAppCard | `selfEtc.selfAppCard` | 결제수단 on/off | 공통 > 결제 정책 |
| selfApple | `selfEtc.selfApple` | 결제수단 on/off | 공통 > 결제 정책 |
| selfCamUse | `selfEtc.selfCamUse` | 카메라 HW | KIOSK > 터미널 HW |
| selfICSiren | `selfEtc.selfICSiren` | 알림장치 HW | KIOSK > 터미널 HW |
| selfGif | `selfEtc.selfGif` | UI 표시 설정 | KIOSK > 키오스크 화면 |

### 문제 6: 결제수단 중복 가능성

| 공통 (PAYMENT) | KIOSK (SELF_ETC) | 중복? |
|----------------|-----------------|------|
| `payment.applePayEnabled` | `selfEtc.selfApple` | ⚠️ 동일 기능 다른 키 |
| — | `selfEtc.selfAppCard` | 앱카드는 공통에 없음 |

→ `selfApple`과 `applePayEnabled`가 동일 목적이라면 하나로 통합 필요.

---

## 3. 키 식별자(Key ID) 영향 분석

### 3.1 현재 키 형식과 참조 구조

```
┌──────────────────────────────────────────────────────────────┐
│ 키 생성 흐름                                                  │
│                                                              │
│ settingsData.ts                                              │
│   categoryMap.sale.prefix = "sale"                            │
│   defaultSaleConfig = { openDay: "", ... }                   │
│                                                              │
│ SettingsView.vue                                             │
│   buildPayload("sale", { openDay: "" })                      │
│   → { "sale.openDay": "" }          ← DB 저장 키             │
│                                                              │
│ loadSettings()                                               │
│   dbKey = `${prefix}.${key}` → "sale.openDay"                │
│   cfg[key] = apiResponse[dbKey]     ← DB 조회 키             │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 설정 이동 시 키 변경 유형

| 이동 유형 | 예시 | 키 변경 | 영향 |
|----------|------|---------|------|
| **같은 테이블, 카테고리만 변경** | `selfPoint.selfZero` → POINT 카테고리 | category 컬럼만 변경, 키 유지 가능 | ⭐ 최소 |
| **같은 테이블, 다른 탭(prefix 변경)** | `posPrint.receiptBarcode` → PRINT 공통 | `posPrint.receiptBarcode` → `print.receiptBarcode` | ⚡ 키 변경 필요 |
| **테이블 간 이동** | `point.selfSoundGuide` (SystemSetting) → SELF_UI (DeviceSetting) | INSERT + DELETE + 키 변경 | 🔴 고영향 |

### 3.3 키 변경 전략 옵션 비교

| 전략 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. prefix 변경 (권장)** | 새 탭의 prefix에 맞게 DB 키 갱신 | 일관성, 깔끔한 구조 | DB 마이그레이션 필요 |
| **B. prefix 유지** | 키는 그대로, category 컬럼만 변경 | DB 변경 최소화 | prefix와 탭 불일치, 프론트 복잡도↑ |
| **C. prefix 제거** | 키를 `keyName`만 사용 (prefix 없이) | 미래 이동에 자유 | 키 충돌 위험, 대규모 리팩터링 |

### 3.4 권장: 전략 A — prefix 변경 + DB 마이그레이션

**이유**:
- 내부 시스템이므로 외부 API 하위 호환 불필요
- 키-탭 간 일관성 유지가 장기 유지보수에 유리
- 마이그레이션 스크립트로 일괄 처리 가능 (upsert 기반이라 안전)
- `buildPayload(prefix, config)` 구조 변경 없이 prefix만 바꾸면 됨

---

## 4. 재분류 제안 (TO-BE)

### 4.1 분류 원칙

| 원칙 | 설명 | 예시 |
|------|------|------|
| **매장 정책 → 공통** | 모든 기기에 동일하게 적용되는 비즈니스 규칙 | 포인트 적립률, 결제수단 on/off, 영수증 내용 |
| **하드웨어 → 기기별** | 물리 장치 포트/타입 등 기기마다 다른 설정 | 프린터 포트, VAN IP, 현금기 포트 |
| **UI/동작 → 기기 유형별** | 기기 유형(POS/KIOSK)에 따라 다른 화면/동작 | 키오스크 터치음, POS 그리드 설정 |
| **"기타" 탭 금지** | 잡항목 금지, 반드시 적합한 카테고리에 배치 | selfEtc → 분산 |

### 4.2 공통 환경설정 — 8탭

| # | 탭 | API 카테고리 | prefix | AS-IS 키 수 | 변경 내용 | TO-BE 키 수 |
|---|-----|-------------|--------|------------|----------|------------|
| 1 | 판매 운영 | SALE | `sale` | 32 | + selfNoAutoGoods(1) | **33** |
| 2 | 결제 정책 | PAYMENT | `payment` | 31 | + selfAppCard(1) ~~+ selfApple(삭제)~~ | **32** |
| 3 | **영수증/출력** | PRINT | `print` | 9 | + selfPrint(4) + posPrint 공통 영수증(12) | **25** |
| 4 | 포인트/회원 | POINT | `point` | 56 | **- selfUI(19)** + selfPoint 포인트정책(4) | **41** |
| 5 | **알림/통신** | NOTIFICATION *(신규)* | `noti` | 0 | selfPoint 알림(7) | **7** |
| 6 | 바코드/중량 | BARCODE | `barcode` | 5 | 유지 | **5** |
| 7 | 시스템 | SYSTEM | `system` | 9 | 유지 | **9** |
| 8 | 접근성 | ACCESSIBILITY | `a11y` | 10 | 유지 | **10** |
| | **합계** | | | **152** | | **162** |

> ✅ selfApple 삭제 확정 (미결사항 #1). applePayEnabled으로 통합. 결제 정책 32키, 합계 162키.

### 4.3 기기별 설정

**POS** — 5탭 (6→5: posPrint 분해 + posSale 통합)

| # | 탭 | API 카테고리 | prefix | 변경 내용 | TO-BE 키 수 |
|---|-----|-------------|--------|----------|------------|
| 1 | 터미널 HW | TERMINAL | `terminal` | 유지 | **30** |
| 2 | VAN 결제 | VAN | `van` | 유지 | **9** |
| 3 | **POS 판매/동작** | POS_OPERATION | `posOp` *(신규)* | posPrint(44) + posSale(11) | **~55** |
| 4 | 정산/마감 | POS_SETTLE | `posSettle` | + posPrint 정산관련(10) | **~37** |
| 5 | **POS 영수증** | POS_RECEIPT | `posReceipt` | posReceipt(10) + posPrint 인쇄전용(10) | **~20** |
| | **합계** | | | | **~151** |

> posPrint(76키) 3분할: 공통 영수증(12) → 공통 PRINT, 판매동작+배달(44) → POS 판매/동작, 정산(10) → 정산/마감, POS 인쇄(10) → POS 영수증

**KIOSK** — 5탭 (8→5: 3탭 분산 후 제거)

| # | 탭 | API 카테고리 | prefix | 변경 내용 | TO-BE 키 수 |
|---|-----|-------------|--------|----------|------------|
| 1 | 터미널 HW | TERMINAL | `terminal` | + selfEtc HW(3: selfJPYN, selfCamUse, selfICSiren) | **33** |
| 2 | VAN 결제 | VAN | `van` | 유지 | **9** |
| 3 | 현금 결제 | SELF_CASH | `selfCash` | 유지 | **10** |
| 4 | 봉투/저울 | SELF_BAG | `selfBag` | + selfBagJPPort(1) | **7** |
| 5 | **키오스크 화면** | SELF_UI *(신규)* | `selfUI` | selfUI(19) + selfAuto(8) + selfGif(1) | **28** |
| | **합계** | | | | **~87** |

제거 탭: ~~포인트/알림(SELF_POINT)~~ → 공통 이동, ~~인쇄/출력(SELF_PRINT)~~ → 공통 흡수, ~~기타(SELF_ETC)~~ → 분산

**KITCHEN** — 2탭 (변경 없음)

| # | 탭 | prefix | TO-BE 키 수 |
|---|-----|--------|------------|
| 1 | 터미널 HW | `terminal` | 30 |
| 2 | 주방 메시지 | `kitchen` | 7 |

---

## 5. 상세 키 이동 맵 (DB 키 변경 포함)

### 5.1 KIOSK selfPoint (11키) → 분산

| keyName | AS-IS DB 키 | AS-IS 테이블 | TO-BE DB 키 | TO-BE 테이블 | TO-BE 카테고리 |
|---------|------------|-------------|------------|-------------|--------------|
| selfNoAutoPoint | `selfPoint.selfNoAutoPoint` | DeviceSetting | `point.selfNoAutoPoint` | **SystemSetting** | POINT |
| selfPointZero | `selfPoint.selfPointZero` | DeviceSetting | `point.selfPointZero` | **SystemSetting** | POINT |
| selfPointHidden | `selfPoint.selfPointHidden` | DeviceSetting | `point.selfPointHidden` | **SystemSetting** | POINT |
| selfZero | `selfPoint.selfZero` | DeviceSetting | `point.selfZero` | **SystemSetting** | POINT |
| selfPointSMSUse | `selfPoint.selfPointSMSUse` | DeviceSetting | `noti.selfPointSMSUse` | **SystemSetting** | NOTIFICATION |
| selfUserCall | `selfPoint.selfUserCall` | DeviceSetting | `noti.selfUserCall` | **SystemSetting** | NOTIFICATION |
| selfSMSAdmin | `selfPoint.selfSMSAdmin` | DeviceSetting | `noti.selfSMSAdmin` | **SystemSetting** | NOTIFICATION |
| selfKakao | `selfPoint.selfKakao` | DeviceSetting | `noti.selfKakao` | **SystemSetting** | NOTIFICATION |
| selfCusAlarmUse | `selfPoint.selfCusAlarmUse` | DeviceSetting | `noti.selfCusAlarmUse` | **SystemSetting** | NOTIFICATION |
| selfCusAlarmTime | `selfPoint.selfCusAlarmTime` | DeviceSetting | `noti.selfCusAlarmTime` | **SystemSetting** | NOTIFICATION |
| selfSNSGubun | `selfPoint.selfSNSGubun` | DeviceSetting | `noti.selfSNSGubun` | **SystemSetting** | NOTIFICATION |

> ⚠️ **테이블 간 이동**: DeviceSetting → SystemSetting. 기기별로 다른 값이 존재할 수 있으므로 마이그레이션 시 대표값(첫 번째 기기 또는 최신 값) 선택 필요.

### 5.2 KIOSK selfPrint (4키) → 공통 영수증/출력

| keyName | AS-IS DB 키 | AS-IS 테이블 | TO-BE DB 키 | TO-BE 테이블 | TO-BE 카테고리 |
|---------|------------|-------------|------------|-------------|--------------|
| selfAutoPrint | `selfPrint.selfAutoPrint` | DeviceSetting | `print.selfAutoPrint` | **SystemSetting** | PRINT |
| selfStoPrint | `selfPrint.selfStoPrint` | DeviceSetting | `print.selfStoPrint` | **SystemSetting** | PRINT |
| selfPrintAddress | `selfPrint.selfPrintAddress` | DeviceSetting | `print.selfPrintAddress` | **SystemSetting** | PRINT |
| selfPrintPhon | `selfPrint.selfPrintPhon` | DeviceSetting | `print.selfPrintPhon` | **SystemSetting** | PRINT |

### 5.3 KIOSK selfEtc (8키) → 분산

| keyName | AS-IS DB 키 | TO-BE DB 키 | TO-BE 테이블 | TO-BE 카테고리 |
|---------|------------|------------|-------------|--------------|
| selfJPYN | `selfEtc.selfJPYN` | `terminal.selfJPYN` | DeviceSetting (유지) | TERMINAL |
| selfBagJPPort | `selfEtc.selfBagJPPort` | `selfBag.selfBagJPPort` | DeviceSetting (유지) | SELF_BAG |
| selfNoAutoGoods | `selfEtc.selfNoAutoGoods` | `sale.selfNoAutoGoods` | **SystemSetting** | SALE |
| selfAppCard | `selfEtc.selfAppCard` | `payment.selfAppCard` | **SystemSetting** | PAYMENT |
| ~~selfApple~~ | ~~`selfEtc.selfApple`~~ | **삭제** (applePayEnabled 중복) | — | — |
| selfCamUse | `selfEtc.selfCamUse` | `terminal.selfCamUse` | DeviceSetting (유지) | TERMINAL |
| selfICSiren | `selfEtc.selfICSiren` | `terminal.selfICSiren` | DeviceSetting (유지) | TERMINAL |
| selfGif | `selfEtc.selfGif` | `selfUI.selfGif` | DeviceSetting (유지) | SELF_UI |

> ⚠️ selfApple: `payment.applePayEnabled`와 동일 목적이면 통합. 이 경우 selfApple 키 삭제하고 applePayEnabled 사용.

### 5.4 공통 POINT에서 분리 → KIOSK 키오스크 화면 (19키)

| keyName | AS-IS DB 키 | TO-BE DB 키 | AS-IS 테이블 | TO-BE 테이블 |
|---------|------------|------------|-------------|-------------|
| selfSoundGuide | `point.selfSoundGuide` | `selfUI.selfSoundGuide` | SystemSetting | **DeviceSetting** |
| selfCusNum4 | `point.selfCusNum4` | `selfUI.selfCusNum4` | SystemSetting | **DeviceSetting** |
| selfNoCustomer | `point.selfNoCustomer` | `selfUI.selfNoCustomer` | SystemSetting | **DeviceSetting** |
| selfCusSelect | `point.selfCusSelect` | `selfUI.selfCusSelect` | SystemSetting | **DeviceSetting** |
| selfCusAddUse | `point.selfCusAddUse` | `selfUI.selfCusAddUse` | SystemSetting | **DeviceSetting** |
| selfCusAddEtc | `point.selfCusAddEtc` | `selfUI.selfCusAddEtc` | SystemSetting | **DeviceSetting** |
| selfCusTopMsg | `point.selfCusTopMsg` | `selfUI.selfCusTopMsg` | SystemSetting | **DeviceSetting** |
| selfCusBTMsg1 | `point.selfCusBTMsg1` | `selfUI.selfCusBTMsg1` | SystemSetting | **DeviceSetting** |
| selfCusBTMsg2 | `point.selfCusBTMsg2` | `selfUI.selfCusBTMsg2` | SystemSetting | **DeviceSetting** |
| selfTouchSoundYN | `point.selfTouchSoundYN` | `selfUI.selfTouchSoundYN` | SystemSetting | **DeviceSetting** |
| selfMainPage | `point.selfMainPage` | `selfUI.selfMainPage` | SystemSetting | **DeviceSetting** |
| selfBTInit | `point.selfBTInit` | `selfUI.selfBTInit` | SystemSetting | **DeviceSetting** |
| selfOneCancel | `point.selfOneCancel` | `selfUI.selfOneCancel` | SystemSetting | **DeviceSetting** |
| selfZHotKey | `point.selfZHotKey` | `selfUI.selfZHotKey` | SystemSetting | **DeviceSetting** |
| selfCountYN | `point.selfCountYN` | `selfUI.selfCountYN` | SystemSetting | **DeviceSetting** |
| selfStartHotKey | `point.selfStartHotKey` | `selfUI.selfStartHotKey` | SystemSetting | **DeviceSetting** |
| selfPriceUse | `point.selfPriceUse` | `selfUI.selfPriceUse` | SystemSetting | **DeviceSetting** |
| selfPriceType | `point.selfPriceType` | `selfUI.selfPriceType` | SystemSetting | **DeviceSetting** |
| selfReader | `point.selfReader` | `selfUI.selfReader` | SystemSetting | **DeviceSetting** |

> ⚠️ **SystemSetting → DeviceSetting 이동**: 19키의 현재 공통 값을 모든 KIOSK 기기에 복사 후 SystemSetting에서 삭제.

### 5.5 KIOSK selfAuto (8키) → 키오스크 화면 탭 통합

| keyName | AS-IS DB 키 | TO-BE DB 키 | 카테고리 변경 |
|---------|------------|------------|-------------|
| autoOpenYN | `selfAuto.autoOpenYN` | `selfUI.autoOpenYN` | SELF_AUTO → SELF_UI |
| autoFinishYN | `selfAuto.autoFinishYN` | `selfUI.autoFinishYN` | SELF_AUTO → SELF_UI |
| autoDay | `selfAuto.autoDay` | `selfUI.autoDay` | SELF_AUTO → SELF_UI |
| autoAP | `selfAuto.autoAP` | `selfUI.autoAP` | SELF_AUTO → SELF_UI |
| autoHH | `selfAuto.autoHH` | `selfUI.autoHH` | SELF_AUTO → SELF_UI |
| autoMM | `selfAuto.autoMM` | `selfUI.autoMM` | SELF_AUTO → SELF_UI |
| autoID | `selfAuto.autoID` | `selfUI.autoID` | SELF_AUTO → SELF_UI |
| autoPass | `selfAuto.autoPass` | `selfUI.autoPass` | SELF_AUTO → SELF_UI |

> 같은 DeviceSetting 테이블 내에서 prefix + category만 변경. 비교적 단순.

### 5.6 POS posPrint (76키) → 4분할

**→ 공통 영수증/출력 (SystemSetting PRINT) — 12키**:

| keyName | AS-IS DB 키 | TO-BE DB 키 | TO-BE 테이블 |
|---------|------------|------------|-------------|
| receiptProductOneLine | `posPrint.receiptProductOneLine` | `print.receiptProductOneLine` | **SystemSetting** |
| receiptBarcode | `posPrint.receiptBarcode` | `print.receiptBarcode` | **SystemSetting** |
| receiptVat | `posPrint.receiptVat` | `print.receiptVat` | **SystemSetting** |
| receiptBottleTotal | `posPrint.receiptBottleTotal` | `print.receiptBottleTotal` | **SystemSetting** |
| receiptItemSeq | `posPrint.receiptItemSeq` | `print.receiptItemSeq` | **SystemSetting** |
| receiptPhoneMask | `posPrint.receiptPhoneMask` | `print.receiptPhoneMask` | **SystemSetting** |
| receiptNameMask | `posPrint.receiptNameMask` | `print.receiptNameMask` | **SystemSetting** |
| cashReceiptAutoIssue | `posPrint.cashReceiptAutoIssue` | `print.cashReceiptAutoIssue` | **SystemSetting** |
| cashReceiptIdShow | `posPrint.cashReceiptIdShow` | `print.cashReceiptIdShow` | **SystemSetting** |
| saleMessageHide | `posPrint.saleMessageHide` | `print.saleMessageHide` | **SystemSetting** |
| noCostPriceShow | `posPrint.noCostPriceShow` | `print.noCostPriceShow` | **SystemSetting** |
| memberTotalHide | `posPrint.memberTotalHide` | `print.memberTotalHide` | **SystemSetting** |

**→ POS 판매/동작 (DeviceSetting POS_OPERATION) — 44키**:

prefix 변경: `posPrint.*` → `posOp.*`

포함 키: saleNewProduct, exchangePassword, zeroPriceInput, discountNoPoint, weightNoPoint, saleCancelDisable, cashBackUse, barcodeGroupUse, returnNoPassword, cashForceInput, costOverSellWarn, disabledProductChange, salePriceCompare, categoryScaleInput, shortcutFixedPrice, shortcutNameProcess, bulkPriceFit, posNoCreditSale, discountNoCashback, cardNoDrawer, cashOnlyNoReturn, cardReturnNoDrawer, cardCardPayUse, giftCashReceiptInclude, giftPointInclude, deliveryPointAccrue, barcodeCardPayScreen, cashChangeCardScreen, deliveryDisable, deliveryNoPayClose, deliveryNoPayReturn, deliverySaleType, deliveryNotePrint, deliverySeqPrint, deliveryReceiptManage, deliveryDriverReceipt, deliveryItemArchive, deliverySeqMemberReceipt, holdNoShift, holdReceiptPrint, holdReceiptDetail, deliveryNoShift, firstScanHoldMsg, overdueCustomerWarn

\+ posSale(11키): prefix `posSale.*` → `posOp.*`
포함 키: receiptDiscountDisplay, totalRounding, scaleRounding, categoryPrintType, deliveryPointRate, creditPointRate, minReceiptAmount, minPointAmount, bcPartner, cardNoSignAmount, creditMemoUse

**→ POS 정산/마감 추가 — 10키**:

prefix 변경: `posPrint.*` → `posSettle.*` (기존 posSettle에 추가)

포함 키: settleCategoryPrint, settleAmountPrint, closeOutstandingPrint, openShiftFiscalPrint, cashbackQrPrint, scale18Barcode, archiveBarcodeNo, eSignArchiveNo, reissueBarcodeNo, receiptNoOutstanding

**→ POS 영수증 추가 — 10키**:

prefix 변경: `posPrint.*` → `posReceipt.*` (기존 posReceipt에 추가)

포함 키: slipNoPrint, slipNoHide, cancelDetailPrint, cardReceiptDetail, checkResponsePrint, eCouponNoReceipt, deliveryArchiveDouble, deliveryArchiveSimple, deliveryArchiveNormal, visitDeliveryArchive

---

## 6. TO-BE 구조 요약

### 공통 환경설정 — 8탭

```
┌───────────────────────────────────────────────────────────────┐
│ 공통 환경설정 (SystemSetting)                                  │
├──────────────┬────────────────────────────────────────────────┤
│ 1. 판매 운영  │ 32키 + selfNoAutoGoods(1)              = 33키│
│   prefix:sale│                                               │
│ 2. 결제 정책  │ 31키 + selfAppCard(1) = 32키 (selfApple삭제)│
│   prefix:    │                                               │
│   payment    │                                               │
│ 3. 영수증/출력│ 9키 + selfPrint(4) + posPrint공통(12)  = 25키│
│   prefix:    │                                               │
│   print      │                                               │
│ 4. 포인트/회원│ 56키 - selfUI(19) + selfPoint정책(4)   = 41키│
│   prefix:    │                                               │
│   point      │                                               │
│ 5. 알림/통신  │ *신규* selfPoint알림(7)                =  7키│
│   prefix:noti│                                               │
│ 6. 바코드/중량│ 유지                                   =  5키│
│ 7. 시스템    │ 유지                                   =  9키│
│ 8. 접근성    │ 유지                                   = 10키│
├──────────────┴────────────────────────────────────────────────┤
│ 합계: 163키 (AS-IS 152키 → +11키: posPrint/selfPoint/selfEtc유입)│
└───────────────────────────────────────────────────────────────┘
```

### 기기별 설정

```
┌───────────────────────────────────────────────────────────────┐
│ POS — 5탭                                                      │
├──────────────┬────────────────────────────────────────────────┤
│ 1. 터미널 HW  │ 유지                                   = 30키│
│   terminal   │                                               │
│ 2. VAN 결제   │ 유지                                   =  9키│
│   van        │                                               │
│ 3. 판매/동작  │ posPrint(44) + posSale(11)             = 55키│
│   posOp      │                                               │
│ 4. 정산/마감  │ posSettle(27) + posPrint정산(10)       = 37키│
│   posSettle  │                                               │
│ 5. POS 영수증 │ posReceipt(10) + posPrint인쇄(10)     = 20키│
│   posReceipt │                                               │
├──────────────┴────────────────────────────────────────────────┤
│ 합계: 151키 (AS-IS 163키 → -12키: 공통 PRINT 이동분)          │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ KIOSK — 5탭                                                    │
├──────────────┬────────────────────────────────────────────────┤
│ 1. 터미널 HW  │ 30키 + selfEtc HW(3)                  = 33키│
│   terminal   │                                               │
│ 2. VAN 결제   │ 유지                                   =  9키│
│   van        │                                               │
│ 3. 현금 결제  │ 유지                                   = 10키│
│   selfCash   │                                               │
│ 4. 봉투/저울  │ 6키 + selfBagJPPort(1)                 =  7키│
│   selfBag    │                                               │
│ 5. 키오스크화면│ selfUI(19) + selfAuto(8) + selfGif(1) = 28키│
│   selfUI     │                                               │
├──────────────┴────────────────────────────────────────────────┤
│ 합계: 87키 (AS-IS 86키 → +1키: selfUI 유입, 포인트/출력 유출)  │
│ ※ selfUI 19키는 SystemSetting→DeviceSetting 테이블 이동       │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ KITCHEN — 2탭 (변경 없음)                                      │
├──────────────┬────────────────────────────────────────────────┤
│ 1. 터미널 HW  │ 30키                                         │
│ 2. 주방 메시지 │ 7키                                          │
└───────────────────────────────────────────────────────────────┘
```

---

## 7. 변경 전후 비교

| 지표 | AS-IS | TO-BE | 개선 |
|------|-------|-------|------|
| 공통 탭 수 | 7 | 8 (+알림/통신) | 관심사 분리 |
| POS 탭 수 | 6 | 5 (-1) | posPrint 분해 |
| KIOSK 탭 수 | **8** | **5** (-3) | 3탭 분산 제거 |
| posPrint 단일 탭 | **76키** | 4분할 (12+44+10+10) | 가독성 대폭 향상 |
| 공통 POINT 혼재 | 56키 (19 selfUI) | 41키 (순수 포인트) | 관심사 분리 |
| "기타" 잡항목 탭 | 1 (8키) | 0 | 완전 제거 |
| 최대 탭 내 키 수 | **76** (posPrint) | **55** (판매/동작) | -28% |
| DB 키 변경 수 | — | **136키** (31%) | 마이그레이션 1회 |

### 키 변경 요약 통계

| 변경 유형 | 키 수 | 내역 |
|----------|-------|------|
| DeviceSetting → SystemSetting | **29** | selfPoint(4+7=11) + selfPrint(4) + selfEtc(2: selfAppCard만, ~~selfApple 삭제~~) + posPrint 공통영수증(12) |
| SystemSetting → DeviceSetting | **19** | point.selfUI* 19키 → selfUI.* (KIOSK 기기 복사) |
| DeviceSetting 내 prefix 변경 | **88** | selfAuto(8)→selfUI, selfEtc(5: HW3+bag1+gif1), posPrint→posOp(44), posSale→posOp(11), posPrint→posSettle(10), posPrint→posReceipt(10) |
| 변경 없음 | **301** | 기존 탭·prefix 유지 키들 |
| selfApple 삭제 | **1** | applePayEnabled과 중복 → 삭제 |
| **총 변경** | **136** | 전체 438키 중 **31%** |

---

## 8. 키 마이그레이션 상세 전략

### 8.1 마이그레이션 원칙

```
┌─────────────────────────────────────────────────────────────┐
│ 원칙 1: 데이터 손실 방지                                      │
│   → INSERT 후 DELETE (UPDATE 대신)                           │
│   → 롤백용 백업 테이블 생성                                   │
│                                                              │
│ 원칙 2: 원자적 실행                                           │
│   → 전체 마이그레이션을 단일 트랜잭션으로 실행                  │
│   → 실패 시 전체 롤백                                        │
│                                                              │
│ 원칙 3: 프론트엔드와 동시 배포                                │
│   → 백엔드 마이그레이션 + 프론트엔드 코드 변경을 같은 릴리스에  │
│   → 순서: DB 마이그레이션 → 백엔드 배포 → 프론트엔드 배포      │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 마이그레이션 SQL (Prisma migration 내부)

```sql
-- ═══════════════════════════════════════════════════════
-- 전체 마이그레이션을 단일 트랜잭션으로 실행
-- ═══════════════════════════════════════════════════════
BEGIN;

-- ═══════════════════════════════════════════════════════
-- Phase 0: 백업 (트랜잭션 외부에서 먼저 실행 권장)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_settings_backup AS SELECT * FROM system_settings;
CREATE TABLE IF NOT EXISTS device_settings_backup AS SELECT * FROM device_settings;

-- ═══════════════════════════════════════════════════════
-- Phase 1: DeviceSetting → SystemSetting 이동 (29키, selfApple 삭제)
-- ═══════════════════════════════════════════════════════

-- 1-1. KIOSK selfPoint 포인트정책(4키) → SystemSetting POINT
-- 모든 KIOSK 기기 중 첫 번째 값 사용 (동일 매장 정책이므로 값 동일 가정)
INSERT INTO system_settings (key, value, category, "createdAt", "updatedAt")
SELECT
  'point.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'POINT' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfPoint.selfNoAutoPoint', 'selfPoint.selfPointZero',
  'selfPoint.selfPointHidden', 'selfPoint.selfZero'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- 1-2. KIOSK selfPoint 알림(7키) → SystemSetting NOTIFICATION
INSERT INTO system_settings (key, value, category, "createdAt", "updatedAt")
SELECT
  'noti.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'NOTIFICATION' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfPoint.selfPointSMSUse', 'selfPoint.selfUserCall',
  'selfPoint.selfSMSAdmin', 'selfPoint.selfKakao',
  'selfPoint.selfCusAlarmUse', 'selfPoint.selfCusAlarmTime',
  'selfPoint.selfSNSGubun'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- 1-3. KIOSK selfPrint(4키) → SystemSetting PRINT
INSERT INTO system_settings (key, value, category, "createdAt", "updatedAt")
SELECT
  'print.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'PRINT' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfPrint.selfAutoPrint', 'selfPrint.selfStoPrint',
  'selfPrint.selfPrintAddress', 'selfPrint.selfPrintPhon'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- 1-4. KIOSK selfEtc 공통정책(2키) → SystemSetting (selfApple 삭제됨)
INSERT INTO system_settings (key, value, category, "createdAt", "updatedAt")
SELECT
  CASE
    WHEN split_part(ds.key, '.', 2) = 'selfNoAutoGoods' THEN 'sale.selfNoAutoGoods'
    WHEN split_part(ds.key, '.', 2) = 'selfAppCard' THEN 'payment.selfAppCard'
  END AS key,
  ds.value,
  CASE
    WHEN split_part(ds.key, '.', 2) = 'selfNoAutoGoods' THEN 'SALE'
    ELSE 'PAYMENT'
  END AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'selfEtc.selfNoAutoGoods', 'selfEtc.selfAppCard'
)
AND d.type = 'KIOSK'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'KIOSK' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- selfApple 키는 삭제 (applePayEnabled과 중복, 미결사항 #1 확정)
DELETE FROM device_settings WHERE key = 'selfEtc.selfApple';

-- 1-5. POS posPrint 공통영수증(12키) → SystemSetting PRINT
INSERT INTO system_settings (key, value, category, "createdAt", "updatedAt")
SELECT
  'print.' || split_part(ds.key, '.', 2) AS key,
  ds.value,
  'PRINT' AS category,
  NOW(), NOW()
FROM device_settings ds
JOIN devices d ON d.id = ds.device_id
WHERE ds.key IN (
  'posPrint.receiptProductOneLine', 'posPrint.receiptBarcode',
  'posPrint.receiptVat', 'posPrint.receiptBottleTotal',
  'posPrint.receiptItemSeq', 'posPrint.receiptPhoneMask',
  'posPrint.receiptNameMask', 'posPrint.cashReceiptAutoIssue',
  'posPrint.cashReceiptIdShow', 'posPrint.saleMessageHide',
  'posPrint.noCostPriceShow', 'posPrint.memberTotalHide'
)
AND d.type = 'POS'
AND ds.device_id = (SELECT id FROM devices WHERE type = 'POS' ORDER BY id LIMIT 1)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- Phase 2: SystemSetting → DeviceSetting 이동 (19키)
-- ═══════════════════════════════════════════════════════

-- selfUI 19키: 모든 KIOSK 기기에 복사
INSERT INTO device_settings (device_id, key, value, category, "createdAt", "updatedAt")
SELECT
  d.id AS device_id,
  'selfUI.' || split_part(ss.key, '.', 2) AS key,
  ss.value,
  'SELF_UI' AS category,
  NOW(), NOW()
FROM system_settings ss
CROSS JOIN devices d
WHERE d.type = 'KIOSK'
AND ss.key IN (
  'point.selfSoundGuide', 'point.selfCusNum4', 'point.selfNoCustomer',
  'point.selfCusSelect', 'point.selfCusAddUse', 'point.selfCusAddEtc',
  'point.selfCusTopMsg', 'point.selfCusBTMsg1', 'point.selfCusBTMsg2',
  'point.selfTouchSoundYN', 'point.selfMainPage', 'point.selfBTInit',
  'point.selfOneCancel', 'point.selfZHotKey', 'point.selfCountYN',
  'point.selfStartHotKey', 'point.selfPriceUse', 'point.selfPriceType',
  'point.selfReader'
)
ON CONFLICT (device_id, key) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- Phase 3: DeviceSetting 내 prefix 변경 (같은 테이블)
-- ═══════════════════════════════════════════════════════

-- 3-1. selfAuto(8키) → selfUI (category: SELF_AUTO → SELF_UI)
-- ⚠️ UPDATE는 PK(device_id, key) 충돌 가능 → 대상 키가 미존재 확인 후 실행
UPDATE device_settings
SET
  key = 'selfUI.' || split_part(key, '.', 2),
  category = 'SELF_UI',
  "updatedAt" = NOW()
WHERE category = 'SELF_AUTO'
AND NOT EXISTS (
  SELECT 1 FROM device_settings ds2
  WHERE ds2.device_id = device_settings.device_id
  AND ds2.key = 'selfUI.' || split_part(device_settings.key, '.', 2)
);

-- 3-2. selfEtc HW키(3키) → TERMINAL
UPDATE device_settings
SET
  key = 'terminal.' || split_part(key, '.', 2),
  category = 'TERMINAL',
  "updatedAt" = NOW()
WHERE key IN ('selfEtc.selfJPYN', 'selfEtc.selfCamUse', 'selfEtc.selfICSiren')
AND NOT EXISTS (
  SELECT 1 FROM device_settings ds2
  WHERE ds2.device_id = device_settings.device_id
  AND ds2.key = 'terminal.' || split_part(device_settings.key, '.', 2)
);

-- 3-3. selfEtc.selfBagJPPort → SELF_BAG
UPDATE device_settings
SET
  key = 'selfBag.selfBagJPPort',
  category = 'SELF_BAG',
  "updatedAt" = NOW()
WHERE key = 'selfEtc.selfBagJPPort'
AND NOT EXISTS (
  SELECT 1 FROM device_settings ds2
  WHERE ds2.device_id = device_settings.device_id AND ds2.key = 'selfBag.selfBagJPPort'
);

-- 3-4. selfEtc.selfGif → SELF_UI
UPDATE device_settings
SET
  key = 'selfUI.selfGif',
  category = 'SELF_UI',
  "updatedAt" = NOW()
WHERE key = 'selfEtc.selfGif'
AND NOT EXISTS (
  SELECT 1 FROM device_settings ds2
  WHERE ds2.device_id = device_settings.device_id AND ds2.key = 'selfUI.selfGif'
);

-- 3-5. posPrint 판매동작(44키) → POS_OPERATION
UPDATE device_settings
SET
  key = 'posOp.' || split_part(key, '.', 2),
  category = 'POS_OPERATION',
  "updatedAt" = NOW()
WHERE key IN (
  'posPrint.saleNewProduct', 'posPrint.exchangePassword', 'posPrint.zeroPriceInput',
  'posPrint.discountNoPoint', 'posPrint.weightNoPoint', 'posPrint.saleCancelDisable',
  'posPrint.cashBackUse', 'posPrint.barcodeGroupUse', 'posPrint.returnNoPassword',
  'posPrint.cashForceInput', 'posPrint.costOverSellWarn', 'posPrint.disabledProductChange',
  'posPrint.salePriceCompare', 'posPrint.categoryScaleInput', 'posPrint.shortcutFixedPrice',
  'posPrint.shortcutNameProcess', 'posPrint.bulkPriceFit', 'posPrint.posNoCreditSale',
  'posPrint.discountNoCashback', 'posPrint.cardNoDrawer', 'posPrint.cashOnlyNoReturn',
  'posPrint.cardReturnNoDrawer', 'posPrint.cardCardPayUse', 'posPrint.giftCashReceiptInclude',
  'posPrint.giftPointInclude', 'posPrint.deliveryPointAccrue', 'posPrint.barcodeCardPayScreen',
  'posPrint.cashChangeCardScreen', 'posPrint.deliveryDisable', 'posPrint.deliveryNoPayClose',
  'posPrint.deliveryNoPayReturn', 'posPrint.deliverySaleType', 'posPrint.deliveryNotePrint',
  'posPrint.deliverySeqPrint', 'posPrint.deliveryReceiptManage', 'posPrint.deliveryDriverReceipt',
  'posPrint.deliveryItemArchive', 'posPrint.deliverySeqMemberReceipt',
  'posPrint.holdNoShift', 'posPrint.holdReceiptPrint', 'posPrint.holdReceiptDetail',
  'posPrint.deliveryNoShift', 'posPrint.firstScanHoldMsg', 'posPrint.overdueCustomerWarn'
);

-- 3-6. posSale(11키) → POS_OPERATION
UPDATE device_settings
SET
  key = 'posOp.' || split_part(key, '.', 2),
  category = 'POS_OPERATION',
  "updatedAt" = NOW()
WHERE category = 'POS_SALE';

-- 3-7. posPrint 정산관련(10키) → POS_SETTLE
UPDATE device_settings
SET
  key = 'posSettle.' || split_part(key, '.', 2),
  category = 'POS_SETTLE',
  "updatedAt" = NOW()
WHERE key IN (
  'posPrint.settleCategoryPrint', 'posPrint.settleAmountPrint',
  'posPrint.closeOutstandingPrint', 'posPrint.openShiftFiscalPrint',
  'posPrint.cashbackQrPrint', 'posPrint.scale18Barcode',
  'posPrint.archiveBarcodeNo', 'posPrint.eSignArchiveNo',
  'posPrint.reissueBarcodeNo', 'posPrint.receiptNoOutstanding'
);

-- 3-8. posPrint 인쇄전용(10키) → POS_RECEIPT
UPDATE device_settings
SET
  key = 'posReceipt.' || split_part(key, '.', 2),
  category = 'POS_RECEIPT',
  "updatedAt" = NOW()
WHERE key IN (
  'posPrint.slipNoPrint', 'posPrint.slipNoHide',
  'posPrint.cancelDetailPrint', 'posPrint.cardReceiptDetail',
  'posPrint.checkResponsePrint', 'posPrint.eCouponNoReceipt',
  'posPrint.deliveryArchiveDouble', 'posPrint.deliveryArchiveSimple',
  'posPrint.deliveryArchiveNormal', 'posPrint.visitDeliveryArchive'
);

-- ═══════════════════════════════════════════════════════
-- Phase 4: 이동 완료된 원본 키 삭제
-- ═══════════════════════════════════════════════════════

-- SystemSetting에서 selfUI 19키 삭제 (DeviceSetting으로 이동 완료 후)
DELETE FROM system_settings WHERE key IN (
  'point.selfSoundGuide', 'point.selfCusNum4', 'point.selfNoCustomer',
  'point.selfCusSelect', 'point.selfCusAddUse', 'point.selfCusAddEtc',
  'point.selfCusTopMsg', 'point.selfCusBTMsg1', 'point.selfCusBTMsg2',
  'point.selfTouchSoundYN', 'point.selfMainPage', 'point.selfBTInit',
  'point.selfOneCancel', 'point.selfZHotKey', 'point.selfCountYN',
  'point.selfStartHotKey', 'point.selfPriceUse', 'point.selfPriceType',
  'point.selfReader'
);

-- DeviceSetting에서 이동/분산 완료된 원본 키 삭제
DELETE FROM device_settings WHERE category IN ('SELF_POINT', 'SELF_PRINT');
DELETE FROM device_settings WHERE key LIKE 'selfEtc.%';
DELETE FROM device_settings WHERE key LIKE 'posPrint.%';  -- 4분할 완료 후

-- ═══════════════════════════════════════════════════════
-- Phase 5: 검증 쿼리
-- ═══════════════════════════════════════════════════════

-- 잔여 POS_PRINT 확인 (0이어야 함)
SELECT COUNT(*) AS orphaned_pos_print FROM device_settings WHERE category = 'POS_PRINT';

-- 잔여 SELF_POINT/SELF_PRINT/SELF_ETC 확인 (0이어야 함)
SELECT COUNT(*) AS orphaned_self FROM device_settings
WHERE category IN ('SELF_POINT', 'SELF_PRINT', 'SELF_ETC', 'SELF_AUTO');

-- 신규 카테고리 키 수 확인
SELECT category, COUNT(*) FROM system_settings GROUP BY category ORDER BY category;
SELECT category, COUNT(*) FROM device_settings GROUP BY category ORDER BY category;

-- TO-BE 합계 cross-check (키 손실 없는지 확인)
-- SystemSetting: 162키 (selfApple 삭제 확정)
SELECT COUNT(*) AS system_total FROM system_settings;
-- DeviceSetting: POS 기기수 × 151 + KIOSK 기기수 × 87 + KITCHEN 기기수 × 37
SELECT d.type, COUNT(ds.key) / COUNT(DISTINCT ds.device_id) AS keys_per_device
FROM device_settings ds JOIN devices d ON d.id = ds.device_id
GROUP BY d.type ORDER BY d.type;

COMMIT;
```

### 8.3 프론트엔드 키 참조 검색 및 안전성 분석

> 키를 변경하기 전에 프론트엔드에서 DB 키를 **직접 참조**하는 코드가 있는지 확인 필요.

#### 검색 명령어

```bash
# 1. settingsStore.get() 호출 — 전체 DB 키 직접 참조
grep -rn "settingsStore\.get\(" frontend/src/renderer/src/ --include="*.ts" --include="*.vue"
grep -rn "settings\.get\(" frontend/src/renderer/src/ --include="*.ts" --include="*.vue"

# 2. settingsStore.getDevice() 호출 — 기기별 설정 참조
grep -rn "settingsStore\.getDevice\(" frontend/src/renderer/src/ --include="*.ts" --include="*.vue"
grep -rn "settings\.getDevice\(" frontend/src/renderer/src/ --include="*.ts" --include="*.vue"

# 3. 이동 대상 키 이름 직접 참조 확인
grep -rn "selfSoundGuide\|selfCusNum4\|selfNoCustomer\|selfMainPage" frontend/src/renderer/src/ --include="*.ts" --include="*.vue"
grep -rn "selfAutoPrint\|selfStoPrint\|selfPrintAddress" frontend/src/renderer/src/ --include="*.ts" --include="*.vue"
```

#### 참조 안전성 분석 결과 (14개 파일 확인 완료)

| 파일 | 참조 키 | 마이그레이션 영향 |
|------|---------|----------------|
| `accessibility.ts` | `a11y.*` (15개) | **안전** — 변경 없는 키 |
| `PaymentView.vue` | `sale.taxRate`, `sale.taxIncluded`, `point.pointUseSplitMethod` | **안전** — 이동 대상 아님 |
| `OrderConfirmView.vue` | `sale.tableSelectEnabled`, `point.salePoint` | **안전** — 이동 대상 아님 |
| `PointSelectView.vue` | `point.salePoint` | **안전** — 이동 대상 아님 |
| `PointPayment.vue` | `point.pointUseMinBalance`, `point.pointUseMaxRate` | **안전** — 이동 대상 아님 |
| `ProductsView.vue` | `sale.kitchenCallEnabled` | **안전** — 변경 없는 키 |
| `WelcomeView.vue` | `biz.name` | **안전** — 변경 없는 키 |
| `SettingsView.vue` | `categoryMap[tabId]` 기반 동적 접근 | **categoryMap 변경만 필요** |
| `DevicesView.vue` | `categoryMap[tabId]` 기반 동적 접근 | **categoryMap 변경만 필요** |

> **핵심 결론**: `point.*` prefix의 selfUI 19키를 DeviceSetting으로 이동하더라도, 뷰 컴포넌트에서 직접 참조하는 `point.*` 키(`salePoint`, `pointUseMinBalance` 등)는 **이동 대상이 아니므로 기존 코드 영향 없음**. SettingsView/DevicesView는 `configRefs[tabId].value[keyName]` 형태로 접근하므로 `categoryMap`과 `defaultConfig` 변경만으로 처리됨.

### 8.4 롤백 절차 (마이그레이션 실패 시)

```sql
-- ═══════════════════════════════════════════════════════
-- 롤백: 백업 테이블에서 원본 복원
-- ═══════════════════════════════════════════════════════
BEGIN;

-- 1. 현재 테이블 비우기
TRUNCATE system_settings;
TRUNCATE device_settings;

-- 2. 백업에서 복원
INSERT INTO system_settings SELECT * FROM system_settings_backup;
INSERT INTO device_settings SELECT * FROM device_settings_backup;

COMMIT;

-- 3. 프론트엔드 코드도 이전 버전으로 롤백 (git revert)
-- git revert <migration-commit-hash>
```

> 주의: 마이그레이션 후 새로 생성된 설정 데이터(새 키로 저장된 값)는 롤백 시 유실됨. 마이그레이션 직후 즉시 검증하여 빠른 롤백 판단 필요.

### 8.5 Phase별 검증 체크리스트

#### Phase 1 검증 (프론트엔드 UI 재배치)

- [ ] 모든 설정 탭이 올바르게 렌더링되는가
- [ ] 각 탭의 설정 항목 수가 TO-BE 키 수와 일치하는가
- [ ] 기존 DB 키로 설정 로드/저장이 정상 동작하는가
- [ ] POS/KIOSK/KITCHEN 각 기기 유형 탭 전환이 정상인가

#### Phase 2 검증 (DB 마이그레이션)

- [ ] 백업 테이블 생성 확인: `SELECT COUNT(*) FROM system_settings_backup`
- [ ] 잔여 구 카테고리 0건: `SELECT COUNT(*) FROM device_settings WHERE category IN ('POS_PRINT','SELF_POINT','SELF_PRINT','SELF_ETC','SELF_AUTO','POS_SALE')`
- [ ] 신규 카테고리 키 수: `SELECT category, COUNT(*) FROM system_settings GROUP BY category` → NOTIFICATION=7, PRINT=25, PAYMENT=33(또는 32)
- [ ] selfUI 키 수: `SELECT COUNT(*) FROM device_settings WHERE category = 'SELF_UI'` → KIOSK 기기 수 × 28
- [ ] POS_OPERATION 키 수: `SELECT COUNT(*) FROM device_settings WHERE category = 'POS_OPERATION'` → POS 기기 수 × 55
- [ ] 전체 키 수 불변 검증: AS-IS 합계와 TO-BE 합계 일치 (테이블 간 이동분 고려)

#### Phase 3 검증 (프론트엔드 키 전환)

- [ ] `settingsStore.get()` 호출부 키 갱신 완료 (해당 없으면 skip)
- [ ] 모든 설정 탭에서 저장 → 새로고침 → 값 유지 확인
- [ ] 키오스크 화면 설정이 기기별로 독립 저장되는가
- [ ] seed.ts가 새 키 형식으로 업데이트되었는가

---

## 9. 구현 영향 분석

### DB 변경

| 변경 | 상세 |
|------|------|
| SystemSetting 신규 카테고리 | `NOTIFICATION` 추가 |
| SystemSetting → DeviceSetting 이동 | selfUI 19키 (POINT → SELF_UI) |
| DeviceSetting → SystemSetting 이동 | selfPoint(11) + selfPrint(4) + selfEtc(3) + posPrint(12) = 30키 |
| DeviceSetting 카테고리 변경 | SELF_POINT → 삭제, SELF_PRINT → 삭제, SELF_ETC → 삭제, SELF_AUTO → SELF_UI 통합 |
| DeviceSetting 신규 카테고리 | `SELF_UI`, `POS_OPERATION` 추가 |
| POS_PRINT 분해 | 76키 → POS_OPERATION(44) + POS_SETTLE(10) + POS_RECEIPT(10) + 공통 PRINT(12) |
| POS_SALE 통합 | POS_SALE(11) → POS_OPERATION 흡수 |

### 백엔드 변경

- `settings.ts` 라우트: `NOTIFICATION` 카테고리 허용 추가
- `device.ts` 라우트: `SELF_UI`, `POS_OPERATION` 카테고리 허용 추가
- 카테고리 validation: 신규 추가 (`NOTIFICATION`, `SELF_UI`, `POS_OPERATION`) + 구 카테고리 제거 (`SELF_POINT`, `SELF_PRINT`, `SELF_ETC`, `SELF_AUTO`, `POS_PRINT`, `POS_SALE`)
- API 프로토콜 호환: `/api/v1/settings/:category`와 `/api/v1/devices/:id/settings/:category`는 key-value PUT/GET 방식이므로 API 인터페이스 자체는 변경 없음. **변경되는 것은 DB에 저장된 key 값(prefix.keyName)**
- `seed.ts`: 초기 설정 데이터를 새 prefix/category 체계로 업데이트

### 프론트엔드 변경

| 파일 | 변경 내용 |
|------|----------|
| `settingsData.ts` | 탭 추가 (알림/통신), `defaultPointConfig`에서 selfUI 19키 제거, `defaultPrintConfig`에 16키 추가, `defaultNotificationConfig` 신규, prefix/categoryMap 업데이트 |
| `deviceSettingsData.ts` | 탭 제거 (selfPoint, selfPrint, selfEtc, selfAuto), `defaultSelfUIConfig` 신규(28키), `defaultPosOperationConfig` 신규(55키), posPrint/posSale 삭제, prefix/categoryMap 업데이트 |
| `SettingsView.vue` | 8탭 UI, 알림/통신 섹션 추가, 영수증/출력 확대 |
| `DevicesView.vue` | KIOSK 5탭, POS 5탭 UI 변경 |

### 리스크

| 리스크 | 수준 | 대응 |
|--------|------|------|
| selfUI 테이블 이동 (SystemSetting→DeviceSetting) | **높음** | 모든 KIOSK 기기에 동일 값 복사 후 검증 |
| DB 키 변경으로 인한 참조 누락 | **높음** | grep으로 전체 코드베이스 키 참조 검색 후 갱신 |
| posPrint 76키 분류 오류 | 중간 | 분류 후 합계 검증 (12+44+10+10 = 76) |
| ~~selfApple vs applePayEnabled 중복~~ | ✅ 해결 | selfApple 삭제, applePayEnabled 사용 |
| 기존 seed 데이터 불일치 | 중간 | seed.ts도 함께 업데이트 |
| 마이그레이션 중 서비스 중단 | 낮음 | 트랜잭션 + 백업 테이블로 안전 실행 |

---

## 10. 구현 순서 제안

### Phase 1: 데이터 설계 + 프론트엔드 (DB 마이그레이션 전)

> 프론트엔드만 먼저 변경. 이 단계에서는 **기존 DB 키를 그대로 사용**하되 UI 재배치만 수행.

1. `settingsData.ts` 재구성 — selfUI 분리, 알림/통신 탭 추가, 영수증/출력 확대
2. `deviceSettingsData.ts` 재구성 — 탭 변경, posPrint 분해, SELF_UI 신규
3. SettingsView.vue / DevicesView.vue UI 변경
4. **검증**: 화면에서 모든 설정이 올바른 탭에 표시되는지 확인

> ⚠️ Phase 1에서는 DB 키를 바꾸지 않으므로, 프론트엔드가 **기존 prefix를 유지**해야 함. 이를 위해 `categoryMap`에 임시로 기존 prefix를 매핑하거나, `keyPrefixOverrides` 맵을 사용.

### Phase 2: DB 마이그레이션

5. Prisma migration 작성 (Section 8.2 SQL 기반)
6. 데이터 마이그레이션 실행 (백업 → 이동 → 검증 → 원본 삭제)
7. 백엔드 카테고리 추가 (NOTIFICATION, SELF_UI, POS_OPERATION)
8. seed.ts 업데이트 (신규 카테고리 + 새 prefix 키)
9. **검증**: 기존 데이터 정상 조회 확인, 키 누락 여부 합계 체크

### Phase 3: 프론트엔드 키 전환 + 정리

10. 프론트엔드 `categoryMap` prefix를 최종 값으로 변경 (Phase 1의 임시 매핑 제거)
11. `settingsStore.get()` 호출부 키 이름 갱신 (grep 검색 기반)
12. `.doc/settings-asis-mapping.md` 업데이트
13. 구 카테고리 제거 (SELF_POINT, SELF_PRINT, SELF_ETC, SELF_AUTO, POS_PRINT, POS_SALE)
14. 백업 테이블 삭제 확인

---

## 11. 미결 사항 — ✅ 결정 완료 (2026-03-11)

| # | 항목 | 결정 | 근거 |
|---|------|------|------|
| 1 | selfApple vs applePayEnabled 중복 여부 | ✅ **동일 옵션 → selfApple 삭제**, applePayEnabled 사용 | VB6 원본 비교 결과 동일 목적. 결제 정책 **32키** (33→32), 합계 **162키** |
| 2 | 알림/통신 탭(7키) | ✅ **독립 탭** (notification) | 향후 확장 가능성. 7키라도 별도 관리가 명확 |
| 3 | posPrint 76키 분류 정확성 | ✅ **현재 분류 기반 진행** | 12(공통)+44(posOp)+10(posSettle)+10(posReceipt)=76 검증 완료 |
| 4 | selfUI의 공통↔기기별 관계 | ✅ **기기별 옵션 우선** (DeviceSetting) | 기기마다 다른 UI 설정 허용. 초기값은 공통에서 복사 |
| 5 | Phase 1,2 동시 진행 여부 | ✅ **동시 진행** (Sprint 2+3 통합) | 임시 매핑 불필요. 최종 prefix 직접 사용 |
