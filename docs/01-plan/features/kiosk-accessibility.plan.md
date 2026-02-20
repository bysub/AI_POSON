# Plan: 키오스크 저시력/시각장애인 접근성 (Kiosk Accessibility)

## 개요

저시력 시각장애인이 키오스크를 독립적으로 사용할 수 있도록 접근성 기능을 추가한다.
2021년 장애인차별금지법 개정(제15조, 제21조)에 따라 2025-01-28부터 소규모 사업장 포함 전면 시행되며, KS X 9211(무인정보단말기 접근성 지침) + WCAG 2.1 AA를 준수한다.

## 법적 근거

| 법령                    | 조항                       | 내용                                               |
| ----------------------- | -------------------------- | -------------------------------------------------- |
| 장애인차별금지법 시행령 | 제15조, 제21조 개정 (2021) | 무인정보단말기 접근성 의무화                       |
| Phase 3                 | 2025-01-28                 | 100인 미만 사업장 적용                             |
| 기존 키오스크           | 2026-01-28                 | 이전 설치 키오스크도 적용                          |
| KS X 9211               | 2022-02                    | 무인정보단말기 접근성 지침 (10원칙, 47지표)        |
| 벌칙                    |                            | 3년 이하 징역 또는 3천만원 이하 벌금 (악의적 위반) |

## 현재 동작 (AS-IS)

### 키오스크 플로우

```
WelcomeView → MenuView → OrderConfirmView → PointSelectView → PaymentView → CompleteView
```

### 현재 접근성 현황

| 항목               | 현재 상태 | 문제점                               |
| ------------------ | --------- | ------------------------------------ |
| 색상 대비          | 미검증    | red-500 텍스트 등 4.5:1 미충족 가능  |
| 고대비 모드        | 없음      | 저시력자용 흑/백/노랑 대비 모드 없음 |
| 글꼴 크기          | 고정      | 확대 불가, 저시력자 판독 어려움      |
| 음성 안내 (TTS)    | 없음      | 화면 내용 음성 출력 불가             |
| 터치 영역          | 불균일    | 일부 버튼 44px 미만, 간격 부족       |
| ARIA 속성          | 미적용    | role, aria-label, aria-live 없음     |
| 포커스 표시        | 없음      | 키보드/외부 입력 탐색 불가           |
| 접근성 모드 진입점 | 없음      | 시각장애인이 접근성 기능 발견 불가   |

### 기존 인프라 (활용 가능)

- **i18n**: 4개 언어(ko, en, ja, zh) → TTS lang 파라미터 활용
- **Pinia Settings Store**: `systemSettings` + `deviceSettings` → 접근성 설정 저장
- **KioskLayout.vue**: 전역 오버레이 구조 (Virtual Keyboard, Idle Timer 패턴)
- **Tailwind CSS**: CSS 변수 + 테마 확장 → 고대비 모드 구현 용이
- **Electron Main Process**: Node.js TTS 라이브러리 또는 Web Speech API 활용

## TO-BE 설계

### 핵심 기능 4가지

#### 1. 접근성 모드 토글 & 설정 패널

WelcomeView에 접근성 버튼(휠체어 아이콘)을 항시 노출하며, 탭하면 접근성 설정 패널이 열린다.
접근성 모드가 활성화되면 모든 키오스크 화면에 적용된다.

```
┌──────────────────────────────┐
│  ♿ 접근성 설정               │
│ ─────────────────────────────│
│  🔤 글꼴 크기                │
│  [ 표준 ] [ 크게 ] [매우크게]│
│                              │
│  🎨 화면 모드                │
│  [ 기본 ] [고대비] [반전대비]│
│                              │
│  🔊 음성 안내                │
│  [ OFF ─────●── ON ]        │
│                              │
│  [적용하기]     [닫기]       │
└──────────────────────────────┘
```

**설정 항목:**

