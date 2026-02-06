# 마이그레이션 계획 전문가 패널 검토 보고서

## Executive Summary

| 검토 항목        | 현재 점수  | 개선 후 예상 점수 |
| ---------------- | ---------- | ----------------- |
| 요구사항 명세    | 6.5/10     | 8.5/10            |
| 아키텍처 설계    | 7.5/10     | 9.0/10            |
| 결제 시스템 설계 | 7.0/10     | 8.5/10            |
| 테스트 전략      | 5.5/10     | 8.0/10            |
| DevOps/운영      | 7.0/10     | 8.5/10            |
| **전체 평균**    | **6.7/10** | **8.5/10**        |

---

## 1. 요구사항 전문가 검토 (Karl Wiegers 관점)

> "요구사항 명세는 구현 가능하고, 검증 가능하며, 추적 가능해야 한다."

### 1.1 Critical Issues

#### ❌ 기능 요구사항 명세 부재

**문제점**: 계획에 "무엇을 구현할지"는 있으나, "어떻게 동작해야 하는지"에 대한 상세 기능 요구사항이 없음

```
현재 문서:
"Week 9-10: 상품 관리
├── 상품 CRUD API
├── 카테고리 관리
├── 이미지 업로드
└── 키오스크 메뉴 화면"

필요한 명세:
FR-001: 상품 CRUD API
  FR-001.1: 상품 등록 시 필수 필드 검증 (바코드, 상품명, 판매가)
  FR-001.2: 바코드 중복 검증 후 에러 코드 PRODUCT_BARCODE_DUPLICATE 반환
  FR-001.3: 상품 이미지는 최대 5MB, JPG/PNG 형식만 허용
  FR-001.4: 카테고리 삭제 시 해당 카테고리의 상품은 '미분류'로 이동
```

**권고 사항**:

- 기능 요구사항 명세서(FRS) 별도 작성
- 각 요구사항에 고유 ID 부여 (FR-001, FR-002...)
- 검증 기준(Acceptance Criteria) 명시

---

#### ❌ 비기능 요구사항(NFR) 정량적 기준 미흡

**문제점**: KPI는 있으나 시스템 요구사항으로서의 NFR이 불완전

```
현재 문서 (KPI):
"시스템 가용성: 99.9%"
"평균 응답 시간: < 500ms"

누락된 NFR:
NFR-001: 동시 접속 사용자 수
  - 단일 키오스크에서 초당 최대 5건의 주문 처리 가능
  - 백엔드 서버당 최대 100개 키오스크 동시 연결 지원

NFR-002: 데이터 무결성
  - 결제 트랜잭션은 ACID 보장
  - 네트워크 장애 시 로컬 큐에 최대 100건 저장

NFR-003: 보안 요구사항
  - PCI-DSS 준수 필수 항목 명시
  - 카드 데이터 메모리 상 최대 보유 시간: 30초
```

**권고 사항**:

- NFR 카테고리별 정량적 기준 정의 (성능, 보안, 확장성, 가용성)
- 각 NFR에 측정 방법 명시

---

#### ❌ 레거시 기능 매핑 부재

**문제점**: VB6 152개 폼의 어떤 기능이 신규 시스템에 매핑되는지 추적 불가

```
필요한 추적 매트릭스:

| Legacy Form | Legacy Function | New Component | Priority | Status |
|-------------|-----------------|---------------|----------|--------|
| Frm_SaleMain.frm | 판매 등록 | CartPanel.vue | P0 | TBD |
| Frm_SaleMain.frm | 할인 적용 | CartPanel.vue | P1 | TBD |
| Frm_SelfKiosk.frm | 카테고리 선택 | CategoryNav.vue | P0 | TBD |
| Frm_Member.frm | 회원 조회 | MemberSearch.vue | P1 | TBD |
```

**권고 사항**:

- 레거시-신규 기능 매핑 문서 작성
- 우선순위(P0, P1, P2) 지정
- 의도적 제외 기능 명시

---

### 1.2 Major Issues

#### ⚠️ 사용자 스토리/유스케이스 부재

```
필요한 문서:

UC-001: 키오스크 주문
  Actor: 고객
  Precondition: 키오스크 메인 화면 표시
  Main Flow:
    1. 고객이 언어를 선택한다
    2. 고객이 카테고리를 선택한다
    3. 고객이 상품을 선택하고 수량을 지정한다
    4. 고객이 장바구니에 담기를 선택한다
    5. 고객이 결제하기를 선택한다
    6. 고객이 결제 수단을 선택한다
    7. 시스템이 결제를 처리한다
    8. 시스템이 영수증을 출력한다
  Alternative Flow:
    3a. 상품이 품절인 경우
    6a. 결제 실패 시
    7a. 네트워크 장애 시
```

#### ⚠️ 데이터 마이그레이션 검증 기준 미흡

```
현재 문서:
"Phase 4: 검증 및 전환 (Week 4)
├── 데이터 카운트 비교
├── 샘플 데이터 무결성 검증"

필요한 검증 기준:
DM-VERIFY-001: 레코드 카운트 검증
  - 테이블별 레코드 수 100% 일치
  - 허용 오차: 0건

DM-VERIFY-002: 데이터 무결성 검증
  - 상위 100개 판매 내역 금액 검증
  - 회원 포인트 잔액 합계 검증
  - 재고 수량 합계 검증

DM-VERIFY-003: 참조 무결성 검증
  - 고아(Orphan) 레코드 0건 확인
  - FK 위반 0건 확인
```

