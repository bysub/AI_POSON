# 결제 시스템 구현 워크플로우

> 기준 문서: `.doc/payment-method-management-analysis.md` (Part 1~11)
> 작성일: 2026-03-06
> 총 예상 스프린트: 6 스프린트 (Sprint 0 ~ Sprint 5)
> **최종 완료일: 2026-03-09 — 전체 6 Sprint, 19 Phase, 59 Task 구현 완료**

---

## 전체 구현 맵

```
Sprint 0 (선행작업) ✅ 완료
  ├── Phase 0-1: 설계 결정 확정 (D-1 ~ D-8) ✅
  ├── Phase 0-2: 타입 불일치 수정 (PaymentStatus, PaymentType) ✅
  └── Phase 0-3: DB 스키마 마이그레이션 (일괄) ✅

Sprint 1 (결제 수단 기반) ✅ 완료
  ├── Phase 1-1: 결제 수단 on/off 설정 ✅
  ├── Phase 1-2: PaymentView 리팩토링 ✅
  ├── Phase 1-3: 카드 승인정보 전달 수정 ✅
  └── Phase 1-4: 백엔드 결제 수단 검증 ✅

Sprint 2 (포인트 적립 시스템) ✅ 완료
  ├── Phase 2-1: 포인트 설정 UI ✅
  ├── Phase 2-2: MemberService 포인트 적립 로직 ✅
  ├── Phase 2-3: OrderService 적립 연동 ✅
  └── Phase 2-4: 포인트 환수 + 등급 자동 변경 ✅

Sprint 3 (포인트 결제 + 분할 결제) ✅ 완료
  ├── Phase 3-1: PointPayment.vue 컴포넌트 ✅
  ├── Phase 3-2: use-points API + 분할 결제 백엔드 ✅
  ├── Phase 3-3: 취소 시 포인트 환수 통합 ✅
  └── Phase 3-4: 타임아웃 보호 + 다국어 ✅

Sprint 4 (VAN 카드형 확장) ✅ 완료
  ├── Phase 4-1: 애플페이 / 해외카드 연동 ✅
  └── Phase 4-2: 완료 화면 포인트 표시 + 관리자 기능 ✅

Sprint 5 (PG 간편결제 + 실 VAN) ✅ 완료
  ├── Phase 5-1: QrPayment 컴포넌트 + PG Strategy ✅
  └── Phase 5-2: CardPayment 실제 VAN 연동 ✅
```

---

## Sprint 0. 선행 작업 (Foundation) ✅ 완료

> 목표: 모든 스프린트의 선행 조건 해소. 설계 결정 + 타입 정합성 + DB 스키마 일괄 마이그레이션.

### Phase 0-1: 설계 결정 확정 ✅

| ID | 결정 항목 | 권장 안 | 관련 Part |
|:--:|---------|--------|:---------:|
| D-1 | `salePoint` vs `pointEarnEnabled` | **통합** (`pointEarnEnabled`로 일원화) | 8, 10 |
| D-2 | Strategy vs 2단계 API | **2단계 API** (use-points) | 2, 9, 10 |
| D-3 | 1P = 1원 고정 | **고정** | 10 |
| D-4 | 분할 실패 즉시 환수 API | **추가** (`DELETE /orders/:id/use-points`) | 9, 10 |
| D-5 | `gradePeriod` 구현 시점 | **향후** (초기 `"all"` 고정) | 8, 10 |
| D-6 | `totalPurchase` 기준 | **주문 총액** | 11 |
| D-7 | Order에 `updatedAt` 추가 | **추가** | 11 |
| D-8 | 포인트 만료 초기 구현 | **향후** (`pointExpireEnabled=0` 고정) | 11 |

**산출물**: 결정 사항 확정 기록 (analysis.md 업데이트)

---

### Phase 0-2: 타입 불일치 수정 ✅

> 분석 문서: Part 2 (PaymentStatus), Part 5 (0a)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-0.2.1** | `backend/src/types/payment.ts` | `PaymentStatus` 7개 → Prisma enum 5개로 동기화. `AUTHORIZED`→`APPROVED`, `CAPTURED`/`PARTIAL_REF` 제거 |
| **T-0.2.2** | `backend/src/types/payment.ts` | `PaymentType`에 `SIMPLE_PAY`, `POINT` 추가 |
| **T-0.2.3** | `backend/src/routes/orders.ts` | `paymentType` Zod 검증 강화: `z.enum(["CARD","CASH","SIMPLE_PAY","POINT","MIXED"])` |
| **T-0.2.4** | `backend/src/routes/payments.ts` | Zod enum에 `SIMPLE_PAY`, `POINT`, `MIXED` 추가 |

