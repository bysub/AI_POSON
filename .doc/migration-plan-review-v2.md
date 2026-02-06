# 마이그레이션 계획 v2.0 전문가 패널 2차 검토 보고서

## Executive Summary

| 검토 항목        | v1.0 점수  | v2.0 점수  | 개선율   | 추가 개선 후 예상 |
| ---------------- | ---------- | ---------- | -------- | ----------------- |
| 요구사항 명세    | 6.5/10     | **8.5/10** | +30%     | 9.0/10            |
| 아키텍처 설계    | 7.5/10     | **9.0/10** | +20%     | 9.5/10            |
| 결제 시스템 설계 | 7.0/10     | **8.5/10** | +21%     | 9.0/10            |
| 테스트 전략      | 5.5/10     | **8.0/10** | +45%     | 8.5/10            |
| DevOps/운영      | 7.0/10     | **8.5/10** | +21%     | 9.0/10            |
| **전체 평균**    | **6.7/10** | **8.5/10** | **+27%** | **9.0/10**        |

### 검토 결론

**v2.0은 1차 검토의 주요 권고 사항을 대부분 성공적으로 반영했습니다.**

- ✅ 기능/비기능 요구사항 명세 추가 (FR-xxx, NFR-xxx)
- ✅ 유스케이스 상세 정의 (UC-001 ~ UC-005)
- ✅ 오프라인 아키텍처 설계 (IndexedDB + Dexie.js)
- ✅ Electron 보안 아키텍처 설계 (contextIsolation, preload)
- ✅ 하드웨어 추상화 레이어(HAL) 설계
- ✅ 캐싱 전략 정의 (L1/L2/L3)
- ✅ 배포 아키텍처 설계 (하이브리드 모델)
- ✅ 결제 상태 머신 정의
- ✅ 멱등성 설계 (IdempotencyService)
- ✅ VAN Failover 전략
- ✅ 테스트 피라미드 정의
- ✅ 성능 테스트 시나리오 (k6)
- ✅ Gherkin 수용 테스트 명세

**그러나 일부 영역에서 추가 보완이 필요합니다.**

---

## 1. 요구사항 전문가 2차 검토 (Karl Wiegers 관점)

### 1.1 권고안 반영 현황

| 1차 권고 항목                 | 반영 여부 | 평가                                  |
| ----------------------------- | --------- | ------------------------------------- |
| 기능 요구사항 명세서 (FRS)    | ✅ 반영   | Section 1.1에 FR-100~400 시리즈 추가  |
| 비기능 요구사항 (NFR) 정량화  | ✅ 반영   | Section 1.2에 NFR-100~400 시리즈 추가 |
| 레거시-신규 기능 매핑         | ✅ 반영   | Section 1.3에 매핑 테이블 추가        |
| 유스케이스 문서               | ✅ 반영   | Section 1.4에 UC-001~005 상세 추가    |
| 데이터 마이그레이션 검증 기준 | ⚠️ 미흡   | 언급 없음                             |

### 1.2 개선된 점

#### ✅ 잘 작성된 요구사항 명세

```markdown
FR-102: 바코드 중복 시 PRODUCT_BARCODE_DUPLICATE 에러 반환

- 검증 기준: 중복 등록 불가
- 우선순위: P0
```

요구사항이 **고유 ID**, **검증 기준**, **우선순위**를 포함하여 추적 가능해졌습니다.

#### ✅ 유스케이스의 Alternative Flow 명시

```markdown
| 단계 | 조건                      | 대체 흐름                                  |
| ---- | ------------------------- | ------------------------------------------ |
| 3a   | 상품이 품절인 경우        | "품절" 표시, 선택 불가                     |
| 9c   | 네트워크 장애 (현금 결제) | 오프라인 모드로 처리, 동기화 대기열에 추가 |
```

예외 시나리오가 명확히 정의되어 개발 시 혼란이 줄어듭니다.

### 1.3 추가 개선 필요 사항

#### ⚠️ Minor: 데이터 마이그레이션 검증 기준 누락

**현재 상태**: 데이터 마이그레이션 검증 기준이 v2.0에 명시되지 않음

