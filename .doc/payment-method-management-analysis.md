# 결제 수단 관리 및 결제 처리 분석

> 작성일: 2026-03-06 | 전문가 패널 리뷰: 2026-03-06 | 코드베이스 심층 분석: 2026-03-06
> 대상: PaymentView, SettingsView(결제 정책), PaymentService, OrderService

---

## Part 1. 결제 수단 사용여부 관리 (공통설정 -> 결제 정책)

### 현재 상태

| 항목 | 현황 |
|------|------|
| **SettingsView** | `payment` 탭에 카드 정책, 토글 15개, 수수료 설정 존재 |
| **settingsData.ts** | `defaultPaymentConfig`에 결제 수단 on/off 키 **없음** |
| **PaymentView** | `paymentMethods` 배열 10개 하드코딩, 설정 연동 없음 |
| **DB** | `SystemSetting` 테이블 (key-value), PAYMENT 카테고리 |

### 추가할 설정 키 (10개 결제 수단)

| 설정 키 | 설명 | 기본값 |
|---------|------|--------|
| `payment.cardEnabled` | 카드 결제 | `"1"` |
| `payment.mobileEnabled` | 간편 결제 (삼성페이, 카카오페이) | `"1"` |
| `payment.cashEnabled` | 현금 결제 | `"1"` |
| `payment.scannerEnabled` | 바코드/QR | `"1"` |
| `payment.applePayEnabled` | 애플페이 | `"0"` |
| `payment.foreignCardEnabled` | 지역/해외 카드 | `"0"` |
| `payment.paycoEnabled` | 페이코 | `"0"` |
| `payment.wechatPayEnabled` | 위쳇페이 | `"0"` |
| `payment.alipayEnabled` | 알리페이 | `"0"` |
| `payment.storePointEnabled` | 매장 포인트 | `"0"` |

### [수정] 설정 키 네이밍 - 기존 키와의 일관성

> **현재 `defaultPaymentConfig`의 키 포맷은 접두사 없이 `minCardPrice`, `offCardCheck` 등으로 되어 있다.**
> 그러나 `SettingService.saveByCategory(category, entries)`는 키를 그대로 DB에 저장하고,
> `SettingService.findAll()`은 전체 설정을 플랫 맵으로 반환한다.
>
> **결정 필요**: 두 가지 방식 중 선택해야 한다.

| 방식 | 장점 | 단점 |
|------|------|------|
| **A. 접두사 있음** (`payment.cardEnabled`) | 키만으로 카테고리 식별 가능, `findAll()` 시 충돌 없음 | 기존 키(`minCardPrice`)와 스타일 불일치 |
| **B. 접두사 없음** (`cardEnabled`) | 기존 키 스타일과 일관 | `findAll()` 시 다른 카테고리 키와 이름 충돌 위험 |

> **권장: 방식 A (접두사 사용)** - `settingsStore.get("payment.cardEnabled")`로 호출.
> 단, 기존 PAYMENT 카테고리 키(`minCardPrice` 등)도 향후 `payment.minCardPrice`로
> 마이그레이션 검토 필요. 현재 혼용은 동작에 문제없으나 명명 규칙 불일치가 발생한다.

### 개선점: 설정 키와 PaymentView 매핑

> 현재 `PaymentView.vue`의 `paymentMethods` 배열과 설정 키 사이에 명시적 매핑이 없다.
> 각 `PaymentMethodDef`에 `settingKey` 필드를 추가하여 설정과 1:1 매핑하는 것을 권장한다.

```typescript
// 개선안: PaymentMethodDef 확장
interface PaymentMethodDef {
  key: PaymentMethod;
  label: string;
  desc: string;
  icon: string;
  settingKey: string;      // "payment.cardEnabled" 등
  stepType: PaymentStep;   // "card" | "cash" | "qr-pay" | "point-pay"
  backendType: PaymentType; // "CARD" | "CASH" | "SIMPLE_PAY" | "POINT"
}

// 사용 예시
const paymentMethods: PaymentMethodDef[] = [
  {
    key: "card",
    label: "payment.card",
    desc: "payment.cardDesc",
    icon: "...",
    settingKey: "payment.cardEnabled",
    stepType: "card",
    backendType: "CARD",
  },
  // ...
];

// 필터링
const enabledMethods = computed(() =>
  paymentMethods.filter(m => settingsStore.get(m.settingKey, "0") === "1")
);

// proceedPayment에서
currentStep.value = selectedMethodDef.stepType;
```

### 변경 대상 파일 (3개)

| 파일 | 변경 내용 |
|------|----------|
| `frontend/.../admin/settingsData.ts` | `defaultPaymentConfig`에 키 추가 + `paymentToggles`에 항목 추가 |
| `frontend/.../views/PaymentView.vue` | `settingsStore`에서 enabled 상태 읽어 필터링 |
| DB (자동) | API `PUT /settings/PAYMENT` 시 자동 생성 |

### 구현 흐름

```
관리자 SettingsView -> PUT /api/v1/settings/PAYMENT
                         |
                    SystemSetting 테이블 저장
                         |
키오스크 PaymentView -> settingsStore.get("payment.cardEnabled") === "1"
                         |
                    paymentMethods.filter(m => enabled)
```

---

## Part 2. 결제 처리 분석 (신규 6개 수단)

### 현재 결제 아키텍처

> **[주의] 결제 API 이중 경로 문제**
> 현재 결제 처리에 2개의 API 경로가 존재하며, 실제로 사용되는 것은 하나뿐이다.

| API | 사용 여부 | 설명 |
|-----|:--------:|------|
| `PATCH /api/v1/orders/:id/status` | **실제 사용** | 주문 상태 PAID 변경 + Payment 레코드 자동 생성 + 재고 차감 |
| `POST /api/v1/payments` | **미사용** | PaymentService Strategy 호출 (VAN Failover) |

> **문제**: `POST /payments`의 PaymentService(Strategy Pattern, CircuitBreaker, IdempotencyService)가
> 구현되어 있으나 프론트엔드에서 호출하지 않는다. `PATCH /orders/:id/status`의 `order.service.ts`에서
> 직접 `prisma.payment.create()`로 Payment 레코드를 생성한다.
>
> **결정 필요**: 신규 결제 수단 추가 시 두 경로를 통합할지, 현재 방식을 유지할지 결정해야 한다.
> - **방안 1**: `PATCH /orders/:id/status`에서 내부적으로 `PaymentService.processPayment()` 호출
> - **방안 2**: 프론트에서 `POST /payments` 호출 후 `PATCH /orders/:id/status` 호출 (2단계)
> - **방안 3**: 현재 방식 유지, 단 PG/포인트 결제만 `POST /payments` 활용

```
[실제 사용 흐름]
PaymentView (Frontend)
  | currentStep: "card" | "cash"
  | CardPayment / CashPayment 컴포넌트
  |
  +-- 카드 성공 -> PATCH /api/v1/orders/:id/status { status: "PAID", paymentType: "CARD" }
  |                   -> order.service.updateStatus()
  |                       -> prisma.payment.create() (Payment 레코드)
  |                       -> deductStockForOrder()   (재고 차감)
  |
  +-- 현금 성공 -> PATCH /api/v1/orders/:id/status { status: "PAID", paymentType: "CASH", receivedAmount }
                    -> 동일 흐름

[미사용 흐름]
POST /api/v1/payments -> PaymentService -> VAN Strategy (Failover, CircuitBreaker)
                                        -> prisma.payment.create()
```

### [주의] CardPayment.vue - 현재 시뮬레이션 상태

> **현재 `CardPayment.vue`는 실제 VAN 연동이 아닌 시뮬레이션으로 동작한다.**
> - `processPayment()`에서 3초 대기 후 90% 확률로 성공 처리
> - Electron IPC API(`window.api.terminal.requestPayment`)는 preload에 정의되어 있으나 Main Process 핸들러 미구현
> - 실제 VAN 연동 시 CardPayment 내부를 IPC 호출로 교체 필요
>
> 신규 결제 수단 추가 전에 이 시뮬레이션 상태를 인지해야 한다.

### 현재 Backend Strategy 구조

```
backend/src/services/payment/
  payment-strategy.interface.ts   # IPaymentStrategy 인터페이스
  payment.service.ts              # PaymentService (VAN Failover 관리)
  strategies/
    base-payment.strategy.ts      # BasePaymentStrategy (Circuit Breaker, Retry)
    nice-payment.strategy.ts      # NICE VAN
    kicc-payment.strategy.ts      # KICC VAN
    kis-payment.strategy.ts       # KIS VAN
    smartro-payment.strategy.ts   # SMARTRO VAN
```

### 신규 결제 수단별 처리 분류

| 결제 수단 | 처리 분류 | paymentType | paymentMethod | 처리 방식 |
|-----------|----------|-------------|---------------|----------|
| 애플페이 | VAN 카드형 | `CARD` | `APPLE_PAY` | 기존 VAN 전략으로 처리 (NFC 터치) |
| 지역/해외 카드 | VAN 카드형 | `CARD` | `FOREIGN_CARD` | 기존 VAN 전략으로 처리 (IC/MSR) |
| 페이코 | PG 간편결제 | 신규 `SIMPLE_PAY` | `PAYCO` | PG API 연동 필요 (QR/바코드) |
| 위쳇페이 | PG 해외결제 | 신규 `SIMPLE_PAY` | `WECHAT_PAY` | PG API 연동 필요 (QR 스캔) |
| 알리페이 | PG 해외결제 | 신규 `SIMPLE_PAY` | `ALIPAY` | PG API 연동 필요 (QR 스캔) |
| 매장 포인트 | 내부 처리 | 신규 `POINT` | `STORE_POINT` | Member.points 차감 (DB 트랜잭션) |

### [추가] Payment DB 모델 확장 - paymentMethod 필드 필요

> **현재 문제**: `Payment` 모델에는 `paymentType`(CARD/CASH/MIXED)만 존재한다.
> 애플페이, 해외카드, 페이코 등을 구분할 수 없어 **매출 통계, 수수료 정산, 관리자 리포트**에서
> 결제 수단별 분석이 불가능하다.

```prisma
// schema.prisma - Payment 모델에 paymentMethod 필드 추가
model Payment {
  // ... 기존 필드
  paymentMethod  String?       @map("payment_method") @db.VarChar(30) // APPLE_PAY, FOREIGN_CARD, PAYCO, WECHAT_PAY, ALIPAY, STORE_POINT
}
```

> DB enum 대신 String을 사용하면 신규 수단 추가 시 마이그레이션 없이 확장 가능.
> 기존 결제 데이터의 `paymentMethod`는 null (하위 호환).

### Backend 타입 확장

```typescript
// 현재 (types/payment.ts)
export type PaymentType = "CARD" | "CASH" | "MIXED";

// 확장 후
export type PaymentType = "CARD" | "CASH" | "SIMPLE_PAY" | "POINT" | "MIXED";

// [추가] 결제 수단 상세 구분
export type PaymentMethodCode =
  | "CARD"          // 일반 카드
  | "MOBILE_PAY"    // 삼성페이/카카오페이
  | "APPLE_PAY"     // 애플페이
  | "FOREIGN_CARD"  // 해외카드
  | "PAYCO"         // 페이코
  | "WECHAT_PAY"    // 위쳇페이
  | "ALIPAY"        // 알리페이
  | "STORE_POINT"   // 매장 포인트
  | "CASH"          // 현금
  | "SCANNER";      // 바코드/QR
```

### DB 스키마 변경 - 4곳 동기화 필수

> `PaymentType`은 아래 **4곳**에 정의/사용되어 있으며 반드시 동시에 변경해야 한다.

| 위치 | 파일 | 현재 값 | 비고 |
|------|------|---------|------|
| Prisma enum | `prisma/schema.prisma:202` | `CARD, CASH, MIXED` | DB 레벨 제약 |
| TS 타입 | `backend/src/types/payment.ts:26` | `"CARD" \| "CASH" \| "MIXED"` | 코드 레벨 타입 |
| Zod 스키마 | `backend/src/routes/payments.ts:16` | `z.enum(["CARD", "CASH"])` | API 입력 검증 (미사용 경로) |
| orders 라우트 | `backend/src/routes/orders.ts:31-35` | `z.string().optional()` | **실제 사용 경로 - 검증 없음** |

> **[주의] orders 라우트의 paymentType 검증 부재**
> `PATCH /orders/:id/status`의 Zod 스키마에서 `paymentType: z.string().optional()`로 정의되어 있어
> 어떤 문자열이든 통과한다. `order.service.ts`에서 `paymentType as PaymentType`으로 캐스팅만 하고
> 유효성 검증을 하지 않으므로 잘못된 값이 DB에 저장될 수 있다.
>
> **개선 필수**: `z.enum(["CARD", "CASH", "SIMPLE_PAY", "POINT"]).optional()` 등으로 강화해야 한다.

```prisma
// 확장 후 schema.prisma
enum PaymentType {
  CARD
  CASH
  SIMPLE_PAY
  POINT
  MIXED
}
```

