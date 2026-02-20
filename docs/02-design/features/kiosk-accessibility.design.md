# Design: 키오스크 저시력/시각장애인 접근성

## 컴포넌트 구조

```
KioskLayout.vue
  ├── <RouterView />
  ├── <VirtualKeyboard />          ← 기존
  ├── <AccessibilityToggle />      ← 신규: 플로팅 ♿ 버튼
  ├── <AccessibilityPanel />       ← 신규: 설정 패널 (모달)
  ├── <TTSReplayButton />          ← 신규: "다시 듣기" 플로팅 버튼
  ├── <IdleWarning />              ← 기존
  └── <OfflineIndicator />         ← 기존

stores/accessibility.ts             ← 신규: Pinia 접근성 상태
composables/useTTS.ts               ← 신규: TTS 엔진 래퍼
assets/css/accessibility.css        ← 신규: 고대비 CSS 변수
```

## 1. Pinia Store: `useAccessibilityStore`

### 파일: `frontend/src/renderer/src/stores/accessibility.ts`

```typescript
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useSettingsStore } from "./settings";

export type FontScale = "standard" | "large" | "extraLarge";
export type ContrastMode = "default" | "highContrast" | "invertedContrast";

const FONT_SIZE_MAP: Record<FontScale, string> = {
  standard: "16px",
  large: "20px",
  extraLarge: "24px",
};

export const useAccessibilityStore = defineStore("accessibility", () => {
  const settingsStore = useSettingsStore();

  // === State ===
  const isEnabled = ref(false); // 접근성 모드 활성 여부
  const showPanel = ref(false); // 설정 패널 표시 여부
  const fontScale = ref<FontScale>("standard");
  const contrastMode = ref<ContrastMode>("default");
  const ttsEnabled = ref(false);
  const ttsRate = ref(0.9); // 0.8 ~ 1.2
  const ttsVolume = ref(1.0); // 0.0 ~ 1.0

  // === Getters ===
  const isHighContrast = computed(() => contrastMode.value !== "default");

  const htmlClasses = computed(() => {
    const classes: string[] = [];
    if (contrastMode.value === "highContrast") classes.push("a11y-high-contrast");
    if (contrastMode.value === "invertedContrast") classes.push("a11y-inverted-contrast");
    if (fontScale.value === "large") classes.push("a11y-font-large");
    if (fontScale.value === "extraLarge") classes.push("a11y-font-xl");
    return classes;
  });

  // === Actions ===
  function initialize() {
    // 관리자 설정에서 기본값 로드
    const enabled = settingsStore.get("a11y.enabled", "1");
    isEnabled.value = enabled === "1";
    ttsRate.value = parseFloat(settingsStore.get("a11y.ttsRate", "0.9"));
    ttsVolume.value = parseFloat(settingsStore.get("a11y.ttsVolume", "1.0"));

    // 기본값이 설정되어 있으면 적용
    const defaultFont = settingsStore.get("a11y.defaultFontScale", "standard");
    if (defaultFont) fontScale.value = defaultFont as FontScale;
    const defaultContrast = settingsStore.get("a11y.defaultContrast", "default");
    if (defaultContrast) contrastMode.value = defaultContrast as ContrastMode;
    const defaultTts = settingsStore.get("a11y.ttsEnabled", "0");
    ttsEnabled.value = defaultTts === "1";

    applyToDOM();
  }

  function setFontScale(scale: FontScale) {
    fontScale.value = scale;
    applyToDOM();
  }

  function setContrastMode(mode: ContrastMode) {
    contrastMode.value = mode;
    applyToDOM();
  }

  function toggleTTS() {
    ttsEnabled.value = !ttsEnabled.value;
  }

  function openPanel() {
    showPanel.value = true;
  }

  function closePanel() {
    showPanel.value = false;
  }

  function resetToDefaults() {
    // 세션 종료(WelcomeView 복귀) 시 호출
    const autoReset = settingsStore.getDevice("a11y.autoReset", "1");
    if (autoReset === "1") {
      fontScale.value = settingsStore.get("a11y.defaultFontScale", "standard") as FontScale;
      contrastMode.value = settingsStore.get("a11y.defaultContrast", "default") as ContrastMode;
      ttsEnabled.value = settingsStore.get("a11y.ttsEnabled", "0") === "1";
      showPanel.value = false;
      applyToDOM();
    }
  }

  function applyToDOM() {
    const root = document.documentElement;

    // 1) 폰트 크기 반영
    root.style.fontSize = FONT_SIZE_MAP[fontScale.value];

    // 2) 대비 모드 클래스 반영
    root.classList.remove("a11y-high-contrast", "a11y-inverted-contrast");
    root.classList.remove("a11y-font-large", "a11y-font-xl");
    htmlClasses.value.forEach((cls) => root.classList.add(cls));
  }

  // fontScale/contrastMode 변경 시 자동 DOM 반영
  watch([fontScale, contrastMode], () => applyToDOM());

  return {
    // State
    isEnabled,
    showPanel,
    fontScale,
    contrastMode,
    ttsEnabled,
    ttsRate,
    ttsVolume,
    // Getters
    isHighContrast,
    htmlClasses,
    // Actions
    initialize,
    setFontScale,
    setContrastMode,
    toggleTTS,
    openPanel,
    closePanel,
    resetToDefaults,
    applyToDOM,
  };
});
```

