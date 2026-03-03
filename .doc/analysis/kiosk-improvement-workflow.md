# AI_POSON 키오스크 개선 구현 워크플로우

> 기준 문서: `kiosk-system-review.analysis.md` (2026-02-27 검증)
> 작성일: 2026-02-27 | 총 이슈: 7 Critical + 6 Warning + 구조 개선 + 품질

---

## Phase 1 - 보안 패치 (긴급)

> 목표: Critical 보안 취약점 7건 해결
> 의존성: 없음 (즉시 착수 가능)
> 예상 변경 파일: ~10개

### Task 1.1: JWT 토큰 보안 저장소 전환 [Critical 2-1]

**현재**: localStorage에 accessToken + refreshToken + admin 정보 평문 저장
**목표**: Electron safeStorage API 또는 메인 프로세스 메모리 보관

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/renderer/src/stores/auth.ts` |
| 추가 파일 | `frontend/src/main/index.ts` (IPC 핸들러), `frontend/src/preload/index.ts` (bridge) |
| 복잡도 | 중간 |

**구현 단계**:
1. Main Process에 `token:store`, `token:get`, `token:clear` IPC 핸들러 추가
   - `safeStorage.encryptString()` / `safeStorage.decryptString()` 사용
   - 또는 메인 프로세스 메모리 변수에 보관 (재시작 시 재로그인)
2. Preload에 `contextBridge` API 노출: `window.api.token.store/get/clear`
3. `auth.ts` store에서 `localStorage.setItem/getItem/removeItem` → IPC 호출로 교체
4. 기존 localStorage 데이터 마이그레이션 (첫 실행 시 자동 이전 후 삭제)

**검증 포인트**:
- [ ] 로그인 후 DevTools > Application > LocalStorage에 토큰 없음
- [ ] 앱 재시작 후 자동 로그인 동작 확인
- [ ] 로그아웃 시 저장소 완전 초기화

---

### Task 1.2: IPC 인증 가드 추가 [Critical 2-2]

**현재**: `app:quit`, `app:toggleDevTools`가 인증 없이 호출 가능
**목표**: 관리자 세션 검증 후 실행, 프로덕션에서 DevTools 비활성화

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/main/index.ts` (lines 161-166) |
| 수정 파일 | `frontend/src/preload/index.ts` |
| 복잡도 | 낮음 |

**구현 단계**:
1. Main Process에 `adminSessionToken` 변수 추가 (Task 1.1의 토큰 저장과 연계)
2. `app:quit` 핸들러에 관리자 토큰 검증 로직 추가
3. `app:toggleDevTools`: `is.dev` 조건 추가 → 프로덕션에서 완전 비활성화
4. 선택: 키오스크 모드에서 `Ctrl+Shift+I` 단축키 차단

**검증 포인트**:
- [ ] 키오스크 화면에서 `window.api.quit()` 호출 시 인증 요구
- [ ] 프로덕션 빌드에서 DevTools 열기 불가
- [ ] 관리자 로그인 후 정상 종료 가능

---

### Task 1.3: CORS 프로덕션 보안 [Critical 2-7]

**현재**: `else` 분기에서 모든 origin 허용 + `credentials: true`
**목표**: 프로덕션에서 허용 origin만 통과, 나머지 차단

| 항목 | 내용 |
|------|------|
| 수정 파일 | `backend/src/index.ts` (lines 23-42) |
| 수정 파일 | `backend/src/config/index.ts` (cors.origin 활용) |
| 복잡도 | 낮음 |

**구현 단계**:
1. `config/index.ts`의 `cors.origin` 값을 실제 CORS 미들웨어에서 소비
2. `else` 분기 수정:
   ```ts
   if (process.env.NODE_ENV === 'development') {
     callback(null, true); // 개발 환경만 허용
   } else {
     callback(new Error('CORS not allowed'));
   }
   ```
3. `.env.example`에 `CORS_ORIGIN` 항목 추가

**검증 포인트**:
- [ ] `NODE_ENV=production`에서 미등록 origin 요청 시 CORS 에러
- [ ] Electron 앱 내부 요청 정상 통과 (localhost origin)
- [ ] 개발 모드에서 모든 origin 허용

---

### Task 1.4: 결제 API 타입 안전성 [Critical 2-3]

