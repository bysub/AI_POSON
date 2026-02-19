import { ref } from "vue";

// ============ Hangul Tables ============
const CHO = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
const JUNG = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
];
const JONG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const VOWELS = new Set([
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅛ",
  "ㅜ",
  "ㅠ",
  "ㅡ",
  "ㅣ",
]);

// 자음 → 종성 인덱스 (ㄸ,ㅃ,ㅉ 은 종성 불가)
const CON_TO_JONG: Record<string, number> = {
  ㄱ: 1,
  ㄲ: 2,
  ㄴ: 4,
  ㄷ: 7,
  ㄹ: 8,
  ㅁ: 16,
  ㅂ: 17,
  ㅅ: 19,
  ㅆ: 20,
  ㅇ: 21,
  ㅈ: 22,
  ㅊ: 23,
  ㅋ: 24,
  ㅌ: 25,
  ㅍ: 26,
  ㅎ: 27,
};

// 복합 중성: 현재 중성 인덱스 + 모음 → 새 중성 인덱스
const COMPOUND_JUNG: Record<number, Record<string, number>> = {
  8: { ㅏ: 9, ㅐ: 10, ㅣ: 11 }, // ㅗ+ㅏ→ㅘ, ㅗ+ㅐ→ㅙ, ㅗ+ㅣ→ㅚ
  13: { ㅓ: 14, ㅔ: 15, ㅣ: 16 }, // ㅜ+ㅓ→ㅝ, ㅜ+ㅔ→ㅞ, ㅜ+ㅣ→ㅟ
  18: { ㅣ: 19 }, // ㅡ+ㅣ→ㅢ
};

// 복합 종성: 현재 종성 인덱스 + 자음 → 새 종성 인덱스
const COMPOUND_JONG: Record<number, Record<string, number>> = {
  1: { ㅅ: 3 }, // ㄱ+ㅅ→ㄳ
  4: { ㅈ: 5, ㅎ: 6 }, // ㄴ+ㅈ→ㄵ, ㄴ+ㅎ→ㄶ
  8: { ㄱ: 9, ㅁ: 10, ㅂ: 11, ㅅ: 12, ㅌ: 13, ㅍ: 14, ㅎ: 15 }, // ㄹ+...
  17: { ㅅ: 18 }, // ㅂ+ㅅ→ㅄ
};

// 종성 분리: 복합 종성 → [남는 종성 인덱스, 새 초성 문자]
const JONG_SPLIT: Record<number, [number, string]> = {
  3: [1, "ㅅ"],
  5: [4, "ㅈ"],
  6: [4, "ㅎ"],
  9: [8, "ㄱ"],
  10: [8, "ㅁ"],
  11: [8, "ㅂ"],
  12: [8, "ㅅ"],
  13: [8, "ㅌ"],
  14: [8, "ㅍ"],
  15: [8, "ㅎ"],
  18: [17, "ㅅ"],
};

// 복합 중성/종성 → 기본형 (백스페이스용)
const JUNG_BASE: Record<number, number> = {
  9: 8,
  10: 8,
  11: 8,
  14: 13,
  15: 13,
  16: 13,
  19: 18,
};
const JONG_BASE: Record<number, number> = {
  3: 1,
  5: 4,
  6: 4,
  9: 8,
  10: 8,
  11: 8,
  12: 8,
  13: 8,
  14: 8,
  15: 8,
  18: 17,
};

function compose(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(0xac00 + cho * 21 * 28 + jung * 28 + jong);
}

// ============ HangulComposer ============
class HangulComposer {
  private cho = -1;
  private jung = -1;
  private jong = -1;

  get isActive(): boolean {
    return this.cho >= 0;
  }