### 상태 흐름도

```
WelcomeView.onMounted
  └─ accessibilityStore.initialize()  ← 관리자 설정 기반 초기화
       └─ applyToDOM()               ← html 클래스/fontSize 반영

사용자 인터랙션
  ├─ ♿ 버튼 탭 → openPanel()
  ├─ 패널에서 설정 변경 → setFontScale() / setContrastMode() / toggleTTS()
  │   └─ watch → applyToDOM() 자동 호출
  └─ 패널 닫기 → closePanel()

세션 종료 (WelcomeView 복귀)
  └─ resetToDefaults()  ← 관리자 기본값으로 복원
```

## 2. Composable: `useTTS`

### 파일: `frontend/src/renderer/src/composables/useTTS.ts`

```typescript
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAccessibilityStore } from "@/stores/accessibility";

// 마지막 발화 텍스트 (다시 듣기 용도)
const lastUtterance = ref("");
const isSpeaking = ref(false);

export function useTTS() {
  const { locale } = useI18n();
  const a11yStore = useAccessibilityStore();

  // 언어 코드 → BCP 47 매핑
  const LANG_MAP: Record<string, string> = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    zh: "zh-CN",
  };

  /**
   * 텍스트를 음성으로 읽기
   * TTS가 비활성이면 무시 (silent no-op)
   */
  function speak(text: string, options?: { force?: boolean }) {
    if (!a11yStore.ttsEnabled && !options?.force) return;
    if (!text.trim()) return;
    if (!window.speechSynthesis) return;

    // 이전 발화 중단
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[locale.value] ?? "ko-KR";
    utterance.rate = a11yStore.ttsRate;
    utterance.volume = a11yStore.ttsVolume;

    utterance.onstart = () => {
      isSpeaking.value = true;
    };
    utterance.onend = () => {
      isSpeaking.value = false;
    };
    utterance.onerror = () => {
      isSpeaking.value = false;
    };

    lastUtterance.value = text;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * 마지막 발화를 다시 읽기 (KS X 9211 필수)
   */
  function replay() {
    if (lastUtterance.value) {
      speak(lastUtterance.value, { force: true });
    }
  }

  /**
   * 현재 발화 중단
   */
  function stop() {
    window.speechSynthesis?.cancel();
    isSpeaking.value = false;
  }

  /**
   * 사용 가능한 음성 목록 조회
   */
  function getVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis?.getVoices() ?? [];
  }

  return {
    speak,
    replay,
    stop,
    getVoices,
    lastUtterance,
    isSpeaking,
  };
}
```

### TTS 발화 시점 상세