**의존성**: 없음 (즉시 착수 가능)
**변경 파일**: 3개

---

### Phase 0-3: DB 스키마 일괄 마이그레이션 ✅

> 분석 문서: Part 2, 8, 9, 11

Sprint 1~3에서 필요한 스키마 변경을 **단일 마이그레이션**으로 일괄 처리.
마이그레이션을 나누면 각 스프린트마다 DB 변경이 생겨 운영 리스크 증가.

```prisma
// 단일 마이그레이션에 포함할 변경 사항

// 1. PaymentType enum 확장 (Part 2)
enum PaymentType {
  CARD
  CASH
  SIMPLE_PAY   // [신규]
  POINT        // [신규]
  MIXED
}

// 2. Payment 모델 - paymentMethod 필드 (Part 2)
model Payment {
  // + paymentMethod String? @map("payment_method") @db.VarChar(30)
}

// 3. Member 모델 확장 (Part 8)
model Member {
  // + totalEarned   Int @default(0) @map("total_earned")
  // + totalPurchase Int @default(0) @map("total_purchase")
}

// 4. PointHistory 테이블 신규 (Part 8)
// + model PointHistory { ... }
// + enum PointType { EARN, USE, CANCEL, EXPIRE, ADJUST }

// 5. Order 모델 확장 (Part 9, 11)
model Order {
  // + pointUsed  Int? @default(0) @map("point_used")
  // + updatedAt  DateTime @updatedAt @map("updated_at")
}

// 6. Order ↔ PointHistory 관계 (Part 11 I-5)
```

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-0.3.1** | `backend/prisma/schema.prisma` | 위 6개 항목 일괄 반영 |
| **T-0.3.2** | 터미널 | `npx prisma migrate dev --name payment-point-system` |
| **T-0.3.3** | `backend/prisma/schema.prisma` | `npx prisma generate` (클라이언트 재생성) |

**의존성**: Phase 0-2 완료 후
**변경 파일**: 1개 (schema.prisma)

---

## Sprint 1. 결제 수단 기반 (Payment Foundation) ✅ 완료

> 목표: 결제 수단 on/off 토글 + PaymentView 리팩토링 + 승인정보 전달 수정
> 선행: Sprint 0 완료

### Phase 1-1: 결제 수단 on/off 설정 ✅

> 분석 문서: Part 1

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-1.1.1** | `frontend/.../admin/settingsData.ts` | `defaultPaymentConfig`에 10개 결제 수단 설정 키 추가 |
| **T-1.1.2** | `frontend/.../admin/settingsData.ts` | `paymentToggles`에 10개 토글 항목 추가 |
| **T-1.1.3** | `frontend/.../admin/SettingsView.vue` | 결제 정책 탭에 토글 UI 렌더링 확인 |

**변경 파일**: 2개

---

### Phase 1-2: PaymentView 리팩토링 ✅

> 분석 문서: Part 1 (PaymentMethodDef), Part 2 (PaymentStep 확장)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-1.2.1** | `frontend/.../views/PaymentView.vue` | `PaymentMethodDef` 인터페이스 정의 (settingKey, stepType, backendType) |
| **T-1.2.2** | `frontend/.../views/PaymentView.vue` | `paymentMethods` 배열을 `PaymentMethodDef[]`로 재정의 |
| **T-1.2.3** | `frontend/.../views/PaymentView.vue` | `enabledMethods` computed 추가 (settingsStore 연동 필터링) |
| **T-1.2.4** | `frontend/.../views/PaymentView.vue` | `PaymentStep` 타입에 `"qr-pay"`, `"point-pay"` 추가 |
| **T-1.2.5** | `frontend/.../views/PaymentView.vue` | `proceedPayment()`에서 `selectedMethodDef.stepType` 참조하도록 수정 |

**의존성**: Phase 1-1 완료 후
**변경 파일**: 1개 (PaymentView.vue)

---

### Phase 1-3: 카드 승인정보 전달 수정 ✅

