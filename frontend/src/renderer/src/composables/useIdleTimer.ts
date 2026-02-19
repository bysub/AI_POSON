import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCartStore } from "@/stores/cart";
import { useLocaleStore } from "@/stores/locale";

const WARNING_SECONDS = 10;
const IDLE_EVENTS = ["touchstart", "mousedown", "mousemove", "keydown", "click", "scroll"];

// 타이머 비활성 라우트 (웰컴, 주문완료는 자체 타이머 보유)
const EXCLUDED_PATHS = ["/", "/complete"];

const showWarning = ref(false);
const remainingSeconds = ref(0);

export function useIdleTimer(timeoutSeconds = 120) {
  const router = useRouter();
  const route = useRoute();
  const cartStore = useCartStore();
  const localeStore = useLocaleStore();

  let warningTimeout: ReturnType<typeof setTimeout> | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let active = false;

  function clearTimers() {
    if (warningTimeout) {
      clearTimeout(warningTimeout);
      warningTimeout = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function resetTimer() {
    if (showWarning.value) {
      showWarning.value = false;
    }
    clearTimers();

    if (!active) return;
    if (EXCLUDED_PATHS.includes(route.path)) return;

    const warningDelay = Math.max(0, timeoutSeconds - WARNING_SECONDS) * 1000;
    warningTimeout = setTimeout(() => {
      showWarning.value = true;
      remainingSeconds.value = WARNING_SECONDS;
      countdownInterval = setInterval(() => {
        remainingSeconds.value--;
        if (remainingSeconds.value <= 0) {
          goToWelcome();
        }
      }, 1000);
    }, warningDelay);
  }

  function goToWelcome() {
    clearTimers();
    showWarning.value = false;
    cartStore.clear();
    localeStore.resetLocale();
    router.push("/");
  }

  function start() {
    active = true;
    IDLE_EVENTS.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
  }

  function stop() {
    active = false;
    IDLE_EVENTS.forEach((event) => document.removeEventListener(event, resetTimer));
    clearTimers();
    showWarning.value = false;
  }

  watch(
    () => route.path,
    () => {
      if (active) resetTimer();
    },
  );

  return { showWarning, remainingSeconds, start, stop };
}