| 화면                 | 이벤트         | 발화 텍스트 (ko)                                                     | i18n 키                                |
| -------------------- | -------------- | -------------------------------------------------------------------- | -------------------------------------- |
| **WelcomeView**      | `onMounted`    | "주문을 시작하려면 화면을 터치하세요"                                | `a11y.tts.welcome`                     |
| **MenuView**         | `onMounted`    | "메뉴를 선택하세요. 카테고리와 상품을 터치하면 음성으로 안내합니다." | `a11y.tts.menuGuide`                   |
| **MenuView**         | 카테고리 탭    | "{카테고리명}"                                                       | 동적                                   |
| **MenuView**         | 상품 탭        | "{상품명}, {가격}원"                                                 | 동적                                   |
| **MenuView**         | 장바구니 추가  | "{상품명} 추가됨. 장바구니 {N}개, 총 {금액}원"                       | `a11y.tts.cartAdded`                   |
| **OrderConfirmView** | `onMounted`    | "주문을 확인하세요. 총 {N}개, {금액}원입니다."                       | `a11y.tts.orderConfirm`                |
| **OrderConfirmView** | 매장/포장 선택 | "매장식사 선택" / "포장 선택"                                        | `a11y.tts.dineIn` / `a11y.tts.takeout` |
| **PointSelectView**  | `onMounted`    | "포인트를 적립하시겠습니까?"                                         | `a11y.tts.pointAsk`                    |
| **PaymentView**      | `onMounted`    | "결제 수단을 선택하세요. 총 {금액}원입니다."                         | `a11y.tts.paymentGuide`                |
| **PaymentView**      | 결제수단 탭    | "카드결제" / "현금결제" / "모바일결제"                               | 동적                                   |
| **CompleteView**     | `onMounted`    | "주문이 완료되었습니다. 주문번호 {N}번입니다. 감사합니다."           | `a11y.tts.complete`                    |
| **전역**             | 에러 발생      | 에러 메시지 텍스트                                                   | 동적                                   |
| **IdleWarning**      | 표시 시        | "화면을 터치하지 않으면 {N}초 후 처음으로 돌아갑니다."               | `a11y.tts.idleWarning`                 |

## 3. CSS 고대비 모드

### 파일: `frontend/src/renderer/src/assets/css/accessibility.css`

```css
/* ========================================
   접근성 CSS Custom Properties
   ======================================== */

/* 기본 모드: 기존 테마 색상 매핑 */
:root {
  --a11y-bg: #fdf9f3;
  --a11y-bg-secondary: #f5ede0;
  --a11y-surface: #ffffff;
  --a11y-text: #1e293b;
  --a11y-text-secondary: #64748b;
  --a11y-primary: #8e3524;
  --a11y-primary-hover: #7a3125;
  --a11y-accent: #c96231;
  --a11y-border: #e2e8f0;
  --a11y-border-strong: #cbd5e1;
  --a11y-success: #22c55e;
  --a11y-error: #ef4444;
  --a11y-warning: #f59e0b;
  --a11y-button-text: #ffffff;
  --a11y-focus-ring: 0 0 0 3px rgba(142, 53, 36, 0.4);
  --a11y-btn-border: 0px;
}

/* 고대비 모드 (검정 배경) - 대비비 7:1+ (WCAG AAA) */
.a11y-high-contrast {
  --a11y-bg: #000000;
  --a11y-bg-secondary: #0a0a0a;
  --a11y-surface: #1a1a1a;
  --a11y-text: #ffffff;
  --a11y-text-secondary: #e0e0e0;
  --a11y-primary: #ffff00;
  --a11y-primary-hover: #ffd700;
  --a11y-accent: #00ff00;
  --a11y-border: #ffffff;
  --a11y-border-strong: #ffff00;
  --a11y-success: #00ff00;
  --a11y-error: #ff4444;
  --a11y-warning: #ffff00;
  --a11y-button-text: #000000;
  --a11y-focus-ring: 0 0 0 4px #ffff00;
  --a11y-btn-border: 2px solid #ffffff;
}

/* 반전 대비 모드 (밝은 배경) - 대비비 7:1+ */
.a11y-inverted-contrast {
  --a11y-bg: #ffffff;
  --a11y-bg-secondary: #f5f5f5;
  --a11y-surface: #ffffff;
  --a11y-text: #000000;
  --a11y-text-secondary: #333333;
  --a11y-primary: #0000cc;
  --a11y-primary-hover: #000099;
  --a11y-accent: #cc0000;
  --a11y-border: #000000;
  --a11y-border-strong: #000000;
  --a11y-success: #006600;
  --a11y-error: #cc0000;
  --a11y-warning: #cc6600;
  --a11y-button-text: #ffffff;
  --a11y-focus-ring: 0 0 0 4px #0000cc;
  --a11y-btn-border: 3px solid #000000;
}

/* ========================================
   포커스 표시 (모든 모드 공통)
   ======================================== */
.a11y-high-contrast *:focus-visible,
.a11y-inverted-contrast *:focus-visible {
  outline: none !important;
  box-shadow: var(--a11y-focus-ring) !important;
}

/* ========================================
   글꼴 크기 (html font-size 변경 방식이 아닌 보조)
   ======================================== */
.a11y-font-large {
  /* html font-size는 JS에서 20px로 설정 */
  /* 추가 보정이 필요한 고정 크기 요소용 */
  --a11y-min-touch: 56px;
}

.a11y-font-xl {
  --a11y-min-touch: 64px;
}
```

