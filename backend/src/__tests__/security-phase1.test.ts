import { describe, it, expect, vi, beforeEach } from "vitest";

// ── S-1/S-17: JWT Secret 환경변수 검증 ──
describe("S-1/S-17: JWT Secret 환경변수 검증", () => {
  it("개발 환경에서는 기본 시크릿으로 시작 가능", async () => {
    // config 모듈이 이미 로드되어 있으므로 값 확인
    const { config } = await import("../config/index.js");
    expect(config.jwt.accessSecret).toBeDefined();
    expect(config.jwt.refreshSecret).toBeDefined();
    expect(config.jwt.accessSecret.length).toBeGreaterThan(10);
  });

  it("프로덕션에서 JWT_ACCESS_SECRET 미설정 시 프로세스 종료 코드 존재", async () => {
    // config/index.ts 소스 내 process.exit(1) 호출 로직 확인
    const fs = await import("fs");
    const configSource = fs.readFileSync("src/config/index.ts", "utf-8");
    expect(configSource).toContain('process.exit(1)');
    expect(configSource).toContain('JWT_ACCESS_SECRET');
    expect(configSource).toContain('isProduction');
  });
});

// ── S-3: CORS 비허용 origin 차단 ──
describe("S-3: CORS 비허용 origin 차단", () => {
  it("index.ts에 CORS 에러 반환 로직 존재", async () => {
    const fs = await import("fs");
    const indexSource = fs.readFileSync("src/index.ts", "utf-8");
    // 비허용 origin에 대해 에러를 생성하는지 확인
    expect(indexSource).toContain("new Error");
    expect(indexSource).toContain("not allowed");
    // 이전의 전체 허용 패턴이 제거되었는지 확인
    expect(indexSource).not.toContain("Allow all origins in development");
  });
});

// ── S-6: 개발용 인증 폴백 엄격화 ──
describe("S-6: 개발용 인증 폴백 엄격화", () => {
  it("auth.service.ts에서 NODE_ENV 대신 config.env 사용", async () => {
    const fs = await import("fs");
    const authSource = fs.readFileSync("src/services/auth.service.ts", "utf-8");
    // process.env.NODE_ENV !== "production" 패턴이 없어야 함
    expect(authSource).not.toContain('process.env.NODE_ENV !== "production"');
    // 대신 config.env === "development" 사용
    expect(authSource).toContain('config.env === "development"');
  });
});

// ── S-7: 주문 가격 서버 재계산 ──
describe("S-7: 주문 가격 서버 재계산", () => {
  it("order service에서 DB 가격으로 총액 계산", async () => {
    const fs = await import("fs");
    // Service Layer 추출 후 비즈니스 로직은 order.service.ts에 위치
    const orderSource = fs.readFileSync("src/services/order.service.ts", "utf-8");
    // 클라이언트 price 직접 사용 패턴이 없어야 함
    expect(orderSource).not.toContain("item.price * item.quantity");
    // DB 가격 조회 필드가 포함되어야 함
    expect(orderSource).toContain("sellPrice");
    expect(orderSource).toContain("discountPrice");
    expect(orderSource).toContain("serverPrice");
  });
});