---

### 1.3 Recommendations Summary

| 우선순위 | 항목                                | 예상 소요 |
| -------- | ----------------------------------- | --------- |
| P0       | 기능 요구사항 명세서 작성           | 2주       |
| P0       | 레거시-신규 기능 매핑               | 1주       |
| P1       | 비기능 요구사항 정의                | 1주       |
| P1       | 유스케이스 문서 작성                | 2주       |
| P2       | 데이터 마이그레이션 검증 체크리스트 | 3일       |

---

## 2. 아키텍처 전문가 검토 (Martin Fowler, Michael Nygard 관점)

> "아키텍처는 변경하기 어려운 결정들의 집합이다." - Martin Fowler
> "복원력은 설계 시점에 고려해야 한다." - Michael Nygard

### 2.1 Critical Issues

#### ❌ 오프라인 모드 아키텍처 미설계

**문제점**: 레거시 시스템의 핵심 기능인 "네트워크 장애 시 오프라인 운영"이 설계되지 않음

```
레거시 시스템 (DBConnection.bas):
- SQL Server 실패 시 MS Access로 자동 전환
- 로컬에 트랜잭션 저장 후 복구 시 동기화

신규 시스템 아키텍처에 필요:
┌─────────────────────────────────────────────────────────────┐
│                  Offline-First Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐      ┌─────────────────┐              │
│  │   Vue App       │      │   IndexedDB     │              │
│  │   (Pinia)       │ ←──→ │   (Local)       │              │
│  └────────┬────────┘      └─────────────────┘              │
│           │                        ↑                        │
│           │                        │ Sync when online       │
│           ▼                        │                        │
│  ┌─────────────────┐      ┌───────┴─────────┐              │
│  │ Offline Queue   │ ────→│   Backend API   │              │
│  │ (LocalStorage)  │      │   (Express)     │              │
│  └─────────────────┘      └─────────────────┘              │
│                                                             │
│  Conflict Resolution:                                       │
│  - Last-Write-Wins (LWW) for non-critical data             │
│  - Version Vector for inventory/stock                       │
│  - Manual Resolution for payment conflicts                  │
└─────────────────────────────────────────────────────────────┘
```

**권고 사항**:

1. IndexedDB/Dexie.js 기반 로컬 스토리지 설계
2. 동기화 전략 문서화 (Conflict Resolution)
3. 오프라인 시 가능/불가능 기능 정의

---

#### ❌ Electron Main/Renderer 프로세스 분리 미설계

**문제점**: Electron의 보안 아키텍처(contextIsolation, preload)가 상세 설계되지 않음

```
현재 문서:
"packages/frontend/
├── electron/
│   ├── main/
│   └── preload/"

필요한 설계:

┌─────────────────────────────────────────────────────────────┐
│                    Electron Security Model                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Main Process (Node.js)           Renderer Process (Vue)    │
│  ┌──────────────────────┐        ┌──────────────────────┐  │
│  │ - 하드웨어 제어        │        │ - UI 렌더링          │  │
│  │ - 파일 시스템 접근     │        │ - 사용자 인터랙션    │  │
│  │ - 결제 DLL/SDK 호출   │  IPC   │ - API 호출           │  │
│  │ - 프린터 제어         │ ←────→ │ - 상태 관리          │  │
│  │ - 데이터베이스 직접 접근│        │                      │  │
│  └──────────────────────┘        └──────────────────────┘  │
│           ▲                                                  │
│           │                                                  │
│  ┌────────┴─────────┐                                       │
│  │    Preload       │                                       │
│  │  - contextBridge │                                       │
│  │  - exposeInMainWorld │                                   │
│  │  - IPC 채널 정의  │                                       │
│  └──────────────────┘                                       │
│                                                             │
│  보안 설정:                                                  │
│  - contextIsolation: true                                   │
│  - nodeIntegration: false                                   │
│  - sandbox: true (가능한 경우)                              │
│  - CSP 헤더 설정                                            │
└─────────────────────────────────────────────────────────────┘
```

**권고 사항**:

1. IPC 채널 명세 문서 작성
2. Preload API 설계
3. Electron 보안 가이드라인 준수 확인

---

#### ❌ 하드웨어 추상화 레이어(HAL) 상세 설계 부재

**문제점**: VB6의 MSComm/DLL 호출을 대체할 하드웨어 접근 계층이 설계되지 않음

```
필요한 HAL 아키텍처:

┌─────────────────────────────────────────────────────────────┐
│              Hardware Abstraction Layer (HAL)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  interface IHardwareDevice {                                │
│    connect(): Promise<void>;                                │
│    disconnect(): Promise<void>;                             │
│    getStatus(): DeviceStatus;                               │
│    onError(callback: ErrorCallback): void;                  │
│  }                                                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  IPrinter   │  │  IScanner   │  │  IPaymentTerminal   │  │
│  │             │  │             │  │                     │  │
│  │ print()     │  │ onScan()    │  │ authorize()         │  │
│  │ openDrawer()│  │ enable()    │  │ captureSignature()  │  │
│  │ cut()       │  │ disable()   │  │ readCard()          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────────┴──────────┐  │
│  │ EscPosDriver│  │ SerialScanner│ │ NiceTerminalDriver  │  │
│  │ StarDriver  │  │ USBScanner   │  │ KiccTerminalDriver  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  Node.js 모듈:                                              │
│  - serialport: COM 포트 통신                                │
│  - node-escpos: ESC/POS 프린터                              │
│  - usb: USB HID 디바이스                                    │
│  - ffi-napi: 네이티브 DLL 호출                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Major Issues

#### ⚠️ API 버저닝 전략 미흡

```
현재 문서:
"REST API Controllers"

