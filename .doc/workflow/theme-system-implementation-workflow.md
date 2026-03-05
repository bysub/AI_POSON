# POSON Kiosk 테마 시스템 구현 워크플로우

> **생성일**: 2026-03-05
> **기준 문서**: `.doc/analysis/theme-system-analysis.md`
> **프로젝트**: POSON POS Self-Service Kiosk

---

## 1. 프로젝트 개요

### 1.1 목표
- CSS Custom Properties 기반 멀티 테마 시스템 구축
- 6개 브랜드 테마 + 접근성 테마 지원
- 기존 53개 Vue 파일의 하드코딩 색상 마이그레이션
- WCAG 2.1 AAA 접근성 준수

### 1.2 범위

| 포함 | 제외 |
|------|------|
| 6개 브랜드 테마 구현 | 런타임 테마 생성기 |
| 고대비/반전대비 모드 | A/B 테스트 프레임워크 |
| VueUse 통합 | 화이트라벨링 시스템 |
| 53개 Vue 파일 마이그레이션 | 오프라인 테마 동기화 |
| 관리자 테마 설정 UI | RTL 레이아웃 지원 |

### 1.3 의존성 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          테마 시스템 의존성                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Sprint 1: 기반 구축                                                    │
│  ┌──────────────┐                                                       │
│  │ 1.1 토큰 정의 │───┬───► 1.3 default.css ───► 1.4 main.css 연동      │
│  └──────────────┘   │                                                   │
│  ┌──────────────┐   │                                                   │
│  │ 1.2 폴더 구조 │───┘                                                   │
│  └──────────────┘                                                       │
│         │                                                               │
│         ▼                                                               │
│  Sprint 2: 테마 구현                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ 2.1 modern   │  │ 2.2 classic  │  │ 2.3 material │  (병렬 가능)       │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│         │                 │                 │                           │
│         └────────────────┬┘─────────────────┘                           │
│                          ▼                                              │
│  Sprint 3: 스토어 & 인프라                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ 3.1 VueUse   │─►│ 3.2 Theme    │─►│ 3.3 FOUC     │                   │
│  │    설치      │  │    Store     │  │    방지      │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                          │                                              │
│                          ▼                                              │
│  Sprint 4: 컴포넌트 마이그레이션                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ 4.1 키오스크 │─►│ 4.2 관리자   │─►│ 4.3 공통     │                   │
│  │    뷰 (12)   │  │    뷰 (20)   │  │ 컴포넌트(21) │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                          │                                              │
│                          ▼                                              │
│  Sprint 5: 접근성                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ 5.1 고대비   │  │ 5.2 반전대비 │  │ 5.3 시스템   │                   │
│  │    테마      │  │    테마      │  │  감지 연동   │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                          │                                              │
│                          ▼                                              │
│  Sprint 6: 테스트 & 관리자 UI                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ 6.1 E2E      │  │ 6.2 Visual   │  │ 6.3 관리자   │                   │
│  │    테스트    │  │  Regression  │  │  테마 설정   │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 상세 구현 일정

### Sprint 1: 기반 구축

**기간**: Day 1-3
**목표**: CSS 변수 기반 테마 인프라 구축

| Task ID | 작업 | 산출물 | 선행작업 | 담당 |
|---------|------|--------|----------|------|
| 1.1 | 디자인 토큰 정의 | `_variables.css` | - | Frontend |
| 1.2 | themes 폴더 구조 생성 | 폴더 구조 | - | Frontend |
| 1.3 | default.css 작성 | `themes/default.css` | 1.1 | Frontend |
| 1.4 | main.css import 설정 | `main.css` 수정 | 1.3 | Frontend |
| 1.5 | Tailwind config 수정 | `tailwind.config.js` | 1.3 | Frontend |
| 1.6 | components.css 생성 | `components.css` | 1.4 | Frontend |

#### Task 1.1: 디자인 토큰 정의

