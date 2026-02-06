<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { Product, ProductOption } from "@/types";

const props = defineProps<{
  product: Product | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [product: Product, quantity: number, selectedOptions: Record<string, ProductOption>];
}>();

const { t } = useI18n();

const quantity = ref(1);
const selectedOptions = ref<Record<string, ProductOption>>({});

// 모달이 열릴 때 초기화
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      quantity.value = 1;
      selectedOptions.value = {};

      // 필수 옵션 자동 선택 (첫 번째 옵션)
      if (props.product?.options) {
        props.product.options.forEach((option) => {
          if (option.isRequired) {
            selectedOptions.value[option.name] = option;
          }
        });
      }
    }
  },
);

// 필수 옵션
const requiredOptions = computed(() => props.product?.options?.filter((o) => o.isRequired) || []);

// 선택 옵션
const optionalOptions = computed(() => props.product?.options?.filter((o) => !o.isRequired) || []);

// 옵션 추가 금액
const optionsTotalPrice = computed(() => {
  return Object.values(selectedOptions.value).reduce(
    (sum, option) => sum + Number(option.price),
    0,
  );
});

// 최종 가격 (상품 + 옵션) * 수량
const totalPrice = computed(() => {
  if (!props.product) return 0;
  return (Number(props.product.sellPrice) + optionsTotalPrice.value) * quantity.value;
});

// 필수 옵션이 모두 선택되었는지
const allRequiredSelected = computed(() => {
  if (!props.product?.options) return true;
  return requiredOptions.value.every((option) => selectedOptions.value[option.name]);
});

/**
 * 가격 포맷팅
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR").format(price);
}

/**
 * 수량 증가
 */
function incrementQuantity(): void {
  quantity.value++;
}

/**
 * 수량 감소
 */
function decrementQuantity(): void {
  if (quantity.value > 1) {
    quantity.value--;
  }
}

/**
 * 옵션 선택/해제
 */
function toggleOption(option: ProductOption): void {
  if (selectedOptions.value[option.name]?.id === option.id) {
    // 이미 선택된 옵션이면 해제 (필수 옵션이 아닌 경우에만)
    if (!option.isRequired) {
      delete selectedOptions.value[option.name];
    }
  } else {
    selectedOptions.value[option.name] = option;
  }
}

/**
 * 옵션이 선택되었는지 확인
 */
function isOptionSelected(option: ProductOption): boolean {
  return selectedOptions.value[option.name]?.id === option.id;
}

/**
 * 확인 버튼 클릭
 */
function handleConfirm(): void {
  if (!props.product || !allRequiredSelected.value) return;
  emit("confirm", props.product, quantity.value, selectedOptions.value);
}

/**
 * 배경 클릭 시 닫기
 */
function handleBackdropClick(): void {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen && product"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="handleBackdropClick"
      >
        <div class="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <!-- Header -->
          <header class="relative bg-gray-100 p-6">
            <button
              class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-md hover:bg-gray-100"
              @click="emit('close')"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h2 class="text-kiosk-xl font-bold text-gray-900">
              {{ product.name }}
            </h2>
            <p class="mt-1 text-kiosk-lg text-primary-600">
              {{ formatPrice(product.sellPrice) }}원
            </p>
          </header>

          <!-- Options Content -->
          <div class="max-h-[50vh] overflow-y-auto p-6">
            <!-- Required Options -->
            <div v-if="requiredOptions.length > 0" class="mb-6">
              <h3 class="mb-3 flex items-center gap-2 text-kiosk-base font-bold text-gray-900">
                필수 선택
                <span class="rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">필수</span>
              </h3>
              <div class="space-y-2">
                <button
                  v-for="option in requiredOptions"
                  :key="option.id"
                  class="flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all"
                  :class="
                    isOptionSelected(option)
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  "
                  @click="toggleOption(option)"
                >
                  <span class="text-kiosk-base font-medium">{{ option.name }}</span>
                  <span class="text-kiosk-base text-gray-600">
                    {{ option.price > 0 ? `+${formatPrice(option.price)}원` : "무료" }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Optional Options -->
            <div v-if="optionalOptions.length > 0">
              <h3 class="mb-3 text-kiosk-base font-bold text-gray-900">추가 선택</h3>
              <div class="space-y-2">
                <button
                  v-for="option in optionalOptions"
                  :key="option.id"
                  class="flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all"
                  :class="
                    isOptionSelected(option)
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  "
                  @click="toggleOption(option)"
                >
                  <span class="text-kiosk-base font-medium">{{ option.name }}</span>
                  <span class="text-kiosk-base text-gray-600">
                    {{ option.price > 0 ? `+${formatPrice(option.price)}원` : "무료" }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <footer class="border-t border-gray-200 bg-gray-50 p-6">
            <!-- Quantity -->
            <div class="mb-4 flex items-center justify-center gap-4">
              <button
                class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold transition-colors hover:bg-gray-300"
                :disabled="quantity <= 1"
                @click="decrementQuantity"
              >
                -
              </button>
              <span class="w-16 text-center text-kiosk-xl font-bold">{{ quantity }}</span>
              <button
                class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white transition-colors hover:bg-primary-700"
                @click="incrementQuantity"
              >
                +
              </button>
            </div>

            <!-- Total & Confirm -->
            <button
              class="btn-kiosk-primary w-full py-4 text-kiosk-lg"
              :disabled="!allRequiredSelected"
              @click="handleConfirm"
            >
              {{ formatPrice(totalPrice) }}원 담기
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}
</style>