필요한 버저닝 전략:

1. URL Path Versioning (권장)
   /api/v1/products
   /api/v2/products

2. Breaking Change 정책
   - 필드 제거: 최소 6개월 deprecation 기간
   - 응답 구조 변경: 새 버전으로 분리

3. 버전 지원 정책
   - v1: 2025.12까지 지원
   - v2: 현재 버전 (active development)

4. API 변경 로그
   CHANGELOG.md에 모든 API 변경 사항 기록
```

#### ⚠️ 캐싱 전략 미설계

```
필요한 캐싱 레이어:

Level 1 (L1): In-Memory (Pinia Store)
- 장바구니 데이터
- 현재 세션 데이터
- TTL: 세션 종료까지

Level 2 (L2): Redis
- 상품 마스터 데이터 (TTL: 5분)
- 카테고리 데이터 (TTL: 10분)
- 세션 데이터 (TTL: 24시간)

Level 3 (L3): PostgreSQL
- 영구 저장 데이터

Cache Invalidation:
- 상품 변경 시: L2 해당 키 삭제
- 일괄 변경 시: L2 전체 flush
- Pub/Sub로 키오스크에 변경 알림
```

#### ⚠️ 에러 복구 패턴 불완전

```
현재 문서:
"Circuit Breaker
 • Failure Threshold: 5회
 • Recovery Time: 30초"

추가 필요한 복원력 패턴:

1. Retry with Exponential Backoff
   - 1차: 100ms
   - 2차: 200ms
   - 3차: 400ms
   - 최대 3회

2. Bulkhead Pattern
   - 결제 처리: 별도 스레드 풀 (max: 10)
   - 일반 API: 기본 스레드 풀 (max: 50)

3. Timeout 정책
   - 결제 API: 30초
   - 일반 조회: 5초
   - 파일 업로드: 60초

4. Fallback 전략
   - VAN 장애 시: 대체 VAN으로 자동 전환
   - DB 장애 시: 읽기는 캐시에서, 쓰기는 큐에 저장
```

---

### 2.3 Minor Issues

#### △ 데이터 파티셔닝 전략 미언급

```
월별 테이블을 단일 테이블로 통합하려면 파티셔닝 필요:

-- PostgreSQL Table Partitioning
CREATE TABLE sales (
    id SERIAL,
    sale_date DATE NOT NULL,
    ...
) PARTITION BY RANGE (sale_date);

CREATE TABLE sales_2024_01 PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 월별 자동 파티션 생성 함수
CREATE FUNCTION create_monthly_partition()...
```

#### △ 로깅 표준 미정의

```
필요한 로깅 표준:

{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "service": "payment-service",
  "traceId": "abc-123",
  "spanId": "def-456",
  "message": "Payment authorized",
  "context": {
    "transactionId": "TX001",
    "amount": 25000,
    "vanCode": "NICE"
  }
}

// 민감 정보 마스킹 규칙
cardNumber: "****-****-****-1234"
phone: "010-****-5678"
```

---

### 2.4 Recommendations Summary

| 우선순위 | 항목                        | 예상 소요 |
| -------- | --------------------------- | --------- |
| P0       | 오프라인 아키텍처 설계      | 1주       |
| P0       | Electron IPC/Security 설계  | 1주       |
| P0       | 하드웨어 추상화 레이어 설계 | 1주       |
| P1       | 캐싱 전략 문서화            | 3일       |
| P1       | 에러 복구 패턴 상세화       | 3일       |
| P2       | 파티셔닝 전략               | 2일       |
| P2       | 로깅 표준 정의              | 2일       |

---

## 3. 결제 시스템 전문가 검토 (Gregor Hohpe 관점)

> "메시지 기반 통합은 느슨한 결합과 높은 신뢰성을 제공한다."

### 3.1 Critical Issues

#### ❌ VAN 통합 그룹핑 기준 불명확

**문제점**: 12개 VAN을 5개로 통합하는 기준이 "API 유사성"이라고만 명시

```
현재 문서:
| 통합 모듈 | 포함 VAN | 통합 이유 |
| NICE Module | NICE, KSNET, KOCES | API 인터페이스 유사성, NICE 계열 |

필요한 분석:

VAN 통합 판단 매트릭스:
| VAN | 프로토콜 | 암호화 | 서명패드 | 결제유형 | 그룹 |
|-----|---------|--------|---------|---------|------|
| NICE | TCP/IP | AES256 | 자체 | 카드,현금 | A |
| KSNET | Serial | 3DES | 자체 | 카드,현금 | A |
| KOCES | TCP/IP | AES256 | 없음 | 카드 | A |
| KICC | TCP/IP | RSA+AES | KICC | 카드,서명 | B |
| KOVAN | Serial | AES128 | KICC호환 | 카드,서명 | B |
| ... | ... | ... | ... | ... | ... |

