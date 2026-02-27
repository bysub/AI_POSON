import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useSettingsStore } from "./settings";

export type FontScale = "standard" | "large" | "extraLarge";
export type ContrastMode = "default" | "highContrast" | "invertedContrast";
export type A11yPreset = "default" | "senior" | "lowVision";

export interface PresetConfig {
  fontScale: FontScale;
  contrastMode: ContrastMode;
  ttsEnabled: boolean;
}

export const A11Y_PRESETS: Record<A11yPreset, PresetConfig> = {
  default: { fontScale: "standard", contrastMode: "default", ttsEnabled: false },
  senior: { fontScale: "large", contrastMode: "default", ttsEnabled: true },
  lowVision: { fontScale: "extraLarge", contrastMode: "highContrast", ttsEnabled: true },
};

const FONT_SIZE_MAP: Record<FontScale, string> = {
  standard: "16px",
  large: "20px",
  extraLarge: "24px",
};

export const useAccessibilityStore = defineStore("accessibility", () => {
  const settingsStore = useSettingsStore();

  // === State ===
  const isEnabled = ref(false);
  const showPanel = ref(false);
  const fontScale = ref<FontScale>("standard");
  const contrastMode = ref<ContrastMode>("default");
  const ttsEnabled = ref(false);
  const ttsRate = ref(0.9);
  const ttsVolume = ref(1.0);
  const voiceEnabled = ref(false);
  const voiceTimeout = ref("10");
  const voiceConfidence = ref("0.4");

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
    const enabled = settingsStore.get("a11y.enabled", "1");
    isEnabled.value = enabled === "1";
    ttsRate.value = parseFloat(settingsStore.get("a11y.ttsRate", "0.9"));
    ttsVolume.value = parseFloat(settingsStore.get("a11y.ttsVolume", "1.0"));

    const defaultFont = settingsStore.get("a11y.defaultFontScale", "standard");
    if (defaultFont) fontScale.value = defaultFont as FontScale;
    const defaultContrast = settingsStore.get("a11y.defaultContrast", "default");
    if (defaultContrast) contrastMode.value = defaultContrast as ContrastMode;
    const defaultTts = settingsStore.get("a11y.ttsEnabled", "1");
    ttsEnabled.value = defaultTts === "1";

    voiceEnabled.value = settingsStore.get("a11y.voiceEnabled", "0") === "1";
    voiceTimeout.value = settingsStore.get("a11y.voiceTimeout", "10");
    voiceConfidence.value = settingsStore.get("a11y.voiceConfidence", "0.4");

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

  function applyPreset(preset: A11yPreset) {
    const config = A11Y_PRESETS[preset];
    fontScale.value = config.fontScale;
    contrastMode.value = config.contrastMode;
    ttsEnabled.value = config.ttsEnabled;
    applyToDOM();
  }

  function resetToDefaults() {
    const autoReset = settingsStore.getDevice("a11y.autoReset", "1");
    if (autoReset === "1") {
      fontScale.value =
        (settingsStore.get("a11y.defaultFontScale", "standard") as FontScale) || "standard";
      contrastMode.value =
        (settingsStore.get("a11y.defaultContrast", "default") as ContrastMode) || "default";
      ttsEnabled.value = settingsStore.get("a11y.ttsEnabled", "1") === "1";
      voiceEnabled.value = settingsStore.get("a11y.voiceEnabled", "0") === "1";
      showPanel.value = false;
      applyToDOM();
    }
  }

  function applyToDOM() {
    const root = document.documentElement;

    // 폰트 크기 반영
    root.style.fontSize = FONT_SIZE_MAP[fontScale.value];

    // 대비 모드 + 폰트 클래스 반영
    root.classList.remove(
      "a11y-high-contrast",
      "a11y-inverted-contrast",
      "a11y-font-large",
      "a11y-font-xl",
    );
    htmlClasses.value.forEach((cls) => root.classList.add(cls));
  }

  watch([fontScale, contrastMode], () => applyToDOM());

  return {
    isEnabled,
    showPanel,
    fontScale,
    contrastMode,
    ttsEnabled,
    ttsRate,
    ttsVolume,
    voiceEnabled,
    voiceTimeout,
    voiceConfidence,
    isHighContrast,
    htmlClasses,
    initialize,
    setFontScale,
    setContrastMode,
    toggleTTS,
    openPanel,
    closePanel,
    applyPreset,
    resetToDefaults,
    applyToDOM,
  };
});