> 분석 문서: Part 2 (handleCardSuccess 하드코딩)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-1.3.1** | `frontend/.../views/PaymentView.vue` | `handleCardSuccess()`에서 `paymentType`을 `selectedMethodDef.backendType`으로 변경 |
| **T-1.3.2** | `frontend/.../views/PaymentView.vue` | API 호출에 `paymentMethod`, `approvalNumber`, `transactionId` 추가 전달 |
| **T-1.3.3** | `backend/src/services/order.service.ts` | `UpdateStatusInput` 인터페이스에 `paymentMethod?`, `approvalNumber?`, `transactionId?` 추가 |
| **T-1.3.4** | `backend/src/services/order.service.ts` | `updateStatus()` 내 Payment 생성 시 추가 필드 저장 |
| **T-1.3.5** | `backend/src/routes/orders.ts` | Zod 스키마에 `paymentMethod`, `approvalNumber`, `transactionId` 옵션 필드 추가 |

**의존성**: Phase 0-3 (paymentMethod 필드 DB 추가)
**변경 파일**: 3개

---

### Phase 1-4: 백엔드 결제 수단 검증 ✅

> 분석 문서: Part 3 (설정 변조 방지)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-1.4.1** | `backend/src/routes/orders.ts` | PAID 전환 전 `SystemSetting` 조회 → 비활성 수단 거부 (403) |
| **T-1.4.2** | `backend/src/routes/orders.ts` | `SIMPLE_PAY`는 `paymentMethod`로 세분화 검증 |

**의존성**: Phase 1-1 (설정 키 존재)
**변경 파일**: 1개

---

## Sprint 2. 포인트 적립 시스템 (Point Earning) ✅ 완료

> 목표: 포인트 적립 설정 + 적립 로직 + 등급 자동 변경
> 선행: Sprint 0 완료 (DB 마이그레이션)

### Phase 2-1: 포인트 설정 UI ✅

> 분석 문서: Part 8 섹션 4-1, 4-2, 섹션 5

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-2.1.1** | `frontend/.../admin/settingsData.ts` | `defaultPointConfig` 확장 (28개 신규 키) |
| **T-2.1.2** | `frontend/.../admin/settingsData.ts` | `pointToggles` 확장 (8개 신규 토글) |
| **T-2.1.3** | `frontend/.../admin/SettingsView.vue` | 포인트/회원 탭 UI 확장 (적립 설정 + 등급 설정 + 포인트 사용 섹션) |

**의존성**: 없음 (Sprint 0 후 즉시)
**변경 파일**: 2개

---

### Phase 2-2: MemberService 포인트 적립 로직 ✅

> 분석 문서: Part 8 섹션 3-3

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-2.2.1** | `backend/src/services/member.service.ts` | `static earnPoints()` 메서드 추가 |
| **T-2.2.2** | `backend/src/services/member.service.ts` | `static calculateEarnPoints()` 메서드 추가 |
| **T-2.2.3** | `backend/src/services/member.service.ts` | `static checkAndUpdateGrade()` 메서드 추가 |

**핵심 주의사항**:
- `paymentType === "POINT"` 시 적립 제외 (무한 루프 방지)
- `Decimal` → `Number()` 변환 필수 (Part 11 E-2)
- 분할 결제 시 `earnableAmount` = 주문총액 - pointUsed (Part 11 C-1)
- `totalPurchase`는 주문 원래 총액 기준 (Part 11 C-2, D-6)

**의존성**: Phase 0-3 (Member 모델 확장, PointHistory 테이블)
**변경 파일**: 1개

---

### Phase 2-3: OrderService 적립 연동 ✅

> 분석 문서: Part 8 섹션 3-4

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-2.3.1** | `backend/src/services/order.service.ts` | `updateStatus()` 내 `$transaction`에 포인트 적립 로직 추가 |
| **T-2.3.2** | `backend/src/services/order.service.ts` | `settingService.findAll()`을 트랜잭션 **밖**에서 미리 조회 (Part 11 I-4) |
| **T-2.3.3** | `backend/src/services/order.service.ts` | 적립 결과 (`earned`, `newBalance`, `gradeChanged`)를 API 응답에 포함 |

**의존성**: Phase 2-2 완료 후
**변경 파일**: 1개

---

### Phase 2-4: 포인트 환수 + 등급 자동 변경 ✅

> 분석 문서: Part 8 섹션 3-5

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-2.4.1** | `backend/src/services/order.service.ts` | CANCELLED 전환 시 EARN 이력 조회 → 포인트 환수 + `totalEarned` decrement |
| **T-2.4.2** | `backend/src/services/order.service.ts` | 환수 시 PointHistory(CANCEL) 생성 |

**의존성**: Phase 2-3 완료 후
**변경 파일**: 1개

---

## Sprint 3. 포인트 결제 + 분할 결제 (Point Payment) ✅ 완료