- 글꼴 크기: 3단계 (표준 16px / 크게 20px / 매우크게 24px)
- 화면 모드: 기본 / 고대비(검정배경+흰색/노란색 텍스트) / 반전대비(흰배경+검정텍스트, 굵은 테두리)
- 음성 안내: ON/OFF 토글

#### 2. 고대비 모드 (High Contrast Mode)

CSS Custom Properties 기반으로 전역 테마를 전환한다.

**기본 모드:**

- 배경: `#FDF9F3` (cream), 텍스트: `#1e293b`, 주요 강조: `#8E3524`

**고대비 모드 (검정 배경):**

- 배경: `#000000`, 텍스트: `#FFFFFF`, 주요 강조: `#FFFF00`
- 모든 텍스트 대비비 7:1 이상 (WCAG AAA)
- 버튼 테두리 2px 이상 흰색/노란색

**반전 대비 모드 (밝은 배경):**

- 배경: `#FFFFFF`, 텍스트: `#000000`, 주요 강조: `#0000FF`
- 모든 텍스트 대비비 7:1 이상
- 버튼 테두리 3px 검정

#### 3. 글꼴 크기 조절 (Font Scaling)

`<html>` 요소의 `font-size`를 변경하여 전체 rem 기반 크기를 일괄 조절한다.

| 레벨     | html font-size | 버튼 최소 높이 | 텍스트 크기 |
| -------- | -------------- | -------------- | ----------- |
| 표준     | 16px (1rem)    | 48px           | 기본값      |
| 크게     | 20px (1.25rem) | 56px           | 1.25배      |
| 매우크게 | 24px (1.5rem)  | 64px           | 1.5배       |

#### 4. 음성 안내 (TTS - Text-to-Speech)

**구현 방식: Web Speech API (Chromium 내장)**

- Electron Renderer에서 `window.speechSynthesis` 직접 사용
- 한국어 음성: `ko-KR` (Windows 11 Heami 음성 활용)
- 다국어 지원: 현재 locale에 맞춰 자동 lang 전환

**음성 출력 트리거:**

| 화면             | 트리거        | 읽는 내용                             |
| ---------------- | ------------- | ------------------------------------- |
| WelcomeView      | 페이지 진입   | "주문을 시작하려면 화면을 터치하세요" |
| MenuView         | 카테고리 탭   | 카테고리 이름                         |
| MenuView         | 상품 탭       | "상품명, 가격, 담기"                  |
| MenuView         | 장바구니 변경 | "장바구니 N개, 총 금액 N원"           |
| OrderConfirmView | 페이지 진입   | "주문 확인, 총 N개, N원"              |
| PaymentView      | 결제수단 탭   | "카드결제 / 현금결제 / 모바일결제"    |
| CompleteView     | 주문 완료     | "주문번호 N번, 감사합니다"            |
| 전체             | 에러 발생     | 에러 메시지 읽기                      |

**추가 기능:**

- "다시 듣기" 버튼 (KS X 9211 필수 요건)
- 음량 조절: 3단계 (작게/보통/크게)
- 읽기 속도: 0.8x ~ 1.2x (기본 0.9x, 저시력자 배려)

### 관리자 설정 연동

기존 2계층 설정 시스템(SystemSetting + DeviceSetting)에 접근성 카테고리를 추가한다.

**매장 공통 설정 (SystemSetting, 카테고리: ACCESSIBILITY):**

| 키                      | 설명                                | 기본값     | 타입   |
| ----------------------- | ----------------------------------- | ---------- | ------ |
| `a11y.enabled`          | 접근성 기능 활성화 (버튼 노출 여부) | `1`        | toggle |
| `a11y.ttsEnabled`       | TTS 기본 활성 여부                  | `0`        | toggle |
| `a11y.defaultFontScale` | 기본 글꼴 크기                      | `standard` | select |
| `a11y.defaultContrast`  | 기본 화면 모드                      | `default`  | select |
| `a11y.ttsRate`          | TTS 읽기 속도                       | `0.9`      | number |
| `a11y.ttsVolume`        | TTS 기본 음량                       | `1.0`      | number |

