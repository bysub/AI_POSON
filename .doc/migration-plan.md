# VB6 키오스크 → Electron + Vue 3 마이그레이션 계획

## Executive Summary

| 항목            | 내용                                                   |
| --------------- | ------------------------------------------------------ |
| **프로젝트명**  | POSON POS Self-Service Kiosk Modernization             |
| **현재 시스템** | VB6 (300K+ LOC, 26 모듈, 152 폼, 12개 VAN 연동)        |
| **목표 시스템** | Electron + Vue 3 + Node.js + TypeScript + Tailwind CSS |
| **핵심 변경**   | PostgreSQL 전환, VAN 통합(12→5), 다국어 지원, CI/CD    |

---

## 1. 아키텍처 개요

### 1.1 기존 VB6 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    VB6 Monolith                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   UI Layer  │  │  Business   │  │  Hardware Layer │  │
│  │ (152 Forms) │  │   Logic     │  │   (COM/DLL)     │  │
│  │             │  │ (26 Modules)│  │                 │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │          │
│  ┌──────┴────────────────┴───────────────────┴───────┐  │
│  │              ADODB (SQL Server)                   │  │
│  │              12개 VAN DLL/OCX 직접 호출            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 목표 3-Tier 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION TIER                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Electron + Vue 3                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │  │
│  │  │ Vue 3 SFC   │  │   Pinia     │  │ Vue Router  │  │ Vue i18n │  │  │
│  │  │ Composition │  │   Store     │  │     4.x     │  │  (다국어) │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬─────┘  │  │
│  │         └─────────────────┼───────────────┴───────────────┘       │  │
│  │                    ┌──────┴──────┐                                 │  │
│  │                    │ Tailwind CSS│                                 │  │
│  │                    │ Design System│                                │  │
│  │                    └─────────────┘                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                │ IPC / HTTP                              │
├────────────────────────────────┼─────────────────────────────────────────┤
│                         APPLICATION TIER                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Node.js + Express                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │  │
│  │  │ REST API    │  │  Services   │  │   Payment Gateway       │    │  │
│  │  │ Controllers │  │  (Business) │  │   (5 Unified Modules)   │    │  │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘    │  │
│  │         │                │                      │                  │  │
│  │  ┌──────┴────────────────┴──────────────────────┴─────────────┐   │  │
│  │  │   Repositories (TypeORM/Prisma)                             │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                │                                         │
├────────────────────────────────┼─────────────────────────────────────────┤
│                           DATA TIER                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │  │
│  │  │ PostgreSQL  │  │    Redis    │  │   File Storage          │    │  │
│  │  │   (Main)    │  │  (Session)  │  │   (Images, Logs)        │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택 상세

### 2.1 Frontend (Presentation Tier)

| 구분           | 기술           | 버전  | 용도                      |
| -------------- | -------------- | ----- | ------------------------- |
| **Runtime**    | Electron       | 33.x  | 데스크탑 앱 프레임워크    |
| **Build Tool** | electron-vite  | 2.x   | Electron + Vite 통합 빌드 |
| **Framework**  | Vue 3          | 3.5.x | Composition API 기반 UI   |
| **Language**   | TypeScript     | 5.x   | 타입 안정성               |
| **State**      | Pinia          | 2.x   | 상태 관리                 |
| **Router**     | Vue Router     | 4.x   | SPA 라우팅                |
| **CSS**        | Tailwind CSS   | 3.x   | 유틸리티 기반 스타일링    |
| **i18n**       | Vue i18n       | 9.x   | 다국어 지원 (한/영/중/일) |
| **Icons**      | Material Icons | -     | Google Material Design    |
| **Forms**      | VeeValidate    | 4.x   | 폼 검증                   |
| **HTTP**       | Axios          | 1.x   | API 클라이언트            |

### 2.2 Backend (Application Tier)

| 구분           | 기술       | 버전   | 용도                |
| -------------- | ---------- | ------ | ------------------- |
| **Runtime**    | Node.js    | 20 LTS | 서버 런타임         |
| **Framework**  | Express    | 4.x    | REST API 프레임워크 |
| **Language**   | TypeScript | 5.x    | 타입 안정성         |
| **ORM**        | Prisma     | 5.x    | 타입 세이프 ORM     |
| **Validation** | Zod        | 3.x    | 스키마 검증         |
| **Auth**       | JWT        | -      | 토큰 기반 인증      |
| **Logging**    | Winston    | 3.x    | 구조화된 로깅       |
| **Testing**    | Jest       | 29.x   | 단위/통합 테스트    |

