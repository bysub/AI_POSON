import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAccessibilityStore } from "@/stores/accessibility";

export type STTStatus = "idle" | "listening" | "processing" | "error";

const LANG_MAP: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

// ── Module-level singleton state (모든 useSTT() 호출이 동일 refs 공유) ──
const status = ref<STTStatus>("idle");
const transcript = ref("");
const interimTranscript = ref("");
const confidence = ref(0);
const errorMessage = ref("");
const isDaemonReady = ref(false);
const sttAvailable = ref(false);
const sttError = ref<string | null>(null);

const isListening = computed(() => status.value === "listening");
const isSupported = computed(() => !!window.api);

// 데몬 준비 상태 주기적 확인 (lazy 초기화 — 첫 useSTT() 호출 시 시작)
let readyCheckTimer: ReturnType<typeof setInterval> | null = null;
let readyCheckCount = 0;
let pollingStarted = false;
const MAX_READY_CHECKS = 90; // 최대 3분 (2초 간격 × 90회)

function stopPolling(): void {
  if (readyCheckTimer) {
    clearInterval(readyCheckTimer);
    readyCheckTimer = null;
  }
}

async function checkDaemonReady(): Promise<void> {
  if (!window.api?.stt) return;
  readyCheckCount++;

  try {
    const result = await window.api.stt.isAvailable();
    if (!result || typeof result !== "object") return;

    sttAvailable.value = result.available;
    sttError.value = result.error ?? null;

    if (result.ready) {
      isDaemonReady.value = true;
      stopPolling();
      console.log(`[STT] Daemon ready (python: ${result.python})`);
    } else if (!result.available || readyCheckCount >= MAX_READY_CHECKS) {
      stopPolling();
      if (!result.available) {
        console.warn(`[STT] STT 사용 불가: ${result.error ?? "unknown"}`);
      } else {
        console.warn("[STT] Daemon 준비 대기 시간 초과");
      }
    }
  } catch {
    // 무시 — 데몬이 아직 시작 안됨
  }
}

function startPolling(): void {
  if (pollingStarted || isDaemonReady.value) return;
  pollingStarted = true;
  readyCheckCount = 0;
  checkDaemonReady();
  readyCheckTimer = setInterval(checkDaemonReady, 2000);
}

export function useSTT() {
  const { locale } = useI18n();
  const a11yStore = useAccessibilityStore();

  // Lazy 초기화: 첫 useSTT() 호출 시 데몬 폴링 시작
  startPolling();

  const currentLang = computed(() => LANG_MAP[locale.value] ?? "ko-KR");

  async function start(vocabulary?: string[]): Promise<boolean> {
    if (!window.api?.stt) {
      console.warn("[STT] Native STT API를 사용할 수 없습니다");
      errorMessage.value = "Speech recognition not available";
      return false;
    }
    if (isListening.value) return false;

    status.value = "listening";
    transcript.value = "";
    interimTranscript.value = "";
    errorMessage.value = "";

    const timeout = parseInt(a11yStore.voiceTimeout ?? "10", 10);
    console.log(
      `[STT] Windows 네이티브 인식 시작 (lang: ${currentLang.value}, timeout: ${timeout}s, vocab: ${vocabulary?.length ?? 0}개)`,
    );

    try {
      const result = await window.api.stt.recognize(currentLang.value, timeout, vocabulary);

      if (result.success && result.transcript) {
        console.log(
          `[STT] 인식 결과: "${result.transcript}" (신뢰도: ${((result.confidence ?? 0) * 100).toFixed(0)}%)`,
        );
        transcript.value = result.transcript.trim();
        confidence.value = result.confidence ?? 0.8;
        status.value = "processing";
      } else if (result.error === "cancelled") {
        console.log("[STT] 사용자에 의해 취소됨");
        status.value = "idle";
      } else if (result.error === "no_speech") {
        console.log("[STT] 음성이 감지되지 않음");
        errorMessage.value = "음성이 감지되지 않았습니다";
        status.value = "idle";
      } else {
        console.error("[STT] 오류:", result.error);
        errorMessage.value = result.error ?? "인식 실패";
        status.value = "error";
      }
    } catch (e) {
      console.error("[STT] IPC 호출 실패:", e);
      errorMessage.value = "음성 인식 서비스 오류";
      status.value = "error";
    }

    return status.value === "processing";
  }

  function stop() {
    window.api?.stt?.stop();
    if (status.value === "listening") {
      status.value = "idle";
    }
  }

  function reset() {
    stop();
    transcript.value = "";
    interimTranscript.value = "";
    confidence.value = 0;
    errorMessage.value = "";
    status.value = "idle";
  }

  /** 폴링 타이머 정리 (컴포넌트 unmount 시 호출) */
  function destroy() {
    stop();
    stopPolling();
    pollingStarted = false;
  }

  return {
    status,
    transcript,
    interimTranscript,
    confidence,
    errorMessage,
    isListening,
    isSupported,
    isDaemonReady,
    sttAvailable,
    sttError,
    currentLang,
    start,
    stop,
    reset,
    destroy,
  };
}