```css
/* frontend/src/renderer/src/assets/styles/themes/_variables.css */

/* ====================================
   POSON Kiosk Design Token Reference
   ==================================== */

/*
  필수 토큰 목록:

  색상 (Colors)
  --theme-bg                    페이지 배경
  --theme-bg-secondary          섹션 배경
  --theme-surface               카드/모달 배경
  --theme-surface-hover         호버 상태
  --theme-text                  주요 텍스트
  --theme-text-secondary        보조 텍스트
  --theme-text-muted            비활성 텍스트
  --theme-primary               주요 액션
  --theme-primary-hover         주요 액션 호버
  --theme-primary-text          주요 버튼 내 텍스트
  --theme-accent                강조색
  --theme-accent-hover          강조색 호버
  --theme-border                기본 테두리
  --theme-border-strong         강조 테두리
  --theme-success               성공 상태
  --theme-error                 에러 상태
  --theme-warning               경고 상태

  그라데이션 (Gradients)
  --theme-gradient-welcome      웰컴 페이지 배경
  --theme-gradient-button       버튼 그라데이션

  그림자 (Shadows)
  --theme-shadow-sm             작은 그림자
  --theme-shadow-md             중간 그림자
  --theme-shadow-lg             큰 그림자

  폰트 (Typography)
  --theme-font-sans             기본 폰트
  --theme-font-display          디스플레이 폰트

  반경 (Border Radius)
  --theme-radius-sm             4px
  --theme-radius-md             8px
  --theme-radius-lg             16px

  터치 피드백 (Touch Feedback)
  --theme-ripple-color          터치 리플 색상
  --theme-press-scale           터치 스케일
  --theme-press-duration        터치 애니메이션 시간
*/
```

#### Task 1.3: default.css 작성

```css
/* frontend/src/renderer/src/assets/styles/themes/default.css */
:root,
[data-theme="default"] {
  /* 색상 */
  --theme-bg: #FDF9F3;
  --theme-bg-secondary: #f5ede0;
  --theme-surface: #ffffff;
  --theme-surface-hover: #f8f8f8;
  --theme-text: #1e293b;
  --theme-text-secondary: #64748b;
  --theme-text-muted: #94a3b8;
  --theme-primary: #8E3524;
  --theme-primary-hover: #7a3125;
  --theme-primary-text: #ffffff;
  --theme-accent: #C96231;
  --theme-accent-hover: #a54f26;
  --theme-border: #e2e8f0;
  --theme-border-strong: #cbd5e1;
  --theme-success: #22c55e;
  --theme-error: #ef4444;
  --theme-warning: #f59e0b;

  /* 그라데이션 */
  --theme-gradient-welcome: linear-gradient(135deg, #1a0a05 0%, #3d1a0a 25%, #5c2d15 50%, #8e3524 75%, #2d1810 100%);
  --theme-gradient-button: linear-gradient(135deg, var(--theme-primary), var(--theme-accent));

  /* 그림자 */
  --theme-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --theme-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --theme-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* 폰트 */
  --theme-font-sans: "Pretendard", system-ui, sans-serif;
  --theme-font-display: "Pretendard", system-ui, sans-serif;

  /* 반경 */
  --theme-radius-sm: 4px;
  --theme-radius-md: 8px;
  --theme-radius-lg: 16px;

  /* 터치 피드백 */
  --theme-ripple-color: color-mix(in srgb, var(--theme-primary) 30%, transparent);
  --theme-press-scale: 0.97;
  --theme-press-duration: 100ms;
}
```

#### 완료 기준 (Sprint 1)

- [ ] `themes/` 디렉토리 생성 완료
- [ ] `_variables.css` 토큰 레퍼런스 작성
- [ ] `default.css` 현재 색상값 마이그레이션
- [ ] `main.css`에서 테마 파일 import
- [ ] `tailwind.config.js` CSS 변수 참조로 수정
- [ ] 기존 UI 동일하게 렌더링 확인

---

### Sprint 2: 테마 구현

**기간**: Day 4-6
**목표**: 5개 브랜드 테마 CSS 작성

| Task ID | 작업 | 산출물 | 선행작업 | 담당 |
|---------|------|--------|----------|------|
| 2.1 | Modern 테마 | `themes/modern.css` | 1.3 | Frontend |
| 2.2 | Modern Red 테마 | `themes/modern-red.css` | 1.3 | Frontend |
| 2.3 | Classic 테마 | `themes/classic.css` | 1.3 | Frontend |
| 2.4 | Bootstrap 테마 | `themes/bootstrap.css` | 1.3 | Frontend |
| 2.5 | Material 테마 | `themes/material.css` | 1.3 | Frontend |
| 2.6 | Dark 테마 | `themes/dark.css` | 1.3 | Frontend |

#### 병렬 작업 가능

Task 2.1 ~ 2.6은 모두 Task 1.3에만 의존하므로 **병렬 작업 가능**

#### 완료 기준 (Sprint 2)