통합 불가 사유:
- NICE ↔ KICC: 암호화 방식 상이, 서명패드 프로토콜 비호환
- KIS ↔ SMARTRO: T-money 연동 프로토콜 상이
```

**권고 사항**:

1. 각 VAN의 기술 스펙 상세 비교표 작성
2. 실제 통합 가능성 기술 검증(PoC) 수행
3. 통합 불가 시 대안(별도 모듈 유지) 명시

---

#### ❌ 결제 트랜잭션 상태 머신 미정의

**문제점**: 결제 실패, 취소, 부분 환불 등 복잡한 상태 전이가 정의되지 않음

```
필요한 상태 머신:

                    ┌─────────────────────────────────┐
                    ▼                                 │
              ┌──────────┐                           │
              │ PENDING  │────────────────┐          │
              └────┬─────┘                │          │
                   │ authorize()          │ timeout   │
                   ▼                      ▼          │
              ┌──────────┐          ┌──────────┐    │
              │AUTHORIZED│          │ FAILED   │    │
              └────┬─────┘          └──────────┘    │
                   │                                 │
      ┌────────────┼────────────┐                   │
      │ capture()  │            │ cancel()          │
      ▼            │            ▼                   │
┌──────────┐       │      ┌──────────┐              │
│ CAPTURED │       │      │CANCELLED │              │
└────┬─────┘       │      └──────────┘              │
     │             │                                 │
     │ refund()    │ partial_refund()               │
     ▼             ▼                                 │
┌──────────┐ ┌────────────┐                         │
│ REFUNDED │ │PARTIAL_REF │─────────────────────────┘
└──────────┘ └────────────┘

상태 전이 규칙:
- AUTHORIZED → CAPTURED: 당일만 가능
- CAPTURED → REFUNDED: 7일 이내
- CANCELLED: AUTHORIZED 상태에서만 가능
- 재시도: FAILED → PENDING (최대 3회)
```

**권고 사항**:

1. 상태 머신 다이어그램 작성
2. 각 전이의 비즈니스 규칙 명시
3. 비정상 상태 복구 절차 정의

---

#### ❌ VAN 장애 시 Failover 전략 미설계

**문제점**: Circuit Breaker는 있으나 대체 VAN 전환 로직이 없음

```
필요한 Failover 전략:

┌─────────────────────────────────────────────────────────────┐
│                   VAN Failover Strategy                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Primary VAN Selection:                                     │
│  1. 가맹점 설정에 따른 기본 VAN 선택                         │
│  2. Circuit Breaker 상태 확인                               │
│     - CLOSED: 정상 사용                                     │
│     - OPEN: Failover VAN으로 전환                           │
│                                                             │
│  Failover 우선순위:                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│  │  NICE   │ →→ │  KICC   │ →→ │   KIS   │                 │
│  │(Primary)│    │(Backup1)│    │(Backup2)│                 │
│  └─────────┘    └─────────┘    └─────────┘                 │
│                                                             │
│  Failover 조건:                                             │
│  - 5회 연속 실패 (Network Error, Timeout)                   │
│  - 응답 시간 > 10초 (3회 연속)                              │
│  - VAN사 점검 시간 (사전 스케줄링)                          │
│                                                             │
│  주의사항:                                                  │
│  - 결제 응답 오류는 Failover 트리거하지 않음                │
│  - Failover 시 가맹점 ID 매핑 필요                          │
│  - 로그 및 알림 필수                                        │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 Major Issues

#### ⚠️ 결제 멱등성(Idempotency) 보장 미설계

```
문제 시나리오:
1. 결제 요청 전송
2. 네트워크 타임아웃 (응답 미수신)
3. 재시도 시 중복 결제 위험

필요한 설계:

// 멱등성 키 기반 중복 방지
interface PaymentRequest {
  idempotencyKey: string;  // UUID, 클라이언트 생성
  ...
}

// Redis 기반 중복 검사
async function processPayment(request: PaymentRequest) {
  const existing = await redis.get(`payment:${request.idempotencyKey}`);
  if (existing) {
    return JSON.parse(existing);  // 기존 결과 반환
  }

  const result = await vanClient.authorize(request);
  await redis.setex(
    `payment:${request.idempotencyKey}`,
    86400,  // 24시간 보관
    JSON.stringify(result)
  );
  return result;
}
```

#### ⚠️ 결제 데이터 암호화 상세 미흡

```
현재 문서:
"카드 데이터 토큰화"

필요한 상세:

1. 전송 구간 암호화
   - TLS 1.3 필수
   - 민감 필드 추가 암호화 (AES-256-GCM)

2. 저장 구간 암호화
   - 카드 번호: 토큰으로 대체 (실 번호 저장 금지)
   - 승인 번호: AES-256 암호화
   - 암호화 키: AWS KMS 또는 HashiCorp Vault

3. 메모리 보안
   - 카드 데이터 사용 후 즉시 제로화
   - V8 가비지 컬렉터 고려 (SecureBuffer 사용)

4. 로그 마스킹
   - 카드번호: 완전 마스킹
   - 승인번호: 앞 4자리만 표시
   - 금액: 마스킹 안 함
```