### 2.3 Data Tier

| 구분          | 기술           | 버전 | 용도                      |
| ------------- | -------------- | ---- | ------------------------- |
| **Database**  | PostgreSQL     | 16.x | 메인 DB (SQL Server 대체) |
| **Cache**     | Redis          | 7.x  | 세션/캐시                 |
| **Migration** | Prisma Migrate | -    | DB 스키마 버전 관리       |

### 2.4 DevOps

| 구분           | 기술                 | 용도               |
| -------------- | -------------------- | ------------------ |
| **CI/CD**      | GitHub Actions       | 자동화 빌드/배포   |
| **Container**  | Docker               | 컨테이너화         |
| **Monitoring** | Prometheus + Grafana | 메트릭 수집/시각화 |
| **APM**        | OpenTelemetry        | 분산 추적          |
| **Logging**    | ELK Stack            | 로그 수집/분석     |

---

## 3. VAN 결제 통합 모듈 설계

### 3.1 기존 VAN 연동 현황 (12개)

| VAN사   | DLL/OCX               | 결제 유형          |
| ------- | --------------------- | ------------------ |
| NICE    | NicePosV205.dll       | 카드, 현금영수증   |
| KSNET   | KSNet_ADSL.dll        | 카드, 동글         |
| KICC    | KiccDSC.ocx, Kicc.dll | 카드, 서명패드     |
| KIS     | KisCatSSL.dll         | 카드, BC로열티     |
| KOCES   | -                     | 카드               |
| KOVAN   | kovan_signpad.ocx     | 카드, 서명패드     |
| SMARTRO | SmartroSign.dll       | 카드, NFC, T-money |
| SPC     | SPCNSecuCAT.ocx       | 카드               |
| FDIK    | fdikpos43.dll         | KMPS 인터넷        |
| JTNET   | NCPOS.dll             | 카드, 서명패드     |
| KCP     | KCPOCX.ocx            | 카드               |
| STAR    | -                     | 카드               |

### 3.2 통합 결제 모듈 설계 (12 → 5)

```typescript
// 5개 통합 결제 모듈 아키텍처
┌─────────────────────────────────────────────────────────────────────┐
│                    Payment Gateway Service                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │   NICE     │  │   KICC     │  │    KIS     │  │  SMARTRO   │    │
│  │  Module    │  │   Module   │  │   Module   │  │   Module   │    │
│  │            │  │            │  │            │  │            │    │
│  │ • NICE     │  │ • KICC     │  │ • KIS      │  │ • SMARTRO  │    │
│  │ • KSNET    │  │ • KOVAN    │  │ • KCP      │  │ • SPC      │    │
│  │ • KOCES    │  │ • JTNET    │  │            │  │ • FDIK     │    │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │
│        │               │               │               │            │
│  ┌─────┴───────────────┴───────────────┴───────────────┴─────────┐  │
│  │              Unified Payment Interface (Strategy Pattern)      │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  interface IPaymentStrategy {                           │  │  │
│  │  │    authorize(data: PaymentRequest): Promise<Result>     │  │  │
│  │  │    cancel(txId: string): Promise<Result>                │  │  │
│  │  │    refund(txId: string, amount: number): Promise<Result>│  │  │
│  │  │  }                                                      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┴────────────────────────────────────┐  │
│  │                   Circuit Breaker + Retry                      │  │
│  │  • Failure Threshold: 5회                                      │  │
│  │  • Recovery Time: 30초                                         │  │
│  │  • Timeout: 30초                                               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┴────────────────────────────────────┐  │
│  │               Hardware Abstraction Layer                       │  │
│  │  • 서명패드 통합                                                │  │
│  │  • NFC/IC 카드리더 통합                                         │  │
│  │  • MSR 리더 통합                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 VAN 그룹핑 전략

| 통합 모듈          | 포함 VAN           | 통합 이유                        |
| ------------------ | ------------------ | -------------------------------- |
| **NICE Module**    | NICE, KSNET, KOCES | API 인터페이스 유사성, NICE 계열 |
| **KICC Module**    | KICC, KOVAN, JTNET | 서명패드 연동 유사성             |
| **KIS Module**     | KIS, KCP           | BC로열티/포인트 연동             |
| **SMARTRO Module** | SMARTRO, SPC, FDIK | NFC/T-money 지원                 |
| **Legacy Bridge**  | 기타 레거시        | 점진적 마이그레이션용            |

### 3.4 통합 결제 인터페이스

```typescript
// src/services/payment/interfaces/payment-strategy.interface.ts
export interface PaymentRequest {
  merchantId: string;
  terminalId: string;
  amount: number;
  installment: number;
  cardNumber?: string; // 토큰화 필수
  trackData?: string; // MSR 데이터
  signatureData?: Buffer;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  approvalNumber?: string;
  approvalDate?: string;
  cardInfo?: {
    issuer: string;
    cardType: string;
    lastFourDigits: string;
  };
  errorCode?: string;
  errorMessage?: string;
}