- [ ] 6개 테마 CSS 파일 작성 완료
- [ ] 각 테마에서 모든 필수 토큰 정의 확인
- [ ] 브라우저 DevTools에서 `data-theme` 변경 시 색상 전환 확인

---

### Sprint 3: 스토어 & 인프라

**기간**: Day 7-9
**목표**: 테마 상태 관리 및 VueUse 통합

| Task ID | 작업 | 산출물 | 선행작업 | 담당 |
|---------|------|--------|----------|------|
| 3.1 | VueUse 설치 | `package.json` | - | Frontend |
| 3.2 | useThemeStore 구현 | `stores/theme.ts` | 3.1 | Frontend |
| 3.3 | FOUC 방지 스크립트 | `index.html` 수정 | 3.2 | Frontend |
| 3.4 | 테마 전환 애니메이션 | `main.css` 수정 | 3.2 | Frontend |
| 3.5 | 시스템 테마 감지 | `stores/theme.ts` | 3.2 | Frontend |

#### Task 3.1: VueUse 설치

```bash
cd frontend
npm install @vueuse/core
```

#### Task 3.2: useThemeStore 구현

```typescript
// frontend/src/renderer/src/stores/theme.ts
import { defineStore } from 'pinia'
import { useColorMode, usePreferredColorScheme, usePreferredContrast, usePreferredReducedMotion } from '@vueuse/core'
import { computed, watch } from 'vue'

export type BrandTheme = 'default' | 'modern' | 'modern-red' | 'classic' | 'bootstrap' | 'material'
export type ColorMode = 'light' | 'dark' | 'system'
export type ContrastMode = 'normal' | 'high' | 'inverted'

export const useThemeStore = defineStore('theme', () => {
  // VueUse useColorMode - 자동 localStorage 저장
  const colorMode = useColorMode({
    attribute: 'data-theme',
    modes: {
      default: 'default',
      modern: 'modern',
      'modern-red': 'modern-red',
      classic: 'classic',
      bootstrap: 'bootstrap',
      material: 'material',
      dark: 'dark',
    },
    storageKey: 'poson-theme',
    disableTransition: false,
  })

  // 시스템 설정 감지
  const systemColorScheme = usePreferredColorScheme()
  const systemContrast = usePreferredContrast()
  const reducedMotion = usePreferredReducedMotion()

  // 현재 테마
  const currentTheme = computed(() => colorMode.value)

  // 테마 변경
  const setTheme = (theme: BrandTheme | 'dark') => {
    colorMode.value = theme
  }

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

  // 모션 감소 설정 적용
  watch(reducedMotion, (motion) => {
    if (motion === 'reduce') {
      document.documentElement.dataset.motion = 'reduced'
    } else {
      delete document.documentElement.dataset.motion
    }
  }, { immediate: true })

  return {
    colorMode,
    currentTheme,
    systemColorScheme,
    systemContrast,
    reducedMotion,
    setTheme,
  }
})
```

#### Task 3.3: FOUC 방지

```html
<!-- frontend/src/renderer/index.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <script>
    // FOUC 방지: 렌더링 전 테마 적용
    (function() {
      try {
        const saved = localStorage.getItem('poson-theme')
        const theme = saved || 'default'
        document.documentElement.dataset.theme = theme

        // 시스템 대비 설정
        if (window.matchMedia('(prefers-contrast: more)').matches) {
          document.documentElement.dataset.contrast = 'high'
        }

        // 모션 감소 설정
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          document.documentElement.dataset.motion = 'reduced'
        }
      } catch (e) {
        document.documentElement.dataset.theme = 'default'
      }
    })()
  </script>
  <!-- ... -->
</head>
```

#### 완료 기준 (Sprint 3)

- [ ] VueUse 설치 및 import 확인
- [ ] `useThemeStore` 동작 확인
- [ ] 테마 변경 시 `data-theme` 속성 변경 확인
- [ ] localStorage 저장/복원 확인
- [ ] 페이지 새로고침 시 FOUC 없음 확인
- [ ] 시스템 고대비 모드 감지 확인

---

### Sprint 4: 컴포넌트 마이그레이션

**기간**: Day 10-15
**목표**: 53개 Vue 파일의 하드코딩 색상 → CSS 변수

