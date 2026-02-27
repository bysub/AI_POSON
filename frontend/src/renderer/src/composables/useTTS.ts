import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAccessibilityStore } from "@/stores/accessibility";

const lastUtterance = ref("");
const isSpeaking = ref(false);

/** 한글 포함 여부 판별 */
const HAS_KOREAN = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

let cancelToken = 0;

/** 사용 가능한 TTS 음성 캐시 (onvoiceschanged 시 갱신) */
let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices() {
  voicesCache = window.speechSynthesis?.getVoices() ?? [];
}

// 음성 목록은 비동기 로드 - 초기화 및 변경 시 캐시 갱신
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/** 지정 언어에 대한 TTS 음성이 시스템에 설치되어 있는지 확인 */
function hasVoiceFor(lang: string): boolean {
  if (voicesCache.length === 0) loadVoices();
  const prefix = lang.split("-")[0];
  return voicesCache.some((v) => v.lang === lang || v.lang.startsWith(prefix));
}

/**
 * 텍스트를 한국어/비한국어 세그먼트로 분할
 * "불고기 버거を1点" → [{text:"불고기 버거", lang:"ko-KR"}, {text:"を1点", lang:"ja-JP"}]
 */
function splitByKorean(
  text: string,
  targetLang: string,
): { text: string; lang: string }[] {
  const segments: { text: string; lang: string }[] = [];
  const re = /([가-힣ㄱ-ㅎㅏ-ㅣ](?:[가-힣ㄱ-ㅎㅏ-ㅣ\s\d]*[가-힣ㄱ-ㅎㅏ-ㅣ])?)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before) segments.push({ text: before, lang: targetLang });
    }
    segments.push({ text: match[0], lang: "ko-KR" });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), lang: targetLang });
  }

  return segments;
}

export function useTTS() {
  const { locale, t } = useI18n();
  const a11yStore = useAccessibilityStore();

  const LANG_MAP: Record<string, string> = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    zh: "zh-CN",
  };

  /**
   * TTS 발화.
   * - fallbackKey/fallbackParams: 대상 언어 음성이 없을 때 한국어로 대체할 i18n 키와 파라미터
   */
  function speak(
    text: string,
    options?: {
      force?: boolean;
      fallbackKey?: string;
      fallbackParams?: Record<string, unknown>;
      fallbackText?: string;
    },
  ) {
    if (!a11yStore.ttsEnabled && !options?.force) return;
    if (!text.trim()) return;
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    lastUtterance.value = text;

    const token = ++cancelToken;

    setTimeout(() => {
      if (token !== cancelToken) return;

      let targetLang = LANG_MAP[locale.value] ?? "ko-KR";
      let speakText = text;

      // 대상 언어 음성이 시스템에 없고, 한국어 fallback이 제공된 경우에만 대체
      if (targetLang !== "ko-KR" && !hasVoiceFor(targetLang)) {
        console.warn(
          `[TTS] ${targetLang} 음성이 설치되지 않았습니다. ` +
          `Windows 설정 → 시간 및 언어 → 음성에서 해당 언어를 추가하세요.`,
        );
        if (options?.fallbackKey) {
          speakText = t(options.fallbackKey, options.fallbackParams ?? {}, { locale: "ko" });
          targetLang = "ko-KR";
        } else if (options?.fallbackText) {
          speakText = options.fallbackText;
          targetLang = "ko-KR";
        }
        // fallback 미제공 시 원본 텍스트+언어 유지 (Chromium 기본 동작에 맡김)
      }

      // 비한국어 로케일에서 한글이 섞여있으면 분할 발화
      // 단, 한국어 음성이 시스템에 없으면 전체를 한국어 fallback으로 전환 (무음 방지)
      if (targetLang !== "ko-KR" && HAS_KOREAN.test(speakText) && !hasVoiceFor("ko-KR")) {
        // 한국어 음성이 없으면 대상 언어로 통째로 발화 (한글이 깨질 수 있지만 무음보다 나음)
        // fallback이 있으면 한국어 텍스트로 대체
        if (options?.fallbackKey) {
          speakText = t(options.fallbackKey, options.fallbackParams ?? {}, { locale: "ko" });
        } else if (options?.fallbackText) {
          speakText = options.fallbackText;
        }
        // 한국어 fallback 텍스트로 변경 시 targetLang도 ko-KR로 (Chromium 기본 동작에 맡김)
      }

      if (targetLang !== "ko-KR" && HAS_KOREAN.test(speakText) && hasVoiceFor("ko-KR")) {
        const segments = splitByKorean(speakText, targetLang);
        let idx = 0;

        const speakNext = () => {
          if (token !== cancelToken) return;
          if (idx >= segments.length) {
            isSpeaking.value = false;
            return;
          }
          const seg = segments[idx++];
          const utt = new SpeechSynthesisUtterance(seg.text);
          utt.lang = seg.lang;
          utt.rate = a11yStore.ttsRate;
          utt.volume = a11yStore.ttsVolume;
          utt.onstart = () => { isSpeaking.value = true; };
          utt.onend = speakNext;
          // 한글 세그먼트 에러 시 대상 언어로 재시도 (무음 스킵 방지)
          utt.onerror = () => {
            if (seg.lang === "ko-KR") {
              console.warn(`[TTS] 한글 세그먼트 발화 실패, ${targetLang}로 재시도: "${seg.text}"`);
              const retry = new SpeechSynthesisUtterance(seg.text);
              retry.lang = targetLang;
              retry.rate = a11yStore.ttsRate;
              retry.volume = a11yStore.ttsVolume;
              retry.onend = speakNext;
              retry.onerror = () => {
                console.warn(`[TTS] 재시도도 실패, 세그먼트 건너뜀: "${seg.text}"`);
                speakNext();
              };
              window.speechSynthesis.speak(retry);
            } else {
              speakNext();
            }
          };
          window.speechSynthesis.speak(utt);
        };

        speakNext();
        return;
      }

      // 단일 언어 발화
      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.lang = targetLang;
      utterance.rate = a11yStore.ttsRate;
      utterance.volume = a11yStore.ttsVolume;

      utterance.onstart = () => { isSpeaking.value = true; };
      utterance.onend = () => { isSpeaking.value = false; };
      utterance.onerror = () => { isSpeaking.value = false; };

      window.speechSynthesis.speak(utterance);
    }, 60);
  }

  function replay() {
    if (lastUtterance.value) {
      speak(lastUtterance.value, { force: true });
    }
  }

  function stop() {
    ++cancelToken;
    window.speechSynthesis?.cancel();
    isSpeaking.value = false;
  }

  return {
    speak,
    replay,
    stop,
    hasVoiceFor,
    getVoices: () => voicesCache,
    lastUtterance,
    isSpeaking,
  };
}