**권고 추가 내용**:

```markdown
### 데이터 마이그레이션 검증 체크리스트

| 검증 항목        | 검증 방법               | 허용 오차 |
| ---------------- | ----------------------- | --------- |
| 레코드 수 일치   | 테이블별 COUNT(\*) 비교 | 0건       |
| 금액 합계 일치   | 월별 판매 금액 SUM 비교 | 0원       |
| 회원 포인트 합계 | 회원 포인트 잔액 SUM    | 0원       |
| 참조 무결성      | FK 위반 레코드 조회     | 0건       |
| 인코딩 검증      | 한글 상품명 무결성      | 100%      |
```

**우선순위**: P2 (Phase 4 DB 마이그레이션 전 완료)

---

#### ⚠️ Minor: 요구사항 추적 매트릭스(RTM) 부재

**권고 사항**: 요구사항 → 설계 → 테스트 → 코드 추적 매트릭스

```markdown
| FR ID  | 설계 문서       | 테스트 케이스  | 구현 모듈         | 상태 |
| ------ | --------------- | -------------- | ----------------- | ---- |
| FR-101 | Section 2.4 HAL | TC-PROD-001    | ProductService.ts | TBD  |
| FR-301 | Section 4.1 VAN | TC-PAY-001~010 | PaymentService.ts | TBD  |
```

**우선순위**: P2 (프로젝트 관리 도구에서 관리 가능)

---

## 2. 아키텍처 전문가 2차 검토 (Martin Fowler, Michael Nygard 관점)

### 2.1 권고안 반영 현황

| 1차 권고 항목                | 반영 여부 | 평가                                        |
| ---------------------------- | --------- | ------------------------------------------- |
| 오프라인 아키텍처 설계       | ✅ 우수   | Section 2.2 IndexedDB + Conflict Resolution |
| Electron Main/Renderer 분리  | ✅ 우수   | Section 2.3 contextIsolation + preload API  |
| 하드웨어 추상화 레이어 (HAL) | ✅ 우수   | Section 2.4 인터페이스 + 구현체 예시        |
| API 버저닝 전략              | ⚠️ 미흡   | 언급 없음                                   |
| 캐싱 전략                    | ✅ 반영   | Section 2.5 L1/L2/L3 계층화                 |
| 에러 복구 패턴               | ✅ 반영   | Section 4.1 Circuit Breaker + Retry         |
| 데이터 파티셔닝 전략         | ⚠️ 미흡   | 언급 없음                                   |
| 로깅 표준                    | ⚠️ 미흡   | 언급 없음                                   |

### 2.2 개선된 점

#### ✅ 우수한 오프라인 아키텍처 설계

```typescript
class OfflineDatabase extends Dexie {
  orders!: Table<OfflineOrder>;
  products!: Table<OfflineProduct>;
  syncQueue!: Table<SyncQueueItem>;
  // ...
}
```

- IndexedDB 스키마가 코드로 명시됨
- Conflict Resolution 전략이 데이터 유형별로 정의됨
- 오프라인 시 가능/불가능 기능이 명확함

#### ✅ 우수한 Electron 보안 모델

```javascript
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  preload: path.join(__dirname, 'preload.js')
}
```

Electron 보안 베스트 프랙티스가 반영되었습니다.

#### ✅ 잘 설계된 HAL 인터페이스

```typescript
interface IPrinter extends IHardwareDevice {
  print(data: PrintData): Promise<PrintResult>;
  printReceipt(receipt: Receipt): Promise<PrintResult>;
  openCashDrawer(): Promise<void>;
  cut(): Promise<void>;
}
```

하드웨어 독립적인 인터페이스로 드라이버 교체가 용이해졌습니다.

### 2.3 추가 개선 필요 사항

#### ⚠️ Major: API 버저닝 전략 미정의

**현재 상태**: REST API의 버전 관리 전략이 없음

**권고 추가 내용**:

```markdown
### API 버전 관리 전략

**버저닝 방식**: URL Path Versioning
```

/api/v1/products
/api/v2/products

````