**현재**: `processPayment(paymentData: unknown)`, 반환값 `unknown`
**목표**: 명확한 `PaymentRequest` / `PaymentResponse` 인터페이스

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/renderer/src/services/api/client.ts` (lines 111-122) |
| 추가 파일 | `frontend/src/renderer/src/types/payment.ts` (또는 기존 types에 추가) |
| 복잡도 | 낮음 |

**구현 단계**:
1. `PaymentRequest` 인터페이스 정의 (orderId, amount, method, vanType 등)
2. `PaymentResponse` 인터페이스 정의 (transactionId, approvalNumber, status 등)
3. `CancelPaymentRequest` / `CancelPaymentResponse` 인터페이스 정의
4. `apiClient`의 `processPayment`, `cancelPayment` 시그니처 변경
5. 호출 측 (PaymentView.vue 등) 타입 적용

**검증 포인트**:
- [ ] `vue-tsc --noEmit` 빌드 에러 없음
- [ ] 결제 플로우 정상 동작 (카드/현금)

---

### Task 1.5: JWT 시크릿 필수화 [Critical 2-6]

**현재**: 2곳에서 서로 다른 폴백 문자열 하드코딩
**목표**: `.env` 필수 입력 강제, 앱 시작 시 검증

| 항목 | 내용 |
|------|------|
| 수정 파일 | `backend/src/config/index.ts` (lines 18-19) |
| 수정 파일 | `backend/src/services/auth.service.ts` (lines 28-30) |
| 복잡도 | 낮음 |

**구현 단계**:
1. `config/index.ts`에서 JWT 폴백값 제거 → `process.env.JWT_ACCESS_SECRET` 직접 사용
2. `auth.service.ts`에서 `config`에서만 시크릿 참조 (중복 제거)
3. 앱 시작 시 필수 환경변수 검증 함수 추가:
   ```ts
   function validateEnv() {
     const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
     const missing = required.filter(k => !process.env[k]);
     if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
   }
   ```
4. `.env.example` 업데이트

**검증 포인트**:
- [ ] `.env`에 JWT_ACCESS_SECRET 미설정 시 서버 시작 실패 + 명확한 에러 메시지
- [ ] 정상 설정 시 기존과 동일 동작

---

### Task 1.6: console.log 민감정보 제거 [Warning 3-5, 3-6]

**현재**: 결제 정보 4건 + NumberPad 디버그 1건
**목표**: 프로덕션 빌드에서 민감 로그 제거

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/renderer/src/views/PaymentView.vue` (4곳) |
| 수정 파일 | `frontend/src/renderer/src/components/kiosk/NumberPad.vue` (1곳) |
| 복잡도 | 낮음 |

**구현 단계**:
1. PaymentView.vue: 4개 `console.log` → 삭제 또는 조건부 로깅
2. NumberPad.vue: `console.log("화면오픈시?" + ...)` 삭제
3. 선택: `vite.config.ts`에 `esbuild.drop: ['console']` 추가 (프로덕션 전체 적용)

**검증 포인트**:
- [ ] 프로덕션 빌드에서 결제 정보 콘솔 출력 없음
- [ ] 개발 모드에서 필요한 로그는 유지

---

## Phase 2 - 안정성 개선

> 목표: 결제 신뢰성 + STT 안정성 확보
> 의존성: Phase 1 완료 권장 (필수 아님)
> 예상 변경 파일: ~6개

### Task 2.1: 결제 후 DB 업데이트 재시도 [Critical 2-4]