  processJamo(jamo: string): { committed: string; composing: string } {
    const isVowel = VOWELS.has(jamo);

    // 상태: 조합 없음
    if (this.cho === -1) {
      if (!isVowel) {
        this.cho = CHO.indexOf(jamo);
        return { committed: "", composing: jamo };
      }
      return { committed: jamo, composing: "" };
    }

    // 상태: 초성만
    if (this.jung === -1) {
      if (isVowel) {
        this.jung = JUNG.indexOf(jamo);
        return { committed: "", composing: compose(this.cho, this.jung, 0) };
      }
      const prev = CHO[this.cho];
      this.cho = CHO.indexOf(jamo);
      return { committed: prev, composing: jamo };
    }

    // 상태: 초성+중성
    if (this.jong === -1) {
      if (!isVowel) {
        const jongIdx = CON_TO_JONG[jamo];
        if (jongIdx !== undefined) {
          this.jong = jongIdx;
          return { committed: "", composing: compose(this.cho, this.jung, this.jong) };
        }
        // ㄸ,ㅃ,ㅉ → 종성 불가, 확정 후 새 초성
        const committed = compose(this.cho, this.jung, 0);
        this.cho = CHO.indexOf(jamo);
        this.jung = -1;
        return { committed, composing: jamo };
      }
      // 복합 중성 시도
      const cj = COMPOUND_JUNG[this.jung]?.[jamo];
      if (cj !== undefined) {
        this.jung = cj;
        return { committed: "", composing: compose(this.cho, this.jung, 0) };
      }
      // 확정 후 모음 직접 출력
      const committed = compose(this.cho, this.jung, 0);
      this.reset();
      return { committed: committed + jamo, composing: "" };
    }

    // 상태: 초성+중성+종성
    if (!isVowel) {
      // 복합 종성 시도
      const cj = COMPOUND_JONG[this.jong]?.[jamo];
      if (cj !== undefined) {
        this.jong = cj;
        return { committed: "", composing: compose(this.cho, this.jung, this.jong) };
      }
      // 확정 후 새 초성
      const committed = compose(this.cho, this.jung, this.jong);
      this.cho = CHO.indexOf(jamo);
      this.jung = -1;
      this.jong = -1;
      return { committed, composing: jamo };
    }

    // 모음 입력 → 종성 분리
    const split = JONG_SPLIT[this.jong];
    let remainJong: number;
    let newCho: string;
    if (split) {
      [remainJong, newCho] = split;
    } else {
      remainJong = 0;
      newCho = JONG[this.jong];
    }
    const committed = compose(this.cho, this.jung, remainJong);
    this.cho = CHO.indexOf(newCho);
    this.jung = JUNG.indexOf(jamo);
    this.jong = -1;
    return { committed, composing: compose(this.cho, this.jung, 0) };
  }

  /** 백스페이스: 조합 단계를 1단계 되돌림. null이면 조합 해제됨 */
  backspace(): string | null {
    if (this.cho === -1) return null;

    if (this.jong >= 0) {
      const base = JONG_BASE[this.jong];
      this.jong = base !== undefined ? base : -1;
      return this.jong >= 0
        ? compose(this.cho, this.jung, this.jong)
        : compose(this.cho, this.jung, 0);
    }

    if (this.jung >= 0) {
      const base = JUNG_BASE[this.jung];
      if (base !== undefined) {
        this.jung = base;
        return compose(this.cho, this.jung, 0);
      }
      this.jung = -1;
      return CHO[this.cho];
    }

    this.cho = -1;
    return null;
  }

  flush(): string {
    if (this.cho === -1) return "";
    const result =
      this.jung >= 0 ? compose(this.cho, this.jung, this.jong >= 0 ? this.jong : 0) : CHO[this.cho];
    this.reset();
    return result;
  }

  reset(): void {
    this.cho = -1;
    this.jung = -1;
    this.jong = -1;
  }
}

// ============ Singleton State ============
const isVisible = ref(false);
const keyboardType = ref<"number" | "full">("number");
const inputMode = ref<"ko" | "en">("ko");
const isShift = ref(false);
const keyboardHeight = ref(0);
const contentShift = ref(0);
const targetEl = ref<HTMLInputElement | null>(null);

const composer = new HangulComposer();
let composingActive = false;
let initialized = false;

// ============ Internal Helpers ============
function isEligibleInput(el: EventTarget | null): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) return false;
  if (el.dataset.keyboard === "none") return false;
  if (["checkbox", "radio", "hidden", "file", "range"].includes(el.type)) return false;
  return true;
}

function determineType(el: HTMLInputElement): "number" | "full" {
  if (el.dataset.keyboard === "number") return "number";
  if (el.dataset.keyboard === "full") return "full";
  if (el.type === "tel" || el.type === "number") return "number";
  return "full";
}

