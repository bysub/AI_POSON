# AI_POSON 키오스크 시스템 종합 분석 보고서

> 분석일: 2026-02-27 | 검증일: 2026-02-27 | 분석 범위: Frontend + Backend 전체

---

## 1. 프로젝트 규모 요약

| 영역 | 파일 수 | 총 라인 수 |
|------|---------|-----------:|
| **Frontend (Vue/TS)** | 79개 | 27,780줄 |
| **Backend (Express/TS)** | 39개 | 7,365줄 |
| **DB 모델 (Prisma)** | 19개 | - |
| **API 엔드포인트** | ~100개 | - |
| **합계** | ~118개 | ~35,000줄 |

---

## 2. Critical Issues (반드시 수정)

### 2-1. JWT 토큰을 localStorage에 저장
- **파일**: `stores/auth.ts:65-68`
- **상태**: 미수정
- **위험**: accessToken + refreshToken(7일 유효) + 관리자 정보가 localStorage에 평문 저장
- **코드**:
  ```ts
  localStorage.setItem("accessToken", response.data.data.accessToken);
  localStorage.setItem("refreshToken", response.data.data.refreshToken);
  localStorage.setItem("admin", JSON.stringify(response.data.data.user));
  ```
- **권장**: Electron `safeStorage` API 또는 메인 프로세스 메모리 보관

### 2-2. `app:quit` / `app:toggleDevTools` IPC에 인증 가드 없음
- **파일**: `main/index.ts:161-166`, `preload/index.ts:8`
- **상태**: 미수정
- **위험**: 키오스크 환경에서 `window.api.quit()` 또는 `window.api.toggleDevTools()` 호출로 앱 종료/DevTools 노출 가능
- **코드**:
  ```ts
  ipcMain.handle("app:quit", () => app.quit());  // 인증 없음
  ```
- **권장**: 메인 프로세스에서 관리자 세션 검증 후 종료/DevTools 처리. 프로덕션에서 `toggleDevTools` 비활성화

### 2-3. 결제 API `unknown` 타입 사용
- **파일**: `services/api/client.ts:111-122`
- **상태**: 미수정
- **위험**: `processPayment(paymentData: unknown)` + `cancelPayment` 반환값 `unknown` - 타입 검증 없음
- **권장**: `PaymentRequest`/`PaymentResponse` 인터페이스 정의

### 2-4. 결제 성공 후 DB 업데이트 실패 무시
- **파일**: `views/PaymentView.vue:140-199`
- **상태**: 미수정
- **위험**: VAN 카드 승인 성공 → 주문 상태 PATCH 실패 시 `console.error`만 출력하고 `/complete`로 이동. 결제는 완료되었지만 DB는 PENDING 상태 유지
- **코드**:
  ```ts
  try {
    await apiClient.patch(`/api/v1/orders/${currentOrder.value.id}/status`, { ... });
  } catch (error) {
    console.error("Failed to update order status:", error); // 무시
  }
  // 결제 성공/실패 관계없이 완료 화면으로 이동
  ```
- **권장**: 최대 3회 재시도 + 실패 시 로컬 큐에 기록 후 온라인 복구

### 2-5. 인메모리 토큰 저장 (Backend)
- **파일**: `auth.service.ts:15-16`
- **상태**: 미수정 (문서화됨)
- **위험**: `new Map<string, { userId: string; expiresAt: Date }>()` - 서버 재시작 시 모든 리프레시 토큰 소실
- **권장**: Redis로 이동

### 2-6. JWT 시크릿 2단계 하드코딩
- **파일**: `config/index.ts:18-19`, `auth.service.ts:28-30`
- **상태**: 미수정
- **위험**: 폴백값이 2곳에 존재하며 문자열이 서로 다름
  - `config/index.ts`: `"access-secret-change-in-production"`
  - `auth.service.ts`: `"access-secret-key-change-in-production"`
- **영향**: `.env`에 JWT_ACCESS_SECRET 미설정 시 예측 가능한 시크릿으로 운영됨
- **권장**: `.env` 필수 입력 강제 (폴백값 제거), 앱 시작 시 환경변수 검증

### 2-7. CORS 설정 - 프로덕션에서 모든 origin 허용 (신규)
- **파일**: `backend/src/index.ts:23-42`
- **상태**: 미수정
- **위험**: `else` 분기에서 `callback(null, true)` → 모든 origin이 허용되며 `credentials: true`와 결합
- **코드**:
  ```ts
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(null, true); // "Allow all origins in development" 주석이지만 프로덕션에서도 실행
  }
  ```
- **추가 문제**: `config/index.ts`에 정의된 `cors.origin` 환경변수가 실제로 사용되지 않음
- **권장**: `NODE_ENV`에 따른 분기 + `else`에서 `callback(new Error("CORS not allowed"))`