export interface IPaymentStrategy {
  readonly vanCode: string;
  readonly vanName: string;

  authorize(request: PaymentRequest): Promise<PaymentResult>;
  cancel(transactionId: string, reason?: string): Promise<PaymentResult>;
  refund(transactionId: string, amount?: number): Promise<PaymentResult>;

  // 서명패드/하드웨어 연동
  captureSignature?(): Promise<Buffer>;
  readNFC?(): Promise<string>;
}

// Circuit Breaker 설정
export interface CircuitBreakerConfig {
  failureThreshold: number; // 기본 5회
  successThreshold: number; // 기본 3회
  timeout: number; // 기본 30000ms
  halfOpenRequests: number; // 기본 1회
}
```

---

## 4. PostgreSQL 마이그레이션 설계

### 4.1 스키마 매핑

#### SQL Server → PostgreSQL 타입 매핑

| SQL Server    | PostgreSQL    | 비고        |
| ------------- | ------------- | ----------- |
| NVARCHAR(n)   | VARCHAR(n)    | UTF-8 기본  |
| INT           | INTEGER       | 동일        |
| DECIMAL(18,2) | NUMERIC(18,2) | 동일        |
| DATETIME      | TIMESTAMP     | 시간대 고려 |
| BIT           | BOOLEAN       | 변환 필요   |
| IMAGE         | BYTEA         | 바이너리    |
| TEXT          | TEXT          | 동일        |

### 4.2 핵심 테이블 스키마

```sql
-- PostgreSQL Schema

-- 상품 마스터
CREATE TABLE goods (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- 분류
    category_l_code VARCHAR(3),
    category_l_name VARCHAR(20),
    category_m_code VARCHAR(3),
    category_m_name VARCHAR(20),
    category_s_code VARCHAR(3),
    category_s_name VARCHAR(50),

    -- 가격
    purchase_price NUMERIC(18,2) DEFAULT 0,
    sell_price NUMERIC(18,2) DEFAULT 0,

    -- 재고
    stock_quantity INTEGER DEFAULT 0,

    -- 옵션
    is_weight_item BOOLEAN DEFAULT FALSE,
    is_bundle BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- 이미지
    image_url VARCHAR(500),
    thumbnail_url VARCHAR(500),

    -- 다국어
    name_en VARCHAR(100),
    name_ja VARCHAR(100),
    name_zh VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 판매 트랜잭션
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    sale_number VARCHAR(20) UNIQUE NOT NULL,
    pos_no VARCHAR(2) NOT NULL,

    -- 금액
    total_amount NUMERIC(18,2) NOT NULL,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    net_amount NUMERIC(18,2) NOT NULL,

    -- 결제
    payment_type VARCHAR(20) NOT NULL, -- CASH, CARD, MIXED
    cash_amount NUMERIC(18,2) DEFAULT 0,
    card_amount NUMERIC(18,2) DEFAULT 0,

    -- 회원
    member_id INTEGER REFERENCES members(id),
    point_used NUMERIC(18,2) DEFAULT 0,
    point_earned NUMERIC(18,2) DEFAULT 0,

    -- 상태
    status VARCHAR(20) DEFAULT 'COMPLETED', -- COMPLETED, CANCELLED, REFUNDED

    sale_date DATE NOT NULL,
    sale_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 판매 상세
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    goods_id INTEGER REFERENCES goods(id),

    barcode VARCHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(18,2) NOT NULL,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    total_price NUMERIC(18,2) NOT NULL,

    -- 중량 상품
    weight_grams INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 결제 내역
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id),

    -- VAN 정보
    van_code VARCHAR(10) NOT NULL,
    terminal_id VARCHAR(20),
    merchant_id VARCHAR(20),

    -- 거래 정보
    transaction_id VARCHAR(50) UNIQUE,
    approval_number VARCHAR(20),
    approval_date TIMESTAMP,

    -- 금액
    amount NUMERIC(18,2) NOT NULL,
    installment INTEGER DEFAULT 0,

    -- 카드 정보 (토큰화)
    card_token VARCHAR(100),
    card_issuer VARCHAR(50),
    card_type VARCHAR(20),
    last_four_digits VARCHAR(4),

    -- 현금영수증
    cash_receipt_number VARCHAR(50),
    cash_receipt_type VARCHAR(20),

    -- 상태
    status VARCHAR(20) DEFAULT 'APPROVED', -- APPROVED, CANCELLED, REFUNDED

    -- 서명 데이터
    signature_data BYTEA,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 회원
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    member_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,

    phone VARCHAR(20),
    email VARCHAR(100),

    -- 포인트
    point_balance NUMERIC(18,2) DEFAULT 0,
    total_point_earned NUMERIC(18,2) DEFAULT 0,
    total_point_used NUMERIC(18,2) DEFAULT 0,

    -- 등급
    grade VARCHAR(20) DEFAULT 'NORMAL',

    -- 다국어 선호
    preferred_language VARCHAR(5) DEFAULT 'ko',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_goods_barcode ON goods(barcode);