function syncToInput(committed: string, composingChar: string): void {
  const el = targetEl.value;
  if (!el) return;

  let base = el.value;
  if (composingActive && base.length > 0) {
    base = base.slice(0, -1);
  }

  const newValue = base + committed + composingChar;

  // maxlength 체크
  if (el.maxLength > 0 && newValue.length > el.maxLength) return;

  el.value = newValue;
  composingActive = composingChar.length > 0;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function flushComposition(): void {
  if (!composingActive || !targetEl.value) {
    composer.reset();
    composingActive = false;
    return;
  }
  // 조합 중인 문자는 이미 input에 들어있으므로 상태만 리셋
  composer.reset();
  composingActive = false;
}

// ============ Event Handlers ============
function updateKeyboardHeight(): void {
  requestAnimationFrame(() => {
    const kbd = document.querySelector("[data-virtual-keyboard]") as HTMLElement | null;
    const kbdH = kbd ? kbd.offsetHeight : 0;
    keyboardHeight.value = kbdH;

    // input이 키보드에 가려질 때만 최소한의 이동량 계산
    if (kbdH > 0 && targetEl.value) {
      const inputRect = targetEl.value.getBoundingClientRect();
      const keyboardTop = window.innerHeight - kbdH;
      const padding = 24;
      if (inputRect.bottom + padding > keyboardTop) {
        contentShift.value = inputRect.bottom + padding - keyboardTop;
      } else {
        contentShift.value = 0;
      }
    } else {
      contentShift.value = 0;
    }
  });
}

function onFocusIn(e: FocusEvent): void {
  if (!isEligibleInput(e.target)) return;

  const el = e.target;
  if (targetEl.value && targetEl.value !== el) {
    flushComposition();
  }

  targetEl.value = el;
  keyboardType.value = determineType(el);
  isVisible.value = true;
  isShift.value = false;

  // 풀 키보드 기본은 한글, 숫자 키보드에서는 리셋
  if (keyboardType.value === "full") {
    inputMode.value = "ko";
  }

  // 키보드 높이 측정 (레이아웃에서 콘텐츠 올림용)
  updateKeyboardHeight();
}

function onDocumentClick(e: MouseEvent): void {
  if (!isVisible.value) return;
  const el = e.target as HTMLElement;
  if (el.closest("[data-virtual-keyboard]")) return;
  if (isEligibleInput(el)) return;
  // 터치 기기에서 키보드 표시로 인한 콘텐츠 이동(translateY) 때문에
  // click 타겟이 input이 아닌 다른 요소로 잡힐 수 있음.
  // input이 여전히 포커스 상태이면 키보드를 숨기지 않음.
  if (isEligibleInput(document.activeElement)) return;
  flushComposition();
  isVisible.value = false;
  keyboardHeight.value = 0;
  contentShift.value = 0;
  targetEl.value = null;
}

// ============ Public API ============
function init(): void {
  if (initialized) return;
  initialized = true;
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("click", onDocumentClick);
}

function destroy(): void {
  if (!initialized) return;
  initialized = false;
  document.removeEventListener("focusin", onFocusIn);
  document.removeEventListener("click", onDocumentClick);
  flushComposition();
  isVisible.value = false;
  keyboardHeight.value = 0;
  contentShift.value = 0;
  targetEl.value = null;
}

function hide(): void {
  flushComposition();
  isVisible.value = false;
  keyboardHeight.value = 0;
  contentShift.value = 0;
  targetEl.value = null;
}

function handleKey(key: string): void {
  if (!targetEl.value) return;

  if (keyboardType.value === "number") {
    // 숫자 키보드: 직접 삽입
    const el = targetEl.value;
    if (el.maxLength > 0 && el.value.length >= el.maxLength) return;
    el.value += key;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // 풀 키보드
  if (inputMode.value === "en") {
    // 영문: 직접 삽입
    flushComposition();
    const ch = isShift.value ? key.toUpperCase() : key.toLowerCase();
    const el = targetEl.value;
    if (el.maxLength > 0 && el.value.length >= el.maxLength) return;
    el.value += ch;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (isShift.value) isShift.value = false;
    return;
  }

  // 한글 조합
  const jamo = key;
  const result = composer.processJamo(jamo);
  syncToInput(result.committed, result.composing);
  if (isShift.value) isShift.value = false;
}

function handleBackspace(): void {
  const el = targetEl.value;
  if (!el) return;

  if (inputMode.value === "ko" && composer.isActive) {
    const result = composer.backspace();
    if (result !== null) {
      // 조합 문자 교체
      let base = el.value;
      if (composingActive && base.length > 0) {
        base = base.slice(0, -1);
      }
      el.value = base + result;
      composingActive = true;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // 조합 해제 - 조합 문자 제거
      if (composingActive && el.value.length > 0) {
        el.value = el.value.slice(0, -1);
        composingActive = false;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    return;
  }

  // 일반 백스페이스
  if (el.value.length > 0) {
    el.value = el.value.slice(0, -1);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function handleSpace(): void {
  if (!targetEl.value) return;
  flushComposition();
  const el = targetEl.value;
  if (el.maxLength > 0 && el.value.length >= el.maxLength) return;
  el.value += " ";
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleConfirm(): void {
  flushComposition();
  const el = targetEl.value;
  isVisible.value = false;
  keyboardHeight.value = 0;
  contentShift.value = 0;
  targetEl.value = null;
  el?.blur();
}

function toggleLanguage(): void {
  flushComposition();
  inputMode.value = inputMode.value === "ko" ? "en" : "ko";
  isShift.value = false;
}

function toggleShift(): void {
  isShift.value = !isShift.value;
}

// ============ Export ============
export function useVirtualKeyboard() {
  return {
    // State
    isVisible,
    keyboardType,
    inputMode,
    isShift,
    keyboardHeight,
    contentShift,
    // Actions
    init,
    destroy,
    handleKey,
    handleBackspace,
    handleSpace,
    handleConfirm,
    toggleLanguage,
    toggleShift,
    hide,
  };
}
