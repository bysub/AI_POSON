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
const value = ref( props.format === "phone" ? "010":"" );

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
  console.log( "화면오픈시?" + props.format )
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
      class="w-full rounded-xl border-2 px-4 py-3 text-center text-2xl font-bold tracking-wider"
      style="border-color: var(--theme-border, #e2e8f0); background: var(--theme-bg-secondary, #fffbeb); color: var(--theme-text, #1e293b)"
    >
      {{ displayValue || placeholder }}
    </div>

    <!-- Keypad -->
    <div class="grid w-full grid-cols-3 gap-2">
      <button
        v-for="n in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="n"
        class="flex h-14 items-center justify-center rounded-xl text-xl font-bold transition-colors"
        style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
        @click="pressKey(n)"
      >
        {{ n }}
      </button>

      <!-- Bottom row -->
      <button
        class="flex h-14 items-center justify-center rounded-xl transition-colors"
        style="background: var(--theme-bg-secondary, #e5e7eb); color: var(--theme-text-secondary, #64748b)"
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
        class="flex h-14 items-center justify-center rounded-xl text-xl font-bold transition-colors"
        style="background: var(--theme-primary, #ef4444); color: var(--theme-primary-text, #fff)"
        @click="pressKey('0')"
      >
        0
      </button>
      <button
        class="flex h-14 items-center justify-center rounded-xl text-sm font-bold transition-colors"
        style="background: var(--theme-bg-secondary, #e5e7eb); color: var(--theme-text-secondary, #64748b)"
        @click="clearAll"
      >
        {{ t("numberPad.clear") }}
      </button>
    </div>

    <!-- Confirm button -->
    <button
      class="w-full rounded-xl py-3 text-lg font-bold transition-colors disabled:opacity-40"
      style="background: var(--theme-accent, #f59e0b); color: var(--theme-primary-text, #fff)"
      :disabled="value.length === 0"
      @click="confirm"
    >
      {{ t("numberPad.confirm") }}
    </button>
  </div>
</template>