```typescript
// 확장 후 payments.ts Zod (MIXED는 복합결제 시 orders 라우트에서만 사용)
paymentType: z.enum(["CARD", "CASH", "SIMPLE_PAY", "POINT", "MIXED"]),
paymentMethod: z.string().optional(), // 결제 수단 상세
```

> 변경 시 `npx prisma migrate dev` 필수. 기존 데이터에는 영향 없음 (enum 값 추가만).

### [수정] PaymentStatus 타입 불일치

> **현재 불일치 발견**:
> - `types/payment.ts`의 `PaymentStatus`: `PENDING | AUTHORIZED | CAPTURED | CANCELLED | REFUNDED | PARTIAL_REF | FAILED` (7개)
> - `prisma/schema.prisma`의 `PaymentStatus` enum: `PENDING | APPROVED | CANCELLED | REFUNDED | FAILED` (5개)
>
> `AUTHORIZED`, `CAPTURED`, `PARTIAL_REF`는 Prisma enum에 없어 DB 저장 시 에러 발생 가능.
> `APPROVED`는 TS 타입에 없어 DB 조회 후 타입 캐스팅 시 문제 발생 가능.
> **결제 수단 확장 전에 이 불일치를 먼저 해결해야 한다.**

### PaymentService 확장

```
processPayment()
  +-- CARD        -> processCardPayment()       (기존)
  +-- CASH        -> processCashPayment()       (기존)
  +-- SIMPLE_PAY  -> processSimplePayPayment()  (신규 - PG 연동)
  +-- POINT       -> processPointPayment()      (신규 - DB 트랜잭션)
```

### 신규 Strategy 필요 여부

| 수단 | Strategy 필요 | 이유 |
|------|:---:|------|
| 애플페이 | X | 기존 VAN Strategy 사용 (카드 단말 NFC) |
| 지역/해외 카드 | X | 기존 VAN Strategy 사용 |
| 페이코 | O | `PaycoPaymentStrategy` - PAYCO PG API |
| 위쳇페이 | O | `WechatPaymentStrategy` - 위쳇 PG API |
| 알리페이 | O | `AlipayPaymentStrategy` - 알리 PG API |
| 매장 포인트 | O | `PointPaymentStrategy` - Member.points 차감 |

### Frontend 컴포넌트 확장

| 현재 Step | 사용 수단 | 컴포넌트 |
|-----------|----------|---------|
| `card` | 카드, 간편결제, 애플페이, 지역/해외 카드 | `CardPayment.vue` (기존) |
| `cash` | 현금 | `CashPayment.vue` (기존) |
| `qr-pay` (신규) | 페이코, 위쳇페이, 알리페이 | `QrPayment.vue` (신규 필요) |
| `point-pay` (신규) | 매장 포인트 | `PointPayment.vue` (신규 필요) |

### [수정] PaymentView handleCardSuccess - 결제 수단 + 승인정보 전달 누락

> **현재 문제 (2건)**:
>
> **1. paymentType 하드코딩**: `handleCardSuccess()`에서 항상 `paymentType: "CARD"`만 전달.
> 애플페이, 해외카드 등으로 결제해도 모두 "CARD"로 저장되어 수단별 매출 통계 불가.
>
> **2. 카드 승인정보 미전달**: `handleCardSuccess(transactionId, approvalNumber)`로 승인정보를 받지만
> `PATCH /orders/:id/status`에는 `status`와 `paymentType`만 보냄.
> `order.service.ts`에서 Payment 레코드 생성 시 `vanCode`, `approvalNumber`, `transactionId` 모두 null로 저장.
> **결제 취소/환불 시 원거래 정보를 찾을 수 없는 심각한 문제.**

```typescript
// 현재 (PaymentView.vue:164)
await apiClient.patch(`/api/v1/orders/${currentOrder.value.id}/status`, {
  status: "PAID",
  paymentType: "CARD",  // 항상 CARD - 수단 구분 불가
  // approvalNumber, transactionId 미전달!
});

// 개선 후
await apiClient.patch(`/api/v1/orders/${currentOrder.value.id}/status`, {
  status: "PAID",
  paymentType: selectedMethodDef.backendType,   // "CARD" | "SIMPLE_PAY" | "POINT"
  paymentMethod: selectedMethod.value,           // "applePay" | "wechatPay" 등
  approvalNumber,                                // 승인번호
  transactionId,                                 // 거래 ID
});
```

> `order.service.ts`의 `updateStatus()`도 이 추가 필드를 받아 Payment 레코드에 저장하도록 수정 필요.

### PaymentStep 타입 확장

```typescript
// 현재
type PaymentStep = "select" | "card" | "cash" | "processing";

// 확장 후
type PaymentStep = "select" | "card" | "cash" | "qr-pay" | "point-pay" | "processing";
```

---

## Part 3. 보안 고려사항

### 핵심 보안 위협

| 영역 | 위험 | 대응 |
|------|------|------|
| 포인트 결제 | 동시 차감 Race Condition | `prisma.$transaction` + 비관적 잠금 (행 레벨) |
| PG 결제 | 위변조 | 서버 사이드 금액 검증, Webhook 검증 |
| 해외 결제 | 환율 변동 | 결제 시점 환율 고정, 서버 사이드 계산 |
| 설정 변조 | 클라이언트에서 비활성 수단 호출 | 백엔드에서도 설정 확인 필수 |
| 멱등성 | 중복 결제 | 기존 `IdempotencyService` 활용 |
| PG 키 관리 | API 키 노출 | 환경변수 관리, 서버 사이드에서만 사용 |

### 추가 보안/운영 주의사항

| 영역 | 위험 | 대응 |
|------|------|------|
| 포인트 잔액 부족 | 결제 금액 > 보유 포인트 | 프론트에서 사전 잔액 체크 + 백엔드 이중 검증 |
| 포인트 마이너스 | DB 음수 방지 | `Member.points` 컬럼에 `CHECK (points >= 0)` 제약 또는 코드 레벨 검증 |
| QR 결제 타임아웃 | QR 생성 후 미결제 | 3분 TTL + 폴링/Webhook으로 상태 확인 + 타임아웃 시 자동 취소 |
| PG Webhook 인증 | 위조된 Webhook 호출 | 서명 검증 (HMAC-SHA256), IP 화이트리스트 |
| 오프라인 모드 | 네트워크 단절 시 결제 가능 수단 | 현금만 허용 (기존), 포인트는 오프라인 불가 명시 |
| Payment DB 정합성 | 신규 paymentType으로 저장 시 기존 통계 쿼리 호환 | 통계/리포트 쿼리에서 `SIMPLE_PAY`, `POINT` 타입 처리 추가 |
| 설정 캐시 | 관리자가 수단 비활성화 후 키오스크에 미반영 | `settingsStore` 주기적 갱신 또는 WebSocket 실시간 동기화 |
| 복합 결제 | 포인트 일부 + 카드 잔액 결제 | 현재 MIXED 타입 존재하나 미구현. **Part 9에서 분할 결제 설계 완료** |

### 백엔드 결제 수단 검증 미들웨어

> 현재 백엔드 `POST /api/v1/payments`에서는 `paymentType`만 검증하고,
> 해당 결제 수단이 매장 설정에서 활성화되어 있는지 확인하지 않는다.
> 프론트엔드에서 필터링하더라도, API 직접 호출로 우회 가능하므로
> 백엔드에서도 `SystemSetting` 조회 후 비활성 수단이면 거부해야 한다.

```typescript
// payments.ts에서 결제 처리 전 검증
const PAYMENT_TYPE_TO_SETTING: Record<string, string> = {
  CARD: "payment.cardEnabled",
  CASH: "payment.cashEnabled",
  SIMPLE_PAY: "payment.paycoEnabled",  // paymentMethod로 세분화 필요
  POINT: "payment.storePointEnabled",
};

const settingKey = PAYMENT_TYPE_TO_SETTING[request.paymentType];
if (settingKey) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
  if (setting?.value !== "1") {
    return res.status(403).json({
      success: false,
      error: { code: "PAYMENT_METHOD_DISABLED", message: "비활성화된 결제 수단입니다" }
    });
  }
}
```

> **주의**: `SIMPLE_PAY`는 페이코/위쳇/알리 3개 수단을 포함하므로
> `paymentMethod` 필드를 활용해 수단별 개별 검증이 필요하다.

```typescript
// SIMPLE_PAY의 경우 paymentMethod로 세분화 검증
if (request.paymentType === "SIMPLE_PAY" && request.paymentMethod) {
  const methodSettingMap: Record<string, string> = {
    PAYCO: "payment.paycoEnabled",
    WECHAT_PAY: "payment.wechatPayEnabled",
    ALIPAY: "payment.alipayEnabled",
  };
  const methodKey = methodSettingMap[request.paymentMethod];
  // ... 개별 검증
}
```

### [추가] PG 간편결제 CircuitBreaker 필요

> 현재 CircuitBreaker는 VAN Strategy에만 적용되어 있다 (`base-payment.strategy.ts`).
> PG 간편결제(페이코/위쳇/알리) Strategy에도 동일한 CircuitBreaker 패턴 적용 필요.
> PG API 장애 시 무한 대기 방지 + 자동 차단/복구.

### [추가] 포인트 결제 롤백 전략

> 포인트 차감 후 주문 상태 변경 실패 시 포인트 복원 필요.
> `prisma.$transaction`으로 포인트 차감과 주문 상태 변경을 원자적으로 처리해야 한다.

```typescript
// PointPaymentStrategy 롤백 패턴
await prisma.$transaction(async (tx) => {
  // 1. 포인트 잔액 확인 + 차감 (비관적 잠금)
  // Prisma findUnique은 SELECT FOR UPDATE를 지원하지 않으므로 $queryRaw 사용
  const [member] = await tx.$queryRaw<{ id: number; points: number }[]>`
    SELECT id, points FROM members WHERE id = ${memberId} FOR UPDATE
  `;
  if (!member || member.points < amount) throw new Error("INSUFFICIENT_POINTS");

  await tx.member.update({
    where: { id: memberId },
    data: { points: { decrement: amount } },
  });

  // 2. Payment 레코드 생성
  await tx.payment.create({ data: { ... } });

  // 3. 주문 상태 PAID로 변경
  await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
});
// -> 하나라도 실패하면 전체 롤백
```

---

## Part 4. VB6 레거시 결제 수단 매핑 (ASIS -> TOBE)

### VB6에서 지원했던 결제 수단

| VB6 결제 수단 | INI 설정 키 | TOBE 매핑 | 비고 |
|--------------|-----------|----------|------|
| 카드 (12개 VAN) | `[Card] VAN_Select` | card | 12개 VAN -> 4개 Strategy로 축소 |
| 현금 입출금기 | 항상 활성 | cash | RS-232 시리얼 -> Electron IPC |
| 카카오페이 | `[Self] self_Kakao` | mobile | QR 코드 기반 |
| 제로페이 | `[Self] Self_Zero` | scanner | QR 코드 기반 |
| 앱카드 | `[Self] self_AppCard` | mobile | 앱 연동 |
| 애플페이 | `[Self] self_Apple` | applePay | NFC 터치 |
| 포인트 결제 | `self_NoAutoPoint` | storePoint | 회원 포인트 차감 |
| T-money | SMARTRO VAN 전용 | - | 미마이그레이션 (교통카드) |
| CashBee | SMARTRO VAN 전용 | - | 미마이그레이션 (선불카드) |

> **VB6 미지원**: WeChat Pay, Alipay, PAYCO, 해외카드 (모두 신규 추가)

### VB6 설정 키 -> TOBE 설정 키 대응

| VB6 (pos_config.ini) | TOBE (SystemSetting) | 비고 |
|---------------------|---------------------|------|
| `[Self] self_Kakao=0\|1` | `payment.mobileEnabled` | 카카오페이 -> 간편결제 통합 |
| `[Self] Self_Zero=0\|1` | `payment.scannerEnabled` | 제로페이 -> 바코드/QR 통합 |
| `[Self] self_AppCard=0\|1` | `payment.mobileEnabled` | 앱카드 -> 간편결제 통합 |
| `[Self] self_Apple=0\|1` | `payment.applePayEnabled` | 1:1 매핑 |
| `[Self] self_NoAutoPoint=0\|1` | `payment.storePointEnabled` | 의미 반전 (NoAuto=1 -> Enabled=0) |
| `[Card] VAN_Select=N` | DeviceSetting `van.vanSelect` | 기기별 설정으로 이동 |
| `[Other] OFF_CARD_Chk=0\|1` | `payment.offCardCheck` | 기존 키 존재 |

> 이 매핑을 통해 VB6 설정 마이그레이션 스크립트 작성 시 참조할 수 있다.

---

## Part 5. 구현 우선순위