| Task ID | 작업 | 파일 수 | 선행작업 | 담당 |
|---------|------|---------|----------|------|
| 4.1 | 키오스크 뷰 마이그레이션 | 12 | 3.2 | Frontend |
| 4.2 | 관리자 뷰 마이그레이션 | 20 | 3.2 | Frontend |
| 4.3 | 공통 컴포넌트 마이그레이션 | 21 | 3.2 | Frontend |
| 4.4 | 인라인 스타일 통합 | - | 4.1-4.3 | Frontend |

#### Task 4.1: 키오스크 뷰 (12개)

| 파일 | 변경 내용 | 우선순위 |
|------|----------|----------|
| `WelcomeView.vue` | `.bg-welcome` 그라데이션 → CSS 변수 | 높음 |
| `MenuView.vue` | `.voice-highlight` 색상 → CSS 변수 | 높음 |
| `CartView.vue` | Tailwind 색상 클래스 변환 | 중간 |
| `PaymentView.vue` | Tailwind 색상 클래스 변환 | 중간 |
| `CompleteView.vue` | Tailwind 색상 클래스 변환 | 낮음 |
| `LanguageSelectView.vue` | Tailwind 색상 클래스 변환 | 낮음 |
| `KioskLayout.vue` | 배경색 → CSS 변수 | 높음 |
| `OrderConfirmView.vue` | Tailwind 색상 클래스 변환 | 중간 |
| `PointSelectView.vue` | Tailwind 색상 클래스 변환 | 낮음 |
| ... | ... | ... |

#### 마이그레이션 패턴

**변경 전:**
```html
<button class="bg-primary-600 text-white hover:bg-primary-700">
```

**변경 후:**
```html
<button class="bg-theme-primary text-theme-primary-text hover:bg-theme-primary-hover">
```

**인라인 스타일 변경 전:**
```vue
<style scoped>
.bg-welcome {
  background: linear-gradient(135deg, #1a0a05 0%, #3d1a0a 25%, #5c2d15 50%, #8e3524 75%, #2d1810 100%);
}
</style>
```

**변경 후:**
```vue
<style scoped>
.bg-welcome {
  background: var(--theme-gradient-welcome);
}
</style>
```

#### Task 4.4: 인라인 스타일 통합

23개 Vue 파일의 `<style scoped>` 중 공통 스타일을 `components.css`로 이동:

| 스타일 | 출현 파일 수 | 통합 |
|--------|-------------|------|
| `.fade-*` 트랜지션 | 8 | ✅ 통합 |
| `.slide-fade-*` 트랜지션 | 4 | ✅ 통합 |
| `.modal-*` 트랜지션 | 5 | ✅ 통합 |
| `.hide-scrollbar` | 3 | ✅ 통합 |
| 개별 레이아웃 보정 | 5 | ❌ 유지 |

#### 완료 기준 (Sprint 4)

- [ ] 53개 Vue 파일 마이그레이션 완료
- [ ] `grep -r '#[0-9a-fA-F]' --include='*.vue'` 결과 0건
- [ ] 모든 페이지에서 테마 전환 정상 동작
- [ ] `components.css`에 공통 스타일 통합

---

### Sprint 5: 접근성 테마

**기간**: Day 16-18
**목표**: 고대비/반전대비 모드 구현 및 WCAG AAA 준수

| Task ID | 작업 | 산출물 | 선행작업 | 담당 |
|---------|------|--------|----------|------|
| 5.1 | 고대비 테마 | `themes/accessibility.css` | 4.4 | Frontend |
| 5.2 | 반전대비 테마 | `themes/accessibility.css` | 4.4 | Frontend |
| 5.3 | 접근성 스토어 연동 | `stores/accessibility.ts` | 5.1-5.2 | Frontend |
| 5.4 | forced-colors 지원 | `themes/accessibility.css` | 5.1 | Frontend |
| 5.5 | 기존 filter 코드 제거 | `accessibility.css` 정리 | 5.3 | Frontend |

#### Task 5.1-5.2: 접근성 테마