**현재**: VAN 승인 성공 → DB PATCH 실패 시 무시 → DB는 PENDING 상태 유지
**목표**: 최대 3회 재시도 + 실패 시 로컬 큐에 기록 → 온라인 복구

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/renderer/src/views/PaymentView.vue` (lines 140-199) |
| 추가 파일 | `frontend/src/renderer/src/utils/retryQueue.ts` (또는 기존 SyncManager 활용) |
| 복잡도 | 중간 |

**구현 단계**:
1. 재시도 유틸리티 함수 작성:
   ```ts
   async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000)
   ```
2. PaymentView.vue에서 주문 상태 PATCH에 재시도 적용
3. 최종 실패 시 Dexie.js (IndexedDB)에 `pendingStatusUpdates` 큐 저장
4. `SyncManager` 또는 별도 워커에서 큐 소비 → 온라인 복구 시 재전송
5. 사용자에게 "결제 완료 (동기화 대기 중)" 안내

**검증 포인트**:
- [ ] 네트워크 차단 상태에서 결제 → 로컬 큐에 기록
- [ ] 네트워크 복구 시 자동 재전송 → DB 상태 PAID로 변경
- [ ] 3회 재시도 로그 확인

---

### Task 2.2: Backend 리프레시 토큰 Redis 이동 [Critical 2-5]

**현재**: `new Map()` 인메모리 저장 → 서버 재시작 시 전체 토큰 소실
**목표**: Redis 기반 저장소로 전환

| 항목 | 내용 |
|------|------|
| 수정 파일 | `backend/src/services/auth.service.ts` (lines 15-16, 관련 메서드) |
| 활용 파일 | `backend/src/utils/cache.ts` (기존 Redis 연결 재활용) |
| 복잡도 | 중간 |

**구현 단계**:
1. `auth.service.ts`에서 `Map` → Redis SET/GET 교체
   - Key: `refresh:{token}`, Value: `{ userId, expiresAt }`, TTL: 7일
2. `storeRefreshToken()`, `verifyRefreshToken()`, `removeRefreshToken()` 수정
3. Redis 미연결 시 graceful fallback (기존 Map 사용) — 이미 cache.ts에 패턴 있음
4. 기존 토큰 마이그레이션 불필요 (재시작 시 재로그인)

**검증 포인트**:
- [ ] 서버 재시작 후 기존 리프레시 토큰으로 갱신 가능
- [ ] Redis CLI에서 `KEYS refresh:*` 확인
- [ ] Redis 미연결 시 정상 동작 (fallback)

---

### Task 2.3: STT_MODEL 초기 로딩 화이트리스트 [Warning 3-2]

**현재**: 초기 `process.env.STT_MODEL` 검증 없이 Python 인자로 전달
**목표**: 런타임 핸들러와 동일한 화이트리스트 적용

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/main/index.ts` (line 277) |
| 복잡도 | 낮음 |

**구현 단계**:
1. 기존 `stt:setModel` 핸들러의 화이트리스트 상수를 파일 상단으로 이동
2. 초기 로딩에도 동일 검증 적용:
   ```ts
   const VALID_MODELS = ['tiny', 'base', 'small', 'medium', 'large-v3'];
   let sttModelSize = VALID_MODELS.includes(process.env.STT_MODEL ?? '')
     ? process.env.STT_MODEL
     : 'small';
   ```

**검증 포인트**:
- [ ] `STT_MODEL=malicious` 설정 시 `small`로 폴백
- [ ] 정상 모델명 설정 시 올바르게 적용

---

### Task 2.4: useSTT 타이머 재시도 제한 [Warning 3-3]