| 순서 | 작업 | 난이도 | 변경 범위 | 비고 |
|:----:|------|:------:|----------|------|
| **0a** | **PaymentStatus 타입 불일치 수정** | 낮음 | types/payment.ts + schema.prisma | **선행 작업 필수** |
| **0b** | **결제 API 경로 통합 결정** | 설계 | orders.ts + payments.ts | 이중 경로 해소 방안 확정 |
| 1 | 설정 관리 (on/off 토글) | 낮음 | settingsData + PaymentView | 즉시 구현 가능 |
| 2 | Payment 모델에 paymentMethod 필드 추가 | 낮음 | schema.prisma + order.service.ts + PaymentView | DB 마이그레이션 |
| 3 | handleCardSuccess에서 paymentType/Method 동적 전달 | 낮음 | PaymentView | backendType + selectedMethod 참조 |
| 4 | 애플페이/해외카드 연동 | 낮음 | PaymentView 분기만 추가 | 기존 VAN 플로우 재사용 |
| 5 | 매장 포인트 결제 | 중간 | PointPayment 컴포넌트 + Strategy + DB | Member.points 연동 |
| 6 | PG 간편결제 (페이코/위쳇/알리) | 높음 | QrPayment 컴포넌트 + PG Strategy | PG사 계약 + API 연동 |
| 7 | CardPayment 실제 VAN 연동 | 높음 | CardPayment + Electron Main + IPC | 시뮬레이션 -> 실제 VAN |

> **참고**: 포인트 적립 시스템(Part 8: P-1~P-8)과 분할 결제(Part 9: S-1~S-7)의
> 세부 우선순위는 각 Part에 별도 정의. 전체 기준으로 Part 5의 순서 5(매장 포인트)에
> Part 8/9 태스크가 포함된다.

---

## Part 6. 전문가 패널 리뷰 요약

### Karl Wiegers (요구사항 품질)

| 심각도 | 이슈 | 권장 조치 |
|:------:|------|----------|
| CRITICAL | 설정 키 네이밍 규칙 미확정 (접두사 유/무) | 방식 A(접두사) 채택 후 기존 키 마이그레이션 계획 수립 |
| MAJOR | `PaymentMethodDef` 인터페이스 정의가 3곳에서 각각 다른 필드 제안 | 단일 최종 인터페이스로 통합 (settingKey + stepType + backendType) |
| MINOR | 구현 우선순위에 선행 조건(PaymentStatus 불일치) 누락 | 우선순위 0번으로 추가 |

### Martin Fowler (아키텍처 설계)

| 심각도 | 이슈 | 권장 조치 |
|:------:|------|----------|
| CRITICAL | Payment DB 모델에 결제 수단 구분 필드 없음 | `paymentMethod` String 필드 추가 |
| MAJOR | `handleCardSuccess`가 paymentType 하드코딩 | `selectedMethodDef`에서 backendType/paymentMethod 동적 참조 |
| MAJOR | `SIMPLE_PAY`가 3개 PG를 하나로 묶어 개별 CircuitBreaker 불가 | PG별 Strategy에 개별 CircuitBreaker 적용 |

### Michael Nygard (운영 안정성)

| 심각도 | 이슈 | 권장 조치 |
|:------:|------|----------|
| CRITICAL | PaymentStatus TS/Prisma 불일치 (7개 vs 5개) | 즉시 동기화 |
| MAJOR | PG Strategy에 CircuitBreaker 미적용 계획 | base-payment.strategy 패턴 재사용 |
| MAJOR | 포인트 차감 후 주문 상태 변경 실패 시 롤백 전략 부재 | `$transaction` 원자적 처리 |
| MINOR | PG Webhook 수신 엔드포인트 및 서명 검증 구현 세부사항 부재 | Webhook 라우트 설계 추가 |

### Lisa Crispin (테스트 전략)

| 심각도 | 이슈 | 권장 조치 |
|:------:|------|----------|
| MAJOR | 테스트 시나리오 및 엣지 케이스 정의 없음 | Part 6 테스트 매트릭스 참조 |
| MINOR | 오프라인->온라인 전환 시 설정 동기화 테스트 필요 | 네트워크 상태 변경 시나리오 추가 |

---

## Part 7. 테스트 매트릭스

### 설정 관리 테스트

| 시나리오 | 예상 결과 |
|---------|----------|
| 관리자가 카드 결제 비활성화 | PaymentView에서 카드 버튼 미노출 |
| 전체 수단 비활성화 | 결제 불가 안내 메시지 표시 |
| 설정 변경 후 키오스크 새로고침 없이 반영 | settingsStore 갱신 주기에 따라 반영 |
| API 직접 호출로 비활성 수단 결제 시도 | 403 PAYMENT_METHOD_DISABLED 응답 |

### 결제 처리 테스트

| 시나리오 | 예상 결과 |
|---------|----------|
| 포인트 잔액 정확히 일치하는 금액 결제 | 정상 처리, 잔액 0 |
| 포인트 잔액 부족 | 프론트 사전 차단 + 백엔드 400 에러 |
| 동시에 2대 키오스크에서 같은 회원 포인트 결제 | 1건 성공, 1건 잔액 부족 |
| QR 생성 후 3분 타임아웃 | 자동 취소 + 사용자 안내 |
| PG API 장애 시 CircuitBreaker 동작 | 5회 연속 실패 후 차단, 30초 후 half-open |
| 결제 중 네트워크 단절 | 카드: 실패 안내, 현금: 정상 처리 |

---

## 관련 파일 목록

### Frontend
- `frontend/src/renderer/src/views/PaymentView.vue` - 결제 화면 (수단 선택 + 결제 진행)
- `frontend/src/renderer/src/views/admin/SettingsView.vue` - 관리자 공통설정
- `frontend/src/renderer/src/views/admin/settingsData.ts` - 설정 기본값 + 토글 정의
- `frontend/src/renderer/src/components/payment/CardPayment.vue` - 카드 결제 컴포넌트 (**시뮬레이션**)
- `frontend/src/renderer/src/components/payment/CashPayment.vue` - 현금 결제 컴포넌트
- `frontend/src/renderer/src/stores/settings.ts` - settingsStore (systemSettings/deviceSettings)
- `frontend/src/renderer/src/stores/cart.ts` - submitOrder (주문 생성)
- `frontend/src/renderer/src/views/kiosk/PointSelectView.vue` - 포인트 적립/미적립 선택
- `frontend/src/renderer/src/views/kiosk/OrderConfirmView.vue` - 주문 확인
- `frontend/src/preload/index.ts` - Electron IPC API 정의 (terminal.requestPayment 등)

### Backend
- `backend/src/types/payment.ts` - PaymentType, PaymentStatus, VanCode 등 타입 정의
- `backend/src/routes/payments.ts` - 결제 API 라우트 + Zod 스키마 (**현재 미사용**)
- `backend/src/routes/orders.ts` - 주문 상태 변경 API (**실제 결제 처리 경로**)
- `backend/src/services/order.service.ts` - updateStatus() (Payment 생성 + 재고 차감)
- `backend/src/services/payment/payment.service.ts` - PaymentService (Strategy 관리)
- `backend/src/services/payment/payment-strategy.interface.ts` - IPaymentStrategy 인터페이스
- `backend/src/services/payment/strategies/base-payment.strategy.ts` - 기본 Strategy (CircuitBreaker, Retry)
- `backend/src/services/payment/strategies/nice-payment.strategy.ts` - NICE VAN
- `backend/src/services/payment/strategies/kicc-payment.strategy.ts` - KICC VAN
- `backend/src/services/payment/strategies/kis-payment.strategy.ts` - KIS VAN
- `backend/src/services/payment/strategies/smartro-payment.strategy.ts` - SMARTRO VAN
- `backend/src/services/setting.service.ts` - SystemSetting CRUD
- `backend/prisma/schema.prisma` - DB 스키마 (PaymentType enum, Payment 모델)

### VB6 레거시 참조
- `prev_kiosk/POSON_SELF21/Frm_SaleCard.frm` - VB6 카드 결제 UI (713줄)
- `prev_kiosk/POSON_SELF21/Frm_SelfCash.frm` - VB6 현금 결제 UI (3,777줄)
- `prev_kiosk/POSON_SELF21/Frm_rPoint.frm` - VB6 포인트 결제
- `.doc/asis/04-payment-systems.md` - VB6 VAN 기술 분석

---

## Part 8. 포인트 적립 및 회원 등급 시스템 분석

> 작성일: 2026-03-06

### 현재 상태 요약

| 항목 | 현황 | 문제 |
|------|------|------|
| **Member 모델** | `points: Int`, `grade: MemberGrade(NORMAL/SILVER/GOLD/VIP)` 필드 존재 | 사용하지 않는 빈 필드 |
| **MemberService** | CRUD만 존재 (`lookupByPhone`, `register`, `create`, `update`, `delete`) | `earnPoints()`, `updateGrade()` 메서드 없음 |
| **OrderService.updateStatus()** | PAID 전환 시 Payment 생성 + 재고 차감만 수행 | **포인트 적립 로직 없음** |
| **settingsData.ts** | `defaultPointConfig`에 `salePoint` 토글만 존재 | **적립률, 등급 기준 설정 키 없음** |
| **PointSelectView.vue** | 회원 조회/등록 + memberId 전달만 수행 | 적립 예정 포인트 표시 없음 |
| **포인트 이력** | 별도 테이블 없음 | 적립/사용/취소 추적 불가 |

### VB6 레거시 포인트 시스템 분석

> VB6는 **5단계 등급별 차등 적립률** 시스템을 사용했다.

#### VB6 Points 구조체 (Mdl_Main.bas:1097-1119)

```
Level 1 (일반):   Level1_Price(기준금액), Level1_PPoint(현금적립률), Level1_CPoint(카드적립률)
Level 2 (실버):   Level2_Price(기준금액), Level2_PPoint(현금적립률), Level2_CPoint(카드적립률)
Level 3 (골드):   Level3_Price(기준금액), Level3_PPoint(현금적립률), Level3_CPoint(카드적립률)
Level 4 (VIP):    Level4_Price(기준금액), Level4_PPoint(현금적립률), Level4_CPoint(카드적립률)
Level 5 (특등):   Level5_Price(기준금액), Level5_PPoint(현금적립률), Level5_CPoint(카드적립률)
```

#### VB6 관련 S_Config 키

| S_Config 키 | 설명 | TOBE 매핑 |
|-------------|------|----------|
| `Point_Chk` | 포인트 사용 여부 | `salePoint` (기존) |
| `Point_Rate` | 포인트 적립률 (%) | **신규 필요** |
| `Point_Use_Min` | 최소 사용 포인트 | **신규 필요** |
| `Default_Point` | 기본 적립 기준액 | **신규 필요** |
| `Min_Point` | 최소 적립 포인트 | **신규 필요** |
| `MEM_PointGubun` | 포인트 구분 | 미사용 |
| `self_NoAutoPoint` | 셀프 자동적립 차단 | **신규 필요** |
| `self_PointZero` | 적립 후 초기화 | 미사용 |

#### VB6 포인트 적립 함수들

| 함수 | 위치 | 기능 |
|------|------|------|
| `MEM_PointADD()` | Mdl_Function.bas:35 | 생일 보너스 포인트 적립 |
| `Point_Per()` | Mdl_Function.bas:42 | 추가 포인트 계산 |
| `Mem_PointSum()` | Mdl_Function.bas:37 | 등급별 포인트 합산 |
| `MEM_SalePrice()` | Mdl_Function.bas:36 | 등급별 할인 가격 |

### 1. 포인트 적립 설정 키 설계 (공통환경설정 > 포인트/회원 탭)

> `settingsData.ts`의 `defaultPointConfig`에 추가할 설정 키

#### 1-1. 적립 기본 설정

| 설정 키 | 설명 | 기본값 | 타입 | 비고 |
|---------|------|--------|------|------|
| `pointEarnEnabled` | 포인트 적립 활성화 | `"0"` | toggle | 기존 `salePoint`와 통합 검토. 기본 비활성 |
| `pointEarnType` | 적립 방식 | `"rate"` | select | `"rate"`(비율) / `"fixed"`(정액) |
| `pointEarnRate` | 적립 비율 (%) | `"1"` | number | 결제 금액의 N% 적립 (예: 1% = 1000원당 10포인트) |
| `pointEarnFixed` | 정액 적립 금액 | `"100"` | number | 건당 N포인트 고정 적립 |
| `pointEarnUnit` | 적립 기준 단위 (원) | `"1000"` | number | N원 단위로 절사 후 적립 계산 |
| `pointEarnRound` | 적립 포인트 절사 | `"floor"` | select | `"floor"`(내림) / `"round"`(반올림) / `"ceil"`(올림) |
| `pointMinEarn` | 최소 적립 포인트 | `"1"` | number | 계산 결과가 N 미만이면 적립 안 함 |
| `pointMinPurchase` | 적립 최소 결제 금액 | `"1000"` | number | N원 이상 결제 시만 적립 |
| `pointAutoEarn` | 자동 적립 (키오스크) | `"1"` | toggle | 0=수동(포인트 스킵 가능), 1=자동적립 |

#### 1-2. 등급별 차등 적립률 (VB6 5단계 → TOBE 4단계)

> VB6는 5단계였으나 현재 MemberGrade enum이 4단계(NORMAL/SILVER/GOLD/VIP)이므로 4단계로 설계.
> 향후 5단계가 필요하면 `MemberGrade` enum에 `PREMIUM` 추가.