**버전 지원 정책**:
| 버전 | 상태 | 지원 종료 |
|------|------|----------|
| v1 | Current | 2028-12-31 |
| v2 | Planning | - |

**Breaking Change 정책**:
- 필드 제거: 최소 6개월 deprecation 기간
- 필드 추가: Breaking Change 아님
- 응답 구조 변경: 새 버전으로 분리

**Deprecation 알림**:
```json
{
  "meta": {
    "deprecationWarning": "This endpoint will be removed in v2. Use /api/v2/products instead.",
    "deprecationDate": "2028-12-31"
  }
}
````

````

**우선순위**: P1 (Phase 1 API 개발 시작 전)

---

#### ⚠️ Minor: 로깅 표준 미정의

**권고 추가 내용**:

```markdown
### 로깅 표준

**구조화된 로그 형식 (JSON)**:
```json
{
  "timestamp": "2026-01-15T10:30:00.000Z",
  "level": "INFO",
  "service": "payment-service",
  "traceId": "abc-123-def-456",
  "spanId": "ghi-789",
  "message": "Payment authorized",
  "context": {
    "transactionId": "TX001",
    "amount": 25000,
    "vanCode": "NICE"
  }
}
````

**민감 정보 마스킹**:
| 필드 | 마스킹 규칙 | 예시 |
|------|-----------|------|
| 카드번호 | 완전 마스킹 | \***\*-\*\***-\***\*-\*\*** |
| 승인번호 | 앞 4자리만 | 1234\***\* |
| 전화번호 | 중간 4자리 | 010-\*\***-5678 |
| 이메일 | 앞 3자 후 마스킹 | abc***@***.com |

````

**우선순위**: P2 (Phase 1 백엔드 기반 구축 시)

---

#### ⚠️ Minor: 데이터 파티셔닝 전략 미정의

**권고 추가 내용**:

```markdown
### PostgreSQL 파티셔닝 전략

**대상 테이블**: sales, orders, payments (월별 100만+ 레코드 예상)

**파티셔닝 방식**: Range Partitioning by Date

```sql
CREATE TABLE orders (
    id BIGSERIAL,
    order_date DATE NOT NULL,
    store_id INTEGER NOT NULL,
    -- ...
    PRIMARY KEY (id, order_date)
) PARTITION BY RANGE (order_date);

-- 월별 파티션 자동 생성
CREATE TABLE orders_2026_01 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
````

**파티션 관리**:

- 자동 생성: pg_cron으로 3개월 선행 생성
- 자동 삭제: 7년 이상 된 파티션 자동 아카이브

```

**우선순위**: P2 (Phase 1 DB 마이그레이션 시)

---

## 3. 결제 시스템 전문가 2차 검토 (Gregor Hohpe 관점)

### 3.1 권고안 반영 현황

| 1차 권고 항목 | 반영 여부 | 평가 |
|--------------|----------|------|
| VAN 통합 그룹핑 기준 상세화 | ⚠️ 미흡 | 여전히 "API 유사성"만 언급 |
| 결제 상태 머신 정의 | ✅ 우수 | Section 4.2 상태 다이어그램 |
| VAN Failover 전략 | ✅ 우수 | Section 4.1 우선순위 + 조건 |
| 멱등성 설계 | ✅ 우수 | Section 4.3 IdempotencyService |
| 암호화 상세 명세 | ⚠️ 미흡 | 간략히만 언급 |
| VAN별 타임아웃 차별화 | ✅ 반영 | Section 4.4 VAN_TIMEOUT_CONFIG |

### 3.2 개선된 점

#### ✅ 우수한 결제 상태 머신

```

PENDING → AUTHORIZED → CAPTURED → REFUNDED
↓
CANCELLED
↓
PARTIAL_REF

상태 전이 규칙:

- AUTHORIZED → CAPTURED: 당일만 가능 (23:59까지)
- CAPTURED → REFUNDED: 7일 이내

````

상태 전이 규칙이 명확하여 구현 시 혼란이 없습니다.

#### ✅ 우수한 멱등성 설계

```typescript
async processPayment(idempotencyKey, paymentFn) {
  const existing = await redis.get(`payment:idem:${idempotencyKey}`);
  if (existing) {
    if (record.status === 'COMPLETED') return record.result;
    if (record.status === 'PROCESSING') throw new PaymentInProgressError();
  }
  // ...
}
````