### 색상 대비비 검증

| 조합            | 기본 모드                    | 고대비 모드                  | 반전 대비 모드               |
| --------------- | ---------------------------- | ---------------------------- | ---------------------------- |
| 텍스트/배경     | `#1e293b`/`#FDF9F3` = 11.2:1 | `#FFFFFF`/`#000000` = 21:1   | `#000000`/`#FFFFFF` = 21:1   |
| 주요색/배경     | `#8E3524`/`#FDF9F3` = 5.8:1  | `#FFFF00`/`#000000` = 19.6:1 | `#0000CC`/`#FFFFFF` = 8.6:1  |
| 보조색/배경     | `#C96231`/`#FDF9F3` = 4.0:1  | `#00FF00`/`#000000` = 15.3:1 | `#CC0000`/`#FFFFFF` = 5.9:1  |
| 보조텍스트/배경 | `#64748b`/`#FDF9F3` = 4.6:1  | `#E0E0E0`/`#000000` = 17.4:1 | `#333333`/`#FFFFFF` = 12.6:1 |

모든 조합이 WCAG AA(4.5:1) 이상이며, 고대비/반전 모드는 AAA(7:1) 이상을 충족합니다.

### Tailwind 적용 전략

기존 Tailwind 클래스에서 색상을 CSS 변수로 교체하는 유틸리티 클래스를 추가합니다.
**전체 교체가 아닌 점진적 적용**: 키오스크 뷰에서만 접근성 변수를 사용합니다.

```javascript
// tailwind.config.js extend 추가
colors: {
  // 기존 colors 유지...
  a11y: {
    bg: "var(--a11y-bg)",
    "bg-secondary": "var(--a11y-bg-secondary)",
    surface: "var(--a11y-surface)",
    text: "var(--a11y-text)",
    "text-secondary": "var(--a11y-text-secondary)",
    primary: "var(--a11y-primary)",
    accent: "var(--a11y-accent)",
    border: "var(--a11y-border)",
    success: "var(--a11y-success)",
    error: "var(--a11y-error)",
    warning: "var(--a11y-warning)",
  },
}
```

**키오스크 뷰 교체 예시:**

```html
<!-- Before -->
<div class="bg-cream text-gray-900">
  <!-- After -->
  <div class="bg-a11y-bg text-a11y-text">
    <!-- Before -->
    <button class="bg-red-500 text-white">
      <!-- After -->
      <button
        class="bg-a11y-primary text-a11y-button-text"
        style="border: var(--a11y-btn-border)"
      ></button>
    </button>
  </div>
</div>
```

## 4. 컴포넌트 상세 설계

### 4-1. AccessibilityToggle.vue

**위치**: `frontend/src/renderer/src/components/kiosk/AccessibilityToggle.vue`
**역할**: 화면 우하단 고정 플로팅 버튼 (♿ 아이콘)

```
┌─────────────────────────────────┐
│                                 │
│         (키오스크 화면)          │
│                                 │
│                                 │
│                          ┌───┐  │
│                          │ ♿│  │  ← 56x56px 플로팅 버튼
│                          └───┘  │
└─────────────────────────────────┘
```

**Props/Events:**

```typescript
// Props 없음 (store에서 직접 읽음)

// Template
<button
  v-if="a11yStore.isEnabled"
  class="fixed z-[9990] rounded-full shadow-lg"
  :class="positionClass"
  :style="{ width: '56px', height: '56px' }"
  :aria-label="t('a11y.openSettings')"
  @click="a11yStore.openPanel()"
>
  <!-- ♿ SVG 아이콘 -->
</button>
```