> 목표: PointPayment 컴포넌트 + use-points API + 분할 결제 + 타임아웃 보호
> 선행: Sprint 2 완료

### Phase 3-1: PointPayment.vue 컴포넌트 ✅

> 분석 문서: Part 9 (PointPayment.vue 핵심 로직)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-3.1.1** | `frontend/.../components/payment/PointPayment.vue` | 신규 컴포넌트 생성 (4개 시나리오 분기) |
| **T-3.1.2** | `frontend/.../views/PaymentView.vue` | `currentStep === "point-pay"` 시 `<PointPayment />` 렌더링 |
| **T-3.1.3** | `frontend/.../views/PaymentView.vue` | `splitRequired` 이벤트 핸들러 (잔액 카드/현금 전환) |
| **T-3.1.4** | `frontend/.../components/index.ts` | PointPayment export 추가 |

**핵심 주의사항**:
- 설정값은 `computed()`로 반응성 유지 (Part 10 MINOR 수정)
- `payFullPoint()`에서 반드시 `use-points` API 먼저 호출 (Part 10 수정)

**변경 파일**: 3개 (1개 신규, 2개 수정)

---

### Phase 3-2: use-points API + 분할 결제 백엔드 ✅

> 분석 문서: Part 9 (Backend 분할 결제 처리)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-3.2.1** | `backend/src/services/order.service.ts` | `usePoints()` 메서드 추가 (행 잠금 + 포인트 차감 + Payment(POINT) 생성) |
| **T-3.2.2** | `backend/src/routes/orders.ts` | `POST /orders/:id/use-points` 라우트 추가 |
| **T-3.2.3** | `backend/src/services/order.service.ts` | `updateStatus()` 확장 — PAID 전환 시 `pointUsed` 확인 → 잔액 기준 Payment 생성 |
| **T-3.2.4** | `backend/src/services/order.service.ts` | `cancelUsePoints()` 메서드 추가 (D-4: 즉시 환수 API) |
| **T-3.2.5** | `backend/src/routes/orders.ts` | `DELETE /orders/:id/use-points` 라우트 추가 (즉시 환수) |

**핵심 주의사항**:
- `$queryRaw` + `FOR UPDATE` 행 잠금 (Part 3, 11 E-6)
- `Number(order.totalAmount)` Decimal 변환 (Part 11 E-3, E-4)
- 잔액 기준 적립금 계산 (Part 11 C-1)

**변경 파일**: 2개

---

### Phase 3-3: 취소 시 포인트 환수 통합 ✅

> 분석 문서: Part 9 (분할 결제 취소)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-3.3.1** | `backend/src/services/order.service.ts` | CANCELLED 전환 시 Payment(POINT) 조회 → `Decimal` 변환 후 환수 (Part 11 E-1) |
| **T-3.3.2** | `backend/src/services/order.service.ts` | 적립 환수(Phase 2-4)와 사용 환수 통합 — EARN과 USE 모두 환수 처리 |

**의존성**: Phase 2-4 + Phase 3-2 완료 후
**변경 파일**: 1개

---

### Phase 3-4: 타임아웃 보호 + 다국어 ✅

> 분석 문서: Part 9 (타임아웃 보호, 다국어)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-3.4.1** | `backend/src/utils/` 또는 `backend/src/jobs/` | `recoverStaleSplitPayments()` 배치 함수 (5분 주기) |
| **T-3.4.2** | `backend/src/index.ts` | `setInterval` 또는 `node-cron`으로 배치 등록 |
| **T-3.4.3** | `frontend/.../locales/ko.json` | 포인트 결제 관련 14개 다국어 키 추가 |
| **T-3.4.4** | `frontend/.../locales/en.json` | 영문 번역 |
| **T-3.4.5** | `frontend/.../locales/ja.json` | 일문 번역 |
| **T-3.4.6** | `frontend/.../locales/zh.json` | 중문 번역 |
| **T-3.4.7** | `frontend/.../admin/settingsData.ts` | `pointUseSplitEnabled`, `pointUseSplitMethod` 설정 키 추가 확인 |

**의존성**: Phase 3-2 완료 후
**변경 파일**: 6~7개

---

## Sprint 4. VAN 카드형 확장 + 완료 화면 (Enhancement) ✅ 완료

> 목표: 애플페이/해외카드 + 완료 화면 포인트 표시 + 관리자 포인트 기능
> 선행: Sprint 1 Phase 1-2 완료

### Phase 4-1: 애플페이 / 해외카드 연동 ✅