중복 결제 방지가 Redis 기반으로 잘 설계되었습니다.

#### ✅ VAN별 타임아웃 최적화

```typescript
const VAN_TIMEOUT_CONFIG = {
  NICE: 30000,
  KICC: 45000, // 서명패드 대기 포함
  SMARTRO: 60000, // T-money/NFC 포함
};
```

### 3.3 추가 개선 필요 사항

#### ⚠️ Major: VAN 통합 기술 검증 기준 상세화 필요

**현재 상태**: 12개 VAN을 5개 모듈로 통합하는 기술적 근거가 여전히 부족

**권고 추가 내용**:

```markdown
### VAN 통합 기술 판단 매트릭스

| VAN     | 프로토콜 | 암호화  | 서명패드    | API 유형  | 통합 그룹   |
| ------- | -------- | ------- | ----------- | --------- | ----------- |
| NICE    | TCP/IP   | AES-256 | 자체 SDK    | REST      | A (NICE)    |
| KSNET   | TCP/IP   | AES-256 | 자체 SDK    | REST      | A (NICE)    |
| KOCES   | TCP/IP   | AES-256 | 없음        | REST      | A (NICE)    |
| KICC    | TCP/IP   | RSA+AES | KICC SDK    | SOAP→REST | B (KICC)    |
| KOVAN   | Serial   | AES-128 | KICC 호환   | Serial    | B (KICC)    |
| JTNET   | Serial   | AES-128 | KICC 호환   | Serial    | B (KICC)    |
| KIS     | TCP/IP   | AES-256 | KIS SDK     | REST      | C (KIS)     |
| KCP     | TCP/IP   | RSA     | 자체 SDK    | REST      | C (KIS)     |
| SMARTRO | TCP/IP   | AES-256 | 자체 SDK    | REST+NFC  | D (SMARTRO) |
| SPC     | TCP/IP   | AES-256 | SMARTRO호환 | REST      | D (SMARTRO) |
| FDIK    | TCP/IP   | 3DES    | 없음        | REST      | D (SMARTRO) |

**통합 불가 사유 예시**:

- NICE ↔ KICC: 서명패드 SDK 비호환, 암호화 키 관리 방식 상이
- KIS ↔ SMARTRO: T-money/NFC 프로토콜 비호환

**PoC 검증 항목**:

1. 동일 그룹 VAN 간 공통 인터페이스 구현 가능 여부
2. 암호화 키 관리 통합 가능 여부
3. 에러 코드 매핑 일관성
```

**우선순위**: P0 (Phase 0 PoC에서 검증)

---

#### ⚠️ Minor: 결제 데이터 암호화 상세 미흡

**권고 추가 내용**:

````markdown
### 결제 데이터 암호화 명세

**1. 전송 구간 (Transport Layer)**:

- TLS 1.3 필수 (TLS 1.2 이하 비활성화)
- 민감 필드 이중 암호화 (AES-256-GCM)

**2. 저장 구간 (Data at Rest)**:
| 데이터 | 저장 방식 | 암호화 |
|--------|----------|--------|
| 카드번호 | 저장 금지 (토큰만) | N/A |
| 승인번호 | DB 저장 | AES-256-CBC |
| 거래금액 | DB 저장 | 평문 |

**3. 메모리 보안**:

```typescript
class SecureBuffer {
  private data: Buffer;

  clear(): void {
    crypto.randomFillSync(this.data); // 랜덤 덮어쓰기
    this.data.fill(0); // 제로화
  }
}
```
````

**4. 암호화 키 관리**:

- 키 저장: AWS Secrets Manager 또는 HashiCorp Vault
- 키 로테이션: 90일 주기
- 키 접근 로깅: 모든 접근 CloudTrail 기록

````

**우선순위**: P1 (Phase 2 결제 모듈 개발 전)

---

#### ⚠️ Minor: 부분 환불(Partial Refund) 시나리오 상세화