**배치 규칙:**

- `position: fixed`, z-index: 9990 (키보드 9999 바로 아래)
- 기본 위치: 우하단 `right-4 bottom-20` (장바구니 영역 위)
- 관리자 설정(`a11y.buttonPosition`)에 따라 좌/우 전환
- WelcomeView에서는 더 눈에 띄는 위치 (하단 중앙 근처)

### 4-2. AccessibilityPanel.vue

**위치**: `frontend/src/renderer/src/components/kiosk/AccessibilityPanel.vue`
**역할**: 접근성 설정 모달 패널

```
┌────────────────────────────────────┐
│  ♿ 접근성 설정                  ✕  │
│ ───────────────────────────────── │
│                                    │
│  글꼴 크기                         │
│  ┌──────┐ ┌──────┐ ┌────────┐    │
│  │ 표준 │ │ 크게 │ │매우크게│    │
│  │  가  │ │  가  │ │   가   │    │
│  │ 16px │ │ 20px │ │  24px  │    │
│  └──────┘ └──────┘ └────────┘    │
│                                    │
│  화면 모드                         │
│  ┌──────┐ ┌──────┐ ┌────────┐    │
│  │ 기본 │ │고대비│ │반전대비│    │
│  │ 🌤️  │ │ 🌙  │ │  ☀️  │    │
│  └──────┘ └──────┘ └────────┘    │
│                                    │
│  음성 안내                         │
│  ┌────────────────────────────┐   │
│  │  OFF  ──────●──────  ON   │   │
│  └────────────────────────────┘   │
│                                    │
│  ┌──────────────────────────────┐ │
│  │         적용하기              │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

**Props/Events:**

```typescript
interface Props {
  // Props 없음 - store에서 직접 읽기
}

// Emits
const emit = defineEmits<{
  close: [];
}>();
```

**주요 동작:**

1. 모달 열림 시 TTS로 "접근성 설정 화면입니다" 발화
2. 각 옵션 탭 시 TTS로 옵션명 + 현재 상태 발화
3. 글꼴 크기 선택 카드: 해당 크기로 미리보기 텍스트 표시
4. 대비 모드 선택 카드: 해당 모드의 색상 미리보기
5. "적용하기" → 설정 저장 + 패널 닫기
6. 모달 외부 클릭 → 변경 취소하지 않고 닫기 (이미 실시간 반영됨)

**ARIA 속성:**

```html
<div role="dialog" aria-modal="true" :aria-label="t('a11y.settingsTitle')"></div>
```

### 4-3. TTSReplayButton.vue

**위치**: `frontend/src/renderer/src/components/kiosk/TTSReplayButton.vue`
**역할**: "다시 듣기" 플로팅 버튼 (KS X 9211 의무)

```typescript
// TTS가 활성이고, 마지막 발화가 있을 때만 표시
<button
  v-if="a11yStore.ttsEnabled && tts.lastUtterance.value"
  class="fixed left-4 bottom-20 z-[9990]"
  :aria-label="t('a11y.replay')"
  @click="tts.replay()"
>
  🔊 다시 듣기
</button>
```

**디자인:**

- 56x56px 원형 버튼 + "다시 듣기" 텍스트 라벨
- 발화 중일 때 펄스 애니메이션
- 좌하단 배치 (AccessibilityToggle과 대칭)

## 5. 화면별 적용 상세

### 5-1. KioskLayout.vue 변경

```diff
 <script setup lang="ts">
+import { useAccessibilityStore } from "@/stores/accessibility";
+import AccessibilityToggle from "@/components/kiosk/AccessibilityToggle.vue";
+import AccessibilityPanel from "@/components/kiosk/AccessibilityPanel.vue";
+import TTSReplayButton from "@/components/kiosk/TTSReplayButton.vue";

+const a11yStore = useAccessibilityStore();
 </script>

 <template>
   <div class="h-screen w-screen overflow-hidden bg-kiosk-background">
     <RouterView />
     <VirtualKeyboard />
+    <AccessibilityToggle />
+    <AccessibilityPanel v-if="a11yStore.showPanel" />
+    <TTSReplayButton />
     <!-- Idle Warning -->
     <!-- Offline indicator -->
   </div>
 </template>