```css
/* frontend/src/renderer/src/assets/styles/themes/accessibility.css */

/* 고대비 모드 - WCAG AAA (7:1 대비율) */
[data-contrast="high"],
[data-theme="high-contrast"] {
  --theme-bg: #000000;
  --theme-bg-secondary: #1a1a1a;
  --theme-surface: #000000;
  --theme-surface-hover: #333333;
  --theme-text: #ffffff;
  --theme-text-secondary: #e5e5e5;
  --theme-text-muted: #cccccc;
  --theme-primary: #ffff00;
  --theme-primary-hover: #cccc00;
  --theme-primary-text: #000000;
  --theme-accent: #00ffff;
  --theme-accent-hover: #00cccc;
  --theme-border: #ffffff;
  --theme-border-strong: #ffffff;
  --theme-success: #00ff00;
  --theme-error: #ff0000;
  --theme-warning: #ffff00;
  --theme-gradient-welcome: linear-gradient(135deg, #000000, #1a1a1a, #333333);
}

/* 반전대비 모드 */
[data-contrast="inverted"],
[data-theme="inverted"] {
  --theme-bg: #1e293b;
  --theme-bg-secondary: #334155;
  --theme-surface: #0f172a;
  --theme-surface-hover: #1e293b;
  --theme-text: #f8fafc;
  --theme-text-secondary: #cbd5e1;
  --theme-text-muted: #94a3b8;
  --theme-primary: #60a5fa;
  --theme-primary-hover: #93c5fd;
  --theme-primary-text: #1e293b;
  --theme-accent: #f97316;
  --theme-accent-hover: #fb923c;
  --theme-border: #475569;
  --theme-border-strong: #64748b;
  --theme-success: #4ade80;
  --theme-error: #f87171;
  --theme-warning: #fbbf24;
  --theme-gradient-welcome: linear-gradient(135deg, #0f172a, #1e3a5f, #1e293b);
}

/* Windows 고대비 모드 (forced-colors) */
@media (forced-colors: active) {
  .btn-primary,
  .btn-kiosk-primary {
    background-color: ButtonFace;
    color: ButtonText;
    border: 2px solid ButtonText;
    forced-color-adjust: none;
  }

  svg {
    fill: currentColor;
  }

  .card-kiosk {
    border: 2px solid CanvasText;
  }
}

/* 모션 감소 모드 */
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

[data-motion="reduced"] * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

#### 완료 기준 (Sprint 5)

- [ ] 고대비 모드에서 텍스트/배경 대비율 ≥ 7:1
- [ ] axe-core 자동 검사 통과
- [ ] Windows 고대비 모드(forced-colors) 정상 동작
- [ ] 기존 filter 기반 코드 제거
- [ ] 접근성 패널에서 테마 전환 동작

---

### Sprint 6: 테스트 & 관리자 UI

**기간**: Day 19-22
**목표**: E2E 테스트 및 관리자 테마 설정 UI

| Task ID | 작업 | 산출물 | 선행작업 | 담당 |
|---------|------|--------|----------|------|
| 6.1 | E2E 테마 테스트 | `tests/e2e/theme.spec.ts` | 5.5 | QA |
| 6.2 | Visual Regression 설정 | Percy 연동 | 6.1 | QA |
| 6.3 | 접근성 자동 테스트 | axe-core 연동 | 6.1 | QA |
| 6.4 | 관리자 테마 설정 탭 | `SettingsView.vue` | 5.5 | Frontend |
| 6.5 | 기기별 테마 설정 저장 | `DevicesView.vue` | 6.4 | Frontend |
| 6.6 | 테마 프리뷰 기능 | `useThemePreview.ts` | 6.4 | Frontend |

#### Task 6.1: E2E 테마 테스트

```typescript
// tests/e2e/theme.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const themes = ['default', 'modern', 'modern-red', 'classic', 'bootstrap', 'material']
const requiredTokens = [
  '--theme-bg', '--theme-surface', '--theme-text',
  '--theme-primary', '--theme-border', '--theme-success'
]