**현재 상태**: 상태 머신에 PARTIAL_REF 상태는 있으나 비즈니스 규칙 부족

**권고 추가 내용**:

```markdown
### 부분 환불 비즈니스 규칙

**허용 조건**:
- 원거래 상태: CAPTURED
- 원거래 후 경과 시간: 7일 이내
- 환불 금액: 원거래 금액 - 기환불 금액 이하

**제한 사항**:
- 동일 거래 부분 환불 최대 횟수: 5회
- 최소 환불 금액: 100원
- 원거래 VAN과 동일 VAN으로만 환불 가능

**상태 전이**:
````

CAPTURED → PARTIAL_REF (부분 환불)
→ PARTIAL_REF (추가 부분 환불)
→ REFUNDED (완전 환불)

````

**데이터 모델**:
```typescript
interface RefundHistory {
  originalTransactionId: string;
  refundTransactionId: string;
  refundAmount: number;
  remainingAmount: number;
  refundedAt: Date;
  reason: string;
}
````

```

**우선순위**: P1 (Phase 2 결제 모듈 개발 시)

---

## 4. 테스트 전문가 2차 검토 (Lisa Crispin, Gojko Adzic 관점)

### 4.1 권고안 반영 현황

| 1차 권고 항목 | 반영 여부 | 평가 |
|--------------|----------|------|
| 테스트 전략 문서 | ✅ 우수 | Section 5.1 테스트 피라미드 |
| VAN 테스트 Mock/Stub 전략 | ✅ 우수 | Section 5.2 Unit/Integration/Contract |
| 테스트 데이터 관리 전략 | ⚠️ 미흡 | 간략히만 언급 |
| 수용 테스트 명세 (Gherkin) | ✅ 우수 | Section 5.4 시나리오 명세 |
| 성능 테스트 기준 | ✅ 반영 | Section 5.3 k6 시나리오 |
| 회귀 테스트 자동화 범위 | ⚠️ 미흡 | 언급 없음 |

### 4.2 개선된 점

#### ✅ 우수한 테스트 피라미드 정의

```

         ▲
        /E\  E2E Tests (10%) - 20개 핵심 시나리오
       /2E \
      /────\
     / Integ \ Integration Tests (20%) - API 100% 커버
    /  ration \

/───────────\
 / Unit \ Unit Tests (70%) - Services 85% 커버
/ Tests \
────────────────────

````

테스트 비율과 커버리지 목표가 명확합니다.

#### ✅ 우수한 VAN 테스트 전략

```typescript
// 1. Unit Test - Mock
mockClient.authorize.mockResolvedValue({ resultCode: '0000' });

// 2. Integration Test - WireMock
// wiremock/mappings/nice-authorize.json

// 3. Contract Test - Pact
await provider.addInteraction({ ... });
````

계층별 테스트 방법론이 명확합니다.

#### ✅ 잘 작성된 Gherkin 명세

```gherkin
@P0 @smoke
Scenario: 정상 카드 결제
  Given 장바구니에 "아메리카노" 1개가 담겨있다
  When 고객이 "카드 결제"를 선택한다
  And 유효한 신용카드를 투입한다
  Then 결제가 승인된다

@P0 @resilience
Scenario: VAN 타임아웃 시 재시도
  ...
```

우선순위 태그(@P0)와 테스트 유형 태그(@smoke, @resilience)가 잘 활용되었습니다.

### 4.3 추가 개선 필요 사항

#### ⚠️ Minor: 테스트 데이터 관리 전략 상세화

**현재 상태**: Factory 패턴만 간략히 언급

**권고 추가 내용**:

````markdown
### 테스트 데이터 관리 전략

**1. Factory 패턴 (Unit/Integration Test)**:

```typescript
// tests/factories/product.factory.ts
import { faker } from "@faker-js/faker/locale/ko";