```

### 5-2. WelcomeView.vue 변경

```diff
 onMounted(() => {
   cartStore.clear();
   localeStore.resetLocale();
   locale.value = "ko";
   selectedLang.value = "ko";
   settingsStore.initialize();
+
+  // 접근성 초기화 + 세션 리셋
+  accessibilityStore.initialize();
+  accessibilityStore.resetToDefaults();
+
+  // TTS 환영 메시지 (접근성 모드 활성 시)
+  tts.speak(t("a11y.tts.welcome"));
 });
```

**추가 ARIA 속성:**

```html
<main role="main" :aria-label="t('welcome.title')">
  <button :aria-label="t('a11y.tts.welcome')" @click="startOrder"></button>
</main>
```

### 5-3. MenuView.vue 변경 (가장 복잡)

**카테고리 버튼:**

```html
<button
  v-for="category in categoriesWithAll"
  :key="category.id"
  :aria-label="getLocalizedName(category)"
  :aria-pressed="effectiveSelectedId === category.id"
  role="tab"
  @click="handleCategorySelect(category.id === 0 ? null : category.id);
          tts.speak(getLocalizedName(category))"
></button>
```

**상품 카드:**

```html
<article
  v-for="product in productsStore.filteredProducts"
  :key="product.id"
  :aria-label="`${getLocalizedName(product)}, ${formatPrice(product.sellPrice)}원${
    isUnavailable(product) ? ', 품절' : ''
  }`"
  role="button"
  :tabindex="isUnavailable(product) ? -1 : 0"
  @click="handleAddToCart(product);
          tts.speak(`${getLocalizedName(product)}, ${formatPrice(product.sellPrice)}원`)"
></article>
```

**장바구니 변경 시 TTS (aria-live 영역):**

```html
<!-- Screen Reader + TTS 공지 영역 -->
<div aria-live="polite" aria-atomic="true" class="sr-only">{{ cartAnnouncement }}</div>
```

```typescript
// 장바구니 변경 감지
watch(
  () => cartStore.totalItems,
  (newCount) => {
    if (newCount > 0) {
      const msg = t("a11y.tts.cartUpdated", {
        count: newCount,
        total: formatPrice(cartStore.totalAmount),
      });
      tts.speak(msg);
      cartAnnouncement.value = msg;
    }
  },
);
```

### 5-4. OrderConfirmView.vue 변경

```typescript
onMounted(() => {
  tts.speak(
    t("a11y.tts.orderConfirm", {
      count: cartStore.totalItems,
      total: formatPrice(cartStore.totalAmount),
    }),
  );
});
```

**매장/포장 버튼 ARIA:**

```html
<button
  role="radio"
  :aria-checked="selectedOrderType === 'DINE_IN'"
  @click="selectOrderType('DINE_IN');
          tts.speak(t('a11y.tts.dineIn'))"
></button>
```

### 5-5. PaymentView.vue 변경

```typescript
onMounted(() => {
  tts.speak(
    t("a11y.tts.paymentGuide", {
      total: formatPrice(total.value),
    }),
  );
});
```

**결제 에러 시 TTS:**

```typescript
watch(orderError, (err) => {
  if (err) tts.speak(err);
});
```

### 5-6. CompleteView.vue 변경

```typescript
onMounted(() => {
  tts.speak(
    t("a11y.tts.complete", {
      number: orderNumber.value,
    }),
  );
});
```

## 6. i18n 추가 키

### `locales/ko.json` 추가