#### ⚠️ VAN 응답 타임아웃 차별화 필요

```
현재 문서:
"Timeout: 30초"

VAN별 특성 고려 필요:

| VAN | 권장 타임아웃 | 특이사항 |
|-----|-------------|---------|
| NICE | 30초 | 표준 |
| KICC | 45초 | 서명패드 대기 포함 |
| KIS | 30초 | 표준 |
| SMARTRO | 60초 | T-money/NFC 포함 시 |
| KSNET | 25초 | 빠른 응답 |

// 동적 타임아웃 설정
const timeoutConfig = {
  'NICE': 30000,
  'KICC': 45000,
  'SMARTRO': 60000,
  default: 30000
};
```

---

### 3.3 Recommendations Summary

| 우선순위 | 항목                    | 예상 소요 |
| -------- | ----------------------- | --------- |
| P0       | VAN 통합 기술 검증(PoC) | 2주       |
| P0       | 결제 상태 머신 설계     | 1주       |
| P0       | VAN Failover 전략 설계  | 1주       |
| P1       | 멱등성 설계             | 3일       |
| P1       | 암호화 상세 명세        | 3일       |
| P2       | VAN별 타임아웃 최적화   | 2일       |

---

## 4. 테스트 전문가 검토 (Lisa Crispin, Gojko Adzic 관점)

> "테스트는 품질의 게이트키퍼가 아니라 품질의 조력자다." - Lisa Crispin
> "Living Documentation은 명세와 테스트의 결합이다." - Gojko Adzic

### 4.1 Critical Issues

#### ❌ 테스트 전략 문서 부재

**문제점**: CI/CD에 테스트 단계는 있으나, 테스트 범위/깊이/전략이 없음

```
현재 문서:
"# 2. 단위 테스트
  - run: pnpm test:unit --coverage"

필요한 테스트 전략:

┌─────────────────────────────────────────────────────────────┐
│                    Test Pyramid                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ▲                                    │
│                       /E\  E2E Tests (10%)                  │
│                      /2E \  - 20개 핵심 사용자 시나리오      │
│                     /────\  - Playwright                    │
│                    /      \                                 │
│                   / Integ  \ Integration Tests (20%)        │
│                  /  ration  \ - API 엔드포인트 100% 커버    │
│                 /───────────\ - Supertest + Jest            │
│                /             \                              │
│               /    Unit       \ Unit Tests (70%)            │
│              /     Tests       \ - Services: 85% 커버리지   │
│             /──────────────────\ - Utils: 90% 커버리지      │
│            /                    \ - Jest + Vitest           │
│           ────────────────────────                          │
│                                                             │
│  특수 테스트:                                                │
│  - Contract Tests: 12개 VAN API (Pact)                      │
│  - Mutation Tests: 결제 모듈 대상                           │
│  - Performance Tests: k6 (100 concurrent users)             │
│  - Security Tests: OWASP ZAP 자동화                         │
└─────────────────────────────────────────────────────────────┘
```

---

#### ❌ VAN 테스트 Mock/Stub 전략 미정의

**문제점**: 12개 VAN 연동을 어떻게 테스트할지 전략이 없음

```
필요한 VAN 테스트 전략:

1. Unit Test: Mock 사용
   - 각 Strategy 클래스의 로직 테스트
   - VAN 클라이언트는 Mock으로 대체

2. Integration Test: Stub Server 사용
   - WireMock/Prism으로 VAN 응답 시뮬레이션
   - 정상/오류/타임아웃 시나리오

3. Contract Test: Pact 사용
   - VAN 응답 스키마 검증
   - 변경 감지 자동화

4. E2E Test (Staging): 테스트 가맹점
   - 각 VAN사의 테스트 환경 사용
   - 실 결제 → 즉시 취소 패턴

// WireMock Stub 예시
{
  "request": {
    "method": "POST",
    "url": "/nice/v1/authorize"
  },
  "response": {
    "status": 200,
    "body": {
      "resultCode": "0000",
      "approvalNo": "12345678",
      "transactionId": "TX001"
    }
  }
}
```

---

#### ❌ 테스트 데이터 관리 전략 부재

```
필요한 테스트 데이터 전략:

1. 테스트 데이터 생성
   - Factory 패턴: @faker-js/faker 활용
   - Builder 패턴: 복잡한 객체 생성

// Factory 예시
const ProductFactory = {
  create: (overrides = {}) => ({
    barcode: faker.string.alphanumeric(13),
    name: faker.commerce.productName(),
    sellPrice: faker.number.int({ min: 1000, max: 100000 }),
    ...overrides
  })
};

2. 테스트 데이터 격리
   - 테스트별 트랜잭션 롤백
   - 테스트 DB 초기화 스크립트

3. 테스트 계정
   - 테스트용 회원: TEST_MEMBER_001 ~ 010
   - 테스트용 카드: VAN사별 테스트 카드 번호
```

---

### 4.2 Major Issues

#### ⚠️ 수용 테스트(Acceptance Test) 기준 부재