**현재**: `setInterval(checkDaemonReady, 2000)` — 무한 폴링
**목표**: 최대 15회 재시도 후 에러 상태 전환

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/renderer/src/composables/useSTT.ts` (lines 44-48) |
| 복잡도 | 낮음 |

**구현 단계**:
1. 재시도 카운터 추가 `let retryCount = 0; const MAX_RETRIES = 15;`
2. `checkDaemonReady` 콜백에서 `retryCount++` → 초과 시 `clearInterval` + 에러 상태
3. 선택: 지수 백오프 (2s → 4s → 8s → 최대 30s)
4. 에러 상태 시 UI에 "음성 인식 사용 불가" 안내

**검증 포인트**:
- [ ] STT 데몬 미시작 시 30초 후 에러 상태 전환 (15회 * 2초)
- [ ] 에러 상태에서 메모리 누수 없음 (interval cleared)
- [ ] 정상 시작 시 기존 동작 유지

---

## Phase 3 - 구조 개선 (리팩토링)

> 목표: 거대 파일 분리, 유지보수성 향상
> 의존성: Phase 1, 2 완료 후 착수 권장
> 예상 변경 파일: ~20개 (신규 컴포넌트 포함)

### Task 3.1: DevicesView 컴포넌트 분리 (2,276줄)

| 항목 | 내용 |
|------|------|
| 대상 파일 | `frontend/src/renderer/src/views/admin/DevicesView.vue` |
| 신규 파일 | `components/admin/devices/DeviceList.vue` |
| 신규 파일 | `components/admin/devices/PosSettings.vue` |
| 신규 파일 | `components/admin/devices/KioskSettings.vue` |
| 신규 파일 | `components/admin/devices/KitchenSettings.vue` |
| 신규 파일 | `composables/useDeviceSettings.ts` |
| 복잡도 | 높음 |

**구현 단계**:
1. 기기 유형별 설정 패널 → 개별 컴포넌트 추출
2. 공통 로직 (설정 로드/저장) → `useDeviceSettings` composable
3. 좌측 기기 목록 → `DeviceList.vue` 분리
4. DevicesView는 레이아웃 + 라우팅 역할만 유지 (~300줄 목표)

---

### Task 3.2: ProductsView 컴포넌트 분리 (1,364줄)

| 항목 | 내용 |
|------|------|
| 대상 파일 | `frontend/src/renderer/src/views/admin/ProductsView.vue` |
| 신규 파일 | `components/admin/products/ProductFormModal.vue` |
| 신규 파일 | `components/admin/products/OptionManager.vue` |
| 신규 파일 | `components/admin/products/ProductList.vue` |
| 복잡도 | 중간 |

**구현 단계**:
1. 상품 등록/수정 모달 → `ProductFormModal.vue`
2. 옵션 관리 (추가/수정/삭제) → `OptionManager.vue`
3. 상품 목록 테이블 → `ProductList.vue`
4. ProductsView는 조합 + 상태 관리만 (~400줄 목표)

---

### Task 3.3: SettingsView 탭별 분리 (1,370줄)

| 항목 | 내용 |
|------|------|
| 대상 파일 | `frontend/src/renderer/src/views/admin/SettingsView.vue` |
| 신규 파일 | `components/admin/settings/SaleTab.vue` |
| 신규 파일 | `components/admin/settings/PaymentTab.vue` |
| 신규 파일 | `components/admin/settings/PrintTab.vue` |
| 신규 파일 | `components/admin/settings/PointTab.vue` |
| 신규 파일 | `components/admin/settings/BarcodeTab.vue` |
| 신규 파일 | `components/admin/settings/SystemTab.vue` |
| 복잡도 | 중간 |

---

### Task 3.4: Backend 서비스 레이어 추출

| 항목 | 내용 |
|------|------|
| 대상 파일 | `backend/src/routes/orders.ts` (656줄) |
| 대상 파일 | `backend/src/routes/products.ts` (611줄) |
| 신규 파일 | `backend/src/services/order.service.ts` |
| 신규 파일 | `backend/src/services/product.service.ts` |
| 복잡도 | 중간 |

**구현 단계**:
1. 라우트 파일에서 비즈니스 로직 → 서비스 클래스로 추출
2. 라우트는 요청 파싱 + 서비스 호출 + 응답 포맷만 담당
3. 캐싱 로직 서비스 내부로 이동

---

## Phase 4 - 품질 강화

> 목표: 테스트 커버리지 확보, API 문서화, 성능 최적화
> 의존성: Phase 1~3 완료 후 지속적 진행
> 예상 변경 파일: ~30개 (테스트 파일 포함)

### Task 4.1: 핵심 로직 단위 테스트

| 항목 | 내용 |
|------|------|
| 신규 파일 | `frontend/src/renderer/src/utils/__tests__/productMatcher.test.ts` |
| 신규 파일 | `frontend/src/renderer/src/stores/__tests__/auth.test.ts` |
| 신규 파일 | `frontend/src/renderer/src/composables/__tests__/useVoiceCommand.test.ts` |
| 신규 파일 | `backend/src/services/__tests__/auth.service.test.ts` |
| 신규 파일 | `backend/src/routes/__tests__/orders.test.ts` |
| 복잡도 | 높음 (초기 설정 포함) |

**우선순위 테스트**:
1. `productMatcher` — 초성 매칭, 병음 매칭, Levenshtein, 다국어
2. `auth.service` — JWT 생성/검증, 리프레시 토큰, 역할 체크
3. `useVoiceCommand` — 키워드 매칭, 수량 파싱
4. 결제 플로우 — Strategy 패턴, CircuitBreaker 동작

---

### Task 4.2: Levenshtein 성능 최적화 [Warning 3-4]

| 항목 | 내용 |
|------|------|
| 수정 파일 | `frontend/src/renderer/src/utils/productMatcher.ts` (lines 47-60) |
| 복잡도 | 낮음 |

**구현 단계**:
1. 길이 차이 기반 조기 종료:
   ```ts
   if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
   ```
2. 선택: 단일 행 최적화 (메모리 O(min(n,m)))

---

### Task 4.3: API 문서 (Swagger/OpenAPI)

| 항목 | 내용 |
|------|------|
| 추가 패키지 | `swagger-jsdoc`, `swagger-ui-express` |
| 수정 파일 | `backend/src/index.ts` (미들웨어 추가) |
| 신규 파일 | `backend/src/swagger.ts` (설정) |
| 복잡도 | 높음 (~100개 엔드포인트) |

---

### Task 4.4: N+1 쿼리 최적화 [Warning 3-7]

| 항목 | 내용 |
|------|------|
| 수정 파일 | `backend/src/routes/stock-movements.ts` (lines 93-129) |
| 복잡도 | 낮음 |

**구현 단계**:
1. `prisma.$transaction` 내 반복 쿼리 → `updateMany` / 배치 처리
2. 페이징이 적용되어 있어 영향도 낮지만, 대량 재고 조정 시 필요

---

## 의존성 맵 (실행 순서)

```
Phase 1 (보안) ─ 병렬 실행 가능
├── Task 1.1 JWT 보안 저장소     ←── Task 1.2 의존 (세션 토큰 공유)
├── Task 1.3 CORS 수정           ←── 독립
├── Task 1.4 결제 API 타입       ←── 독립
├── Task 1.5 JWT 시크릿 필수화   ←── 독립
└── Task 1.6 console.log 제거    ←── 독립