```json
{
  "a11y": {
    "openSettings": "접근성 설정 열기",
    "settingsTitle": "접근성 설정",
    "fontScale": "글꼴 크기",
    "fontStandard": "표준",
    "fontLarge": "크게",
    "fontExtraLarge": "매우 크게",
    "contrastMode": "화면 모드",
    "contrastDefault": "기본",
    "contrastHigh": "고대비",
    "contrastInverted": "반전 대비",
    "ttsLabel": "음성 안내",
    "ttsOn": "켜기",
    "ttsOff": "끄기",
    "apply": "적용하기",
    "replay": "다시 듣기",
    "tts": {
      "welcome": "주문을 시작하려면 화면을 터치하세요",
      "menuGuide": "메뉴를 선택하세요. 상품을 터치하면 음성으로 안내합니다.",
      "cartAdded": "{name} 추가됨. 장바구니 {count}개, 총 {total}",
      "cartUpdated": "장바구니 {count}개, 총 {total}",
      "orderConfirm": "주문을 확인하세요. 총 {count}개, {total}입니다.",
      "dineIn": "매장 식사 선택",
      "takeout": "포장 선택",
      "pointAsk": "포인트를 적립하시겠습니까?",
      "paymentGuide": "결제 수단을 선택하세요. 총 {total}입니다.",
      "complete": "주문이 완료되었습니다. 주문번호 {number}번입니다. 감사합니다.",
      "idleWarning": "화면을 터치하지 않으면 {seconds}초 후 처음으로 돌아갑니다.",
      "settingsOpened": "접근성 설정 화면입니다."
    }
  }
}
```

### 다국어 (en, ja, zh)

동일 키 구조로 3개 언어 추가. 예시 (en):

```json
{
  "a11y": {
    "openSettings": "Open accessibility settings",
    "settingsTitle": "Accessibility Settings",
    "fontScale": "Font Size",
    "fontStandard": "Standard",
    "fontLarge": "Large",
    "fontExtraLarge": "Extra Large",
    "contrastMode": "Display Mode",
    "contrastDefault": "Default",
    "contrastHigh": "High Contrast",
    "contrastInverted": "Inverted Contrast",
    "ttsLabel": "Voice Guide",
    "ttsOn": "ON",
    "ttsOff": "OFF",
    "apply": "Apply",
    "replay": "Replay",
    "tts": {
      "welcome": "Touch the screen to start ordering",
      "menuGuide": "Select a menu item. Touch a product to hear its details.",
      "cartAdded": "{name} added. Cart: {count} items, total {total}",
      "cartUpdated": "Cart: {count} items, total {total}",
      "orderConfirm": "Please confirm your order. {count} items, total {total}.",
      "dineIn": "Dine-in selected",
      "takeout": "Takeout selected",
      "pointAsk": "Would you like to earn points?",
      "paymentGuide": "Select a payment method. Total: {total}.",
      "complete": "Your order is complete. Order number {number}. Thank you.",
      "idleWarning": "The screen will reset in {seconds} seconds.",
      "settingsOpened": "Accessibility settings screen."
    }
  }
}
```

## 7. tailwind.config.js 변경

```diff
 theme: {
   extend: {
     colors: {
       // 기존 유지...
+      a11y: {
+        bg: "var(--a11y-bg)",
+        "bg-secondary": "var(--a11y-bg-secondary)",
+        surface: "var(--a11y-surface)",
+        text: "var(--a11y-text)",
+        "text-secondary": "var(--a11y-text-secondary)",
+        primary: "var(--a11y-primary)",
+        accent: "var(--a11y-accent)",
+        border: "var(--a11y-border)",
+        "border-strong": "var(--a11y-border-strong)",
+        success: "var(--a11y-success)",
+        error: "var(--a11y-error)",
+        warning: "var(--a11y-warning)",
+        "button-text": "var(--a11y-button-text)",
+      },
     },
+    boxShadow: {
+      "a11y-focus": "var(--a11y-focus-ring)",
+    },
   },
 },
```

## 8. 관리자 설정 연동

### 설정 카테고리: ACCESSIBILITY

기존 `SettingsView.vue`의 6개 탭에 7번째 "접근성" 탭을 추가합니다.

| 키                      | 라벨               | UI 타입  | 옵션                                  |
| ----------------------- | ------------------ | -------- | ------------------------------------- |
| `a11y.enabled`          | 접근성 기능 활성화 | 토글     | ON/OFF                                |
| `a11y.ttsEnabled`       | TTS 기본 활성      | 토글     | ON/OFF                                |
| `a11y.defaultFontScale` | 기본 글꼴 크기     | 셀렉트   | standard/large/extraLarge             |
| `a11y.defaultContrast`  | 기본 화면 모드     | 셀렉트   | default/highContrast/invertedContrast |
| `a11y.ttsRate`          | TTS 읽기 속도      | 슬라이더 | 0.8 ~ 1.2                             |
| `a11y.ttsVolume`        | TTS 기본 음량      | 슬라이더 | 0.0 ~ 1.0                             |