| 설정 키 | 설명 | 기본값 | 비고 |
|---------|------|--------|------|
| `pointGradeEnabled` | 등급별 차등 적립 사용 | `"0"` | 0=전체 동일률, 1=등급별 차등 |
| `pointGradeNormalRate` | 일반 등급 적립률 (%) | `"1"` | NORMAL 회원 적립률 |
| `pointGradeSilverRate` | 실버 등급 적립률 (%) | `"2"` | SILVER 회원 적립률 |
| `pointGradeGoldRate` | 골드 등급 적립률 (%) | `"3"` | GOLD 회원 적립률 |
| `pointGradeVipRate` | VIP 등급 적립률 (%) | `"5"` | VIP 회원 적립률 |

#### 1-3. 결제 수단별 적립 설정

> VB6는 현금(PPoint)과 카드(CPoint) 적립률을 별도로 관리했다.

| 설정 키 | 설명 | 기본값 | 비고 |
|---------|------|--------|------|
| `pointCardEarnEnabled` | 카드 결제 시 적립 | `"1"` | 0=카드 결제 적립 제외 |
| `pointCashEarnEnabled` | 현금 결제 시 적립 | `"1"` | 0=현금 결제 적립 제외 |

#### 1-4. 포인트 사용 설정

| 설정 키 | 설명 | 기본값 | 비고 |
|---------|------|--------|------|
| `pointUseEnabled` | 포인트 사용(차감) 활성화 | `"0"` | 포인트로 결제 기능 |
| `pointUseMinBalance` | 최소 사용 가능 포인트 | `"1000"` | N포인트 이상 보유 시 사용 가능 |
| `pointUseMaxRate` | 최대 사용 비율 (%) | `"100"` | 결제 금액의 N%까지 사용 가능 |

### 2. 등급 변경 기준 설정 (공통환경설정 > 포인트/회원 탭)

> `settingsData.ts`의 `defaultPointConfig`에 추가할 등급 기준 설정 키

#### 2-1. 등급 승급 기준

| 설정 키 | 설명 | 기본값 | 비고 |
|---------|------|--------|------|
| `gradeAutoEnabled` | 자동 등급 변경 | `"0"` | 0=수동, 1=자동 |
| `gradeCriteria` | 등급 기준 | `"totalPoints"` | `"totalPoints"`(누적포인트) / `"totalPurchase"`(누적구매액) |
| `gradeSilverThreshold` | 실버 승급 기준 | `"10000"` | 누적 N 이상 → SILVER |
| `gradeGoldThreshold` | 골드 승급 기준 | `"50000"` | 누적 N 이상 → GOLD |
| `gradeVipThreshold` | VIP 승급 기준 | `"100000"` | 누적 N 이상 → VIP |

#### 2-2. 등급 산정 방식

| 설정 키 | 설명 | 기본값 | 비고 |
|---------|------|--------|------|
| `gradePeriod` | 등급 산정 기간 | `"all"` | `"all"`(전체기간) / `"year"`(최근1년) / `"month6"`(최근6개월) |
| `gradeDownEnabled` | 등급 하향 허용 | `"0"` | 0=승급만, 1=강등도 가능 |

#### 2-3. DB 스키마 확장 필요 (Member 모델)

> 현재 `Member` 모델에는 누적 구매 금액 필드가 없다. 등급 산정 기준이 `totalPurchase`인 경우 필요.

```prisma
model Member {
  // ... 기존 필드
  points         Int         @default(0)           // 현재 보유 포인트 (사용 가능)
  totalEarned    Int         @default(0) @map("total_earned")    // 누적 적립 포인트 (등급 산정용)
  totalPurchase  Int         @default(0) @map("total_purchase")  // 누적 구매 금액 (등급 산정용)
  grade          MemberGrade @default(NORMAL)
}
```

> `points`는 사용/적립으로 변동하는 **잔액**, `totalEarned`는 순수 적립 합계 (등급 산정용).

#### 2-4. 포인트 이력 테이블 (신규)

> 현재 포인트 변동 이력을 추적할 테이블이 없다. 적립/사용/취소 추적을 위해 필요.

```prisma
model PointHistory {
  id         Int       @id @default(autoincrement())
  memberId   Int       @map("member_id")
  member     Member    @relation(fields: [memberId], references: [id])
  type       PointType                // EARN, USE, CANCEL, EXPIRE
  amount     Int                      // 변동 포인트 (양수)
  balance    Int                      // 변동 후 잔액
  orderId    String?   @map("order_id")
  order      Order?    @relation(fields: [orderId], references: [id])
  description String?  @db.VarChar(200) // "주문 #12345 적립", "포인트 결제 사용"
  createdAt  DateTime  @default(now()) @map("created_at")

  @@index([memberId])
  @@index([orderId])
  @@map("point_histories")
}

enum PointType {
  EARN      // 적립
  USE       // 사용
  CANCEL    // 취소 (적립 취소 or 사용 취소)
  EXPIRE    // 만료
  ADJUST    // 수동 조정 (관리자)
}
```

### 3. 결제 완료 시 포인트 적립 로직 설계

#### 3-1. 현재 흐름 (적립 없음)

```
PaymentView -> PATCH /orders/:id/status { status: "PAID", paymentType }
                |
           order.service.updateStatus()
                |
                +-- prisma.$transaction
                |     +-- deductStockForOrder()    ← 재고 차감
                |     +-- prisma.payment.create()  ← Payment 레코드 생성
                |     +-- prisma.order.update()    ← 주문 상태 PAID
                |
                +-- invalidateStockCache()
                |
                X  ← 포인트 적립 없음!
```

#### 3-2. 개선 흐름 (적립 추가)

```
PaymentView -> PATCH /orders/:id/status { status: "PAID", paymentType }
                |
           order.service.updateStatus()
                |
                +-- prisma.$transaction
                |     +-- deductStockForOrder()
                |     +-- prisma.payment.create()
                |     +-- prisma.order.update()
                |     +-- [신규] earnPointsForOrder()   ← 포인트 적립
                |           +-- 설정 확인 (pointEarnEnabled)
                |           +-- 결제 수단별 적립 가능 여부 확인
                |           +-- 적립 포인트 계산 (등급별 차등)
                |           +-- Member.points += earnedPoints
                |           +-- Member.totalEarned += earnedPoints
                |           +-- Member.totalPurchase += orderAmount
                |           +-- PointHistory 생성
                |           +-- [선택] 등급 자동 변경 확인
                |
                +-- invalidateStockCache()
```

#### 3-3. MemberService 확장 메서드

```typescript
// member.service.ts에 추가할 메서드들

/** 포인트 적립 */
static async earnPoints(
  tx: PrismaTransactionClient,
  memberId: number,
  orderId: string,
  orderAmount: number,
  paymentType: string,
  settings: Record<string, string>
): Promise<{ earned: number; newBalance: number; gradeChanged: boolean }> {
  // 1. 회원 조회 (이후 잔액 반환을 위해 먼저 조회)
  const member = await tx.member.findUnique({ where: { id: memberId } });
  if (!member) return { earned: 0, newBalance: 0, gradeChanged: false };

  // 2. 적립 활성화 확인
  if (settings["pointEarnEnabled"] !== "1") return { earned: 0, newBalance: member.points, gradeChanged: false };

  // 3. 결제 수단별 적립 가능 여부
  if (paymentType === "CARD" && settings["pointCardEarnEnabled"] !== "1") {
    return { earned: 0, newBalance: member.points, gradeChanged: false };
  }
  if (paymentType === "CASH" && settings["pointCashEarnEnabled"] !== "1") {
    return { earned: 0, newBalance: member.points, gradeChanged: false };
  }
  // POINT 결제 시 적립 제외 (포인트로 결제한 금액에 포인트 적립하면 무한 루프)
  if (paymentType === "POINT") {
    return { earned: 0, newBalance: member.points, gradeChanged: false };
  }

  // 4. 최소 결제 금액 확인
  const minPurchase = parseInt(settings["pointMinPurchase"] || "1000");
  if (orderAmount < minPurchase) return { earned: 0, newBalance: member.points, gradeChanged: false };

  // 5. 적립 포인트 계산
  const earned = MemberService.calculateEarnPoints(orderAmount, member.grade, settings);
  if (earned <= 0) return { earned: 0, newBalance: member.points, gradeChanged: false };

  // 6. Member 업데이트
  const updated = await tx.member.update({
    where: { id: memberId },
    data: {
      points: { increment: earned },
      totalEarned: { increment: earned },
      totalPurchase: { increment: orderAmount },
    },
  });

  // 7. PointHistory 생성
  await tx.pointHistory.create({
    data: {
      memberId,
      type: "EARN",
      amount: earned,
      balance: updated.points,
      orderId,
      description: `주문 적립 (${orderAmount.toLocaleString()}원)`,
    },
  });

  // 8. 등급 자동 변경
  let gradeChanged = false;
  if (settings["gradeAutoEnabled"] === "1") {
    gradeChanged = await MemberService.checkAndUpdateGrade(tx, memberId, updated, settings);
  }

  return { earned, newBalance: updated.points, gradeChanged };
}

/** 적립 포인트 계산 */
static calculateEarnPoints(
  amount: number,
  grade: MemberGrade,
  settings: Record<string, string>
): number {
  const earnType = settings["pointEarnType"] || "rate";

  if (earnType === "fixed") {
    return parseInt(settings["pointEarnFixed"] || "100");
  }

  // 비율 적립
  let rate: number;
  if (settings["pointGradeEnabled"] === "1") {
    // 등급별 차등 적립률
    const gradeRateMap: Record<string, string> = {
      NORMAL: "pointGradeNormalRate",
      SILVER: "pointGradeSilverRate",
      GOLD: "pointGradeGoldRate",
      VIP: "pointGradeVipRate",
    };
    rate = parseFloat(settings[gradeRateMap[grade]] || "1");
  } else {
    rate = parseFloat(settings["pointEarnRate"] || "1");
  }

  // 기준 단위로 절사 후 계산
  const unit = parseInt(settings["pointEarnUnit"] || "1000");
  const baseAmount = Math.floor(amount / unit) * unit;

  // 포인트 = 기준금액 × (적립률 / 100)
  const rawPoints = baseAmount * (rate / 100);

  // 절사 방식
  const round = settings["pointEarnRound"] || "floor";
  let earned: number;
  if (round === "ceil") earned = Math.ceil(rawPoints);
  else if (round === "round") earned = Math.round(rawPoints);
  else earned = Math.floor(rawPoints);

  // 최소 적립 포인트 체크
  const minEarn = parseInt(settings["pointMinEarn"] || "1");
  return earned >= minEarn ? earned : 0;
}

/** 등급 자동 변경 확인 */
static async checkAndUpdateGrade(
  tx: PrismaTransactionClient,
  memberId: number,
  member: { totalEarned: number; totalPurchase: number; grade: string },
  settings: Record<string, string>
): Promise<boolean> {
  const criteria = settings["gradeCriteria"] || "totalPoints";
  const value = criteria === "totalPurchase" ? member.totalPurchase : member.totalEarned;

  const vipThreshold = parseInt(settings["gradeVipThreshold"] || "100000");
  const goldThreshold = parseInt(settings["gradeGoldThreshold"] || "50000");
  const silverThreshold = parseInt(settings["gradeSilverThreshold"] || "10000");

  let newGrade: MemberGrade;
  if (value >= vipThreshold) newGrade = "VIP";
  else if (value >= goldThreshold) newGrade = "GOLD";
  else if (value >= silverThreshold) newGrade = "SILVER";
  else newGrade = "NORMAL";

  // 등급 하향 미허용 시
  if (settings["gradeDownEnabled"] !== "1") {
    const gradeOrder = { NORMAL: 0, SILVER: 1, GOLD: 2, VIP: 3 };
    if (gradeOrder[newGrade] <= gradeOrder[member.grade as MemberGrade]) return false;
  }

  if (newGrade !== member.grade) {
    await tx.member.update({ where: { id: memberId }, data: { grade: newGrade } });
    return true;
  }
  return false;
}
```

#### 3-4. OrderService.updateStatus() 수정 포인트

> `backend/src/services/order.service.ts:252-296`의 `$transaction` 블록에 포인트 적립 로직 추가

```typescript
// order.service.ts updateStatus() 내 $transaction 블록
const order = await prisma.$transaction(async (tx) => {
  // 기존: 재고 차감
  if (newStatus === "PAID" && !STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
    await this.deductStockForOrder(tx, orderId, existing.orderNumber);
  }

  // 기존: Payment 레코드 생성
  if (newStatus === "PAID" && paymentType) {
    await tx.payment.create({ ... });
  }

  // [신규] 포인트 적립 - memberId가 있는 주문에만
  if (newStatus === "PAID" && existing.memberId) {
    const settings = await settingService.findAll();  // 또는 캐시에서 조회
    await MemberService.earnPoints(
      tx, existing.memberId, orderId, Number(existing.totalAmount), paymentType, settings
    );
  }

  // 기존: 주문 상태 업데이트
  return tx.order.update({ ... });
});
```

> **주의**: `existing.memberId`는 `PointSelectView`에서 회원 선택 시 주문에 저장된 값.
> 비회원(미적립 선택) 주문은 `memberId === null`이므로 적립 로직 자동 스킵.