export const ProductFactory = {
  create: (overrides: Partial<Product> = {}) => ({
    id: faker.number.int(),
    barcode: faker.string.alphanumeric(13),
    name: faker.commerce.productName(),
    sellPrice: faker.number.int({ min: 1000, max: 50000 }),
    categoryId: faker.number.int({ min: 1, max: 10 }),
    ...overrides,
  }),
  createMany: (count: number) => Array.from({ length: count }, () => ProductFactory.create()),
};
```
````

**2. 테스트 DB 격리 전략**:

- 트랜잭션 롤백: 테스트 종료 시 자동 롤백
- 별도 스키마: test_schema 사용
- Docker 컨테이너: 테스트별 fresh DB

**3. 테스트 계정 관리**:
| 계정 유형 | ID | 용도 |
|----------|-----|------|
| 테스트 회원 | TEST_MEM_001~010 | 포인트 적립/사용 |
| 테스트 카드 | 각 VAN 제공 번호 | 결제 테스트 |
| 테스트 매장 | TEST_STORE_001 | 통합 테스트 |

````

**우선순위**: P2 (Phase 1 테스트 환경 구축 시)

---

#### ⚠️ Minor: 회귀 테스트 자동화 범위 미정의

**권고 추가 내용**:

```markdown
### 회귀 테스트 자동화 계획

**Smoke Test (배포 후 즉시, 5분)**:
- 로그인 성공
- 메뉴 목록 조회
- 장바구니 추가
- 테스트 결제 (NICE 테스트 카드)

**Daily Regression (매일 03:00, 30분)**:
- 전체 API 엔드포인트 (100개+)
- 핵심 E2E 시나리오 (20개)
- 결제 모듈 (5개 VAN 모두)
- 오프라인 동기화 테스트

**Weekly Full Regression (일요일 02:00, 2시간)**:
- 전체 테스트 스위트
- 성능 기준선 검증 (k6)
- 보안 스캔 (OWASP ZAP)
- 의존성 취약점 (npm audit)
- VAN Contract Test (Pact)

**CI/CD 파이프라인 통합**:
```yaml
# .github/workflows/regression.yml
on:
  schedule:
    - cron: '0 3 * * *'  # Daily 03:00
    - cron: '0 2 * * 0'  # Weekly Sunday 02:00
````

````

**우선순위**: P1 (Phase 1 CI/CD 구축 시)

---

#### ⚠️ Minor: Mutation Testing 상세화

**현재 상태**: "Mutation Tests: 결제 모듈 대상"만 언급

**권고 추가 내용**:

```markdown
### Mutation Testing 전략

**대상 모듈** (결제 관련 핵심 코드):
- `src/services/payment/*.ts`
- `src/strategies/payment/*.ts`
- `src/utils/payment/*.ts`

**Mutation 점수 목표**: 80% 이상

**Stryker 설정**:
```json
// stryker.conf.json
{
  "mutate": ["src/services/payment/**/*.ts"],
  "testRunner": "jest",
  "thresholds": { "high": 80, "low": 60, "break": 50 }
}
````

**실행 시점**: PR 머지 전 (결제 관련 파일 변경 시)

```

**우선순위**: P2 (Phase 2 결제 모듈 완료 후)

---

## 5. DevOps 전문가 2차 검토 (Kelsey Hightower 관점)

### 5.1 권고안 반영 현황

| 1차 권고 항목 | 반영 여부 | 평가 |
|--------------|----------|------|
| 배포 아키텍처 정의 | ✅ 우수 | Section 3.1 하이브리드 모델 |
| Electron 자동 업데이트 | ✅ 우수 | Section 3.2 electron-updater |
| 환경별 설정 관리 | ⚠️ 미흡 | 언급 없음 |
| 모니터링 에스컬레이션 | ✅ 반영 | Section 6.1 Level 1/2/3 |
| 백업/복구 전략 | ✅ 반영 | Section 6.2 RTO/RPO 정의 |
| 로그 보관 정책 | ✅ 반영 | Section 6.3 법적 근거 포함 |

### 5.2 개선된 점

#### ✅ 우수한 하이브리드 배포 아키텍처

```

Cloud (AWS) Store (Local)
┌───────────────┐ ┌─────────────────────┐
│ Central Server│ ←── HTTPS ──→│ Local Server │
│ (ECS Fargate) │ │ (Docker) │
│ Master DB │ │ Local DB (Postgres) │
└───────────────┘ │ Kiosk 1, 2, N │
└─────────────────────┘

```