---

## 3. Warning Issues (수정 권장)

### 3-1. 개발 모드 sandbox 비활성화
- **파일**: `main/index.ts:74`
- **상태**: 미수정 (의도적)
- `sandbox: is.dev ? false : true` → 프로덕션은 `true`이므로 허용 가능하나, 개발 환경 리스크 존재

### 3-2. STT_MODEL 환경변수 미검증 (부분 수정)
- **파일**: `main/index.ts:277`, `main/index.ts:451`
- **상태**: 부분 수정
- 런타임 `stt:setModel` IPC 핸들러에는 화이트리스트 검증 존재
- 초기 시작 시 `process.env.STT_MODEL`은 여전히 검증 없이 Python 인자로 전달
- **권장**: 초기 로딩에도 동일한 화이트리스트 적용

### 3-3. useSTT 타이머 누수 가능성
- **파일**: `composables/useSTT.ts:44-48`
- **상태**: 미수정
- `setInterval(checkDaemonReady, 2000)` - 카운터, 최대 시도 제한, 백오프 없음
- STT 데몬이 시작 실패 시 앱 전체 수명 동안 2초마다 폴링
- **권장**: 최대 15회 재시도 후 에러 상태 전환

### 3-4. Levenshtein 성능 (대규모 상품)
- **파일**: `utils/productMatcher.ts:47-60`
- **상태**: 미수정
- 상품 수백 개 시 O(n*m) 행렬 연산이 동기적으로 실행
- **권장**: 조기 종료 조건 추가 `if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1`

### 3-5. 결제 정보 console.log 노출
- **파일**: `views/PaymentView.vue:141, 152, 183, 195`
- **상태**: 미수정 (4건)
- 노출 데이터: `transactionId`, `approvalNumber`, `receivedAmount`, `changeAmount`
- **권장**: 프로덕션 빌드에서 `console.log` 제거 (vite-plugin-remove-console 또는 조건부 로깅)

### 3-6. NumberPad 디버그 로그 미제거
- **파일**: `components/kiosk/NumberPad.vue:43`
- **상태**: 미수정
- `console.log("화면오픈시?" + props.format)` - 오탈자 포함 디버그 로그

### 3-7. N+1 쿼리 패턴 (Backend)
- **파일**: `stock-movements.ts:93-129`
- **상태**: 낮은 위험
- `prisma.$transaction` 내 반복문에서 아이템당 3회 쿼리 (find + update + create)
- 페이징이 적용되어 있어 실제 성능 영향은 제한적
- **권장**: 대량 재고 조정 시 `prisma.purchaseProduct.updateMany` 활용 검토

---

## 4. 아키텍처 분석

### 4-1. Frontend 구조 평가

| 항목 | 평가 | 근거 |
|------|------|------|
| 구조 정리도 | **B+** | 폴더 분류 명확, 거대 파일 존재 |
| 재사용성 | **A-** | Composable/Store 설계 우수 |
| 타입 안전성 | **A** | TypeScript + Composition API |
| 일관성 | **A** | 명명, 패턴, 스타일 일관 |
| 유지보수성 | **B** | 거대 파일로 가독성 저하 |
| 테스트 | **D** | 테스트 파일 0개 (vitest 설정만 존재) |

### 4-2. Backend 구조 평가

| 항목 | 평가 | 근거 |
|------|------|------|
| API 설계 | **A-** | REST 원칙 준수, 일관된 응답 포맷 |
| 인증/인가 | **B** | JWT + RBAC 구현, 인메모리 저장 + 하드코딩 시크릿 |
| 에러 처리 | **A** | AppError 클래스 기반 일관 처리 |
| 캐싱 | **B+** | Redis + Graceful fallback |
| 결제 시스템 | **A** | Strategy + CircuitBreaker + 멱등성 |
| CORS/보안 | **C** | 전체 origin 허용, 시크릿 하드코딩 |
| 테스트 | **D** | 테스트 파일 0개 (vitest 설정만 존재) |

---

## 5. 거대 파일 목록 및 리팩토링 우선순위

### P1 (긴급 - 복잡도 높음)

| 파일 | 라인 수 | 개선안 |
|------|--------:|--------|
| DevicesView.vue | 2,276 | 기기 타입별 서브컴포넌트 분리 (POS/KIOSK/KITCHEN) |
| SettingsView.vue | 1,370 | 탭별 컴포넌트 분리 (6개 탭) |
| ProductsView.vue | 1,364 | ProductFormModal + OptionManager 추출 |
| orders.ts (Backend) | 656 | OrderService 분리 |

### P2 (중간)