#### 3-5. 주문 취소 시 포인트 환수

> `CANCELLED`로 전환 시 적립된 포인트를 환수해야 한다.

```typescript
// CANCELLED 전환 시 포인트 환수
if (newStatus === "CANCELLED" && existing.memberId) {
  const earnHistory = await tx.pointHistory.findFirst({
    where: { orderId, memberId: existing.memberId, type: "EARN" },
  });
  if (earnHistory) {
    // 주의: 취소 시에는 decrement가 아니라 increment (포인트 환수)
    await tx.member.update({
      where: { id: existing.memberId },
      data: {
        points: { increment: earnHistory.amount },
        totalEarned: { decrement: earnHistory.amount },
      },
    });
    const updatedMember = await tx.member.findUnique({ where: { id: existing.memberId } });
    await tx.pointHistory.create({
      data: {
        memberId: existing.memberId,
        type: "CANCEL",
        amount: earnHistory.amount,
        balance: updatedMember!.points,
        orderId,
        description: `주문 취소 적립 포인트 환수`,
      },
    });
  }
}
```

### 4. settingsData.ts 변경 설계

#### 4-1. defaultPointConfig 확장

```typescript
// settingsData.ts - 기존 defaultPointConfig에 추가할 키
export const defaultPointConfig: SettingsRecord = {
  // ── 기존 키 (유지) ──
  salePoint: "0",
  weightPoint: "0",
  memberAddScreen: "0",
  gradeMemo: "0",
  noBillMessage: "0",
  noBillSound: "0",
  noBillCusPoint: "0",
  // ...기존 selfXxx 키들...

  // ── [신규] 포인트 적립 설정 ──
  pointEarnEnabled: "0",
  pointEarnType: "rate",
  pointEarnRate: "1",
  pointEarnFixed: "100",
  pointEarnUnit: "1000",
  pointEarnRound: "floor",
  pointMinEarn: "1",
  pointMinPurchase: "1000",
  pointAutoEarn: "1",
  pointCardEarnEnabled: "1",
  pointCashEarnEnabled: "1",

  // ── [신규] 등급별 차등 적립 ──
  pointGradeEnabled: "0",
  pointGradeNormalRate: "1",
  pointGradeSilverRate: "2",
  pointGradeGoldRate: "3",
  pointGradeVipRate: "5",

  // ── [신규] 포인트 사용 ──
  pointUseEnabled: "0",
  pointUseMinBalance: "1000",
  pointUseMaxRate: "100",
  pointUseSplitEnabled: "1",     // Part 9: 분할 결제 허용
  pointUseSplitMethod: "card",   // Part 9: 잔액 결제 수단 (card/cash/select)

  // ── [신규] 등급 자동 변경 ──
  gradeAutoEnabled: "0",
  gradeCriteria: "totalPoints",
  gradeSilverThreshold: "10000",
  gradeGoldThreshold: "50000",
  gradeVipThreshold: "100000",
  gradePeriod: "all",
  gradeDownEnabled: "0",
};
```

#### 4-2. pointToggles 확장

```typescript
export const pointToggles: ToggleItem[] = [
  // ── 기존 토글 (유지) ──
  { key: "salePoint", title: "판매 포인트", desc: "판매 시 포인트 적립" },
  { key: "memberAddScreen", title: "회원 추가 화면", desc: "판매 시 회원 등록 화면" },
  { key: "gradeMemo", title: "등급 메모", desc: "회원 등급 메모 표시" },
  { key: "noBillMessage", title: "무영수증 메시지", desc: "무영수증 시 메시지 표시" },
  { key: "noBillSound", title: "무영수증 소리", desc: "무영수증 시 효과음" },
  { key: "noBillCusPoint", title: "무영수증 포인트", desc: "무영수증 시 포인트 적용" },

  // ── [신규] 포인트 적립 ──
  { key: "pointEarnEnabled", title: "포인트 적립", desc: "결제 완료 시 포인트 자동 적립" },
  { key: "pointAutoEarn", title: "자동 적립 (키오스크)", desc: "키오스크에서 자동 포인트 적립" },
  { key: "pointCardEarnEnabled", title: "카드 결제 적립", desc: "카드 결제 시 포인트 적립" },
  { key: "pointCashEarnEnabled", title: "현금 결제 적립", desc: "현금 결제 시 포인트 적립" },
  { key: "pointGradeEnabled", title: "등급별 차등 적립", desc: "회원 등급에 따라 적립률 차등 적용" },

  // ── [신규] 포인트 사용 ──
  { key: "pointUseEnabled", title: "포인트 사용", desc: "포인트로 결제 기능 활성화" },

  // ── [신규] 등급 관리 ──
  { key: "gradeAutoEnabled", title: "자동 등급 변경", desc: "포인트/구매액 기준 자동 등급 변경" },
  { key: "gradeDownEnabled", title: "등급 하향 허용", desc: "기준 미달 시 등급 강등 허용" },
];
```

### 5. SettingsView 포인트/회원 탭 UI 설계

> 관리자 설정 화면의 포인트/회원 탭에 아래 섹션이 필요하다.

```
┌─────────────────────────────────────────────┐
│ 포인트/회원 설정                              │
├─────────────────────────────────────────────┤
│ ■ 포인트 적립 설정                           │
│   [토글] 포인트 적립 활성화                   │
│   적립 방식: [비율 ▼] / [정액 ▼]            │
│   적립률: [1] %  (비율 선택시)               │
│   정액 적립: [100] 포인트 (정액 선택시)       │
│   적립 기준 단위: [1000] 원                   │
│   최소 결제 금액: [1000] 원                   │
│   [토글] 카드 결제 적립 / 현금 결제 적립      │
│                                              │
│ ■ 등급별 차등 적립                           │
│   [토글] 등급별 차등 적립 사용                │
│   일반: [1]%  실버: [2]%  골드: [3]%  VIP: [5]% │
│                                              │
│ ■ 등급 자동 변경                             │
│   [토글] 자동 등급 변경                       │
│   등급 기준: [누적 포인트 ▼] / [누적 구매액 ▼]│
│   실버: [10,000]  골드: [50,000]  VIP: [100,000]│
│   [토글] 등급 하향 허용                       │
│                                              │
│ ■ 포인트 사용 (결제)                         │
│   [토글] 포인트 사용 활성화                   │
│   최소 사용 가능: [1,000] 포인트              │
│   최대 사용 비율: [100] %                     │
│                                              │
│ ■ 기존 키오스크 UI 설정                      │
│   (기존 selfXxx 토글 유지)                    │
└─────────────────────────────────────────────┘
```

### 6. 구현 우선순위 (포인트 시스템)

| 순서 | 작업 | 난이도 | 변경 범위 |
|:----:|------|:------:|----------|
| P-1 | DB 스키마 확장 (Member + PointHistory) | 낮음 | schema.prisma + migration |
| P-2 | 포인트 설정 키 추가 | 낮음 | settingsData.ts + SettingsView |
| P-3 | MemberService.earnPoints() 구현 | 중간 | member.service.ts |
| P-4 | OrderService.updateStatus() 적립 연동 | 중간 | order.service.ts |
| P-5 | 주문 취소 시 포인트 환수 | 중간 | order.service.ts |
| P-6 | 등급 자동 변경 로직 | 중간 | member.service.ts |
| P-7 | PointSelectView 적립 예정 표시 | 낮음 | PointSelectView.vue |
| P-8 | 관리자 포인트 이력 조회 | 중간 | members 라우트 + 관리자 뷰 |

### 7. VB6 -> TOBE 포인트 설정 매핑

| VB6 키 (S_Config/pos_config.ini) | TOBE 키 (SystemSetting) | 변환 규칙 |
|--------------------------------|----------------------|----------|
| `Point_Chk` | `pointEarnEnabled` | 1:1 |
| `Point_Rate` | `pointEarnRate` | string → number |
| `Point_Use_Min` | `pointUseMinBalance` | string → number |
| `Default_Point` | `pointEarnUnit` | 적립 기준 단위 |
| `Min_Point` | `pointMinEarn` | 최소 적립 포인트 |
| `Level1_PPoint` ~ `Level5_PPoint` | `pointGradeNormalRate` ~ `pointGradeVipRate` | 5단계 → 4단계 축소 |
| `Level1_Price` ~ `Level5_Price` | `gradeSilverThreshold` ~ `gradeVipThreshold` | 등급 기준 금액 |
| `self_NoAutoPoint` | `pointAutoEarn` | **의미 반전**: NoAuto=1 → AutoEarn=0 |
| `Sale_Point` | `salePoint` (기존) | 기존 키 유지 |

---

## Part 9. 포인트 결제 - 잔액 부족 시 복합 결제(분할 결제) 분석

> 작성일: 2026-03-06
> 포인트 결제에서 보유 포인트 < 결제 금액인 경우의 처리 로직 설계

### 현재 상태

| 항목 | 현황 | 문제 |
|------|------|------|
| **PaymentType enum** | `CARD \| CASH \| MIXED` - `MIXED` 존재 | `MIXED`는 정의만 있고 **전혀 사용되지 않음** |
| **PaymentView** | `storePoint` 선택 → `showInfoToast("scannerNotReady")` | **포인트 결제 자체가 미구현** |
| **Payment 모델** | 주문당 Payment 레코드 1건만 생성 | 복합 결제(포인트+카드) 시 2건 이상 필요 |
| **order.service.ts** | `paymentType` 1개만 받아 Payment 1건 생성 | 복합 결제 데이터 구조 미지원 |
| **Part 8 설정** | `pointUseMaxRate` (최대 사용 비율 %) 정의됨 | 부분 사용 시나리오에 대한 처리 흐름 없음 |

### 포인트 결제 시나리오 분류

```
결제 금액: 15,000원
회원 보유 포인트: ?

┌─────────────────────────────────────────────────────────────┐
│ 시나리오 A: 포인트 충분 (보유 20,000 >= 결제 15,000)        │
│ → 전액 포인트 결제                                         │
│ → PaymentType: POINT, 금액: 15,000                         │
│ → Member.points -= 15,000                                  │
├─────────────────────────────────────────────────────────────┤
│ 시나리오 B: 포인트 부족 (보유 8,000 < 결제 15,000)          │
│ → 선택지 1: 포인트 전액 사용 + 나머지 다른 수단 (분할 결제) │
│             포인트 8,000 + 카드 7,000 = 15,000              │
│ → 선택지 2: 포인트 사용 포기 → 다른 결제 수단 선택          │
│ → 선택지 3: 사용할 포인트 직접 입력 (부분 사용)             │
├─────────────────────────────────────────────────────────────┤
│ 시나리오 C: 포인트 0 또는 최소 미달 (보유 500 < 최소 1,000) │
│ → 포인트 결제 버튼 비활성화 또는 안내 메시지                │
├─────────────────────────────────────────────────────────────┤
│ 시나리오 D: 포인트 사용 비율 제한 (maxRate 50%)             │
│ → 결제 금액의 50% = 7,500까지만 포인트 사용 가능            │
│ → 보유 20,000이어도 7,500만 차감 + 나머지 7,500 다른 수단   │
└─────────────────────────────────────────────────────────────┘
```

### 결정 필요: 분할 결제 정책

> **키오스크 셀프 주문 특성상** 결제 UX를 최대한 단순하게 유지해야 한다.
> VB6에서도 포인트 결제는 **전액 포인트** 또는 **포인트 미사용**이 기본이었고,
> 분할 결제는 POS 모드에서만 지원했다.

| 방식 | UX 복잡도 | 설명 | 권장 |
|------|:---------:|------|:----:|
| **A. 전액 or 미사용** | 낮음 | 포인트 >= 금액이면 전액 포인트, 아니면 포인트 사용 불가 | 초기 구현 |
| **B. 자동 분할** | 중간 | 포인트 부족 시 자동으로 포인트 전액 + 나머지 카드/현금 | **권장** |
| **C. 수동 입력** | 높음 | 사용할 포인트 금액을 고객이 직접 입력 | POS 전용 |

> **권장: 방식 B (자동 분할)**
> - 키오스크 UX 단순성 유지 (고객이 금액 입력할 필요 없음)
> - 포인트 전액 자동 사용 + 잔액만 다른 수단으로 결제
> - 설정으로 방식 A/B 전환 가능

### 추가 설정 키

| 설정 키 | 설명 | 기본값 | 비고 |
|---------|------|--------|------|
| `pointUseSplitEnabled` | 분할 결제 허용 | `"1"` | 0=전액만(방식A), 1=분할허용(방식B) |
| `pointUseSplitMethod` | 잔액 결제 수단 | `"card"` | `"card"` / `"cash"` / `"select"` (고객 선택) |

### Frontend 흐름 설계 (PointPayment.vue 신규 컴포넌트)

#### 전체 결제 흐름