**기기별 설정 (DeviceSetting, 키오스크 전용):**

| 키                    | 설명                                 | 기본값  |
| --------------------- | ------------------------------------ | ------- |
| `a11y.autoReset`      | 세션 종료 시 접근성 설정 자동 초기화 | `1`     |
| `a11y.buttonPosition` | 접근성 버튼 위치 (left/right)        | `right` |

### 영향 범위

| 파일                                       | 변경 유형      | 설명                                         |
| ------------------------------------------ | -------------- | -------------------------------------------- |
| **신규 생성**                              |                |                                              |
| `stores/accessibility.ts`                  | 새 Pinia Store | 접근성 상태 관리 (fontScale, contrast, tts)  |
| `composables/useTTS.ts`                    | Composable     | TTS 엔진 래퍼 (speak, stop, replay, setLang) |
| `components/kiosk/AccessibilityPanel.vue`  | 컴포넌트       | 접근성 설정 패널 UI                          |
| `components/kiosk/AccessibilityToggle.vue` | 컴포넌트       | ♿ 플로팅 버튼                               |
| `components/kiosk/TTSReplayButton.vue`     | 컴포넌트       | "다시 듣기" 버튼                             |
| `assets/css/high-contrast.css`             | 스타일시트     | 고대비 모드 CSS 변수                         |
| `locales/ko.json` (a11y 섹션)              | i18n           | 접근성 관련 번역 키 추가                     |
| **기존 수정**                              |                |                                              |
| `KioskLayout.vue`                          | 수정           | AccessibilityToggle, TTSReplayButton 삽입    |
| `WelcomeView.vue`                          | 수정           | 접근성 버튼 + TTS 초기화                     |
| `MenuView.vue`                             | 수정           | 상품/카테고리 TTS + ARIA 속성                |
| `OrderConfirmView.vue`                     | 수정           | 주문 요약 TTS + ARIA                         |
| `PointSelectView.vue`                      | 수정           | 안내 TTS + ARIA                              |
| `PaymentView.vue`                          | 수정           | 결제 진행 TTS + ARIA                         |
| `CompleteView.vue`                         | 수정           | 완료 안내 TTS + ARIA                         |
| `tailwind.config.js`                       | 수정           | 고대비 색상 토큰 추가                        |
| `locales/{en,ja,zh}.json`                  | 수정           | 다국어 접근성 번역 추가                      |

### 구현 우선순위

```
Phase 1 (핵심 인프라) ─────────────────────────────
  1. accessibility store + composable/useTTS
  2. 고대비 CSS 변수 시스템
  3. AccessibilityPanel + AccessibilityToggle 컴포넌트

Phase 2 (화면별 적용) ─────────────────────────────
  4. KioskLayout에 접근성 컴포넌트 통합
  5. WelcomeView 접근성 적용
  6. MenuView 접근성 적용 (가장 복잡)
  7. OrderConfirmView, PaymentView, CompleteView 적용

Phase 3 (TTS 고도화 + 관리자) ─────────────────────
  8. 화면별 TTS 스크립트 작성 + 다시듣기
  9. 관리자 설정 페이지에 ACCESSIBILITY 카테고리 추가
 10. 다국어 접근성 번역 (en, ja, zh)
```

## 기술 결정

### CSS 접근성 모드 구현 방식

**선택: CSS Custom Properties + Tailwind Plugin**

```html
<!-- html 요소에 클래스로 모드 전환 -->
<html class="a11y-high-contrast a11y-font-large"></html>
```

```css
/* 기본 모드 */
:root {
  --a11y-bg: #fdf9f3;
  --a11y-text: #1e293b;
  --a11y-primary: #8e3524;
  --a11y-accent: #c96231;
  --a11y-surface: #ffffff;
  --a11y-border: #e2e8f0;
}

/* 고대비 모드 */
.a11y-high-contrast {
  --a11y-bg: #000000;
  --a11y-text: #ffffff;
  --a11y-primary: #ffff00;
  --a11y-accent: #00ff00;
  --a11y-surface: #1a1a1a;
  --a11y-border: #ffffff;
}
```