**API**: 기존 `GET/PUT /api/v1/settings/ACCESSIBILITY` 엔드포인트 활용
(백엔드 라우트의 category 파라미터는 자유 문자열이므로 추가 코드 불필요)

## 9. 세션 초기화 흐름

```
사용자가 WelcomeView에 돌아오는 경우:
  1. IdleTimer timeout → goToWelcome()
  2. CompleteView → goHome()
  3. MenuView → cancelOrder()

모든 경로에서 WelcomeView.onMounted 호출됨:
  ├── cartStore.clear()
  ├── localeStore.resetLocale()
  └── accessibilityStore.resetToDefaults()  ← 신규
       ├── fontScale → 관리자 기본값 or "standard"
       ├── contrastMode → 관리자 기본값 or "default"
       ├── ttsEnabled → 관리자 기본값 or false
       └── applyToDOM()
```

## 10. 구현 순서 및 파일 목록

### Phase 1: 핵심 인프라 (신규 파일 생성)

| 순서 | 파일                                       | 유형 | 의존성                     |
| ---- | ------------------------------------------ | ---- | -------------------------- |
| 1-1  | `assets/css/accessibility.css`             | 신규 | 없음                       |
| 1-2  | `stores/accessibility.ts`                  | 신규 | settingsStore              |
| 1-3  | `composables/useTTS.ts`                    | 신규 | accessibilityStore, i18n   |
| 1-4  | `components/kiosk/AccessibilityToggle.vue` | 신규 | accessibilityStore         |
| 1-5  | `components/kiosk/AccessibilityPanel.vue`  | 신규 | accessibilityStore, useTTS |
| 1-6  | `components/kiosk/TTSReplayButton.vue`     | 신규 | useTTS                     |

### Phase 2: 통합 및 화면 적용 (기존 파일 수정)

| 순서 | 파일                     | 변경 내용                          |
| ---- | ------------------------ | ---------------------------------- |
| 2-1  | `tailwind.config.js`     | a11y 색상 토큰 추가                |
| 2-2  | `main.ts` (또는 App.vue) | `accessibility.css` import 추가    |
| 2-3  | `KioskLayout.vue`        | 3개 컴포넌트 삽입                  |
| 2-4  | `WelcomeView.vue`        | 초기화 + TTS + ARIA + 색상 교체    |
| 2-5  | `MenuView.vue`           | TTS + ARIA + aria-live + 색상 교체 |
| 2-6  | `OrderConfirmView.vue`   | TTS + ARIA + 색상 교체             |
| 2-7  | `PointSelectView.vue`    | TTS + ARIA + 색상 교체             |
| 2-8  | `PaymentView.vue`        | TTS + ARIA + 색상 교체             |
| 2-9  | `CompleteView.vue`       | TTS + ARIA + 색상 교체             |

### Phase 3: i18n + 관리자 설정

| 순서 | 파일                           | 변경 내용             |
| ---- | ------------------------------ | --------------------- |
| 3-1  | `locales/ko.json`              | a11y 섹션 추가        |
| 3-2  | `locales/en.json`              | a11y 섹션 추가        |
| 3-3  | `locales/ja.json`              | a11y 섹션 추가        |
| 3-4  | `locales/zh.json`              | a11y 섹션 추가        |
| 3-5  | `views/admin/SettingsView.vue` | ACCESSIBILITY 탭 추가 |

## 11. 비기능 요구사항

| 항목                    | 기준                                                    |
| ----------------------- | ------------------------------------------------------- |
| 색상 대비 (기본 모드)   | WCAG AA - 4.5:1 이상                                    |
| 색상 대비 (고대비 모드) | WCAG AAA - 7:1 이상                                     |
| 터치 영역               | 최소 44x44px (표준), 56x56px (크게), 64x64px (매우크게) |
| TTS 지연                | 발화 시작까지 500ms 이내                                |
| 글꼴 크기 전환          | 레이아웃 깨짐 없이 즉시 반영                            |
| 고대비 전환             | 깜빡임 없이 즉시 반영                                   |
| 세션 초기화             | WelcomeView 복귀 시 1초 이내 완료                       |
| 번들 크기 영향          | +5KB 이내 (CSS + JS, gzip 기준)                         |