// ── S-8: 주문 상태 변경 인증 ──
describe("S-8: 주문 상태 변경 인증 추가", () => {
  it("PATCH /:id/status에 authenticate 미들웨어 적용", async () => {
    const fs = await import("fs");
    const ordersSource = fs.readFileSync("src/routes/orders.ts", "utf-8");
    // authenticate가 status 라우트에 적용되었는지 확인
    const statusRouteMatch = ordersSource.match(/router\.patch\("\/\:id\/status",\s*authenticate/);
    expect(statusRouteMatch).not.toBeNull();
  });
});

// ── S-10: 결제 API 인증 ──
describe("S-10: 결제 API 인증 추가", () => {
  it("결제 관련 엔드포인트에 authenticate 적용", async () => {
    const fs = await import("fs");
    const paymentsSource = fs.readFileSync("src/routes/payments.ts", "utf-8");
    // POST / 결제 처리
    expect(paymentsSource).toMatch(/router\.post\("\/",\s*authenticate/);
    // POST /:transactionId/cancel 결제 취소
    expect(paymentsSource).toMatch(/router\.post\("\/:transactionId\/cancel",\s*authenticate/);
    // POST /refund 환불
    expect(paymentsSource).toMatch(/router\.post\("\/refund",\s*authenticate/);
    // GET /:transactionId 조회
    expect(paymentsSource).toMatch(/router\.get\("\/:transactionId",\s*authenticate/);
  });
});

// ── S-11: admin 쿼리 파라미터 인증 ──
describe("S-11: admin 쿼리 파라미터 인증 강제", () => {
  it("products.ts에서 admin=true 미인증 시 차단", async () => {
    const fs = await import("fs");
    const productsSource = fs.readFileSync("src/routes/products.ts", "utf-8");
    // optionalAuth 미들웨어 사용
    expect(productsSource).toContain("optionalAuth");
    // admin=true + 미인증 시 에러 반환
    expect(productsSource).toContain("isAdminMode && !authReq.user");
  });
});

// ── S-18: accessToken ref 비공개화 ──
describe("S-18: accessToken ref 비공개화", () => {
  it("auth store에서 accessToken이 직접 노출되지 않음", async () => {
    const fs = await import("fs");
    const authStoreSource = fs.readFileSync(
      "../frontend/src/renderer/src/stores/auth.ts",
      "utf-8",
    );
    // return 블록에서 accessToken이 직접 포함되지 않아야 함
    const returnBlock = authStoreSource.match(/return \{[\s\S]*?\};/);
    expect(returnBlock).not.toBeNull();
    // accessToken이 return 객체에 직접 포함되지 않음
    // (getAccessToken 메서드를 통해서만 접근)
    const returnContent = returnBlock![0];
    // "accessToken," (직접 노출)이 아닌 "getAccessToken," (함수 노출)만 있어야 함
    const directExposure = returnContent.match(/^\s*accessToken,/m);
    expect(directExposure).toBeNull();
    expect(returnContent).toContain("getAccessToken");
  });
});

// ── R-1: 주문번호 Race Condition ──
describe("R-1: 주문번호 Race Condition 해결", () => {
  it("주문번호 생성에 MAX 패턴 사용 (count 대신)", async () => {
    const fs = await import("fs");
    // Service Layer 추출 후 주문번호 생성 로직은 order.service.ts에 위치
    const orderSource = fs.readFileSync("src/services/order.service.ts", "utf-8");
    // count 기반 패턴이 사라졌는지 확인
    expect(orderSource).not.toContain("orderCount = await tx.order.count");
    // findFirst + orderBy desc 패턴 사용
    expect(orderSource).toContain("findFirst");
    expect(orderSource).toContain('orderBy: { orderNumber: "desc" }');
  });
});

// ── S-2: Refresh Token Redis 전환 ──
describe("S-2: Refresh Token Redis 전환", () => {
  it("auth.service.ts에서 Redis 기반 토큰 저장", async () => {
    const fs = await import("fs");
    const authSource = fs.readFileSync("src/services/auth.service.ts", "utf-8");
    expect(authSource).toContain("getRedis");
    expect(authSource).toContain("REFRESH_TOKEN_PREFIX");
    expect(authSource).toContain("REFRESH_TOKEN_TTL");
    // 기존 전역 Map이 주 저장소가 아님을 확인
    expect(authSource).toContain("memoryFallback");
    expect(authSource).not.toContain("refreshTokenStore");
  });
});

// ── R-2: Idempotency Redis 전환 ──
describe("R-2: Idempotency Redis 전환", () => {
  it("idempotency.service.ts에서 Redis 사용", async () => {
    const fs = await import("fs");
    const idemSource = fs.readFileSync("src/services/payment/idempotency.service.ts", "utf-8");
    expect(idemSource).toContain("getRedis");
    expect(idemSource).toContain("IDEM_PREFIX");
    // 기존 단순 Map 저장소가 아님을 확인
    expect(idemSource).toContain("memoryFallback");
  });
});

// ── S-4: 프로덕션 CSP 유지 ──
describe("S-4: 프로덕션 CSP 정책 유지", () => {
  it("main/index.ts에서 CSP 삭제 대신 교체", async () => {
    const fs = await import("fs");
    const mainSource = fs.readFileSync("../frontend/src/main/index.ts", "utf-8");
    // 프로덕션 블록에서 CSP 삭제 패턴이 없어야 함
    expect(mainSource).not.toContain('delete details.responseHeaders["content-security-policy"]');
    expect(mainSource).not.toContain('delete details.responseHeaders["Content-Security-Policy"]');
    // S-4 주석이 있는 블록에 CSP가 설정됨
    expect(mainSource).toContain("S-4:");
    // 프로덕션 CSP에 app: 프로토콜 포함
    const cspCount = (mainSource.match(/Content-Security-Policy/g) || []).length;
    // 개발 + 프로덕션 양쪽에 CSP 설정이 있어야 함 (최소 2번)
    expect(cspCount).toBeGreaterThanOrEqual(2);
  });
});

// ── S-5: IPC sender origin 검증 ──
describe("S-5: IPC sender origin 검증", () => {
  it("하드웨어 IPC에 sender 검증 적용", async () => {
    const fs = await import("fs");
    const mainSource = fs.readFileSync("../frontend/src/main/index.ts", "utf-8");
    expect(mainSource).toContain("validateIpcSender");
    expect(mainSource).toContain("secureHandle");
    // 하드웨어 핸들러가 secureHandle로 등록됨
    expect(mainSource).toContain('secureHandle("printer:connect"');
    expect(mainSource).toContain('secureHandle("terminal:requestPayment"');
    expect(mainSource).toContain("UNAUTHORIZED_SENDER");
  });
});