> 분석 문서: Part 2 (VAN 카드형)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-4.1.1** | `frontend/.../views/PaymentView.vue` | 애플페이/해외카드 선택 시 `stepType: "card"` → 기존 CardPayment 재사용 |
| **T-4.1.2** | `frontend/.../components/payment/CardPayment.vue` | NFC(애플페이) vs IC/MSR(해외카드) 분기 안내 메시지 |

**변경 파일**: 2개

---

### Phase 4-2: 완료 화면 포인트 표시 + 관리자 기능 ✅

> 분석 문서: Part 11 (I-2, I-3)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-4.2.1** | `frontend/.../views/kiosk/CompleteView.vue` | 적립 포인트 / 잔여 포인트 / 등급 승급 표시 |
| **T-4.2.2** | `frontend/.../locales/*.json` | `complete.earnedPoints` 등 4개 다국어 키 추가 (4개 언어) |
| **T-4.2.3** | `frontend/.../views/kiosk/PointSelectView.vue` | 적립 예정 포인트 표시 (Part 8 P-7) |
| **T-4.2.4** | `backend/src/routes/members.ts` | `GET /members/:id/point-histories` 이력 조회 API |
| **T-4.2.5** | `backend/src/routes/members.ts` | `POST /members/:id/points/adjust` 수동 조정 API (Part 11 I-3) |
| **T-4.2.6** | `frontend/.../views/admin/MembersView.vue` | 포인트 이력 탭 + 수동 조정 UI |

**의존성**: Sprint 2 완료 후 (포인트 적립 로직 필요)
**변경 파일**: 6~8개

---

## Sprint 5. PG 간편결제 + 실 VAN 연동 (External Integration) ✅ 완료

> 목표: PG 사 연동 (페이코/위쳇/알리) + CardPayment 실 VAN 교체
> 선행: Sprint 1 완료 + PG사 계약 완료

### Phase 5-1: QrPayment + PG Strategy ✅

> 분석 문서: Part 2 (PG 간편결제), Part 3 (CircuitBreaker)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-5.1.1** | `frontend/.../components/payment/QrPayment.vue` | QR 표시 + 폴링 결제 확인 컴포넌트 |
| **T-5.1.2** | `frontend/.../views/PaymentView.vue` | `currentStep === "qr-pay"` 시 QrPayment 렌더링 |
| **T-5.1.3** | `backend/src/services/payment/strategies/payco-payment.strategy.ts` | PaycoPaymentStrategy |
| **T-5.1.4** | `backend/src/services/payment/strategies/wechat-payment.strategy.ts` | WechatPaymentStrategy |
| **T-5.1.5** | `backend/src/services/payment/strategies/alipay-payment.strategy.ts` | AlipayPaymentStrategy |
| **T-5.1.6** | `backend/src/routes/webhooks.ts` | PG Webhook 수신 엔드포인트 (서명 검증) |

**변경 파일**: 6개 (4개 신규, 2개 수정)

---

### Phase 5-2: CardPayment 실제 VAN 연동 ✅

> 분석 문서: Part 2 (CardPayment 시뮬레이션)

| 태스크 | 파일 | 변경 내용 |
|--------|------|----------|
| **T-5.2.1** | `frontend/src/main/index.ts` | Electron Main Process에 VAN 단말 IPC 핸들러 구현 |
| **T-5.2.2** | `frontend/src/preload/index.ts` | `terminal.requestPayment` IPC 핸들러 연결 확인 |
| **T-5.2.3** | `frontend/.../components/payment/CardPayment.vue` | 시뮬레이션 제거 → IPC API 호출로 교체 |

**변경 파일**: 3개

---

## 의존성 그래프

```
Sprint 0
  Phase 0-1 (설계 결정)─────────┐
  Phase 0-2 (타입 수정)──┐      │
                         ▼      │
  Phase 0-3 (DB 마이그레이션)───┤
         │                      │
         ├──────────────────────┘
         │
         ▼
Sprint 1 ──────────────────── Sprint 2
  Phase 1-1 (설정 on/off)       Phase 2-1 (포인트 설정 UI)
      │                              │
      ▼                              ▼
  Phase 1-2 (PaymentView)       Phase 2-2 (earnPoints)
      │                              │
      ├── Phase 1-3 (승인정보)       ▼
      │       │                 Phase 2-3 (적립 연동)
      │       ▼                      │
      │   Phase 1-4 (검증)           ▼
      │                         Phase 2-4 (환수 + 등급)
      │                              │
      ▼                              ▼
Sprint 4 (VAN 확장)           Sprint 3
  Phase 4-1 (애플/해외)         Phase 3-1 (PointPayment.vue)
      │                              │
      ▼                              ▼
  Phase 4-2 (완료화면)          Phase 3-2 (use-points API)
                                     │
                                     ▼
                                Phase 3-3 (취소 통합)
                                     │
                                     ▼
                                Phase 3-4 (타임아웃 + i18n)

Sprint 5 (PG + VAN 실연동) ← Sprint 1 + PG 계약 완료 후
```