```
필요한 수용 테스트 명세 (Gherkin):

Feature: 키오스크 결제 처리
  As a 고객
  I want to 키오스크에서 카드 결제를 완료하고
  So that 주문한 상품을 받을 수 있다

  Background:
    Given 키오스크가 정상 동작 중이다
    And NICE VAN이 연동되어 있다

  Scenario: 정상 카드 결제
    Given 장바구니에 "아메리카노" 1개가 담겨있다
    And 총 금액은 4,500원이다
    When 고객이 "카드 결제"를 선택한다
    And 유효한 신용카드를 투입한다
    Then 결제가 승인된다
    And 영수증이 출력된다
    And 주문 번호가 화면에 표시된다

  Scenario: 카드 잔액 부족
    Given 장바구니에 "아메리카노" 1개가 담겨있다
    When 고객이 "카드 결제"를 선택한다
    And 잔액이 부족한 카드를 투입한다
    Then "잔액이 부족합니다" 메시지가 표시된다
    And 다른 결제 수단 선택 화면으로 이동한다

  Scenario: VAN 타임아웃
    Given 장바구니에 "아메리카노" 1개가 담겨있다
    When 고객이 "카드 결제"를 선택한다
    And VAN 응답이 30초 내에 오지 않는다
    Then "결제 처리 중 오류가 발생했습니다" 메시지가 표시된다
    And 결제 재시도 버튼이 표시된다
```

#### ⚠️ 성능 테스트 기준 미정의

```
현재 문서 (KPI):
"평균 응답 시간: < 500ms"

필요한 성능 테스트 명세:

| 시나리오 | 동시 사용자 | 목표 응답시간 | 목표 처리량 |
|---------|------------|-------------|------------|
| 메뉴 조회 | 100 | p95 < 200ms | 500 req/s |
| 장바구니 추가 | 50 | p95 < 100ms | 200 req/s |
| 결제 처리 | 20 | p95 < 5s | 10 req/s |
| 회원 조회 | 30 | p95 < 300ms | 100 req/s |

// k6 스크립트 예시
export const options = {
  scenarios: {
    menu_browsing: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
    checkout: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

#### ⚠️ 회귀 테스트 자동화 범위 미정의

```
필요한 회귀 테스트 범위:

Smoke Test (배포 후 5분):
- 로그인 성공
- 메뉴 목록 조회
- 결제 테스트 (테스트 카드)

Daily Regression (매일 새벽 3시):
- 전체 API 엔드포인트 (100개+)
- 핵심 E2E 시나리오 (20개)
- 성능 기준선 검증

Weekly Full Regression (매주 일요일):
- 전체 테스트 스위트
- 보안 스캔 (OWASP ZAP)
- 의존성 취약점 검사
```

---

### 4.3 Recommendations Summary

| 우선순위 | 항목                       | 예상 소요 |
| -------- | -------------------------- | --------- |
| P0       | 테스트 전략 문서 작성      | 1주       |
| P0       | VAN Mock/Stub 설계         | 1주       |
| P1       | 수용 테스트 명세 (Gherkin) | 2주       |
| P1       | 성능 테스트 시나리오 정의  | 1주       |
| P2       | 테스트 데이터 관리 전략    | 3일       |
| P2       | 회귀 테스트 자동화 계획    | 3일       |

---

## 5. 클라우드/DevOps 전문가 검토 (Kelsey Hightower 관점)

> "인프라를 코드로 관리하고, 배포를 자동화하라."

### 5.1 Critical Issues

#### ❌ 배포 아키텍처 미정의

**문제점**: Docker/CI-CD는 있으나, 실제 배포 환경 아키텍처가 없음

```
현재 문서:
"docker-compose.yml"
"Docker 이미지 빌드 (Backend)"

필요한 배포 아키텍처:

┌─────────────────────────────────────────────────────────────┐
│                   Deployment Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Option A: 중앙 서버 + 로컬 키오스크                         │
│                                                             │
│  ┌─────────────────┐                                        │
│  │   Cloud (AWS)   │                                        │
│  │  ┌───────────┐  │                                        │
│  │  │  Backend  │  │ ←── HTTPS ──┐                          │
│  │  │  (ECS)    │  │             │                          │
│  │  └─────┬─────┘  │             │                          │
│  │        │        │             │                          │
│  │  ┌─────┴─────┐  │      ┌──────┴──────┐                   │
│  │  │PostgreSQL │  │      │   Kiosk 1   │                   │
│  │  │  (RDS)    │  │      │  (Electron) │                   │
│  │  └───────────┘  │      └─────────────┘                   │
│  └─────────────────┘      ┌─────────────┐                   │
│                           │   Kiosk 2   │                   │
│                           │  (Electron) │                   │
│                           └─────────────┘                   │
│                                                             │
│  Option B: 각 매장 로컬 서버 (하이브리드)                    │
│                                                             │
│  ┌─────────────────┐      ┌─────────────────────────────┐  │
│  │   Cloud (AWS)   │      │        Store (Local)         │  │
│  │  ┌───────────┐  │      │  ┌─────────┐  ┌───────────┐  │  │
│  │  │ Central   │  │ sync │  │ Local   │  │ Kiosk 1   │  │  │
│  │  │ Server    │──┼──────┼─→│ Server  │←→│(Electron) │  │  │
│  │  └───────────┘  │      │  │(Docker) │  └───────────┘  │  │
│  │  ┌───────────┐  │      │  └────┬────┘  ┌───────────┐  │  │
│  │  │ Master DB │  │      │       │       │ Kiosk 2   │  │  │
│  │  │  (RDS)    │  │      │  ┌────┴────┐  │(Electron) │  │  │
│  │  └───────────┘  │      │  │Local DB │  └───────────┘  │  │
│  └─────────────────┘      │  │(Postgres)│                │  │
│                           │  └─────────┘                 │  │
│                           └─────────────────────────────┘  │
│                                                             │
│  권장: Option B (오프라인 지원, 낮은 레이턴시)              │
└─────────────────────────────────────────────────────────────┘
```

**권고 사항**:

1. 배포 옵션별 장단점 분석
2. 네트워크 토폴로지 설계
3. 데이터 동기화 전략 결정

---

#### ❌ Electron 앱 업데이트 전략 미정의

**문제점**: Electron 앱의 자동 업데이트 메커니즘이 설계되지 않음

```
필요한 업데이트 전략:

┌─────────────────────────────────────────────────────────────┐
│                  Electron Auto Update                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Update Server 구성                                      │
│     - S3 + CloudFront (또는 electron-updater/GitHub)        │
│     - latest.yml 메타데이터 파일                            │
│                                                             │
│  2. Update Flow                                             │
│     ┌─────────────┐                                         │
│     │ App Start   │                                         │
│     └──────┬──────┘                                         │
│            │                                                │
│            ▼                                                │
│     ┌─────────────┐     ┌─────────────┐                    │
│     │Check Update │────→│  Download   │                    │
│     │ (Background)│     │ (Background)│                    │
│     └──────┬──────┘     └──────┬──────┘                    │
│            │                    │                           │
│            ▼                    ▼                           │
│     ┌─────────────┐     ┌─────────────┐                    │
│     │   No Update │     │  Notify     │                    │
│     │   Continue  │     │  User       │                    │
│     └─────────────┘     └──────┬──────┘                    │
│                                │                            │
│                                ▼                            │
│                         ┌─────────────┐                    │
│                         │ Install on  │                    │
│                         │ Next Restart│                    │
│                         └─────────────┘                    │
│                                                             │
│  3. 롤백 전략                                               │
│     - 이전 버전 보관 (최근 3버전)                           │
│     - 수동 롤백 명령 지원                                   │
│     - 자동 롤백: 시작 실패 3회 시                          │
│                                                             │
│  4. 업무 시간 고려                                          │
│     - 업데이트 알림: 영업 종료 후                          │
│     - 강제 업데이트: 보안 패치만                            │
└─────────────────────────────────────────────────────────────┘
```

---

#### ❌ 환경별 설정 관리 미흡

**문제점**: 환경 변수만 언급하고, 환경별 설정 분리/관리 전략이 없음

```
필요한 환경 설정 전략:

1. 환경 구분
   - development: 로컬 개발
   - test: CI/CD 테스트
   - staging: 통합 테스트
   - production: 운영

2. 설정 관리 방식

   ┌─────────────────┐     ┌─────────────────┐
   │   Application   │     │   Secrets       │
   │   Config        │     │   Management    │
   │                 │     │                 │
   │ - API endpoints │     │ - DB password   │
   │ - Feature flags │     │ - VAN API keys  │
   │ - Timeout values│     │ - JWT secret    │
   │                 │     │                 │
   │ → .env files    │     │ → AWS Secrets   │
   │ → Config server │     │    Manager      │
   └─────────────────┘     └─────────────────┘

3. Feature Flags

   // 점진적 롤아웃 지원
   const features = {
     newPaymentUI: {
       enabled: true,
       rolloutPercentage: 50,  // 50% 사용자에게만
       stores: ['S001', 'S002']  // 특정 매장만
     }
   };
```

---

### 5.2 Major Issues

#### ⚠️ 모니터링 알림 에스컬레이션 미정의

```
현재 문서:
"결제 실패율 > 1% → Critical Alert"

필요한 에스컬레이션 정책:

Level 1 (5분 내 응답):
- 담당자: 운영팀
- 채널: Slack #alerts-ops
- 대상: Warning 알림

Level 2 (15분 내 응답):
- 담당자: 개발팀 온콜
- 채널: Slack #alerts-critical + PagerDuty
- 대상: Critical 알림

Level 3 (30분 내 응답):
- 담당자: 매니저
- 채널: PagerDuty + 전화
- 대상: 30분 이상 미해결 Critical

자동화:
- Critical 알림 15분 미해결 → Level 2 자동 에스컬레이션
- 업무 시간 외: 즉시 Level 2
```

#### ⚠️ 백업/복구 전략 미흡

```
현재 문서:
없음

필요한 백업 전략:

| 데이터 | 백업 주기 | 보관 기간 | 복구 목표(RTO) | RPO |
|--------|----------|----------|---------------|-----|
| 거래 데이터 | 실시간 | 7년 | 15분 | 0 |
| 상품 마스터 | 매일 | 90일 | 1시간 | 24시간 |
| 회원 데이터 | 매일 | 90일 | 1시간 | 24시간 |
| 설정 데이터 | 매일 | 30일 | 2시간 | 24시간 |
| 로그 데이터 | - | 90일 | - | - |

복구 절차:
1. Point-in-Time Recovery (PostgreSQL)
2. S3 백업에서 복원
3. 검증 스크립트 실행
4. 서비스 재시작
```

#### ⚠️ 로그 보관 및 규정 준수 미정의

```
필요한 로그 정책:

| 로그 유형 | 보관 기간 | 근거 |
|----------|----------|------|
| 결제 트랜잭션 | 5년 | 전자금융거래법 |
| 접근 로그 | 3년 | 정보통신망법 |
| 에러 로그 | 90일 | 운영 목적 |
| 디버그 로그 | 7일 | 운영 목적 |

로그 lifecycle:
- Hot (0-7일): Elasticsearch (빠른 검색)
- Warm (7-30일): S3 Standard
- Cold (30-365일): S3 Glacier
- Archive (1-5년): S3 Deep Archive
```

---

### 5.3 Recommendations Summary

| 우선순위 | 항목                        | 예상 소요 |
| -------- | --------------------------- | --------- |
| P0       | 배포 아키텍처 결정 및 설계  | 1주       |
| P0       | Electron 자동 업데이트 설계 | 1주       |
| P1       | 환경별 설정 관리 전략       | 3일       |
| P1       | 백업/복구 전략 문서화       | 3일       |
| P1       | 알림 에스컬레이션 정책      | 2일       |
| P2       | 로그 보관 정책              | 2일       |

---

## 6. 종합 개선 권고안

### 6.1 Critical Priority (즉시 착수)

| #   | 항목                    | 담당              | 예상 소요 |
| --- | ----------------------- | ----------------- | --------- |
| 1   | 오프라인 아키텍처 설계  | 아키텍트          | 1주       |
| 2   | 배포 아키텍처 결정      | 아키텍트 + DevOps | 1주       |
| 3   | VAN 통합 기술 검증(PoC) | 결제 전문가       | 2주       |
| 4   | 기능 요구사항 명세서    | PM + BA           | 2주       |
| 5   | 테스트 전략 문서        | QA Lead           | 1주       |

### 6.2 High Priority (Phase 1 이전)

| #   | 항목                        | 담당          | 예상 소요 |
| --- | --------------------------- | ------------- | --------- |
| 6   | Electron IPC/Security 설계  | Frontend Lead | 1주       |
| 7   | 하드웨어 추상화 레이어 설계 | Backend Lead  | 1주       |
| 8   | 결제 상태 머신 설계         | 결제 전문가   | 1주       |
| 9   | VAN Failover 전략           | 결제 전문가   | 1주       |
| 10  | Electron 자동 업데이트 설계 | Frontend Lead | 1주       |

### 6.3 Medium Priority (Phase 2 이전)

| #   | 항목                       | 담당        | 예상 소요 |
| --- | -------------------------- | ----------- | --------- |
| 11  | 비기능 요구사항 정의       | PM          | 1주       |
| 12  | 레거시-신규 기능 매핑      | BA          | 1주       |
| 13  | 수용 테스트 명세 (Gherkin) | QA          | 2주       |
| 14  | VAN Mock/Stub 설계         | 결제 전문가 | 1주       |
| 15  | 캐싱 전략 문서화           | 아키텍트    | 3일       |

### 6.4 Low Priority (Phase 3 이전)

| #   | 항목                      | 담당         | 예상 소요 |
| --- | ------------------------- | ------------ | --------- |
| 16  | 성능 테스트 시나리오 정의 | QA           | 1주       |
| 17  | 백업/복구 전략 문서화     | DevOps       | 3일       |
| 18  | 로깅 표준 정의            | Backend Lead | 2일       |
| 19  | 환경별 설정 관리 전략     | DevOps       | 3일       |
| 20  | 알림 에스컬레이션 정책    | DevOps       | 2일       |

---

## 7. 개선 로드맵

```
Week -4 ~ -1 (Phase 1 시작 전 4주):
├── Critical Priority 항목 완료
│   ├── 오프라인 아키텍처 설계
│   ├── 배포 아키텍처 결정
│   ├── VAN 통합 PoC
│   ├── 기능 요구사항 명세서
│   └── 테스트 전략 문서
│
└── High Priority 항목 시작
    ├── Electron IPC/Security 설계
    ├── 하드웨어 추상화 레이어 설계
    └── 결제 상태 머신 설계

Phase 1 (Month 1-2) 병행:
├── High Priority 항목 완료
└── Medium Priority 항목 시작

Phase 2 (Month 3-4) 병행:
├── Medium Priority 항목 완료
└── Low Priority 항목 시작

Phase 3 (Month 5-6) 병행:
└── Low Priority 항목 완료
```

---

## 8. 결론

현재 마이그레이션 계획은 **기술 스택 선정과 로드맵 구조**가 잘 정의되어 있으나, 다음 영역에서 보완이 필요합니다:

1. **요구사항 명세**: 기능/비기능 요구사항의 정량적 기준 필요
2. **복원력 설계**: 오프라인 지원, VAN Failover 등 장애 대응 설계 필요
3. **테스트 전략**: 테스트 피라미드, VAN 테스트 방법론 정의 필요
4. **운영 설계**: 배포 아키텍처, 업데이트 전략, 백업/복구 정책 필요

권고된 개선 사항을 Phase 1 시작 전에 완료하면, 프로젝트 성공 가능성이 크게 향상될 것입니다.

---

_검토일: 2026-02-03_
_검토자: Expert Panel (Requirements, Architecture, Payment, Testing, DevOps)_