Phase 2 (안정성) ─ Phase 1 완료 후
├── Task 2.1 결제 DB 재시도      ←── Task 1.4 이후 (타입 활용)
├── Task 2.2 Redis 토큰 저장     ←── Task 1.5 이후 (시크릿 정리 후)
├── Task 2.3 STT_MODEL 검증      ←── 독립
└── Task 2.4 useSTT 타이머       ←── 독립

Phase 3 (구조) ─ Phase 2 완료 후
├── Task 3.1 DevicesView 분리    ←── 독립
├── Task 3.2 ProductsView 분리   ←── 독립
├── Task 3.3 SettingsView 분리   ←── 독립
└── Task 3.4 Backend 서비스 분리 ←── 독립

Phase 4 (품질) ─ 지속적
├── Task 4.1 단위 테스트         ←── Phase 3 완료 후 (분리된 코드 대상)
├── Task 4.2 Levenshtein 최적화  ←── 독립
├── Task 4.3 Swagger 문서        ←── Task 3.4 이후 (서비스 분리 후)
└── Task 4.4 N+1 쿼리 최적화    ←── 독립
```

---

## 진행 체크리스트

### Phase 1 - 보안
- [ ] Task 1.1: JWT safeStorage 전환
- [ ] Task 1.2: IPC 인증 가드
- [ ] Task 1.3: CORS 프로덕션 보안
- [ ] Task 1.4: 결제 API 타입 정의
- [ ] Task 1.5: JWT 시크릿 필수화
- [ ] Task 1.6: console.log 민감정보 제거

### Phase 2 - 안정성
- [ ] Task 2.1: 결제 DB 업데이트 재시도
- [ ] Task 2.2: 리프레시 토큰 Redis 이동
- [ ] Task 2.3: STT_MODEL 화이트리스트
- [ ] Task 2.4: useSTT 타이머 제한

### Phase 3 - 구조 개선
- [ ] Task 3.1: DevicesView 분리 (2,276줄)
- [ ] Task 3.2: ProductsView 분리 (1,364줄)
- [ ] Task 3.3: SettingsView 분리 (1,370줄)
- [ ] Task 3.4: Backend 서비스 레이어 추출

### Phase 4 - 품질
- [ ] Task 4.1: 핵심 단위 테스트 작성
- [ ] Task 4.2: Levenshtein 성능 최적화
- [ ] Task 4.3: Swagger/OpenAPI 문서화
- [ ] Task 4.4: N+1 쿼리 최적화

---

## 이슈-태스크 매핑

| 분석 이슈 | 태스크 | 심각도 |
|-----------|--------|--------|
| 2-1 JWT localStorage | Task 1.1 | Critical |
| 2-2 app:quit/toggleDevTools | Task 1.2 | Critical |
| 2-3 결제 API unknown | Task 1.4 | Critical |
| 2-4 결제 DB 실패 무시 | Task 2.1 | Critical |
| 2-5 인메모리 토큰 | Task 2.2 | Critical |
| 2-6 JWT 시크릿 하드코딩 | Task 1.5 | Critical |
| 2-7 CORS 전체 허용 | Task 1.3 | Critical |
| 3-1 sandbox 비활성화 | - (의도적) | Info |
| 3-2 STT_MODEL 미검증 | Task 2.3 | Warning |
| 3-3 useSTT 타이머 누수 | Task 2.4 | Warning |
| 3-4 Levenshtein 성능 | Task 4.2 | Warning |
| 3-5 console.log 결제정보 | Task 1.6 | Warning |
| 3-6 NumberPad 디버그 | Task 1.6 | Warning |
| 3-7 N+1 쿼리 | Task 4.4 | Low |