> **Sprint 1과 Sprint 2는 병렬 진행 가능** — DB 마이그레이션(Phase 0-3)만 완료되면
> 결제 수단 기반(Sprint 1)과 포인트 적립(Sprint 2)은 독립적으로 작업할 수 있다.

---

## 전체 태스크 요약

| Sprint | Phase 수 | 태스크 수 | 변경 파일 | 핵심 난이도 | 상태 |
|:------:|:--------:|:---------:|:---------:|:-----------:|:----:|
| **0** | 3 | 7 | ~5 | 낮음 | ✅ |
| **1** | 4 | 12 | ~7 | 낮음~중간 | ✅ |
| **2** | 4 | 9 | ~4 | 중간 | ✅ |
| **3** | 4 | 14 | ~12 | 중간~높음 | ✅ |
| **4** | 2 | 8 | ~10 | 낮음~중간 | ✅ |
| **5** | 2 | 9 | ~9 | 높음 | ✅ |
| **합계** | **19** | **59** | - | - | **전체 완료** |

---

## 리스크 및 주의사항

| 리스크 | 영향 | 대응 |
|--------|------|------|
| PG사 계약 지연 | Sprint 5 차단 | Sprint 5를 마지막에 배치 — 계약 병행 가능 |
| Prisma Decimal 타입 이슈 | 런타임 에러 | 모든 `amount`/`totalAmount` 사용 시 `Number()` 변환 (Part 11) |
| 포인트 Race Condition | 동시 결제 시 마이너스 | `$queryRaw` + `FOR UPDATE` 행 잠금 필수 |
| 분할 결제 중 이탈 | 포인트 잠김 | 타임아웃 보호(5분) + 즉시 환수 API 이중 안전장치 |
| 설정 키 28개 대량 추가 | 설정 UI 복잡 | 섹션별 폴딩/아코디언 UI 적용 |
| 다국어 키 18+개 추가 | 번역 누락 | Sprint 3-4에 일괄 처리, 4개 언어 동시 추가 |

---

## 검증 체크리스트 (스프린트별)

### Sprint 0 완료 시 ✅
- [x] `PaymentStatus` TS와 Prisma enum 일치 확인
- [x] `PaymentType`에 SIMPLE_PAY, POINT 추가 확인
- [x] DB 마이그레이션 정상 적용 (PointHistory 테이블, Member 필드, Order 필드)
- [x] `npx prisma generate` 후 타입 에러 없음

### Sprint 1 완료 시 ✅
- [x] 관리자 설정에서 결제 수단 비활성화 → PaymentView에서 미노출
- [x] 카드 결제 시 Payment.paymentMethod에 수단 코드 저장
- [x] 비활성 수단 API 직접 호출 → 403 응답

### Sprint 2 완료 시 ✅
- [x] 15,000원 결제 → 1% 적립 = 150P 확인
- [x] POINT 결제 → 적립 안 됨 확인
- [x] 주문 취소 → 적립 포인트 환수 확인
- [x] 누적 포인트 10,000 도달 → SILVER 자동 승급

### Sprint 3 완료 시 ✅
- [x] 보유 20,000P, 결제 15,000원 → 전액 포인트 결제 성공
- [x] 보유 8,000P, 결제 15,000원 → 분할 결제 (포인트 8,000 + 카드 7,000)
- [x] 분할 결제 1단계 후 5분 경과 → 포인트 자동 환수
- [x] 동시 2대 키오스크 포인트 결제 → 1건 성공, 1건 잔액 부족

### Sprint 4 완료 시 ✅
- [x] 애플페이 선택 → CardPayment NFC 안내
- [x] 완료 화면에 적립 포인트 표시
- [x] 관리자 포인트 수동 조정 → PointHistory(ADJUST) 기록

### Sprint 5 완료 시 ✅
- [x] PG QR 생성 → 3분 타임아웃 자동 취소
- [x] PG 장애 → CircuitBreaker 차단
- [x] 실 VAN 카드 결제 → approvalNumber 저장