CREATE INDEX idx_goods_category ON goods(category_l_code, category_m_code, category_s_code);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_member ON sales(member_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_members_code ON members(member_code);
CREATE INDEX idx_members_phone ON members(phone);
```

### 4.3 데이터 마이그레이션 전략

```
Phase 1: 스키마 생성 (Week 1)
├── PostgreSQL 스키마 생성
├── 인덱스 및 제약조건 설정
└── Prisma 모델 정의

Phase 2: 데이터 추출 (Week 2)
├── SQL Server 데이터 CSV 추출
├── 인코딩 변환 (EUC-KR → UTF-8)
└── 데이터 정제 및 검증

Phase 3: 데이터 적재 (Week 3)
├── PostgreSQL COPY 명령 활용
├── 참조 무결성 검증
└── 시퀀스 리셋

Phase 4: 검증 및 전환 (Week 4)
├── 데이터 카운트 비교
├── 샘플 데이터 무결성 검증
└── 애플리케이션 연결 전환
```

---

## 5. UI/UX 디자인 시스템

### 5.1 디자인 토큰

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{vue,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 키오스크 Primary
        kiosk: {
          primary: "#E31837", // 빨강
          secondary: "#FFC72C", // 노랑
          background: "#F5F5F5",
          surface: "#FFFFFF",
          text: {
            primary: "#1A1A1A",
            secondary: "#666666",
            muted: "#999999",
          },
        },
        // 상태 색상
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      fontFamily: {
        display: ["Quicksand", "sans-serif"],
        body: ["Inter", "sans-serif"],
        korean: ["Noto Sans KR", "sans-serif"],
        japanese: ["Noto Sans JP", "sans-serif"],
        chinese: ["Noto Sans SC", "sans-serif"],
      },
      borderRadius: {
        kiosk: "1.5rem",
        "kiosk-lg": "2rem",
        "kiosk-xl": "2.5rem",
      },
      spacing: {
        "kiosk-touch": "56px", // 최소 터치 영역
      },
      animation: {
        "scale-tap": "scaleTap 0.1s ease-in-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        scaleTap: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 5.2 컴포넌트 라이브러리 구조

```
src/
├── components/
│   ├── common/
│   │   ├── KButton.vue         # 터치 최적화 버튼
│   │   ├── KCard.vue           # 메뉴 카드
│   │   ├── KModal.vue          # 모달 다이얼로그
│   │   ├── KInput.vue          # 입력 필드
│   │   ├── KBadge.vue          # 뱃지/태그
│   │   ├── KSpinner.vue        # 로딩 스피너
│   │   └── KToast.vue          # 토스트 알림
│   │
│   ├── kiosk/
│   │   ├── WelcomeScreen.vue   # 웰컴 (언어 선택)
│   │   ├── CategoryNav.vue     # 카테고리 네비게이션
│   │   ├── MenuGrid.vue        # 메뉴 그리드
│   │   ├── MenuCard.vue        # 메뉴 카드
│   │   ├── CartPanel.vue       # 장바구니 패널
│   │   ├── QuantityModal.vue   # 수량 선택 모달
│   │   ├── OptionModal.vue     # 옵션 선택 모달
│   │   ├── PaymentScreen.vue   # 결제 화면
│   │   ├── CardPayment.vue     # 카드 결제
│   │   ├── CashPayment.vue     # 현금 결제
│   │   ├── ReceiptScreen.vue   # 영수증 화면
│   │   └── LanguageSelector.vue
│   │
│   ├── admin/
│   │   ├── Sidebar.vue
│   │   ├── DataTable.vue
│   │   └── Charts.vue
│   │
│   └── hardware/
│       ├── PrinterStatus.vue
│       ├── ScannerInput.vue
│       └── PaymentDevice.vue
```

### 5.3 키오스크 화면 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│                        Header (상단바)                           │
│  [로고]              [현재시간]              [언어] [관리자]       │
├───────────┬─────────────────────────────────────────────────────┤
│           │                                                     │
│  Category │              Menu Grid (4-5 Columns)                │
│   Nav     │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  (Left)   │  │     │ │     │ │     │ │     │ │     │           │
│           │  │ Menu│ │ Menu│ │ Menu│ │ Menu│ │ Menu│           │
│  ┌─────┐  │  │ Card│ │ Card│ │ Card│ │ Card│ │ Card│           │
│  │ All │  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│  ├─────┤  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Cat 1│  │  │     │ │     │ │     │ │     │ │     │           │
│  ├─────┤  │  │ Menu│ │ Menu│ │ Menu│ │ Menu│ │ Menu│           │
│  │Cat 2│  │  │ Card│ │ Card│ │ Card│ │ Card│ │ Card│           │
│  ├─────┤  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│  │Cat 3│  │                                                     │
│  └─────┘  │                                                     │
│           │                                                     │
├───────────┴─────────────────────────────────────────────────────┤
│                     Cart Bar (하단 장바구니)                      │
│  [장바구니 아이콘] 3개 상품  ₩25,000   [   주문하기   ]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 다국어 지원 (i18n)

### 6.1 지원 언어

| 언어    | 코드 | 폰트         |
| ------- | ---- | ------------ |
| 한국어  | ko   | Noto Sans KR |
| English | en   | Inter        |
| 日本語  | ja   | Noto Sans JP |
| 中文    | zh   | Noto Sans SC |

### 6.2 Vue i18n 구조

```
src/
├── i18n/
│   ├── index.ts
│   ├── locales/
│   │   ├── ko/
│   │   │   ├── common.json
│   │   │   ├── menu.json
│   │   │   ├── payment.json
│   │   │   └── error.json
│   │   ├── en/
│   │   ├── ja/
│   │   └── zh/
│   └── types.d.ts
```

### 6.3 번역 파일 예시

```json
// src/i18n/locales/ko/common.json
{
  "welcome": {
    "title": "환영합니다",
    "selectLanguage": "언어를 선택해주세요",
    "startOrder": "주문 시작하기"
  },
  "menu": {
    "all": "전체",
    "popular": "인기메뉴",
    "new": "신메뉴",
    "addToCart": "담기",
    "soldOut": "품절"
  },
  "cart": {
    "title": "장바구니",
    "empty": "장바구니가 비어있습니다",
    "totalItems": "{count}개 상품",
    "totalAmount": "총 금액",
    "order": "주문하기",
    "clear": "전체 삭제"
  },
  "payment": {
    "selectMethod": "결제 방법을 선택해주세요",
    "card": "카드 결제",
    "cash": "현금 결제",
    "insertCard": "카드를 넣어주세요",
    "processing": "결제 중입니다...",
    "success": "결제가 완료되었습니다",
    "failed": "결제에 실패했습니다"
  }
}
```

```json
// src/i18n/locales/en/common.json
{
  "welcome": {
    "title": "Welcome",
    "selectLanguage": "Please select your language",
    "startOrder": "Start Order"
  },
  "menu": {
    "all": "All",
    "popular": "Popular",
    "new": "New",
    "addToCart": "Add",
    "soldOut": "Sold Out"
  },
  "cart": {
    "title": "Cart",
    "empty": "Your cart is empty",
    "totalItems": "{count} items",
    "totalAmount": "Total",
    "order": "Order Now",
    "clear": "Clear All"
  },
  "payment": {
    "selectMethod": "Select payment method",
    "card": "Card Payment",
    "cash": "Cash Payment",
    "insertCard": "Please insert your card",
    "processing": "Processing payment...",
    "success": "Payment successful",
    "failed": "Payment failed"
  }
}
```

### 6.4 Vue i18n 설정

```typescript
// src/i18n/index.ts
import { createI18n } from "vue-i18n";
import ko from "./locales/ko";
import en from "./locales/en";
import ja from "./locales/ja";
import zh from "./locales/zh";

export type SupportedLocale = "ko" | "en" | "ja" | "zh";

export const i18n = createI18n({
  legacy: false, // Composition API 사용
  locale: "ko",
  fallbackLocale: "en",
  messages: { ko, en, ja, zh },

  // 숫자 포맷
  numberFormats: {
    ko: {
      currency: { style: "currency", currency: "KRW", notation: "standard" },
    },
    en: {
      currency: { style: "currency", currency: "USD" },
    },
    ja: {
      currency: { style: "currency", currency: "JPY" },
    },
    zh: {
      currency: { style: "currency", currency: "CNY" },
    },
  },

  // 날짜/시간 포맷
  datetimeFormats: {
    ko: {
      short: { year: "numeric", month: "short", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" },
    },
  },
});
```

---

## 7. CI/CD 및 모니터링

### 7.1 GitHub Actions 워크플로우

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"

jobs:
  # 1. 린트 및 타입 체크
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  # 2. 단위 테스트
  test-unit:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  # 3. 통합 테스트
  test-integration:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: poson_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
      - run: pnpm test:integration

  # 4. E2E 테스트
  test-e2e:
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e

  # 5. Electron 빌드
  build-electron:
    runs-on: ${{ matrix.os }}
    needs: test-e2e
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        os: [windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:electron
      - uses: actions/upload-artifact@v4
        with:
          name: electron-build-${{ matrix.os }}
          path: dist/electron/

  # 6. Docker 이미지 빌드 (Backend)
  build-docker:
    runs-on: ubuntu-latest
    needs: test-e2e
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 7.2 모니터링 스택

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │   Kiosk     │  │   Backend   │  │        PostgreSQL           │  │
│  │   App       │  │   Server    │  │         Database            │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────────┘  │
│         │                │                       │                  │
│         │      Metrics (OpenTelemetry)           │                  │
│         └────────────────┼───────────────────────┘                  │
│                          ▼                                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Prometheus                                │  │
│  │  • Application Metrics                                        │  │
│  │  • Business Metrics (판매, 결제, 오류율)                         │  │
│  │  • System Metrics (CPU, Memory, Disk)                         │  │
│  └───────────────────────┬───────────────────────────────────────┘  │
│                          │                                          │
│                          ▼                                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                       Grafana                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │  │
│  │  │ 판매 현황   │  │ 결제 현황    │  │   시스템 상태            │ │  │
│  │  │ Dashboard  │  │ Dashboard   │  │   Dashboard             │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    ELK Stack                                   │  │
│  │  Elasticsearch → Logstash → Kibana                            │  │
│  │  • Application Logs                                           │  │
│  │  • Error Tracking                                             │  │
│  │  • Audit Logs                                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Alerting                                    │  │
│  │  • PagerDuty / Slack Integration                              │  │
│  │  • 결제 실패율 > 1% → Critical Alert                           │  │
│  │  • 응답 시간 > 3s → Warning Alert                              │  │
│  │  • 시스템 리소스 > 80% → Warning Alert                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 핵심 메트릭

| 카테고리     | 메트릭         | 임계값         | 알림         |
| ------------ | -------------- | -------------- | ------------ |
| **비즈니스** | 일일 판매액    | 목표 대비      | Daily Report |
| **비즈니스** | 시간당 주문 수 | 평균 대비 ±50% | Warning      |
| **결제**     | 결제 성공률    | < 99%          | Critical     |
| **결제**     | 결제 응답 시간 | > 5s           | Warning      |
| **시스템**   | API 응답 시간  | > 3s           | Warning      |
| **시스템**   | 에러율         | > 1%           | Critical     |
| **인프라**   | CPU 사용률     | > 80%          | Warning      |
| **인프라**   | 메모리 사용률  | > 85%          | Warning      |
| **인프라**   | 디스크 사용률  | > 90%          | Critical     |

---

## 8. 프로젝트 디렉토리 구조

```
poson-kiosk/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml
│       └── release.yml
│
├── packages/
│   ├── common/                    # 공유 타입/유틸리티
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── constants/
│   │   └── package.json
│   │
│   ├── frontend/                  # Electron + Vue 3
│   │   ├── electron/
│   │   │   ├── main/             # Main Process
│   │   │   │   ├── index.ts
│   │   │   │   └── ipc-handlers.ts
│   │   │   └── preload/          # Preload Scripts
│   │   │       └── index.ts
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   ├── kiosk/
│   │   │   │   └── admin/
│   │   │   ├── views/
│   │   │   │   ├── kiosk/
│   │   │   │   └── admin/
│   │   │   ├── stores/
│   │   │   │   ├── cart.ts
│   │   │   │   ├── menu.ts
│   │   │   │   └── payment.ts
│   │   │   ├── composables/
│   │   │   ├── i18n/
│   │   │   │   └── locales/
│   │   │   ├── api/
│   │   │   ├── router/
│   │   │   ├── assets/
│   │   │   └── App.vue
│   │   ├── electron.vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── backend/                   # Node.js + Express
│       ├── src/
│       │   ├── api/
│       │   │   ├── routes/
│       │   │   └── controllers/
│       │   ├── services/
│       │   │   ├── payment/
│       │   │   │   ├── strategies/
│       │   │   │   │   ├── nice.strategy.ts
│       │   │   │   │   ├── kicc.strategy.ts
│       │   │   │   │   ├── kis.strategy.ts
│       │   │   │   │   └── smartro.strategy.ts
│       │   │   │   ├── payment.service.ts
│       │   │   │   └── circuit-breaker.ts
│       │   │   ├── order.service.ts
│       │   │   ├── product.service.ts
│       │   │   └── member.service.ts
│       │   ├── repositories/
│       │   ├── middleware/
│       │   ├── validators/
│       │   ├── config/
│       │   └── app.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── tests/
│       └── package.json
│
├── docker/
│   ├── Dockerfile.backend
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
│
├── docs/
│   ├── api/                      # OpenAPI 스펙
│   ├── architecture/
│   └── migration/
│
├── scripts/
│   ├── migrate-data.ts           # 데이터 마이그레이션
│   └── seed.ts                   # 시드 데이터
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. 마이그레이션 로드맵

### 9.1 Phase 1: 기반 구축 (Month 1-2)

```
Week 1-2: 프로젝트 초기화
├── Monorepo 구조 설정 (pnpm workspace)
├── TypeScript 설정
├── ESLint/Prettier 설정
├── Git Flow 설정
└── CI/CD 기본 파이프라인

Week 3-4: 백엔드 기반
├── Express + TypeScript 설정
├── Prisma + PostgreSQL 연동
├── 기본 인증/인가 구현
└── 로깅/에러 처리 미들웨어

Week 5-6: 프론트엔드 기반
├── electron-vite + Vue 3 설정
├── Tailwind CSS 설정
├── Pinia 상태 관리 설정
├── Vue i18n 다국어 설정
└── 기본 컴포넌트 라이브러리

Week 7-8: 데이터베이스 마이그레이션
├── PostgreSQL 스키마 설계
├── SQL Server → PostgreSQL 데이터 마이그레이션
├── 데이터 검증
└── Prisma 모델 최적화
```

### 9.2 Phase 2: 핵심 기능 (Month 3-4)

```
Week 9-10: 상품 관리
├── 상품 CRUD API
├── 카테고리 관리
├── 이미지 업로드
└── 키오스크 메뉴 화면

Week 11-12: 주문 관리
├── 장바구니 기능
├── 주문 생성/수정
├── 옵션 선택 기능
└── 주문 상태 관리

Week 13-14: 결제 통합 (NICE, KICC)
├── NICE Module 구현
├── KICC Module 구현
├── Circuit Breaker 구현
└── 결제 테스트

Week 15-16: 결제 통합 (KIS, SMARTRO)
├── KIS Module 구현
├── SMARTRO Module 구현
├── 서명패드 연동
└── 현금영수증 연동
```

### 9.3 Phase 3: 확장 기능 (Month 5-6)

```
Week 17-18: 회원/포인트
├── 회원 관리 API
├── 포인트 적립/사용
├── 회원 조회 화면
└── 포인트 결제 연동

Week 19-20: 관리자 기능
├── 관리자 대시보드
├── 판매 현황 조회
├── 정산 기능
└── 재고 관리

Week 21-22: 다국어 완성
├── 전체 화면 번역
├── 언어 전환 테스트
├── 폰트 최적화
└── RTL 지원 (필요시)

Week 23-24: 하드웨어 연동
├── 영수증 프린터 연동
├── 바코드 스캐너 연동
├── CDP 연동
└── 현금서랍 연동
```

### 9.4 Phase 4: 안정화 및 배포 (Month 7-8)

```
Week 25-26: 테스트 및 QA
├── E2E 테스트 완성
├── 성능 테스트
├── 보안 감사
└── 버그 수정

Week 27-28: 모니터링 구축
├── Prometheus + Grafana 설정
├── ELK Stack 설정
├── 알림 설정
└── 대시보드 구성

Week 29-30: 파일럿 배포
├── 테스트 매장 배포
├── 현장 테스트
├── 피드백 수집
└── 긴급 수정

Week 31-32: 전체 배포
├── 단계별 롤아웃
├── 레거시 시스템 병행 운영
├── 교육 및 매뉴얼
└── 레거시 종료
```

---

## 10. 리스크 및 완화 전략

### 10.1 기술 리스크

| 리스크                   | 영향 | 확률 | 완화 전략                          |
| ------------------------ | ---- | ---- | ---------------------------------- |
| VAN 연동 호환성          | 높음 | 중간 | 점진적 마이그레이션, 레거시 브릿지 |
| 데이터 마이그레이션 오류 | 높음 | 낮음 | 철저한 검증, 롤백 계획             |
| Electron 성능 이슈       | 중간 | 중간 | 성능 최적화, 네이티브 모듈 활용    |
| 하드웨어 호환성          | 중간 | 중간 | 추상화 레이어, 드라이버 테스트     |

### 10.2 비즈니스 리스크

| 리스크      | 영향 | 확률 | 완화 전략                |
| ----------- | ---- | ---- | ------------------------ |
| 운영 중단   | 높음 | 낮음 | 병행 운영, 빠른 롤백     |
| 사용자 적응 | 중간 | 중간 | 교육, 단계적 전환        |
| 일정 지연   | 중간 | 중간 | 애자일 방법론, 버퍼 확보 |

---

## 11. 예상 비용 및 리소스

### 11.1 인력 구성

| 역할              | 인원 | 기간  | 비고               |
| ----------------- | ---- | ----- | ------------------ |
| 프로젝트 매니저   | 1    | 8개월 | 전담               |
| 백엔드 개발자     | 2    | 8개월 | Node.js/TypeScript |
| 프론트엔드 개발자 | 2    | 8개월 | Vue 3/Electron     |
| 결제 전문가       | 1    | 4개월 | VAN 연동           |
| QA 엔지니어       | 1    | 6개월 | 테스트             |
| DevOps 엔지니어   | 1    | 4개월 | 인프라/CI/CD       |

### 11.2 인프라 비용 (월간)

| 항목                  | 비용 (예상)      |
| --------------------- | ---------------- |
| AWS/Cloud 서버        | $500-1,000       |
| PostgreSQL (RDS)      | $200-400         |
| Redis (ElastiCache)   | $100-200         |
| 모니터링 (Datadog 등) | $200-500         |
| **월 합계**           | **$1,000-2,100** |

---

## 12. 성공 지표 (KPI)

| 지표                | 목표      | 측정 방법       |
| ------------------- | --------- | --------------- |
| 시스템 가용성       | 99.9%     | 업타임 모니터링 |
| 결제 성공률         | 99.5%     | 결제 로그 분석  |
| 평균 응답 시간      | < 500ms   | APM 측정        |
| 코드 커버리지       | > 80%     | Jest/Vitest     |
| 사용자 만족도       | > 4.0/5.0 | 설문 조사       |
| 마이그레이션 완료율 | 100%      | 기능 체크리스트 |