**이유:**

- Tailwind의 기존 클래스 시스템과 호환
- JavaScript에서 `document.documentElement.classList`로 간단 전환
- SSR 불필요 (Electron 환경)
- 성능: CSS 변수 변경은 리플로우 없이 리페인트만 발생

### TTS 구현 방식

**선택: Web Speech API (SpeechSynthesis)**

```typescript
// composables/useTTS.ts
const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale.value === "ko" ? "ko-KR" : `${locale.value}`;
  utterance.rate = ttsRate.value;
  utterance.volume = ttsVolume.value;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
};
```

**이유:**

- Chromium 내장으로 별도 의존성 불필요
- Windows 11 한국어 음성(Heami) 기본 포함
- `speechSynthesis.getVoices()`로 사용 가능 음성 목록 확인
- Node.js IPC 불필요 → 구현 복잡도 최소화
- 오프라인 동작 (시스템 음성 사용)

### 상태 관리 구조

```
useAccessibilityStore (Pinia)
├── isEnabled: boolean          // 접근성 기능 활성 여부
├── fontScale: 'standard' | 'large' | 'extraLarge'
├── contrastMode: 'default' | 'highContrast' | 'invertedContrast'
├── ttsEnabled: boolean
├── ttsRate: number (0.8 ~ 1.2)
├── ttsVolume: number (0.0 ~ 1.0)
├── actions:
│   ├── toggleAccessibility()
│   ├── setFontScale(scale)
│   ├── setContrastMode(mode)
│   ├── toggleTTS()
│   ├── resetToDefaults()       // 세션 종료 시 초기화
│   └── applyToDOM()            // html 클래스 반영
└── getters:
    ├── htmlClasses: string[]   // 현재 적용할 CSS 클래스 목록
    └── isHighContrast: boolean
```

## 테스트 기준

| 항목             | 기준                             | 검증 방법                  |
| ---------------- | -------------------------------- | -------------------------- |
| 색상 대비        | 모든 텍스트 4.5:1 이상           | Chrome DevTools Lighthouse |
| 고대비 모드 대비 | 모든 텍스트 7:1 이상             | 수동 검증 + axe-core       |
| 터치 영역        | 인터랙티브 요소 44x44px 이상     | DevTools 측정              |
| TTS 동작         | 모든 화면 진입 시 음성 출력      | 수동 테스트                |
| TTS 다국어       | 4개 언어 음성 전환               | 수동 테스트                |
| 글꼴 크기        | 3단계 모두 레이아웃 깨짐 없음    | 시각 검증                  |
| ARIA             | axe-core 위반 0건                | `npm run test:a11y`        |
| 세션 초기화      | WelcomeView 복귀 시 설정 리셋    | 자동 테스트                |
| 설정 연동        | 관리자 설정 변경 → 키오스크 반영 | 수동 테스트                |

## 참고 법령/표준

- 장애인차별금지법 시행령 제15조, 제21조 (2021 개정)
- KS X 9211: 무인정보단말기 접근성 지침 (2022-02)
- 별표5: 무인정보단말기 접근성 검증기준 (과학기술정보통신부)
- WCAG 2.1 AA (W3C)
- WCAG 2.2 SC 2.5.8 Target Size Minimum (W3C)

## 추정 작업량

| Phase                  | 파일 수        | 예상 난이도 |
| ---------------------- | -------------- | ----------- |
| Phase 1 (인프라)       | ~5개 신규      | 중          |
| Phase 2 (화면 적용)    | ~6개 수정      | 중~상       |
| Phase 3 (TTS + 관리자) | ~5개 수정      | 중          |
| **합계**               | **~16개 파일** |             |