오프라인 지원과 낮은 레이턴시를 동시에 달성할 수 있는 설계입니다.

#### ✅ 잘 설계된 Electron 자동 업데이트

```

App Start → Check Update → Download → Notify User → Install on Restart

롤백 전략:

- 최근 3버전 보관
- 시작 실패 3회 → 자동 롤백

````

#### ✅ 명확한 RTO/RPO 정의

| 데이터 유형 | 백업 주기 | RTO | RPO |
|------------|----------|-----|-----|
| 결제 트랜잭션 | 실시간 복제 | 15분 | 0 |
| 주문 데이터 | 5분 스냅샷 | 30분 | 5분 |

### 5.3 추가 개선 필요 사항

#### ⚠️ Major: 환경별 설정 관리 전략 미정의

**현재 상태**: 환경별 설정 분리 및 관리 방법이 없음

**권고 추가 내용**:

```markdown
### 환경별 설정 관리 전략

**1. 환경 구분**:
| 환경 | 용도 | 접근 권한 |
|------|------|----------|
| development | 로컬 개발 | 개발자 전체 |
| test | CI/CD 테스트 | 자동화만 |
| staging | 통합 테스트/QA | 개발팀 + QA |
| production | 운영 | 운영팀만 |

**2. 설정 분류 및 관리**:
````

┌─────────────────────────────────────────────────┐
│ Application Config │
│ (기능 설정, 타임아웃, Feature Flags) │
│ → .env.{environment} 파일 │
│ → Config Server (선택) │
├─────────────────────────────────────────────────┤
│ Secrets │
│ (DB 비밀번호, API 키, 암호화 키) │
│ → AWS Secrets Manager │
│ → 환경별 분리 저장 │
├─────────────────────────────────────────────────┤
│ Infrastructure Config │
│ (서버 주소, 포트, 리소스 한도) │
│ → Terraform 변수 │
│ → 환경별 tfvars 파일 │
└─────────────────────────────────────────────────┘

````

**3. Feature Flags (점진적 롤아웃)**:
```typescript
// src/config/feature-flags.ts
export const featureFlags = {
  newPaymentUI: {
    enabled: process.env.FF_NEW_PAYMENT_UI === 'true',
    rolloutPercentage: 50,
    enabledStores: ['S001', 'S002']
  },
  offlineMode: {
    enabled: true,
    maxQueueSize: 100
  }
};
````

````

**우선순위**: P1 (Phase 1 시작 전)

---

#### ⚠️ Minor: 재해 복구(DR) 절차 상세화

**현재 상태**: RTO/RPO만 있고 실제 복구 절차가 없음

**권고 추가 내용**:

```markdown
### 재해 복구 절차

**1. 클라우드 장애 (Central Server)**:
````

1. 장애 감지 (모니터링 알림)
2. 매장별 오프라인 모드 자동 전환 확인
3. AWS 장애 상황 확인 (Health Dashboard)
4. Multi-AZ 장애 시: 수동 Region Failover
5. 복구 후 데이터 동기화 검증

```

**2. 매장 서버 장애**:
```

1. 키오스크 → 중앙 서버 직접 연결 모드 전환
2. 매장 서버 복구 또는 교체
3. 중앙 서버에서 데이터 재동기화

````

**3. 데이터베이스 복구**:
```bash
# Point-in-Time Recovery (PostgreSQL RDS)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier poson-db \
  --target-db-instance-identifier poson-db-recovered \
  --restore-time 2026-02-03T10:00:00Z
````

**4. 복구 검증 체크리스트**:

- [ ] 레코드 수 비교 (±0 허용)
- [ ] 최근 24시간 거래 금액 합계 검증
- [ ] API 헬스체크 통과
- [ ] Smoke Test 통과

````

**우선순위**: P1 (Phase 4 안정화 전)

---

#### ⚠️ Minor: 보안 업데이트 정책 상세화

**현재 상태**: "보안 패치: 즉시 알림, 24시간 내 강제 적용"만 언급

**권고 추가 내용**:

```markdown
### 보안 업데이트 정책