```
PaymentView
  |
  +-- selectedMethod === "storePoint"
  |     +-- currentStep = "point-pay"
  |     +-- <PointPayment /> 컴포넌트 렌더링
  |
  +-- PointPayment.vue
        |
        +-- onMounted: 회원 포인트 조회 (Member API)
        |
        +-- [판단] 보유 포인트 vs 결제 금액
        |     |
        |     +-- Case 1: 포인트 >= 결제금액
        |     |     → "전액 포인트 결제" 버튼 표시
        |     |     → 결제 실행 → PATCH /orders/:id/status { paymentType: "POINT" }
        |     |
        |     +-- Case 2: 포인트 > 0 && 포인트 < 결제금액 && 분할 허용
        |     |     → "포인트 {N}P 사용 + 잔액 {M}원 카드/현금 결제" 안내
        |     |     → 고객 확인 → 포인트 차감 API → 잔액 결제 단계 전환
        |     |
        |     +-- Case 3: 포인트 < 최소 사용 포인트
        |     |     → "포인트가 부족합니다" 안내
        |     |     → "다른 결제 수단 선택" 버튼
        |     |
        |     +-- Case 4: 분할 미허용 && 포인트 < 결제금액
        |           → "포인트가 부족합니다 (전액 결제만 가능)" 안내
        |           → "다른 결제 수단 선택" 버튼
        |
        +-- [분할 결제 시] 잔액 결제 단계
              → pointUseSplitMethod === "card" → CardPayment 전환 (잔액만)
              → pointUseSplitMethod === "cash" → CashPayment 전환 (잔액만)
              → pointUseSplitMethod === "select" → 카드/현금 선택 UI
```

#### PointPayment.vue 핵심 로직

```typescript
// PointPayment.vue <script setup>
const props = defineProps<{
  orderId: string;
  totalAmount: number;     // 결제 총액
  memberId: number;
}>();

const emit = defineEmits<{
  success: [];
  cancel: [];
  splitRequired: [{ pointUsed: number; remaining: number }];
}>();

const memberPoints = ref(0);
const loading = ref(true);
const processing = ref(false);

// 설정 조회 (computed로 반응성 유지)
const settings = useSettingsStore();
const minBalance = computed(() => parseInt(settings.get("pointUseMinBalance", "1000")));
const maxRate = computed(() => parseInt(settings.get("pointUseMaxRate", "100")));
const splitEnabled = computed(() => settings.get("pointUseSplitEnabled", "1") === "1");
const splitMethod = computed(() => settings.get("pointUseSplitMethod", "card"));

// 최대 사용 가능 포인트 (비율 제한 적용)
const maxUsablePoints = computed(() => {
  const byRate = Math.floor(props.totalAmount * (maxRate.value / 100));
  return Math.min(memberPoints.value, byRate);
});

// 결제 시나리오 판단
const paymentScenario = computed(() => {
  if (memberPoints.value < minBalance.value) return "INSUFFICIENT";     // Case 3
  if (maxUsablePoints.value >= props.totalAmount) return "FULL_POINT";  // Case 1
  if (splitEnabled.value) return "SPLIT";                               // Case 2
  return "INSUFFICIENT_NO_SPLIT";                                       // Case 4
});

// 잔액 계산
const pointToUse = computed(() =>
  paymentScenario.value === "FULL_POINT"
    ? props.totalAmount
    : maxUsablePoints.value
);
const remainingAmount = computed(() => props.totalAmount - pointToUse.value);

// 전액 포인트 결제 (포인트 차감 + PAID 전환을 한번에)
// 주의: PATCH /orders/:id/status만 호출하면 Member.points 차감이 안 됨!
// use-points API를 먼저 호출하거나, 백엔드에서 POINT 타입일 때 자동 차감해야 함
async function payFullPoint() {
  processing.value = true;
  try {
    const { apiClient } = await import("@/services/api/client");
    // 1단계: 포인트 차감 (분할과 동일한 API 사용)
    await apiClient.post(`/api/v1/orders/${props.orderId}/use-points`, {
      pointAmount: pointToUse.value,
      memberId: props.memberId,
    });
    // 2단계: 잔액 0이므로 바로 PAID 전환 (추가 결제 없이)
    await apiClient.patch(`/api/v1/orders/${props.orderId}/status`, {
      status: "PAID",
      paymentType: "POINT",
    });
    emit("success");
  } catch (error) {
    // 잔액 부족 등 서버 검증 실패 처리
    // 1단계 성공 후 2단계 실패 시 → 타임아웃 보호에 의해 자동 환수
  } finally {
    processing.value = false;
  }
}

// 분할 결제 - 포인트 차감 후 잔액 결제 전환
async function paySplit() {
  processing.value = true;
  try {
    const { apiClient } = await import("@/services/api/client");
    // 1단계: 포인트 선차감 (주문에 포인트 사용 기록)
    await apiClient.post(`/api/v1/orders/${props.orderId}/use-points`, {
      pointAmount: pointToUse.value,
      memberId: props.memberId,
    });
    // 2단계: 잔액 결제 단계로 전환 (부모 컴포넌트에서 처리)
    emit("splitRequired", {
      pointUsed: pointToUse.value,
      remaining: remainingAmount.value,
    });
  } catch (error) {
    // 포인트 차감 실패 시 안내
  } finally {
    processing.value = false;
  }
}
```

### Backend 분할 결제 처리

#### API 엔드포인트 설계

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /orders/:id/use-points` | 신규 | 포인트 선차감 (분할 결제 1단계) |
| `PATCH /orders/:id/status` | 기존 수정 | PAID 전환 시 포인트 + 카드/현금 복합 처리 |

#### 분할 결제 시 Payment 레코드 구조

> 분할 결제 시 주문 1건에 Payment 레코드 **2건** 생성

```
Order #12345 (totalAmount: 15,000원)
  ├── Payment #1: { paymentType: "POINT",  amount: 8,000,  status: "APPROVED" }
  └── Payment #2: { paymentType: "CARD",   amount: 7,000,  status: "APPROVED" }
```

> 현재 `Payment` 모델은 이미 `Order`와 1:N 관계 (`payments Payment[]`)이므로
> 스키마 변경 없이 다건 Payment 생성 가능.

#### order.service.ts 분할 결제 흐름

```typescript
// 방법 1: 2단계 API (포인트 선차감 → 잔액 결제)

// [1단계] POST /orders/:id/use-points
async usePoints(orderId: string, memberId: number, pointAmount: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING") throw new AppError(400, "주문 상태 오류");
    if (pointAmount > Number(order.totalAmount)) throw new AppError(400, "포인트 초과");

    // 회원 포인트 잔액 확인 + 차감 (비관적 잠금)
    const [member] = await tx.$queryRaw<{ id: number; points: number }[]>`
      SELECT id, points FROM members WHERE id = ${memberId} FOR UPDATE
    `;
    if (!member || member.points < pointAmount) {
      throw new AppError(400, "포인트 잔액이 부족합니다", "INSUFFICIENT_POINTS");
    }

    await tx.member.update({
      where: { id: memberId },
      data: { points: { decrement: pointAmount } },
    });

    // 포인트 Payment 레코드 생성 (아직 PAID가 아님)
    await tx.payment.create({
      data: {
        orderId,
        paymentType: "POINT",
        amount: pointAmount,
        status: "APPROVED",
      },
    });

    // 포인트 이력 생성
    const updatedMember = await tx.member.findUnique({ where: { id: memberId } });
    await tx.pointHistory.create({
      data: {
        memberId,
        type: "USE",
        amount: pointAmount,
        balance: updatedMember!.points,
        orderId,
        description: `주문 포인트 사용 (${pointAmount.toLocaleString()}P)`,
      },
    });

    // 주문에 포인트 사용 금액 기록 (잔액 결제를 위해)
    await tx.order.update({
      where: { id: orderId },
      data: { pointUsed: pointAmount },  // Order 모델에 필드 추가 필요
    });

    return { pointUsed: pointAmount, remaining: Number(order.totalAmount) - pointAmount };
  });
}

// [2단계] PATCH /orders/:id/status (기존 updateStatus 확장)
// → 잔액에 대한 카드/현금 Payment 생성 + 주문 PAID 전환
async updateStatus(orderId, newStatus, paymentType, ...) {
  // ... 기존 로직
  if (newStatus === "PAID" && paymentType) {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    const pointUsed = order.pointUsed || 0;
    const remainingAmount = Number(order.totalAmount) - pointUsed;

    // 잔액에 대한 Payment 레코드 생성
    if (remainingAmount > 0) {
      await tx.payment.create({
        data: {
          orderId,
          paymentType: paymentType as PaymentType,  // CARD or CASH
          amount: remainingAmount,  // 잔액만
          status: "APPROVED",
        },
      });
    }
  }
}
```

#### Order 모델 확장 (분할 결제 지원)

```prisma
model Order {
  // ... 기존 필드
  pointUsed    Int?    @default(0) @map("point_used")  // 포인트 사용 금액
}
```

### 분할 결제 취소 시 포인트 환수

> 분할 결제 주문 취소 시, 사용된 포인트도 환수해야 한다.

```
주문 취소 흐름:
  1. Payment 레코드 조회 (해당 주문의 모든 Payment)
  2. paymentType === "POINT"인 Payment 발견
     → Member.points += Payment.amount (포인트 환수)
     → PointHistory 생성 (type: "CANCEL")
  3. paymentType === "CARD"인 Payment 발견
     → VAN 취소 요청 (기존 흐름)
  4. 주문 상태 CANCELLED 전환
```

```typescript
// order.service.ts - 취소 시 포인트 환수 (기존 CANCELLED 처리에 추가)
if (newStatus === "CANCELLED") {
  // 포인트 환수
  const pointPayments = await tx.payment.findMany({
    where: { orderId, paymentType: "POINT", status: "APPROVED" },
  });

  for (const pp of pointPayments) {
    if (existing.memberId) {
      await tx.member.update({
        where: { id: existing.memberId },
        data: { points: { increment: Math.floor(Number(pp.amount)) } },
      });

      const member = await tx.member.findUnique({ where: { id: existing.memberId } });
      await tx.pointHistory.create({
        data: {
          memberId: existing.memberId,
          type: "CANCEL",
          amount: Math.floor(Number(pp.amount)),
          balance: member!.points,
          orderId,
          description: `주문 취소 포인트 환수`,
        },
      });
    }

    await tx.payment.update({
      where: { id: pp.id },
      data: { status: "CANCELLED" },
    });
  }

  // 재고 복구 (기존)
  if (STOCK_DEDUCTED_STATUSES.includes(prevStatus)) {
    await this.restoreStockForOrder(tx, orderId, existing.orderNumber);
  }
}
```

### 포인트 결제 UX 화면 설계

```
┌─────────────────────────────────────────────┐
│         매장 포인트 결제                      │
├─────────────────────────────────────────────┤
│                                              │
│  결제 금액          15,000원                 │
│  보유 포인트         8,000P                  │
│                                              │
│  ─────────────────────────────              │
│  포인트 사용         8,000P                  │
│  잔액 (카드 결제)     7,000원                │
│  ─────────────────────────────              │
│                                              │
│  ┌───────────────────────────────┐          │
│  │  포인트 사용 후 카드 결제하기   │          │
│  └───────────────────────────────┘          │
│                                              │
│  ┌───────────────────────────────┐          │
│  │  다른 결제 수단 선택            │          │
│  └───────────────────────────────┘          │
│                                              │
│  ※ 포인트 사용 후 잔액은 카드로 결제됩니다   │
└─────────────────────────────────────────────┘

[전액 포인트 가능한 경우]
┌─────────────────────────────────────────────┐
│         매장 포인트 결제                      │
├─────────────────────────────────────────────┤
│                                              │
│  결제 금액          15,000원                 │
│  보유 포인트        20,000P                  │
│                                              │
│  ─────────────────────────────              │
│  포인트 사용        15,000P                  │
│  잔여 포인트         5,000P                  │
│  ─────────────────────────────              │
│                                              │
│  ┌───────────────────────────────┐          │
│  │    포인트로 결제하기            │          │
│  └───────────────────────────────┘          │
│                                              │
│  ┌───────────────────────────────┐          │
│  │  다른 결제 수단 선택            │          │
│  └───────────────────────────────┘          │
└─────────────────────────────────────────────┘

