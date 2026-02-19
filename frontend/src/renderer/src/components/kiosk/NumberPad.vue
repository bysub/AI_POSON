<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    maxLength?: number;
    placeholder?: string;
    format?: "phone" | "number";
  }>(),
  { maxLength: 11, placeholder: "", format: "number" },
);

const emit = defineEmits<{
  confirm: [value: string];
  cancel: [];
}>();

const { t } = useI18n();
const value = ref("010");

const displayValue = computed(() => {
  if (props.format === "phone" && value.value.length > 0) {
    const v = value.value;
    if (v.length <= 3) return v;
    if (v.length <= 7) return `${v.slice(0, 3)}-${v.slice(3)}`;
    return `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7)}`;
  }
  return value.value;
});

function pressKey(key: string) {
  if (value.value.length < props.maxLength) {
    value.value += key;
  }
}

function backspace() {
  value.value = value.value.slice(0, -1);
}

function clearAll() {
  value.value = "";
}

function confirm() {
  if (value.value.length > 0) {
    emit("confirm", value.value);
  }
}
</script>

<template>
  <div class="flex w-80 flex-col items-center gap-4">
    <!-- Display -->
    <div
      class="w-full rounded-xl border-2 border-gray-200 bg-amber-50 px-4 py-3 text-center text-2xl font-bold tracking-wider text-gray-800"
    >
      {{ displayValue || placeholder }}
    </div>

    <!-- Keypad -->
    <div class="grid w-full grid-cols-3 gap-2">
      <button
        v-for="n in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="n"
        class="flex h-14 items-center justify-center rounded-xl bg-red-400 text-xl font-bold text-white transition-colors hover:bg-red-500 active:bg-red-600"
        @click="pressKey(n)"
      >
        {{ n }}
      </button>

      <!-- Bottom row -->
      <button
        class="flex h-14 items-center justify-center rounded-xl bg-gray-200 text-lg font-bold text-gray-600 transition-colors hover:bg-gray-300"
        @click="backspace"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
          />
        </svg>
      </button>
      <button
        class="flex h-14 items-center justify-center rounded-xl bg-red-400 text-xl font-bold text-white transition-colors hover:bg-red-500 active:bg-red-600"
        @click="pressKey('0')"
      >
        0
      </button>
      <button
        class="flex h-14 items-center justify-center rounded-xl bg-gray-200 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300"
        @click="clearAll"
      >
        {{ t("numberPad.clear") }}
      </button>
    </div>

    <!-- Confirm button -->
    <button
      class="w-full rounded-xl bg-amber-400 py-3 text-lg font-bold text-gray-800 transition-colors hover:bg-amber-500 disabled:opacity-40"
      :disabled="value.length === 0"
      @click="confirm"
    >
      {{ t("numberPad.confirm") }}
    </button>
  </div>
</template>
