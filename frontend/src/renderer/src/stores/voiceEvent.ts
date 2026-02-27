import { defineStore } from "pinia";
import { ref } from "vue";

export const useVoiceEventStore = defineStore("voiceEvent", () => {
  const paymentMethod = ref<{ method: string; ts: number } | null>(null);
  const orderType = ref<{ type: string; ts: number } | null>(null);
  const pointAction = ref<{ action: string; ts: number } | null>(null);

  function emitPaymentMethod(method: string) {
    paymentMethod.value = { method, ts: Date.now() };
  }

  function emitOrderType(type: string) {
    orderType.value = { type, ts: Date.now() };
  }

  function emitPointAction(action: string) {
    pointAction.value = { action, ts: Date.now() };
  }

  function $reset() {
    paymentMethod.value = null;
    orderType.value = null;
    pointAction.value = null;
  }

  return {
    paymentMethod,
    orderType,
    pointAction,
    emitPaymentMethod,
    emitOrderType,
    emitPointAction,
    $reset,
  };
});