**심각도별 대응 시간**:
| 심각도 | CVE 점수 | 패치 배포 | 강제 적용 |
|--------|---------|----------|----------|
| Critical | 9.0-10.0 | 4시간 내 | 즉시 |
| High | 7.0-8.9 | 24시간 내 | 48시간 |
| Medium | 4.0-6.9 | 7일 내 | 다음 정기 업데이트 |
| Low | 0.1-3.9 | 30일 내 | 다음 정기 업데이트 |

**자동화된 취약점 스캔**:
```yaml
# .github/workflows/security.yml
- name: npm audit
  run: npm audit --audit-level=high

- name: OWASP Dependency Check
  uses: dependency-check/action@main

- name: Container Scan
  uses: aquasecurity/trivy-action@master
````

**영업 시간 중 긴급 패치 절차**:

1. 보안팀 승인 (Slack #security)
2. 백업 스냅샷 생성
3. Canary 배포 (10% 트래픽)
4. 10분 모니터링 후 전체 롤아웃

```

**우선순위**: P1 (Phase 1 CI/CD 구축 시)

---

## 6. 종합 평가

### 6.1 v2.0 개선 성과

| 영역 | 1차 권고 항목 수 | 반영 항목 수 | 반영률 |
|------|---------------|-------------|-------|
| 요구사항 | 5 | 4 | 80% |
| 아키텍처 | 8 | 5 | 63% |
| 결제 시스템 | 6 | 4 | 67% |
| 테스트 전략 | 6 | 4 | 67% |
| DevOps | 6 | 4 | 67% |
| **전체** | **31** | **21** | **68%** |

### 6.2 남은 개선 항목

#### Critical (Phase 0에서 해결)
| # | 항목 | 우선순위 |
|---|------|---------|
| 1 | VAN 통합 기술 판단 매트릭스 상세화 | P0 |

#### High (Phase 1 시작 전 해결)
| # | 항목 | 우선순위 |
|---|------|---------|
| 2 | API 버저닝 전략 정의 | P1 |
| 3 | 환경별 설정 관리 전략 | P1 |
| 4 | 결제 데이터 암호화 상세 명세 | P1 |
| 5 | 회귀 테스트 자동화 범위 정의 | P1 |
| 6 | 재해 복구(DR) 절차 상세화 | P1 |
| 7 | 보안 업데이트 정책 상세화 | P1 |

#### Medium (Phase 2 전 해결)
| # | 항목 | 우선순위 |
|---|------|---------|
| 8 | 데이터 마이그레이션 검증 체크리스트 | P2 |
| 9 | 요구사항 추적 매트릭스(RTM) | P2 |
| 10 | 로깅 표준 정의 | P2 |
| 11 | 데이터 파티셔닝 전략 | P2 |
| 12 | 테스트 데이터 관리 전략 상세화 | P2 |
| 13 | 부분 환불 비즈니스 규칙 상세화 | P2 |
| 14 | Mutation Testing 상세화 | P2 |

### 6.3 결론

**v2.0은 프로덕션 준비도가 크게 향상되었습니다.**

1차 검토에서 지적된 주요 문제점(오프라인 아키텍처, Electron 보안, HAL, 테스트 피라미드 등)이 모두 해결되었습니다.

남은 14개 개선 항목 중:
- **Critical**: 1개 (VAN 통합 상세화) - Phase 0 PoC에서 검증
- **High**: 6개 - Phase 1 시작 전 문서화
- **Medium**: 7개 - 개발 진행 중 점진적 보완

**권고 사항**:
1. Phase 0 기간을 활용하여 High Priority 항목 문서화 완료
2. VAN 통합 PoC 수행 시 기술 판단 매트릭스 작성
3. 개발 진행 중 Medium Priority 항목을 점진적으로 보완

---

*검토일: 2026-02-03*
*검토자: Expert Panel (Requirements, Architecture, Payment, Testing, DevOps)*
*검토 대상: migration-plan-v2.md*
```