themes.forEach(theme => {
  test.describe(`Theme: ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t)
      }, theme)
    })

    test('필수 CSS 변수 정의 확인', async ({ page }) => {
      for (const token of requiredTokens) {
        const value = await page.evaluate((t) =>
          getComputedStyle(document.documentElement).getPropertyValue(t).trim()
        , token)
        expect(value).not.toBe('')
      }
    })

    test('색상 대비율 검증 (WCAG AA)', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze()

      expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0)
    })

    test('테마 전환 성능 (100ms 이내)', async ({ page }) => {
      const startTime = Date.now()
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'modern')
      })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})

test.describe('접근성 테마', () => {
  test('고대비 모드 WCAG AAA (7:1)', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-contrast', 'high')
    })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aaa'])
      .analyze()

    expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0)
  })
})
```

#### Task 6.4: 관리자 테마 설정 UI

```vue
<!-- SettingsView.vue 테마 설정 탭 추가 -->
<template>
  <div class="theme-settings">
    <h3 class="text-lg font-semibold mb-4">테마 설정</h3>

    <div class="grid grid-cols-3 gap-4">
      <button
        v-for="theme in availableThemes"
        :key="theme.id"
        class="theme-card p-4 rounded-lg border-2 transition-all"
        :class="[
          currentTheme === theme.id
            ? 'border-theme-primary bg-theme-primary/10'
            : 'border-theme-border hover:border-theme-primary/50'
        ]"
        @mouseenter="startPreview(theme.id)"
        @mouseleave="cancelPreview"
        @click="selectTheme(theme.id)"
      >
        <div
          class="theme-preview h-20 rounded mb-2"
          :style="{ background: theme.preview }"
        />
        <span class="font-medium">{{ theme.name }}</span>
      </button>
    </div>

    <div class="mt-6">
      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="followSystem" class="w-5 h-5" />
        <span>시스템 테마 설정 따르기</span>
      </label>
    </div>
  </div>
</template>
```

#### 완료 기준 (Sprint 6)

- [ ] E2E 테마 테스트 통과 (6개 테마 × 4개 페이지)
- [ ] Visual Regression 베이스라인 생성
- [ ] axe-core 접근성 검사 통과
- [ ] 관리자 테마 설정 UI 완료
- [ ] 테마 프리뷰 기능 동작
- [ ] 설정 저장 및 기기 재시작 후 유지 확인

---

## 3. 전체 일정 요약

```
┌────────────────────────────────────────────────────────────────────────┐
│                        테마 시스템 구현 타임라인                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Day 1-3   │████████│ Sprint 1: 기반 구축                              │
│            │        │ - 토큰 정의, default.css, Tailwind 수정          │
│            │        │                                                  │
│  Day 4-6   │████████│ Sprint 2: 테마 구현 (병렬)                       │
│            │        │ - modern, classic, material, bootstrap, dark     │
│            │        │                                                  │
│  Day 7-9   │████████│ Sprint 3: 스토어 & 인프라                        │
│            │        │ - VueUse, useThemeStore, FOUC 방지              │
│            │        │                                                  │
│  Day 10-15 │████████████████│ Sprint 4: 컴포넌트 마이그레이션           │
│            │                │ - 53개 Vue 파일, 인라인 스타일 통합       │
│            │                │                                          │
│  Day 16-18 │████████│ Sprint 5: 접근성 테마                            │
│            │        │ - 고대비, 반전대비, forced-colors                │
│            │        │                                                  │
│  Day 19-22 │████████████│ Sprint 6: 테스트 & 관리자 UI                 │
│            │            │ - E2E, Visual Regression, 설정 UI            │
│            │            │                                              │
│  Day 23    │██│ 버퍼 / QA                                              │
│            │  │                                                        │
└────────────────────────────────────────────────────────────────────────┘

총 예상 기간: 22-23일 (약 4.5주)
```

---

## 4. 리스크 및 완화 방안

| 리스크 | 영향도 | 확률 | 완화 방안 |
|--------|--------|------|----------|
| Tailwind 클래스 누락 발견 | 높음 | 중간 | 자동화 스크립트로 미변환 클래스 탐지 |
| 색상 대비율 미달 | 높음 | 낮음 | 조기 axe-core 검사, 디자인 수정 |
| VueUse 호환성 문제 | 중간 | 낮음 | 폴백 구현 준비 |
| 성능 저하 | 중간 | 낮음 | Lighthouse CI 모니터링 |
| 기존 접근성 기능 회귀 | 높음 | 중간 | Sprint 5 전용 회귀 테스트 |

---

## 5. 산출물 체크리스트

### 필수 산출물

- [ ] `themes/` 디렉토리 (8개 CSS 파일)
- [ ] `stores/theme.ts` (Pinia 스토어)
- [ ] `composables/useThemePreview.ts`
- [ ] `components.css` (공통 트랜지션)
- [ ] 53개 Vue 파일 마이그레이션
- [ ] `tailwind.config.js` 수정
- [ ] `index.html` FOUC 방지 스크립트
- [ ] E2E 테스트 (`tests/e2e/theme.spec.ts`)
- [ ] 관리자 테마 설정 UI

### 선택 산출물

- [ ] Visual Regression 베이스라인
- [ ] 테마 사용 분석 (analytics)
- [ ] 테마 내보내기/가져오기 기능