| 파일 | 라인 수 | 개선안 |
|------|--------:|--------|
| CategoriesView.vue | 1,069 | CategoryFormModal 분리 |
| PurchaseProductFormModal.vue | 625 | usePurchaseProductForm composable 추출 |
| products.ts (Backend) | 611 | ProductService 분리, 캐싱 로직 함수화 |
| PaymentView.vue | 676 | 결제 수단별 분리 (이미 일부 완료) |

### P3 (낮음)

| 파일 | 라인 수 | 개선안 |
|------|--------:|--------|
| useVoiceCommand.ts | 535 | 상수(키워드맵) → constants.ts 추출 |
| useVirtualKeyboard.ts | 569 | 한글 조합 테이블 → hangul-utils.ts 추출 |

---

## 6. 누락/미구현 기능

### 6-1. 하드웨어 연동 (TODO 다수)
- `hardware/terminal/van-terminal.ts` - 실제 시리얼 통신 미구현
- `hardware/printer/escpos-printer.ts` - 실제 프린터 연결 미구현
- `hardware/scanner/usb-scanner.ts` - 실제 스캐너 연결 미구현

### 6-2. 테스트 커버리지 0%
- Frontend/Backend 모두 vitest 설정만 존재, 테스트 파일 0개
- 핵심 테스트 필요: productMatcher, useVoiceCommand, auth store, 결제 플로우

### 6-3. API 문서 (Swagger)
- OpenAPI/Swagger 미통합, swagger 관련 의존성 없음
- ~100개 엔드포인트 문서화 필요

---

## 7. 긍정적 패턴

- Composition API + `<script setup>` 일관 사용
- Pinia 8개 스토어로 명확한 관심사 분리
- 다국어 4개 언어 (ko/en/ja/zh) 완벽 지원
- 접근성: 저시력 모드, TTS, STT, 가상키보드
- VAN 결제: Strategy + CircuitBreaker + 멱등성 패턴
- Redis 캐싱 + Graceful fallback
- 오프라인 우선: Dexie.js + SyncManager
- CustomEvent → Pinia store 전환 완료
- `env:get` IPC에 `SAFE_ENV_KEYS` 화이트리스트 적용

---

## 8. 권장 개선 로드맵

### Phase 1 - 보안 (즉시)
1. JWT localStorage → Electron safeStorage 이동
2. `app:quit` + `app:toggleDevTools` 인증 가드 추가
3. CORS `else` 분기 수정 (프로덕션에서 차단)
4. 결제 API 타입 정의 (`PaymentRequest`/`PaymentResponse`)
5. Backend JWT 시크릿 필수화 (폴백값 제거)
6. console.log 정리 (결제 민감정보 4건 + NumberPad 디버그 1건)

### Phase 2 - 안정성 (1주)
1. 결제 후 DB 업데이트 실패 재시도 로직 (최대 3회 + 로컬 큐)
2. STT_MODEL 초기 로딩 화이트리스트 검증
3. useSTT 타이머 최대 재시도 제한 (15회)
4. Backend 리프레시 토큰 Redis 이동

### Phase 3 - 구조 개선 (2주)
1. DevicesView 컴포넌트 분리 (2,276줄)
2. ProductsView 컴포넌트 분리 (1,364줄)
3. Backend 서비스 레이어 추출 (orders.ts, products.ts)
4. 대형 라우트 파일 분할

### Phase 4 - 품질 (지속)
1. 핵심 로직 단위 테스트 작성 (productMatcher, auth, 결제)
2. API 문서 (Swagger) 통합
3. Levenshtein 조기 종료 최적화
4. 하드웨어 연동 구현

---

## 9. 이슈 추적 현황

> 마지막 검증: 2026-02-27

| # | 이슈 | 심각도 | 상태 |
|---|------|--------|------|
| 2-1 | JWT localStorage | Critical | 미수정 |
| 2-2 | app:quit/toggleDevTools 무인증 | Critical | 미수정 |
| 2-3 | processPayment unknown 타입 | Critical | 미수정 |
| 2-4 | 결제 후 DB 업데이트 실패 무시 | Critical | 미수정 |
| 2-5 | 인메모리 토큰 저장 | Critical | 미수정 (문서화됨) |
| 2-6 | JWT 시크릿 2단계 하드코딩 | Critical | 미수정 |
| 2-7 | CORS 전체 origin 허용 | Critical | 미수정 (신규 발견) |
| 3-1 | 개발 sandbox 비활성화 | Info | 의도적 |
| 3-2 | STT_MODEL 초기 미검증 | Warning | 부분 수정 |
| 3-3 | useSTT 타이머 누수 | Warning | 미수정 |
| 3-4 | Levenshtein 성능 | Warning | 미수정 |
| 3-5 | console.log 결제 민감정보 | Warning | 미수정 (4건) |
| 3-6 | NumberPad 디버그 로그 | Warning | 미수정 |
| 3-7 | N+1 쿼리 패턴 | Low | 낮은 위험 |
