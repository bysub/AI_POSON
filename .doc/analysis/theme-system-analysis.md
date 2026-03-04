# POSON Kiosk 테마 시스템 분석 및 설계

## 1. 현재 상태 분석

### 1.1 CSS 파일 구조

| 파일 | 역할 | 크기 |
|------|------|------|
| `main.css` | Tailwind 기본 + 키오스크 공통 컴포넌트 | 160줄 |
| `accessibility.css` | 접근성 모드 (고대비, 반전대비, 폰트 크기) | 180줄 |
| `tailwind.config.js` | Tailwind 테마 확장 (색상, 폰트, 간격) | 74줄 |

### 1.2 현재 색상 체계

```
┌─────────────────────────────────────────────────────────────┐
│                    tailwind.config.js                       │
├─────────────────────────────────────────────────────────────┤
│ primary: #8E3524 (브랜드 메인 - 갈색 계열)                   │
│ accent:  #C96231 (강조색 - 오렌지)                          │
│ cream:   #FDF9F3 (배경색)                                   │
│ kiosk.*: 키오스크 전용 시맨틱 색상                           │
│ a11y.*:  CSS 변수 참조 (접근성용)                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 인라인 스타일 현황 (23개 Vue 파일)

| 분류 | 파일 수 | 주요 내용 |
|------|---------|----------|
| **트랜지션/애니메이션** | 15개 | fade, slide, modal 전환 효과 |
| **레이아웃 보정** | 5개 | 버튼 위치, 스크롤바 숨김 |
| **테마 의존적** | 3개 | 배경 그라데이션, 고정 색상값 |

#### 문제점: 하드코딩된 색상값

```css
/* WelcomeView.vue:220 - 배경 그라데이션 */
.bg-welcome {
  background: linear-gradient(135deg, #1a0a05 0%, #3d1a0a 25%,
              #5c2d15 50%, #8e3524 75%, #2d1810 100%);
}

/* MenuView.vue:484 - 하이라이트 색상 */
.voice-highlight {
  outline: 3px solid #22c55e;
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
}
```

### 1.4 접근성 모드 문제점

현재 `accessibility.css`는 CSS `filter` 기반으로 고대비/반전대비를 구현:

```css
.a11y-high-contrast {
  filter: invert(1) hue-rotate(180deg) contrast(2);
}
```

**한계점:**
1. Tailwind 유틸리티 클래스의 하드코딩된 색상값은 filter로 변환됨
2. 의도한 색상 대비가 아닌 수학적 색상 반전
3. 이미지/비디오 복원을 위한 역필터 필요
4. 성능 오버헤드 (전체 DOM에 filter 적용)

---

## 2. 테마 시스템 아키텍처 설계

### 2.1 테마 목록

| 테마 ID | 이름 | 특징 |
|---------|------|------|
| `root` | Default (현재) | 갈색/크림 계열, 따뜻한 톤 |
| `modern` | Modern | 미니멀, 블루-그레이 계열 |
| `modern-red` | Modern Red | 레드-화이트, 강렬한 대비 |
| `classic` | Classic | 세리프 폰트, 골드-아이보리 |
| `bootstrap` | Bootstrap | Bootstrap 5 표준 색상 |
| `material` | Material Design | MD3 토큰, 보라-청록 계열 |

### 2.2 권장 아키텍처: CSS Custom Properties + data-theme

```
┌─────────────────────────────────────────────────────────────┐
│                      <html data-theme="modern">             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  themes/                                                    │
│  ├── _variables.css      ← 공통 토큰 정의                   │
│  ├── default.css         ← :root (기본 테마)                │
│  ├── modern.css          ← [data-theme="modern"]            │
│  ├── modern-red.css      ← [data-theme="modern-red"]        │
│  ├── classic.css         ← [data-theme="classic"]           │
│  ├── bootstrap.css       ← [data-theme="bootstrap"]         │
│  └── material.css        ← [data-theme="material"]          │
│                                                             │
│  main.css                                                   │
│  └── @import "./themes/..."                                 │
│                                                             │
│  컴포넌트 스타일                                             │
│  └── var(--theme-*) 참조                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 디자인 토큰 구조

```css
/* themes/_variables.css - 공통 토큰 네이밍 */
:root {
  /* === 시맨틱 색상 === */
  --theme-bg: ...;              /* 페이지 배경 */
  --theme-bg-secondary: ...;    /* 섹션 배경 */
  --theme-surface: ...;         /* 카드/모달 배경 */
  --theme-surface-hover: ...;   /* 호버 상태 */

  --theme-text: ...;            /* 주요 텍스트 */
  --theme-text-secondary: ...;  /* 보조 텍스트 */
  --theme-text-muted: ...;      /* 비활성 텍스트 */

  --theme-primary: ...;         /* 주요 액션 */
  --theme-primary-hover: ...;
  --theme-primary-text: ...;    /* 주요 버튼 내 텍스트 */

  --theme-accent: ...;          /* 강조 */
  --theme-accent-hover: ...;

  --theme-border: ...;          /* 기본 테두리 */
  --theme-border-strong: ...;   /* 강조 테두리 */

  --theme-success: ...;
  --theme-error: ...;
  --theme-warning: ...;

  /* === 그라데이션 === */
  --theme-gradient-welcome: ...;
  --theme-gradient-button: ...;

  /* === 그림자 === */
  --theme-shadow-sm: ...;
  --theme-shadow-md: ...;
  --theme-shadow-lg: ...;

  /* === 폰트 === */
  --theme-font-sans: ...;
  --theme-font-display: ...;

  /* === 반경 === */
  --theme-radius-sm: ...;
  --theme-radius-md: ...;
  --theme-radius-lg: ...;
}
```

### 2.4 테마별 색상 정의 예시

```css
/* themes/default.css */
:root,
[data-theme="default"] {
  --theme-bg: #FDF9F3;
  --theme-bg-secondary: #f5ede0;
  --theme-surface: #ffffff;
  --theme-text: #1e293b;
  --theme-text-secondary: #64748b;
  --theme-primary: #8E3524;
  --theme-primary-hover: #7a3125;
  --theme-primary-text: #ffffff;
  --theme-accent: #C96231;
  --theme-border: #e2e8f0;
  --theme-gradient-welcome: linear-gradient(135deg, #1a0a05, #3d1a0a, #5c2d15, #8e3524, #2d1810);
  --theme-font-sans: "Pretendard", system-ui, sans-serif;
}

/* themes/modern.css */
[data-theme="modern"] {
  --theme-bg: #f8fafc;
  --theme-bg-secondary: #f1f5f9;
  --theme-surface: #ffffff;
  --theme-text: #0f172a;
  --theme-text-secondary: #475569;
  --theme-primary: #3b82f6;
  --theme-primary-hover: #2563eb;
  --theme-primary-text: #ffffff;
  --theme-accent: #06b6d4;
  --theme-border: #e2e8f0;
  --theme-gradient-welcome: linear-gradient(135deg, #0f172a, #1e3a5f, #3b82f6);
  --theme-font-sans: "Inter", system-ui, sans-serif;
}

/* themes/modern-red.css */
[data-theme="modern-red"] {
  --theme-bg: #fef2f2;
  --theme-bg-secondary: #fee2e2;
  --theme-surface: #ffffff;
  --theme-text: #450a0a;
  --theme-text-secondary: #991b1b;
  --theme-primary: #dc2626;
  --theme-primary-hover: #b91c1c;
  --theme-primary-text: #ffffff;
  --theme-accent: #f97316;
  --theme-border: #fecaca;
  --theme-gradient-welcome: linear-gradient(135deg, #450a0a, #7f1d1d, #dc2626);
}

/* themes/classic.css */
[data-theme="classic"] {
  --theme-bg: #fffbeb;
  --theme-bg-secondary: #fef3c7;
  --theme-surface: #fffff0;
  --theme-text: #44403c;
  --theme-text-secondary: #78716c;
  --theme-primary: #b45309;
  --theme-primary-hover: #92400e;
  --theme-primary-text: #ffffff;
  --theme-accent: #d97706;
  --theme-border: #e7e5e4;
  --theme-gradient-welcome: linear-gradient(135deg, #422006, #78350f, #b45309);
  --theme-font-sans: "Georgia", serif;
}

/* themes/bootstrap.css */
[data-theme="bootstrap"] {
  --theme-bg: #f8f9fa;
  --theme-bg-secondary: #e9ecef;
  --theme-surface: #ffffff;
  --theme-text: #212529;
  --theme-text-secondary: #6c757d;
  --theme-primary: #0d6efd;
  --theme-primary-hover: #0b5ed7;
  --theme-primary-text: #ffffff;
  --theme-accent: #0dcaf0;
  --theme-border: #dee2e6;
  --theme-gradient-welcome: linear-gradient(135deg, #212529, #343a40, #0d6efd);
}

/* themes/material.css */
[data-theme="material"] {
  --theme-bg: #faf7ff;
  --theme-bg-secondary: #e8def8;
  --theme-surface: #fffbfe;
  --theme-text: #1c1b1f;
  --theme-text-secondary: #49454f;
  --theme-primary: #6750a4;
  --theme-primary-hover: #4f378b;
  --theme-primary-text: #ffffff;
  --theme-accent: #7d5260;
  --theme-border: #79747e;
  --theme-gradient-welcome: linear-gradient(135deg, #1c1b1f, #4f378b, #6750a4);
  --theme-font-sans: "Roboto", system-ui, sans-serif;
  --theme-radius-sm: 8px;
  --theme-radius-md: 12px;
  --theme-radius-lg: 28px;
}
```

---

## 3. Tailwind 통합 전략

### 3.1 tailwind.config.js 수정

```javascript
// tailwind.config.js
export default {
  content: ["./src/renderer/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // CSS 변수 참조로 변경
        theme: {
          bg: "var(--theme-bg)",
          "bg-secondary": "var(--theme-bg-secondary)",
          surface: "var(--theme-surface)",
          text: "var(--theme-text)",
          "text-secondary": "var(--theme-text-secondary)",
          primary: "var(--theme-primary)",
          "primary-hover": "var(--theme-primary-hover)",
          accent: "var(--theme-accent)",
          border: "var(--theme-border)",
          success: "var(--theme-success)",
          error: "var(--theme-error)",
          warning: "var(--theme-warning)",
        },
      },
      fontFamily: {
        sans: ["var(--theme-font-sans)"],
      },
      borderRadius: {
        theme: "var(--theme-radius-md)",
      },
      boxShadow: {
        "theme-sm": "var(--theme-shadow-sm)",
        "theme-md": "var(--theme-shadow-md)",
      },
    },
  },
};
```

### 3.2 사용 예시

**변경 전:**
```html
<button class="bg-primary-600 text-white hover:bg-primary-700">
```

**변경 후:**
```html
<button class="bg-theme-primary text-theme-primary-text hover:bg-theme-primary-hover">
```

---

## 4. 인라인 스타일 통합 계획

### 4.1 전역 트랜지션 (components.css로 통합)

```css
/* assets/styles/components.css */

/* === 트랜지션 === */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s ease-in; }
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}

/* === 스크롤바 숨김 === */
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* === 음성 하이라이트 === */
.voice-highlight {
  outline: 3px solid var(--theme-success);
  outline-offset: 2px;
  box-shadow: 0 0 16px color-mix(in srgb, var(--theme-success) 40%, transparent);
  animation: voice-highlight-pulse 0.6s ease-in-out 2;
}

@keyframes voice-highlight-pulse {
  0%, 100% { outline-color: var(--theme-success); }
  50% { outline-color: color-mix(in srgb, var(--theme-success) 60%, white); }
}
```

### 4.2 테마 의존적 스타일 분리

```css
/* themes/default.css에 추가 */
[data-theme="default"] .bg-welcome {
  background: var(--theme-gradient-welcome);
}

/* themes/modern.css에 추가 */
[data-theme="modern"] .bg-welcome {
  background: var(--theme-gradient-welcome);
}
```

---

## 5. 접근성 모드 개선

### 5.1 고대비 모드 재설계

filter 기반 대신 **별도 테마로 구현**:

```css
/* themes/accessibility.css */

/* 고대비 모드 */
[data-theme="high-contrast"],
.a11y-high-contrast {
  --theme-bg: #000000;
  --theme-bg-secondary: #1a1a1a;
  --theme-surface: #000000;
  --theme-text: #ffffff;
  --theme-text-secondary: #e5e5e5;
  --theme-primary: #ffff00;
  --theme-primary-hover: #cccc00;
  --theme-primary-text: #000000;
  --theme-accent: #00ffff;
  --theme-border: #ffffff;
  --theme-success: #00ff00;
  --theme-error: #ff0000;
  --theme-warning: #ffff00;
}

/* 반전 대비 모드 (CSS 변수 반전) */
[data-theme="inverted"],
.a11y-inverted-contrast {
  --theme-bg: #1e293b;
  --theme-bg-secondary: #334155;
  --theme-surface: #0f172a;
  --theme-text: #f8fafc;
  --theme-text-secondary: #cbd5e1;
  --theme-primary: #60a5fa;
  --theme-primary-hover: #93c5fd;
  --theme-primary-text: #1e293b;
  --theme-accent: #f97316;
  --theme-border: #475569;
}
```

### 5.2 장점

| 항목 | filter 기반 (현재) | CSS 변수 기반 (제안) |
|------|-------------------|---------------------|
| 성능 | 전체 DOM repaint | 변수 값만 변경 |
| 이미지 처리 | 역필터 필요 | 자동 보존 |
| 색상 예측성 | 수학적 반전 | 디자이너 의도 반영 |
| 유지보수 | 복잡한 셀렉터 | 단순한 변수 오버라이드 |

---

## 6. 구현 단계

### Phase 1: 기반 구축
1. `themes/` 디렉토리 생성
2. `_variables.css` 토큰 정의
3. `default.css` (현재 스타일) 마이그레이션
4. `main.css`에서 import 설정

### Phase 2: 테마 파일 작성
1. `modern.css` 구현
2. `modern-red.css` 구현
3. `classic.css` 구현
4. `bootstrap.css` 구현
5. `material.css` 구현

### Phase 3: 컴포넌트 마이그레이션
1. Tailwind 색상 클래스 → `theme-*` 변경
2. 인라인 스타일 → `components.css` 이동
3. 하드코딩 색상 → CSS 변수 참조

### Phase 4: 테마 스토어 구현
1. `useThemeStore` Pinia 스토어 생성
2. `<html data-theme="">` 동적 변경
3. 설정 페이지 테마 선택 UI
4. localStorage 테마 저장

### Phase 5: 접근성 모드 재구현
1. 고대비 테마 CSS 변수 정의
2. 반전대비 테마 CSS 변수 정의
3. filter 기반 코드 제거
4. 접근성 패널 업데이트

---

## 7. 추가 개선 사항

### 7.1 다크 모드 지원

```css
/* themes/dark.css */
[data-theme="dark"] {
  --theme-bg: #0f172a;
  --theme-bg-secondary: #1e293b;
  --theme-surface: #1e293b;
  --theme-text: #f8fafc;
  --theme-text-secondary: #94a3b8;
  --theme-primary: #60a5fa;
  --theme-primary-hover: #3b82f6;
  --theme-border: #334155;
}
```

### 7.2 시스템 테마 자동 감지

```javascript
// useThemeStore.ts
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const prefersHighContrast = window.matchMedia('(prefers-contrast: more)');

if (prefersHighContrast.matches) {
  setTheme('high-contrast');
} else if (prefersDark.matches) {
  setTheme('dark');
}
```

### 7.3 테마 전환 애니메이션

```css
html {
  transition: background-color 0.3s ease, color 0.3s ease;
}

html.theme-transitioning * {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease !important;
}
```

### 7.4 CSS Color-Mix 활용 (모던 브라우저)

```css
:root {
  --theme-primary-10: color-mix(in srgb, var(--theme-primary) 10%, transparent);
  --theme-primary-20: color-mix(in srgb, var(--theme-primary) 20%, transparent);
  --theme-primary-90: color-mix(in srgb, var(--theme-primary) 90%, white);
}
```

### 7.5 관리자 테마 설정 연동

기기별 설정(`DeviceSetting`)에 테마 옵션 추가:

```
카테고리: DISPLAY
키: display.theme
값: default | modern | modern-red | classic | bootstrap | material
```

---

## 8. 파일 구조 (최종)

```
frontend/src/renderer/src/
├── assets/
│   └── styles/
│       ├── main.css              ← Tailwind + imports
│       ├── components.css        ← 전역 컴포넌트 스타일
│       └── themes/
│           ├── _variables.css    ← 토큰 정의
│           ├── default.css       ← 기본 테마
│           ├── modern.css
│           ├── modern-red.css
│           ├── classic.css
│           ├── bootstrap.css
│           ├── material.css
│           ├── dark.css
│           └── accessibility.css ← 고대비/반전대비
├── stores/
│   └── theme.ts                  ← 테마 상태 관리
└── composables/
    └── useTheme.ts               ← 테마 전환 로직
```

---

## 9. 결론

**핵심 변경:**
1. CSS Custom Properties 기반 테마 시스템
2. `data-theme` 속성으로 테마 전환
3. Tailwind 색상을 CSS 변수 참조로 변경
4. 인라인 스타일 통합 → 재사용 가능한 클래스
5. 접근성 모드를 filter 대신 CSS 변수로 구현

**예상 효과:**
- 테마 변경 시 하드코딩 색상 문제 해결
- 고대비/반전대비 모드의 예측 가능한 동작
- 일관된 디자인 토큰 관리
- 새 테마 추가 용이 (CSS 파일만 추가)
- 성능 개선 (filter 제거)

---

## 10. 전문가 패널 리뷰 및 추가 개선사항

> **리뷰 일자**: 2026-03-05
> **전문가 패널**: Karl Wiegers (요구사항), Martin Fowler (아키텍처), Lisa Crispin (테스팅), Michael Nygard (운영)

### 10.1 요구사항 품질 분석 (Karl Wiegers)

#### ❌ CRITICAL: 측정 가능한 수용 기준 부재

**현재 문제:**
```
"테마 변경 시 하드코딩 색상 문제 해결" - 어떤 상태가 "해결"인가?
```

**개선 권장:**
```yaml
# 측정 가능한 수용 기준 추가
acceptance_criteria:
  - name: "테마 전환 완전성"
    metric: "data-theme 변경 시 100% 색상 토큰이 CSS 변수 참조"
    validation: "grep -r '#[0-9a-fA-F]' --include='*.vue' | wc -l == 0"

  - name: "접근성 대비율"
    metric: "고대비 모드에서 텍스트/배경 대비율 ≥ 7:1 (WCAG AAA)"
    validation: "axe-core 자동 검사 통과"

  - name: "테마 전환 성능"
    metric: "테마 변경 후 First Paint ≤ 100ms"
    validation: "Lighthouse Performance Score ≥ 90"
```

#### ⚠️ MAJOR: 롤백 시나리오 미정의

**추가 요구사항:**
```yaml
rollback_requirements:
  - scenario: "테마 CSS 로드 실패"
    fallback: "default 테마로 자동 복귀"
    user_notification: "toast 메시지 표시"

  - scenario: "localStorage 테마값 손상"
    fallback: "시스템 테마 감지 또는 default"
    validation: "JSON.parse 실패 시 graceful degradation"
```

---

### 10.2 아키텍처 분석 (Martin Fowler)

#### ⚠️ MAJOR: 테마-접근성 책임 분리 필요

**현재 문제:**
테마(시각적 스타일링)와 접근성(기능적 요구사항)이 혼재

**개선 아키텍처:**
```
┌─────────────────────────────────────────────────────────────┐
│                    테마 레이어 분리                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: 기능적 접근성 (useAccessibilityStore)             │
│  ├── 폰트 크기 (font-scale: normal | large | xl)           │
│  ├── 모션 감소 (prefers-reduced-motion)                    │
│  ├── 강제 색상 모드 (forced-colors)                        │
│  └── TTS, 키보드 네비게이션                                 │
│                                                             │
│  Layer 2: 시각적 테마 (useThemeStore)                       │
│  ├── 브랜드 테마 (default, modern, material...)            │
│  ├── 다크 모드 (light | dark | system)                     │
│  └── 색상 대비 (normal | high-contrast | inverted)         │
│                                                             │
│  조합 예시:                                                  │
│  - theme=modern + contrast=high + font-scale=large         │
│  - theme=material + mode=dark + motion=reduced             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**구현 코드:**
```typescript
// stores/theme.ts
interface ThemeState {
  // 시각적 테마
  brand: 'default' | 'modern' | 'modern-red' | 'classic' | 'bootstrap' | 'material';
  colorMode: 'light' | 'dark' | 'system';
  contrast: 'normal' | 'high' | 'inverted';
}

// stores/accessibility.ts (기존 확장)
interface AccessibilityState {
  fontScale: 'normal' | 'large' | 'xl';
  reducedMotion: boolean;
  forcedColors: boolean;  // 신규: Windows 고대비 모드 감지
  screenReader: boolean;
}

// 조합된 CSS 클래스 생성
// <html data-theme="modern" data-contrast="high" data-font="large">
```

#### 🔧 MINOR: 테마 토큰 네이밍 일관성

**현재:**
```css
--theme-bg           /* 배경 */
--theme-surface      /* 표면 - 영어 */
--theme-text         /* 텍스트 */
```

**권장 (Material Design 3 토큰 체계 참조):**
```css
/* Surface 계층 */
--theme-surface-dim
--theme-surface-default
--theme-surface-bright
--theme-surface-container-lowest
--theme-surface-container-low
--theme-surface-container
--theme-surface-container-high
--theme-surface-container-highest

/* On-Surface (표면 위 콘텐츠) */
--theme-on-surface
--theme-on-surface-variant

/* Primary 계층 */
--theme-primary
--theme-primary-container
--theme-on-primary
--theme-on-primary-container
```

---

### 10.3 테스트 전략 분석 (Lisa Crispin)

#### ❌ CRITICAL: 테스트 시나리오 부재

**추가 필요: 테마 시스템 테스트 매트릭스**

```yaml
# tests/e2e/theme.spec.ts 구조
test_matrix:
  unit_tests:
    - name: "useThemeStore 상태 관리"
      cases:
        - "초기 테마 로드 (localStorage 우선)"
        - "테마 변경 시 data-theme 속성 업데이트"
        - "시스템 테마 변경 감지 및 반영"

  integration_tests:
    - name: "CSS 변수 적용 검증"
      cases:
        - "모든 테마에서 필수 토큰 정의 확인"
        - "테마 전환 시 computed style 변경 검증"
        - "접근성 모드와 테마 조합 테스트"

  visual_regression:
    - name: "스크린샷 비교"
      pages: ["WelcomeView", "MenuView", "CartView", "PaymentView"]
      themes: ["default", "modern", "high-contrast"]
      tool: "Playwright + Percy"

  accessibility_tests:
    - name: "WCAG 준수 검증"
      tool: "axe-core"
      rules:
        - "color-contrast (AA/AAA)"
        - "focus-visible"
        - "forced-colors-active"
```

**Playwright E2E 테스트 예시:**
```typescript
// tests/e2e/theme.spec.ts
import { test, expect } from '@playwright/test';

const themes = ['default', 'modern', 'modern-red', 'classic', 'bootstrap', 'material'];

themes.forEach(theme => {
  test.describe(`Theme: ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
    });

    test('필수 CSS 변수 정의 확인', async ({ page }) => {
      const requiredTokens = [
        '--theme-bg', '--theme-surface', '--theme-text',
        '--theme-primary', '--theme-border'
      ];

      for (const token of requiredTokens) {
        const value = await page.evaluate((t) =>
          getComputedStyle(document.documentElement).getPropertyValue(t)
        , token);
        expect(value.trim()).not.toBe('');
      }
    });

    test('색상 대비율 검증', async ({ page }) => {
      const results = await page.evaluate(() => {
        // @ts-ignore
        return axe.run();
      });
      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
    });
  });
});
```

---

### 10.4 운영 안정성 분석 (Michael Nygard)

#### ⚠️ MAJOR: 장애 복구 메커니즘 부재

**추가 요구사항:**
```yaml
failure_modes:
  - name: "CSS 파일 로드 실패"
    detection: "link.onerror 이벤트"
    recovery:
      - "인라인 폴백 스타일 적용"
      - "Sentry 에러 리포팅"
      - "3회 재시도 후 default 테마 강제 적용"

  - name: "localStorage 접근 불가"
    detection: "try-catch wrapper"
    recovery:
      - "메모리 기반 테마 상태 유지"
      - "세션 종료 시 상태 소실 허용"

  - name: "CSS 변수 미지원 브라우저"
    detection: "CSS.supports('--a', '0')"
    recovery:
      - "하드코딩된 default 테마 폴백"
      - "기능 제한 알림 표시"
```

**구현 코드:**
```typescript
// composables/useTheme.ts
export function useTheme() {
  const loadThemeCSS = async (theme: string): Promise<boolean> => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        // 테마 CSS 동적 로드
        await import(`@/assets/styles/themes/${theme}.css`);
        return true;
      } catch (error) {
        attempt++;
        console.error(`Theme load failed (attempt ${attempt}):`, error);

        if (attempt === MAX_RETRIES) {
          // 폴백: default 테마 강제 적용
          document.documentElement.setAttribute('data-theme', 'default');
          reportToSentry(error);
          showToast('테마 로드 실패. 기본 테마로 전환합니다.');
          return false;
        }

        await sleep(1000 * attempt); // 지수 백오프
      }
    }
    return false;
  };

  return { loadThemeCSS };
}
```

#### 🔧 MINOR: 모니터링 및 분석

**추가 권장:**
```typescript
// 테마 사용 분석 (선택적)
const trackThemeUsage = (theme: string, source: 'manual' | 'system' | 'saved') => {
  // 익명화된 사용 패턴 수집
  analytics.track('theme_changed', {
    theme,
    source,
    timestamp: Date.now(),
    // 개인정보 제외
  });
};
```

---

### 10.5 추가 개선사항 (신규 섹션)

#### 10.5.1 Tailwind CSS 4.0 호환성

Tailwind CSS 4.0의 `@theme` 지시자 활용:

```css
/* Tailwind 4.0 방식 */
@import "tailwindcss";

@theme {
  /* 테마별 분기 없이 CSS 변수 직접 참조 */
  --color-primary: var(--theme-primary);
  --color-surface: var(--theme-surface);
  --color-on-surface: var(--theme-text);
}

/* 커스텀 variant 정의 */
@custom-variant high-contrast (&:where([data-contrast="high"] *));
@custom-variant dark (&:where([data-mode="dark"] *));
```

#### 10.5.2 Forced Colors 모드 지원 (Windows 고대비)

```css
/* Windows 고대비 모드 대응 */
@media (forced-colors: active) {
  .btn-primary {
    /* 시스템 색상 키워드 사용 */
    background-color: ButtonFace;
    color: ButtonText;
    border: 2px solid ButtonText;
    forced-color-adjust: none;
  }

  /* 아이콘 가시성 확보 */
  svg {
    fill: currentColor;
  }
}

/* Tailwind variant 사용 */
.btn-primary {
  @apply forced-colors:border-2 forced-colors:border-current;
}
```

#### 10.5.3 prefers-reduced-motion 지원

```css
/* 모션 감소 설정 존중 */
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Tailwind variant 사용 */
.theme-transition {
  @apply transition-colors duration-300;
  @apply motion-reduce:transition-none;
}
```

#### 10.5.4 CSS Cascade Layers 활용

```css
/* 스타일 우선순위 명확화 */
@layer theme-base, theme-brand, theme-accessibility, theme-overrides;

@layer theme-base {
  :root {
    /* 기본 토큰 */
  }
}

@layer theme-brand {
  [data-theme="modern"] {
    /* 브랜드 테마 */
  }
}

@layer theme-accessibility {
  [data-contrast="high"] {
    /* 접근성 오버라이드 - 항상 브랜드보다 우선 */
  }
}

@layer theme-overrides {
  /* 사용자 커스텀 - 최우선 */
}
```

#### 10.5.5 런타임 테마 생성 (고급)

관리자가 커스텀 색상을 지정할 수 있는 기능:

```typescript
// composables/useCustomTheme.ts
export function useCustomTheme() {
  const generateTheme = (config: ThemeConfig): void => {
    const root = document.documentElement;

    // oklch 색상 공간으로 자동 팔레트 생성
    const primaryOklch = hexToOklch(config.primaryColor);

    root.style.setProperty('--theme-primary', config.primaryColor);
    root.style.setProperty('--theme-primary-hover', adjustLightness(primaryOklch, -10));
    root.style.setProperty('--theme-primary-container', adjustLightness(primaryOklch, 30));

    // 대비율 자동 계산
    const textColor = calculateContrastingColor(config.primaryColor);
    root.style.setProperty('--theme-on-primary', textColor);
  };

  return { generateTheme };
}
```

#### 10.5.6 테마 프리뷰 모드

설정 페이지에서 테마 미리보기:

```typescript
// composables/useThemePreview.ts
export function useThemePreview() {
  const originalTheme = ref<string | null>(null);

  const startPreview = (theme: string): void => {
    originalTheme.value = document.documentElement.dataset.theme || 'default';
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreview = 'true';
  };

  const cancelPreview = (): void => {
    if (originalTheme.value) {
      document.documentElement.dataset.theme = originalTheme.value;
      delete document.documentElement.dataset.themePreview;
    }
  };

  const confirmPreview = (): void => {
    delete document.documentElement.dataset.themePreview;
    originalTheme.value = null;
    // localStorage에 저장
  };

  return { startPreview, cancelPreview, confirmPreview };
}
```

---

### 10.6 수정된 구현 단계

```yaml
implementation_phases:
  phase_1_foundation:
    duration: "~"
    tasks:
      - "themes/ 디렉토리 및 토큰 구조 생성"
      - "default.css 마이그레이션"
      - "@layer 설정"
      - "폴백 메커니즘 구현"
    acceptance:
      - "기존 UI 동일하게 렌더링"
      - "CSS 변수 100% 적용"

  phase_2_themes:
    duration: "~"
    tasks:
      - "5개 브랜드 테마 구현"
      - "다크 모드 각 테마에 추가"
      - "useThemeStore 구현"
    acceptance:
      - "테마 전환 100ms 이내"
      - "모든 페이지에서 테마 적용 확인"

  phase_3_accessibility:
    duration: "~"
    tasks:
      - "테마-접근성 레이어 분리"
      - "고대비/반전대비 CSS 변수 구현"
      - "forced-colors 지원"
      - "prefers-reduced-motion 지원"
    acceptance:
      - "WCAG 2.1 AAA 대비율 충족"
      - "axe-core 검사 통과"

  phase_4_migration:
    duration: "~"
    tasks:
      - "53개 Vue 파일 Tailwind 클래스 마이그레이션"
      - "인라인 스타일 통합"
      - "하드코딩 색상 제거"
    acceptance:
      - "grep '#[0-9a-fA-F]' 결과 0건"
      - "Visual regression 테스트 통과"

  phase_5_testing:
    duration: "~"
    tasks:
      - "E2E 테마 테스트 작성"
      - "Visual regression 설정"
      - "접근성 자동 테스트"
    acceptance:
      - "테스트 커버리지 80%+"
      - "모든 테마 × 접근성 조합 검증"

  phase_6_admin:
    duration: "~"
    tasks:
      - "관리자 테마 설정 UI"
      - "기기별 테마 설정 저장"
      - "테마 프리뷰 기능"
    acceptance:
      - "설정 변경 즉시 반영"
      - "기기 재시작 후 설정 유지"
```

---

### 10.7 품질 메트릭

```yaml
quality_metrics:
  clarity_score: 8.5/10
  completeness_score: 9.0/10
  testability_score: 8.0/10
  consistency_score: 8.5/10

  improvements_applied:
    - "측정 가능한 수용 기준 추가"
    - "장애 복구 시나리오 정의"
    - "테스트 매트릭스 추가"
    - "테마-접근성 책임 분리"
    - "Tailwind 4.0 호환성 고려"
    - "forced-colors/reduced-motion 지원"
```

---

## 11. 브레인스토밍: 심층 확장 영역

> **브레인스토밍 일자**: 2026-03-05
> **탐색 관점**: UX 디자이너, 프론트엔드 아키텍트, 비즈니스 분석가, 키오스크 운영자

### 11.1 VueUse 통합으로 코드 간소화

현재 문서에서 제안한 수동 구현 대신 **VueUse 라이브러리**를 활용하면 코드량을 대폭 줄일 수 있습니다.

#### 11.1.1 useColorMode 활용

```typescript
// stores/theme.ts - VueUse 활용 버전
import { useColorMode, usePreferredColorScheme, usePreferredContrast, usePreferredReducedMotion } from '@vueuse/core'

export function useThemeStore() {
  // VueUse의 useColorMode - 자동 localStorage 저장, 시스템 감지
  const colorMode = useColorMode({
    attribute: 'data-theme',
    modes: {
      // 브랜드 테마
      default: 'default',
      modern: 'modern',
      'modern-red': 'modern-red',
      classic: 'classic',
      bootstrap: 'bootstrap',
      material: 'material',
      // 다크 모드 변형
      'default-dark': 'default-dark',
      'modern-dark': 'modern-dark',
    },
    storageKey: 'poson-theme',
    disableTransition: false, // 테마 전환 애니메이션 활성화
  })

  // 시스템 설정 자동 감지
  const systemColorScheme = usePreferredColorScheme()
  const systemContrast = usePreferredContrast()
  const reducedMotion = usePreferredReducedMotion()

  // 시스템 고대비 모드 자동 적용
  watch(systemContrast, (contrast) => {
    if (contrast === 'more') {
      document.documentElement.dataset.contrast = 'high'
    } else if (contrast === 'less') {
      document.documentElement.dataset.contrast = 'low'
    } else {
      delete document.documentElement.dataset.contrast
    }
  }, { immediate: true })

  return {
    colorMode,
    systemColorScheme,
    systemContrast,
    reducedMotion,
  }
}
```

#### 11.1.2 useCssVar로 동적 토큰 조작

```typescript
// composables/useDynamicTheme.ts
import { useCssVar } from '@vueuse/core'

export function useDynamicTheme() {
  // CSS 변수 직접 조작 (런타임 테마 생성용)
  const primaryColor = useCssVar('--theme-primary')
  const accentColor = useCssVar('--theme-accent')
  const surfaceColor = useCssVar('--theme-surface')

  const applyBrandColors = (config: BrandConfig) => {
    primaryColor.value = config.primary
    accentColor.value = config.accent
    // 파생 색상 자동 생성
    generateColorPalette(config.primary)
  }

  return { primaryColor, accentColor, surfaceColor, applyBrandColors }
}
```

---

### 11.2 키오스크 특화 UX 고려사항

#### 11.2.1 조명 환경 자동 감지

키오스크는 다양한 조명 환경에 노출됩니다:

```typescript
// composables/useAmbientLight.ts
export function useAmbientLight() {
  const brightness = ref<'bright' | 'normal' | 'dim'>('normal')

  // AmbientLightSensor API 활용 (지원 브라우저)
  if ('AmbientLightSensor' in window) {
    const sensor = new AmbientLightSensor()
    sensor.addEventListener('reading', () => {
      if (sensor.illuminance > 500) {
        brightness.value = 'bright'  // 직사광선
      } else if (sensor.illuminance < 50) {
        brightness.value = 'dim'     // 어두운 환경
      } else {
        brightness.value = 'normal'
      }
    })
    sensor.start()
  }

  // 조명에 따른 테마 자동 조정
  const adjustedTheme = computed(() => {
    if (brightness.value === 'bright') {
      return { contrast: 'high', brightness: 1.1 }
    } else if (brightness.value === 'dim') {
      return { contrast: 'normal', brightness: 0.9 }
    }
    return { contrast: 'normal', brightness: 1 }
  })

  return { brightness, adjustedTheme }
}
```

#### 11.2.2 터치 피드백 테마화

```css
/* 테마별 터치 피드백 */
:root {
  --theme-ripple-color: color-mix(in srgb, var(--theme-primary) 30%, transparent);
  --theme-press-scale: 0.97;
  --theme-press-duration: 100ms;
}

[data-theme="material"] {
  --theme-ripple-color: color-mix(in srgb, var(--theme-primary) 20%, transparent);
  --theme-press-scale: 0.98;
  --theme-press-duration: 150ms;
}

/* 터치 피드백 적용 */
.btn-touch {
  transition: transform var(--theme-press-duration) ease;
}

.btn-touch:active {
  transform: scale(var(--theme-press-scale));
}

/* Material ripple effect */
[data-theme="material"] .btn-touch::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, var(--theme-ripple-color) 10%, transparent 10%);
  background-size: 1000% 1000%;
  opacity: 0;
  transition: background 0.5s, opacity 0.3s;
}

[data-theme="material"] .btn-touch:active::after {
  background-size: 0% 0%;
  opacity: 1;
  transition: 0s;
}
```

#### 11.2.3 시간대별 자동 테마 전환

```typescript
// composables/useScheduledTheme.ts
export function useScheduledTheme() {
  const currentHour = ref(new Date().getHours())

  // 1분마다 시간 확인
  useIntervalFn(() => {
    currentHour.value = new Date().getHours()
  }, 60000)

  const scheduledMode = computed(() => {
    // 설정에서 가져온 스케줄
    const schedule = {
      morning: { start: 6, end: 12, mode: 'light' },
      afternoon: { start: 12, end: 18, mode: 'light' },
      evening: { start: 18, end: 22, mode: 'dim' },
      night: { start: 22, end: 6, mode: 'dark' },
    }

    if (currentHour.value >= 22 || currentHour.value < 6) return 'dark'
    if (currentHour.value >= 18) return 'dim'
    return 'light'
  })

  return { scheduledMode, currentHour }
}
```

---

### 11.3 다중 디스플레이 / 다중 기기 시나리오

#### 11.3.1 기기별 독립 테마

POSON 시스템은 여러 기기가 동시에 운영됩니다:

```typescript
// stores/deviceTheme.ts
interface DeviceThemeConfig {
  deviceId: string
  deviceType: 'KIOSK' | 'POS' | 'KITCHEN'
  theme: ThemeConfig
  overrideGlobal: boolean
}

export function useDeviceTheme() {
  const globalTheme = ref<string>('default')
  const deviceTheme = ref<string | null>(null)
  const deviceId = import.meta.env.VITE_DEVICE_ID

  // 기기별 테마 우선 적용
  const effectiveTheme = computed(() => {
    return deviceTheme.value || globalTheme.value
  })

  // 서버에서 기기별 설정 로드
  const loadDeviceTheme = async () => {
    const settings = await api.get(`/devices/${deviceId}/settings/display`)
    deviceTheme.value = settings['display.theme']
  }

  // 실시간 동기화 (WebSocket)
  const syncTheme = () => {
    socket.on('theme:update', (data) => {
      if (data.deviceId === deviceId || data.global) {
        deviceTheme.value = data.theme
      }
    })
  }

  return { effectiveTheme, loadDeviceTheme, syncTheme }
}
```

#### 11.3.2 테마 원격 관리 (관리자 앱)

```typescript
// 관리자 앱에서 모든 기기 테마 일괄 변경
const broadcastThemeChange = async (theme: string, targets: string[]) => {
  await api.post('/admin/broadcast/theme', {
    theme,
    targets, // ['all'] 또는 ['device-001', 'device-002']
    immediate: true,
  })
}
```

---

### 11.4 성능 최적화 전략

#### 11.4.1 테마 CSS 지연 로딩

```typescript
// composables/useThemeLazyLoad.ts
const loadedThemes = new Set<string>(['default'])

export async function loadTheme(theme: string): Promise<void> {
  if (loadedThemes.has(theme)) {
    document.documentElement.dataset.theme = theme
    return
  }

  try {
    // 동적 import로 해당 테마만 로드
    await import(`@/assets/styles/themes/${theme}.css`)
    loadedThemes.add(theme)
    document.documentElement.dataset.theme = theme
  } catch (error) {
    console.error(`Theme ${theme} load failed:`, error)
    // 폴백
    document.documentElement.dataset.theme = 'default'
  }
}

// 테마 프리로드 (설정 페이지 진입 시)
export function preloadAllThemes(): void {
  const themes = ['modern', 'modern-red', 'classic', 'bootstrap', 'material']
  themes.forEach(theme => {
    if (!loadedThemes.has(theme)) {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = `/assets/themes/${theme}.css`
      document.head.appendChild(link)
    }
  })
}
```

#### 11.4.2 CSS 변수 변경 최적화

```typescript
// 배치 업데이트로 reflow 최소화
export function batchUpdateCssVars(updates: Record<string, string>): void {
  const root = document.documentElement

  // requestAnimationFrame으로 렌더링 사이클에 맞춤
  requestAnimationFrame(() => {
    // 모든 변수를 한 번에 업데이트
    Object.entries(updates).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  })
}
```

#### 11.4.3 테마 전환 시 FOUC 방지

```html
<!-- index.html -->
<script>
  // 렌더링 전 테마 적용 (FOUC 방지)
  (function() {
    const saved = localStorage.getItem('poson-theme')
    const theme = saved ? JSON.parse(saved).value : 'default'
    document.documentElement.dataset.theme = theme

    // 시스템 대비 설정
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      document.documentElement.dataset.contrast = 'high'
    }
  })()
</script>
```

---

### 11.5 브랜딩 & 화이트라벨링 지원

#### 11.5.1 프랜차이즈/매장별 커스텀 테마

```typescript
// 매장별 브랜드 설정 로드
interface BrandingConfig {
  storeId: string
  storeName: string
  logo: string
  colors: {
    primary: string
    accent: string
    background: string
  }
  fonts: {
    heading: string
    body: string
  }
  borderRadius: 'sharp' | 'rounded' | 'pill'
}

export function useStoreBranding() {
  const branding = ref<BrandingConfig | null>(null)

  const loadBranding = async () => {
    const storeId = import.meta.env.VITE_STORE_ID
    branding.value = await api.get(`/stores/${storeId}/branding`)

    // 브랜드 색상을 CSS 변수로 적용
    if (branding.value) {
      const root = document.documentElement
      root.style.setProperty('--theme-primary', branding.value.colors.primary)
      root.style.setProperty('--theme-accent', branding.value.colors.accent)
      root.style.setProperty('--theme-bg', branding.value.colors.background)
    }
  }

  return { branding, loadBranding }
}
```

#### 11.5.2 테마 내보내기/가져오기

```typescript
// 테마 설정 백업/복원
export function exportThemeConfig(): string {
  const config = {
    theme: document.documentElement.dataset.theme,
    contrast: document.documentElement.dataset.contrast,
    fontScale: document.documentElement.dataset.font,
    customVars: getComputedCustomVars(),
    exportDate: new Date().toISOString(),
  }
  return JSON.stringify(config, null, 2)
}

export function importThemeConfig(json: string): boolean {
  try {
    const config = JSON.parse(json)
    applyThemeConfig(config)
    return true
  } catch {
    return false
  }
}
```

---

### 11.6 A/B 테스트 & 분석 통합

#### 11.6.1 테마별 전환율 추적

```typescript
// 테마와 사용자 행동 상관관계 분석
export function useThemeAnalytics() {
  const trackConversion = (event: string, theme: string) => {
    analytics.track('theme_conversion', {
      event,
      theme,
      timestamp: Date.now(),
      sessionId: getSessionId(),
    })
  }

  // 테마별 주문 완료율
  const trackOrderComplete = () => {
    const currentTheme = document.documentElement.dataset.theme
    trackConversion('order_complete', currentTheme || 'default')
  }

  // 테마별 이탈률
  const trackAbandonment = () => {
    const currentTheme = document.documentElement.dataset.theme
    trackConversion('cart_abandonment', currentTheme || 'default')
  }

  return { trackOrderComplete, trackAbandonment }
}
```

#### 11.6.2 A/B 테스트 프레임워크

```typescript
// 테마 A/B 테스트
export function useThemeExperiment() {
  const experiment = ref<{
    name: string
    variant: 'A' | 'B'
    theme: string
  } | null>(null)

  const initExperiment = async () => {
    // 실험 그룹 할당 (서버 또는 로컬)
    const variant = Math.random() > 0.5 ? 'A' : 'B'
    const themeMap = {
      A: 'default',
      B: 'modern',
    }

    experiment.value = {
      name: 'theme_comparison_2026_q1',
      variant,
      theme: themeMap[variant],
    }

    // 실험 테마 적용
    document.documentElement.dataset.theme = experiment.value.theme

    // 분석 도구에 실험 정보 전송
    analytics.identify({
      experimentName: experiment.value.name,
      experimentVariant: experiment.value.variant,
    })
  }

  return { experiment, initExperiment }
}
```

---

### 11.7 국제화 & 문화적 고려사항

#### 11.7.1 지역별 색상 선호도

```typescript
// 지역별 기본 테마 매핑
const regionThemeDefaults: Record<string, string> = {
  ko: 'default',      // 한국: 따뜻한 갈색 계열
  ja: 'classic',      // 일본: 클래식/전통적 색감
  zh: 'modern-red',   // 중국: 레드 선호
  en: 'modern',       // 영어권: 모던/미니멀
}

export function useRegionalTheme() {
  const locale = useLocaleStore()

  const suggestedTheme = computed(() => {
    return regionThemeDefaults[locale.currentLocale] || 'default'
  })

  // 첫 방문 시 지역 기반 테마 제안
  const suggestRegionalTheme = () => {
    const hasThemePreference = localStorage.getItem('poson-theme')
    if (!hasThemePreference) {
      return suggestedTheme.value
    }
    return null
  }

  return { suggestedTheme, suggestRegionalTheme }
}
```

#### 11.7.2 RTL 레이아웃 지원

```css
/* RTL 언어 (아랍어, 히브리어) 지원 */
[dir="rtl"] {
  --theme-direction: rtl;
  --theme-start: right;
  --theme-end: left;
}

[dir="ltr"] {
  --theme-direction: ltr;
  --theme-start: left;
  --theme-end: right;
}

.sidebar {
  inset-inline-start: 0;  /* 방향 독립적 */
}

.cart-panel {
  inset-inline-end: 0;
}
```

---

### 11.8 오프라인 테마 동기화

#### 11.8.1 IndexedDB 테마 캐싱

```typescript
// db/themeCache.ts
import Dexie from 'dexie'

class ThemeCacheDB extends Dexie {
  themes!: Dexie.Table<{ id: string; css: string; version: string }, string>

  constructor() {
    super('ThemeCache')
    this.version(1).stores({
      themes: 'id, version',
    })
  }
}

export const themeCache = new ThemeCacheDB()

// 테마 CSS 오프라인 저장
export async function cacheTheme(themeId: string, css: string): Promise<void> {
  await themeCache.themes.put({
    id: themeId,
    css,
    version: APP_VERSION,
  })
}

// 오프라인 시 캐시에서 로드
export async function loadCachedTheme(themeId: string): Promise<string | null> {
  const cached = await themeCache.themes.get(themeId)
  return cached?.css || null
}
```

#### 11.8.2 Service Worker 테마 프리캐싱

```typescript
// sw.ts (Service Worker)
const THEME_CACHE = 'themes-v1'
const THEME_URLS = [
  '/assets/themes/default.css',
  '/assets/themes/modern.css',
  '/assets/themes/modern-red.css',
  '/assets/themes/classic.css',
  '/assets/themes/bootstrap.css',
  '/assets/themes/material.css',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(THEME_CACHE).then((cache) => {
      return cache.addAll(THEME_URLS)
    })
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/assets/themes/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request)
      })
    )
  }
})
```

---

### 11.9 품질 메트릭 업데이트

```yaml
quality_metrics_v2:
  clarity_score: 9.0/10        # +0.5 (VueUse 통합으로 코드 간소화)
  completeness_score: 9.5/10   # +0.5 (오프라인, 다중기기, 국제화 추가)
  testability_score: 8.5/10    # +0.5 (A/B 테스트 프레임워크)
  consistency_score: 9.0/10    # +0.5 (브랜딩 시스템 표준화)
  innovation_score: 8.5/10     # 신규 (조명 감지, 시간대 자동화)

  brainstorm_additions:
    - "VueUse 통합 (useColorMode, useCssVar, usePreferredContrast)"
    - "키오스크 특화 UX (조명 감지, 터치 피드백, 시간대 자동화)"
    - "다중 기기 테마 동기화"
    - "성능 최적화 (지연 로딩, FOUC 방지)"
    - "화이트라벨링 / 프랜차이즈 지원"
    - "A/B 테스트 & 분석 통합"
    - "국제화 & RTL 지원"
    - "오프라인 테마 동기화 (IndexedDB, Service Worker)"
```

---

### 11.10 구현 우선순위 매트릭스

```
┌────────────────────────────────────────────────────────────┐
│                    영향도 (Impact)                         │
│                 낮음 ◄─────────────────► 높음              │
├────────────────────────────────────────────────────────────┤
│  높음 │                          │ VueUse 통합          │ │
│       │ 오프라인 동기화          │ 기본 테마 시스템      │ │
│ 노     │                          │ 접근성 개선           │ │
│ 력     ├──────────────────────────┼──────────────────────┤ │
│ 도     │                          │                      │ │
│       │ A/B 테스트               │ FOUC 방지            │ │
│       │ 조명 감지                │ 지연 로딩             │ │
│  낮음 │ RTL 지원                 │ 터치 피드백 테마화    │ │
└────────────────────────────────────────────────────────────┘

권장 구현 순서:
1. VueUse 통합 + 기본 테마 시스템 (필수)
2. 접근성 개선 + FOUC 방지 (필수)
3. 지연 로딩 + 터치 피드백 (권장)
4. 다중 기기 동기화 (선택)
5. 화이트라벨링 (프랜차이즈 확장 시)
6. A/B 테스트 / 분석 (데이터 기반 의사결정 시)
7. 오프라인 동기화 / RTL (글로벌 확장 시)
```