[포인트 부족/사용 불가]
┌─────────────────────────────────────────────┐
│         매장 포인트 결제                      │
├─────────────────────────────────────────────┤
│                                              │
│  결제 금액          15,000원                 │
│  보유 포인트           500P                  │
│                                              │
│  ⚠ 포인트가 부족합니다                       │
│    (최소 1,000P 이상 보유 시 사용 가능)       │
│                                              │
│  ┌───────────────────────────────┐          │
│  │  다른 결제 수단 선택            │          │
│  └───────────────────────────────┘          │
└─────────────────────────────────────────────┘
```

### 보안 및 Edge Case

| 시나리오 | 위험 | 대응 |
|---------|------|------|
| 분할 결제 1단계(포인트 차감) 후 2단계(카드) 실패 | 포인트만 차감되고 결제 미완료 | 주문 타임아웃(5분) 시 포인트 자동 환수. `Order.pointUsed > 0 && status === PENDING`인 주문 감시 |
| 분할 결제 중 고객 이탈 | 포인트 차감 상태로 주문 미완 | IdleTimer에서 미완료 주문 감지 → 포인트 환수 + 주문 취소 |
| 동시 2대 키오스크에서 같은 회원 포인트 결제 | Race Condition | `prisma.$transaction` + 행 잠금 (기존 설계 유지) |
| 포인트 차감 후 네트워크 단절 | 카드 결제 불가 → 현금만 가능 | 잔액 결제 수단을 현금으로 전환 안내, 또는 포인트 환수 후 전체 현금 결제 |
| pointUsed 금액 조작 (클라이언트) | 서버에서 검증 안 하면 부정 차감 | 백엔드에서 `Member.points >= pointAmount` 이중 검증 필수 |
| 분할 결제 후 부분 환불 | 카드 7,000원만 환불? 포인트 8,000P도 환불? | 환불 정책 결정 필요 (전액 환불만 / 부분 환불 지원 여부) |

### 분할 결제 타임아웃 보호

> 포인트 선차감 후 잔액 결제가 완료되지 않을 경우를 대비한 보호 장치

```typescript
// 배치 작업 또는 스케줄러 (5분 주기)
async function recoverStaleSplitPayments() {
  const staleOrders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      pointUsed: { gt: 0 },
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }, // 5분 초과 (Order에 updatedAt 추가 전까지 createdAt 사용)
    },
    include: { payments: true },
  });

  for (const order of staleOrders) {
    await prisma.$transaction(async (tx) => {
      // 포인트 환수
      if (order.memberId && order.pointUsed) {
        await tx.member.update({
          where: { id: order.memberId },
          data: { points: { increment: order.pointUsed } },
        });
        // PointHistory + Payment 상태 변경 ...
      }
      // 주문 취소
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", pointUsed: 0, cancelledAt: new Date() },
      });
    });
  }
}
```

### 구현 우선순위 (분할 결제)

| 순서 | 작업 | 난이도 | 선행 조건 |
|:----:|------|:------:|----------|
| S-1 | Order 모델에 `pointUsed` 필드 추가 | 낮음 | schema.prisma migration |
| S-2 | PointPayment.vue 컴포넌트 생성 | 중간 | PaymentView 라우팅 수정 |
| S-3 | `POST /orders/:id/use-points` API | 중간 | Part 8 P-1 (PointHistory 테이블) |
| S-4 | updateStatus() 분할 결제 지원 | 중간 | S-1, S-3 |
| S-5 | 취소 시 포인트 환수 | 중간 | S-3 |
| S-6 | 타임아웃 보호 (배치) | 낮음 | S-3 |
| S-7 | 분할 결제 설정 키 추가 | 낮음 | Part 8 P-2 |

### 다국어 키 추가 필요

```json
{
  "payment": {
    "pointPayTitle": "매장 포인트 결제",
    "currentPoints": "보유 포인트",
    "pointToUse": "사용 포인트",
    "remainingAmount": "잔액",
    "remainingByCard": "잔액 (카드 결제)",
    "remainingByCash": "잔액 (현금 결제)",
    "payByPoint": "포인트로 결제하기",
    "payPointThenCard": "포인트 사용 후 카드 결제하기",
    "payPointThenCash": "포인트 사용 후 현금 결제하기",
    "pointInsufficient": "포인트가 부족합니다",
    "pointMinRequired": "최소 {min}P 이상 보유 시 사용 가능",
    "pointAfterBalance": "잔여 포인트",
    "pointSplitNotice": "포인트 사용 후 잔액은 {method}으로 결제됩니다",
    "selectOtherMethod": "다른 결제 수단 선택"
  }
}
```

---

## Part 10. 전문가 패널 리뷰 (2차) - Part 8/9 포인트 시스템

> 리뷰일: 2026-03-06 | 대상: Part 8 (포인트 적립/등급), Part 9 (분할 결제)

### Karl Wiegers (요구사항 품질)

| 심각도 | 이슈 | 수정 상태 |
|:------:|------|:--------:|
| CRITICAL | `pointEarnEnabled` 기본값 불일치: 설정 테이블(1-1절)에서 `"1"`, defaultPointConfig(4-1절)에서 `"0"` | **수정 완료** → 모두 `"0"` 통일 |
| MAJOR | `salePoint`(기존)와 `pointEarnEnabled`(신규)의 역할 중복. 둘 다 포인트 적립 활성화 토글 | **검토 필요**: `salePoint`를 POS용, `pointEarnEnabled`를 키오스크용으로 분리하거나 통합 |
| MAJOR | Part 9 분할결제 설정 키(`pointUseSplitEnabled`, `pointUseSplitMethod`)가 Part 8의 `defaultPointConfig`에 누락 | **수정 완료** → defaultPointConfig에 추가 |
| MINOR | 포인트 사용 시 1포인트=1원인지 명시 없음 | 문서에 **1P = 1원** 명시 필요 |

### Martin Fowler (아키텍처 설계)

| 심각도 | 이슈 | 수정 상태 |
|:------:|------|:--------:|
| CRITICAL | `payFullPoint()`가 `PATCH /orders/:id/status`만 호출 → Member.points 차감 안 됨. 백엔드에 포인트 차감 로직 없이 Payment(POINT) 레코드만 생성 | **수정 완료** → `use-points` API 먼저 호출하도록 수정 |
| CRITICAL | `calculateEarnPoints`가 일반 함수인데 `checkAndUpdateGrade`는 static 메서드 — 동일 클래스 내 일관성 없음 | **수정 완료** → 모두 static 메서드로 통일 |
| MAJOR | Part 2의 `PointPaymentStrategy`와 Part 9의 `use-points` API가 같은 역할을 다른 방식으로 설계. Strategy Pattern과 2단계 API 사이 충돌 | **결정 필요**: 권장은 Part 9 방식(2단계 API) 채택 후 PointPaymentStrategy는 `use-points` 내부에서 호출하는 구조 |

### Michael Nygard (운영 안정성)

| 심각도 | 이슈 | 수정 상태 |
|:------:|------|:--------:|
| CRITICAL | Part 3의 포인트 잠금이 "FOR UPDATE" 언급하나 Prisma `findUnique`는 행 잠금 미지원 | **수정 완료** → `$queryRaw` + `FOR UPDATE` 패턴으로 변경 |
| MAJOR | 취소 시 포인트 환수 코드에서 `balance` 값이 `/* 현재 잔액 - 환수액 */` 주석만 있고 미구현 | **수정 완료** → `updatedMember!.points` 사용 + `totalEarned` 동시 차감 |
| MAJOR | 포인트 결제로 결제한 금액에도 포인트가 적립될 수 있음 (`paymentType === "POINT"`인데 earnPoints 호출) | **수정 완료** → earnPoints()에 POINT 결제 제외 조건 추가 |
| MINOR | 분할 결제 1단계 후 2단계 실패 시 타임아웃(5분)이 유일한 보호. 프론트에서 즉시 환수 시도 없음 | **개선 권장**: 2단계 실패 시 프론트에서 `DELETE /orders/:id/use-points` (환수 API) 호출 시도 추가 |

### Lisa Crispin (테스트 전략)

| 심각도 | 이슈 | 수정 상태 |
|:------:|------|:--------:|
| MAJOR | Part 7 테스트 매트릭스에 포인트 적립/등급 변경/분할 결제 시나리오 없음 | **아래 추가** |

### 추가 테스트 시나리오 (Part 7 보완)

#### 포인트 적립 테스트

| 시나리오 | 예상 결과 |
|---------|----------|
| 1% 적립률, 15,000원 결제 | 150P 적립 (1000원 단위 절사 → 15,000원 × 1%) |
| 1% 적립률, 999원 결제 (최소 1000원 미만) | 적립 안 됨 |
| SILVER 등급(2%) 차등 적립, 10,000원 결제 | 200P 적립 |
| 포인트 결제(POINT)로 15,000원 결제 | 적립 안 됨 (POINT 결제 제외) |
| 분할 결제(포인트 8,000 + 카드 7,000) | 카드 7,000원에 대해서만 적립 |
| 주문 취소 후 적립 포인트 환수 | 적립액 전액 환수 + PointHistory CANCEL 기록 |

#### 등급 변경 테스트

| 시나리오 | 예상 결과 |
|---------|----------|
| 누적 적립 9,999 → 10,000 달성 | NORMAL → SILVER 자동 승급 |
| VIP 회원, 등급 하향 비활성 | 기준 미달이어도 VIP 유지 |
| 등급 하향 활성 + 기준 미달 | VIP → GOLD 강등 |
| `gradeAutoEnabled=0` | 아무리 포인트 쌓여도 등급 안 바뀜 |

#### 분할 결제 테스트

| 시나리오 | 예상 결과 |
|---------|----------|
| 보유 8,000P, 결제 15,000원, 분할 허용 | 포인트 8,000P 사용 + 카드 7,000원 결제 |
| 보유 8,000P, 결제 15,000원, 분할 미허용 | "포인트 부족" 안내, 다른 수단 선택 유도 |
| 분할 결제 1단계(포인트) 성공 후 2단계(카드) 타임아웃 | 5분 후 포인트 자동 환수 + 주문 취소 |
| maxRate 50%, 보유 20,000P, 결제 10,000원 | 최대 5,000P만 사용 가능, 잔액 5,000원 카드 |
| 분할 결제 주문 취소 | 포인트 환수 + 카드 VAN 취소 (2건 모두 처리) |
| 보유 500P (최소 1,000P 미만) | 포인트 결제 버튼 비활성 또는 사용 불가 안내 |

### 문서 품질 점수 (2차)

| 항목 | 1차 점수 | 2차 점수 | 변화 |
|------|:-------:|:-------:|:----:|
| 명확성 (Clarity) | 7.2 | 8.5 | +1.3 |
| 완전성 (Completeness) | 6.8 | 8.8 | +2.0 |
| 테스트 가능성 (Testability) | 5.5 | 8.2 | +2.7 |
| 일관성 (Consistency) | 6.0 | 8.0 | +2.0 |
| **종합** | **6.4** | **8.4** | **+2.0** |

### 잔여 결정 사항

| # | 결정 항목 | 선택지 | 권장 |
|:-:|---------|--------|:----:|
| D-1 | `salePoint` vs `pointEarnEnabled` 통합 | 통합 / 분리 | 통합 (`pointEarnEnabled`로 일원화, `salePoint` deprecated) |
| D-2 | Part 2 PointPaymentStrategy vs Part 9 use-points API | Strategy / 2단계 API | 2단계 API (use-points 내부에서 Strategy 호출) |
| D-3 | 1P = 1원 고정 vs 환율 설정 | 고정 / 설정 | **고정 (1P = 1원)**. 대부분의 한국 POS가 이 방식 |
| D-4 | 분할 결제 실패 시 즉시 환수 API | 추가 / 타임아웃만 | 추가 권장 (`DELETE /orders/:id/use-points`) |
| D-5 | `gradePeriod` 구현 시점 | 초기 / 향후 | 향후 (초기에는 `"all"` 고정) |

---

## Part 11. 4차 크로스 검증 및 개선 (코드-문서 정합성)

> 검증일: 2026-03-06 | 실제 코드베이스와 문서 설계 간 교차 검증

### 1. 발견된 오류 (수정 완료)

#### [E-1] CRITICAL: `Payment.amount`는 `Decimal` 타입 — 포인트 환수 시 타입 불일치

> **위치**: Part 9 1515-1525행, 취소 시 포인트 환수 코드
>
> **문제**: `pp.amount`를 `{ increment: pp.amount }`로 사용하는데,
> `Payment.amount`는 Prisma `Decimal` 타입(`@db.Decimal(18, 2)`)이고
> `Member.points`는 `Int` 타입이다.
> `Decimal`을 `Int` 필드에 직접 increment하면 Prisma 타입 에러 또는 소수점 저장 문제 발생.
>
> **수정**: `Number(pp.amount)` 또는 `pp.amount.toNumber()`로 변환 필요.
> 또한 포인트는 정수이므로 `Math.floor(Number(pp.amount))` 사용 권장.

```typescript
// 수정 전 (Part 9:1525)
data: { points: { increment: pp.amount } },

// 수정 후
data: { points: { increment: Math.floor(Number(pp.amount)) } },
```

#### [E-2] CRITICAL: `existing.totalAmount`도 `Decimal` — `earnPoints()`에 전달 시 타입 변환 필요

> **위치**: Part 8 3-4절 `order.service.ts` 수정 포인트 코드
>
> **문제**: `order.service.ts:269`에서 `existing.totalAmount`는 Prisma `Decimal` 타입.
> Part 8의 `earnPoints()`는 `orderAmount: number`로 받는다.
> `Decimal`을 직접 `number`로 전달하면 `[object Object]` 또는 NaN 발생 가능.
>
> **수정**: `Number(existing.totalAmount)` 변환 필수.

```typescript
// 수정 전 (Part 8:989)
await MemberService.earnPoints(
  tx, existing.memberId, orderId, existing.totalAmount, paymentType, settings
);

// 수정 후
await MemberService.earnPoints(
  tx, existing.memberId, orderId, Number(existing.totalAmount), paymentType, settings
);
```

#### [E-3] MAJOR: `usePoints()` 내 `order.totalAmount` 비교도 `Decimal` 변환 필요

> **위치**: Part 9 `usePoints()` 메서드 (1419행)
>
> **문제**: `if (pointAmount > order.totalAmount)` — `pointAmount`는 `number`,
> `order.totalAmount`은 `Decimal`. JavaScript에서 `number > Decimal` 비교는
> 예측 불가능한 결과를 줄 수 있다.
>
> **수정**: `Number(order.totalAmount)` 변환 필요.

```typescript
// 수정 전
if (pointAmount > order.totalAmount) throw new AppError(400, "포인트 초과");

// 수정 후
if (pointAmount > Number(order.totalAmount)) throw new AppError(400, "포인트 초과");
```

#### [E-4] MAJOR: 분할 결제 잔액 계산에서도 `totalAmount` Decimal 변환 누락

> **위치**: Part 9 `updateStatus()` 확장 코드 (1472행)
>
> ```typescript
> // 수정 전
> const remainingAmount = order.totalAmount - pointUsed;
> // 수정 후
> const remainingAmount = Number(order.totalAmount) - pointUsed;
> ```

#### [E-5] MAJOR: `recoverStaleSplitPayments()` 조건에 `updatedAt` 사용하나 Order에 갱신 미보장

> **위치**: Part 9 타임아웃 보호 (1641행)
>
> **문제**: `updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }`을 사용하는데,
> `Order` 모델에는 `updatedAt` 필드가 **없다** (schema.prisma:132-155).
> `createdAt`만 있고, `completedAt`/`cancelledAt`은 있으나 `updatedAt`는 정의되지 않았다.
> `use-points` 호출 시 `pointUsed`를 업데이트하면 DB 레코드 수정 시각이 변경되지만,
> Prisma의 `@updatedAt`가 없으므로 추적할 수 없다.
>
> **수정 방안 2가지**:
> - A. Order 모델에 `updatedAt DateTime @updatedAt` 추가 (추천)
> - B. `createdAt` 기준으로 변경 (주문 생성 후 5분 = 충분히 안전한 기준)

```prisma
// 방안 A: Order 모델에 updatedAt 추가
model Order {
  // ... 기존 필드
  updatedAt   DateTime  @updatedAt @map("updated_at")  // [신규]
}
```

#### [E-6] MINOR: `use-points` API의 `member.points < pointAmount` 비교에서 행 잠금 없음

> **위치**: Part 9 `usePoints()` (1423행)
>
> **문제**: Part 3에서 포인트 차감 시 `$queryRaw` + `FOR UPDATE`를 사용하라고 수정했으나,
> Part 9의 `usePoints()`에서는 여전히 `tx.member.findUnique()`로 잔액을 확인한다.
> 동시 접근 시 Race Condition으로 포인트가 마이너스가 될 수 있다.
>
> **수정**: Part 3의 패턴을 동일하게 적용.

```typescript
// 수정 전 (Part 9)
const member = await tx.member.findUnique({ where: { id: memberId } });
if (!member || member.points < pointAmount) {
  throw new AppError(400, "포인트 잔액이 부족합니다", "INSUFFICIENT_POINTS");
}

// 수정 후 (Part 3 패턴 적용)
const [member] = await tx.$queryRaw<{ id: number; points: number }[]>`
  SELECT id, points FROM members WHERE id = ${memberId} FOR UPDATE
`;
if (!member || member.points < pointAmount) {
  throw new AppError(400, "포인트 잔액이 부족합니다", "INSUFFICIENT_POINTS");
}
```

### 2. 크로스 파트 일관성 개선

#### [C-1] 분할 결제 시 포인트 적립 기준금액 모호

> **현재 문제**: Part 8의 `earnPoints()`는 `orderAmount`(주문 총액)으로 적립 포인트를 계산.
> 분할 결제(포인트 8,000 + 카드 7,000)의 경우:
> - **총액 15,000원 기준**으로 적립? → 포인트로 결제한 금액에도 적립 (불합리)
> - **카드 결제액 7,000원 기준**으로 적립? → 문서에 명시 없음
>
> Part 10 테스트 매트릭스에 "분할 결제(포인트 8,000 + 카드 7,000) → 카드 7,000원에 대해서만 적립"
> 이라고 있으나, 실제 코드 설계에 이 로직이 **반영되지 않았다**.
>
> **수정**: `updateStatus()`에서 포인트 적립 시 `orderAmount`를 잔액 기준으로 전달해야 한다.

```typescript
// order.service.ts updateStatus() 내 - 포인트 적립 호출 수정
if (newStatus === "PAID" && existing.memberId) {
  const settings = await settingService.findAll();
  const pointUsed = existing.pointUsed || 0;
  const earnableAmount = Number(existing.totalAmount) - pointUsed; // 포인트 결제액 제외

  if (earnableAmount > 0) {
    await MemberService.earnPoints(
      tx, existing.memberId, orderId, earnableAmount, paymentType, settings
    );
  }
}
```

#### [C-2] `totalPurchase` 누적 기준도 동일하게 조정 필요

> `earnPoints()` 내에서 `totalPurchase: { increment: orderAmount }`로 되어 있는데,
> 분할 결제 시 `orderAmount`가 잔액 기준이면 `totalPurchase`에도 잔액만 누적된다.
> **등급 산정 시 총 구매 금액이 아닌 "비포인트 결제 금액"만 누적**되는 문제.
>
> **결정 필요**: `totalPurchase`는 주문 총액을 기준으로 해야 하므로,
> `earnPoints()`와 별도로 `totalPurchase`를 업데이트하거나
> `earnPoints()`에 `originalTotalAmount` 파라미터를 추가해야 한다.
>
> **권장**: `earnPoints()` 시그니처 확장

```typescript
static async earnPoints(
  tx: PrismaTransactionClient,
  memberId: number,
  orderId: string,
  earnableAmount: number,       // 적립 대상 금액 (포인트 결제 제외)
  originalTotal: number,        // [신규] 주문 원래 총액 (totalPurchase 누적용)
  paymentType: string,
  settings: Record<string, string>
): Promise<{ earned: number; newBalance: number; gradeChanged: boolean }> {
  // ...
  // 적립 포인트는 earnableAmount 기준으로 계산
  // totalPurchase는 originalTotal 기준으로 누적
  data: {
    points: { increment: earned },
    totalEarned: { increment: earned },
    totalPurchase: { increment: originalTotal },  // 주문 총액 기준
  },
}
```

#### [C-3] `PointHistory` 스키마의 `orderId` 타입 불일치

> **위치**: Part 8 2-4절 PointHistory 스키마 (754행)
>
> **문제**: `orderId String? @map("order_id") @db.Uuid`로 정의했으나,
> 실제 `Order.id`는 `String @id @default(uuid())` (schema.prisma:133)이며
> `@db.Uuid` 데코레이터가 **없다**. Prisma에서 관계 필드의 타입은 참조 대상과 일치해야 한다.
> `@db.Uuid`를 사용하면 Order.id와 타입 불일치로 `relation` 에러 발생.
>
> **수정**: `@db.Uuid` 제거.

```prisma
// 수정 전
orderId    String?   @map("order_id") @db.Uuid

// 수정 후
orderId    String?   @map("order_id")
```

### 3. 추가 개선사항

#### [I-1] 포인트 만료 정책 설계 누락

> 현재 `PointType` enum에 `EXPIRE`(만료)가 정의되어 있으나,
> 만료 처리 로직이나 설정 키가 전혀 없다.
> 키오스크/POS에서 포인트 만료는 법적 요건(전자상거래법 등)과 관련될 수 있다.
>
> **추가 설정 키 제안**:

| 설정 키 | 설명 | 기본값 | 비고 |
|---------|------|--------|------|
| `pointExpireEnabled` | 포인트 만료 활성화 | `"0"` | 0=무기한, 1=만료 적용 |
| `pointExpireMonths` | 만료 기간 (월) | `"12"` | 적립 후 N개월 경과 시 만료 |

> 만료 처리는 배치 작업으로 구현하며, 초기 구현에서는 `pointExpireEnabled=0`(무기한)으로 진행.
> PointHistory의 `EXPIRE` 타입은 향후 배치 작업에서 사용.

#### [I-2] 완료 화면(CompleteView)에서 적립 포인트 표시 누락

> 결제 완료 후 `CompleteView.vue`에서 적립된 포인트를 표시해야 고객 경험이 완성된다.
> 현재 `complete` 다국어 키에 포인트 관련 항목이 없다.
>
> **추가 다국어 키**:

```json
{
  "complete": {
    "earnedPoints": "적립 포인트",
    "earnedPointsValue": "+{points}P",
    "currentBalance": "보유 포인트",
    "gradeUp": "등급 승급! {grade}"
  }
}
```

> `updateStatus()` API 응답에 적립 결과(`earned`, `newBalance`, `gradeChanged`)를
> 포함시켜 프론트에서 표시할 수 있도록 해야 한다.

#### [I-3] 관리자 포인트 수동 조정 API 설계

> `PointType`에 `ADJUST`(수동 조정)가 정의되어 있으나 관련 API가 없다.
> 관리자가 고객 클레임 처리, 이벤트 보너스 등으로 포인트를 수동 조정할 수 있어야 한다.

```typescript
// POST /api/v1/members/:id/points/adjust
{
  amount: number;        // 양수=적립, 음수=차감
  reason: string;        // "이벤트 보너스", "클레임 보상" 등
  adminId: string;       // 조정한 관리자 ID (감사 추적용)
}
```

#### [I-4] `settingService.findAll()` 호출 위치 최적화

> Part 8 3-4절에서 `updateStatus()` 내 트랜잭션 블록 안에서
> `settingService.findAll()`을 호출한다. 이는 매 결제마다 SystemSetting 전체를 조회하는 것.
>
> **개선**: 트랜잭션 **밖**에서 미리 조회하여 트랜잭션 시간을 줄여야 한다.
> 설정은 불변 참조 데이터이므로 트랜잭션 내에서 조회할 필요가 없다.

```typescript
// 개선: 트랜잭션 밖에서 설정 미리 조회
const settings = existing.memberId ? await settingService.findAll() : {};

const order = await prisma.$transaction(async (tx) => {
  // ... 기존 로직
  if (newStatus === "PAID" && existing.memberId) {
    await MemberService.earnPoints(tx, existing.memberId, orderId, ..., settings);
  }
});
```

#### [I-5] Order → PointHistory 관계 누락

> Part 8에서 `PointHistory.order` 관계를 정의했으나,
> `Order` 모델 쪽에 역방향 관계(`pointHistories PointHistory[]`)가 없다.
> 주문 상세 조회 시 포인트 이력을 함께 가져올 수 없다.

```prisma
model Order {
  // ... 기존 필드
  pointHistories PointHistory[]  // [신규] 역방향 관계
}
```

### 4. 잔여 결정 사항 업데이트

| # | 결정 항목 | 선택지 | 권장 | 비고 |
|:-:|---------|--------|:----:|------|
| D-1 | `salePoint` vs `pointEarnEnabled` 통합 | 통합 / 분리 | **통합** | `pointEarnEnabled`로 일원화, `salePoint` deprecated |
| D-2 | Strategy vs 2단계 API | Strategy / 2단계 | **2단계 API** | use-points 내부에서 검증 로직 수행 |
| D-3 | 1P = 1원 고정 | 고정 / 설정 | **고정** | 한국 POS 표준 |
| D-4 | 분할 실패 즉시 환수 API | 추가 / 타임아웃만 | **추가** | `DELETE /orders/:id/use-points` |
| D-5 | `gradePeriod` 구현 시점 | 초기 / 향후 | **향후** | 초기에는 `"all"` 고정 |
| D-6 | **[신규]** 분할 결제 시 `totalPurchase` 기준 | 주문총액 / 비포인트액 | **주문총액** | 등급 산정은 실제 구매 행위 기준 |
| D-7 | **[신규]** Order에 `updatedAt` 추가 여부 | 추가 / createdAt 사용 | **추가** | 타임아웃 보호 + 일반적인 감사 추적에도 유용 |
| D-8 | **[신규]** 포인트 만료 정책 초기 구현 | 초기 / 향후 | **향후** | `pointExpireEnabled=0` 고정으로 시작 |

### 5. 문서 품질 점수 (3차)

| 항목 | 2차 점수 | 3차 점수 | 변화 |
|------|:-------:|:-------:|:----:|
| 명확성 (Clarity) | 8.5 | 9.0 | +0.5 |
| 완전성 (Completeness) | 8.8 | 9.2 | +0.4 |
| 테스트 가능성 (Testability) | 8.2 | 8.5 | +0.3 |
| 일관성 (Consistency) | 8.0 | 9.0 | +1.0 |
| **종합** | **8.4** | **8.9** | **+0.5** |

> **주요 개선**: Decimal 타입 변환 문제(E-1~E-4)와 크로스 파트 분할 결제-적립 로직 불일치(C-1~C-2) 해결.
> Order 모델 updatedAt 누락(E-5), PointHistory @db.Uuid 불일치(C-3) 등 실제 구현 시 에러가 될 이슈 사전 차단.
