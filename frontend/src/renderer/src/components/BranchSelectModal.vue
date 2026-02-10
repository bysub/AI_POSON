<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { LBranch, MBranch, SBranch } from "@/types";
import { apiClient } from "@/services/api/client";

const props = defineProps<{
  visible: boolean;
  initialLCode?: string;
  initialMCode?: string;
  initialSCode?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", value: { lCode: string; mCode: string; sCode: string; label: string }): void;
}>();

const largeBranches = ref<LBranch[]>([]);
const mediumBranches = ref<MBranch[]>([]);
const smallBranches = ref<SBranch[]>([]);

const selectedLarge = ref<LBranch | null>(null);
const selectedMedium = ref<MBranch | null>(null);
const selectedSmall = ref<SBranch | null>(null);

const isLoading = ref({ large: false, medium: false, small: false });

const canConfirm = computed(
  () => selectedLarge.value && selectedMedium.value && selectedSmall.value,
);

const selectionLabel = computed(() => {
  if (!selectedLarge.value) return "";
  let label = selectedLarge.value.lName;
  if (selectedMedium.value) {
    label += " > " + selectedMedium.value.mName;
  }
  if (selectedSmall.value) {
    label += " > " + selectedSmall.value.sName;
  }
  return label;
});

const selectionCode = computed(() => {
  const parts: string[] = [];
  if (selectedLarge.value) parts.push(selectedLarge.value.lCode);
  if (selectedMedium.value) parts.push(selectedMedium.value.mCode);
  if (selectedSmall.value) parts.push(selectedSmall.value.sCode);
  return parts.join("-");
});

async function loadLargeBranches(): Promise<void> {
  isLoading.value.large = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: LBranch[] }>(
      "/api/v1/branches/large",
    );
    largeBranches.value = res.data.data;
  } catch {
    console.error("Failed to load large branches");
  } finally {
    isLoading.value.large = false;
  }
}

async function loadMediumBranches(lCode: string): Promise<void> {
  isLoading.value.medium = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: MBranch[] }>(
      `/api/v1/branches/medium?lCode=${lCode}`,
    );
    mediumBranches.value = res.data.data;
  } catch {
    console.error("Failed to load medium branches");
  } finally {
    isLoading.value.medium = false;
  }
}

async function loadSmallBranches(lCode: string, mCode: string): Promise<void> {
  isLoading.value.small = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: SBranch[] }>(
      `/api/v1/branches/small?lCode=${lCode}&mCode=${mCode}`,
    );
    smallBranches.value = res.data.data;
  } catch {
    console.error("Failed to load small branches");
  } finally {
    isLoading.value.small = false;
  }
}

function selectLarge(item: LBranch): void {
  selectedLarge.value = item;
  selectedMedium.value = null;
  selectedSmall.value = null;
  mediumBranches.value = [];
  smallBranches.value = [];
  loadMediumBranches(item.lCode);
}

function selectMedium(item: MBranch): void {
  selectedMedium.value = item;
  selectedSmall.value = null;
  smallBranches.value = [];
  loadSmallBranches(item.lCode, item.mCode);
}

function selectSmall(item: SBranch): void {
  selectedSmall.value = item;
}

function confirm(): void {
  if (!selectedLarge.value || !selectedMedium.value || !selectedSmall.value) return;
  emit("select", {
    lCode: selectedLarge.value.lCode,
    mCode: selectedMedium.value.mCode,
    sCode: selectedSmall.value.sCode,
    label: selectionLabel.value,
  });
}

// visible이 true가 될 때 초기화 및 로드
watch(
  () => props.visible,
  async (val) => {
    if (!val) return;
    selectedLarge.value = null;
    selectedMedium.value = null;
    selectedSmall.value = null;
    mediumBranches.value = [];
    smallBranches.value = [];
    await loadLargeBranches();

    // 기존 값 복원
    if (props.initialLCode) {
      const l = largeBranches.value.find((b) => b.lCode === props.initialLCode);
      if (l) {
        selectedLarge.value = l;
        await loadMediumBranches(l.lCode);
        if (props.initialMCode) {
          const m = mediumBranches.value.find((b) => b.mCode === props.initialMCode);
          if (m) {
            selectedMedium.value = m;
            await loadSmallBranches(m.lCode, m.mCode);
            if (props.initialSCode) {
              const s = smallBranches.value.find((b) => b.sCode === props.initialSCode);
              if (s) {
                selectedSmall.value = s;
              }
            }
          }
        }
      }
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
          <!-- Header -->
          <header
            class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3"
          >
            <h3 class="text-base font-bold text-slate-800">분류 선택</h3>
            <button
              class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          <!-- 3-Panel Body -->
          <div class="grid grid-cols-3 divide-x divide-slate-200" style="height: 320px">
            <!-- 대분류 -->
            <div class="flex min-h-0 flex-col">
              <div class="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >대분류</span
                >
              </div>
              <div class="flex-1 overflow-y-auto">
                <div
                  v-if="isLoading.large"
                  class="flex items-center justify-center py-8 text-sm text-slate-400"
                >
                  불러오는 중...
                </div>
                <div
                  v-else-if="largeBranches.length === 0"
                  class="py-8 text-center text-sm text-slate-400"
                >
                  등록된 대분류가 없습니다.
                </div>
                <div
                  v-for="item in largeBranches"
                  v-else
                  :key="item.lCode"
                  class="flex cursor-pointer items-center gap-2 border-b border-slate-50 px-3 py-1.5 transition-colors hover:bg-slate-50"
                  :class="
                    selectedLarge?.lCode === item.lCode
                      ? 'bg-indigo-50 font-medium text-indigo-700'
                      : ''
                  "
                  @click="selectLarge(item)"
                >
                  <span
                    class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600"
                    >{{ item.lCode }}</span
                  >
                  <span class="text-sm">{{ item.lName }}</span>
                </div>
              </div>
            </div>

            <!-- 중분류 -->
            <div class="flex min-h-0 flex-col">
              <div class="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >중분류</span
                >
              </div>
              <div class="flex-1 overflow-y-auto">
                <div v-if="!selectedLarge" class="py-8 text-center text-sm text-slate-400">
                  대분류를 선택해주세요.
                </div>
                <div
                  v-else-if="isLoading.medium"
                  class="flex items-center justify-center py-8 text-sm text-slate-400"
                >
                  불러오는 중...
                </div>
                <div
                  v-else-if="mediumBranches.length === 0"
                  class="py-8 text-center text-sm text-slate-400"
                >
                  등록된 중분류가 없습니다.
                </div>
                <div
                  v-for="item in mediumBranches"
                  v-else
                  :key="`${item.lCode}-${item.mCode}`"
                  class="flex cursor-pointer items-center gap-2 border-b border-slate-50 px-3 py-1.5 transition-colors hover:bg-slate-50"
                  :class="
                    selectedMedium?.mCode === item.mCode
                      ? 'bg-indigo-50 font-medium text-indigo-700'
                      : ''
                  "
                  @click="selectMedium(item)"
                >
                  <span
                    class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600"
                    >{{ item.mCode }}</span
                  >
                  <span class="text-sm">{{ item.mName }}</span>
                </div>
              </div>
            </div>

            <!-- 소분류 -->
            <div class="flex min-h-0 flex-col">
              <div class="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >소분류</span
                >
              </div>
              <div class="flex-1 overflow-y-auto">
                <div v-if="!selectedMedium" class="py-8 text-center text-sm text-slate-400">
                  중분류를 선택해주세요.
                </div>
                <div
                  v-else-if="isLoading.small"
                  class="flex items-center justify-center py-8 text-sm text-slate-400"
                >
                  불러오는 중...
                </div>
                <div
                  v-else-if="smallBranches.length === 0"
                  class="py-8 text-center text-sm text-slate-400"
                >
                  등록된 소분류가 없습니다.
                </div>
                <div
                  v-for="item in smallBranches"
                  v-else
                  :key="`${item.lCode}-${item.mCode}-${item.sCode}`"
                  class="flex cursor-pointer items-center gap-2 border-b border-slate-50 px-3 py-1.5 transition-colors hover:bg-slate-50"
                  :class="
                    selectedSmall?.sCode === item.sCode
                      ? 'bg-indigo-50 font-medium text-indigo-700'
                      : ''
                  "
                  @click="selectSmall(item)"
                >
                  <span
                    class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600"
                    >{{ item.sCode }}</span
                  >
                  <span class="text-sm">{{ item.sName }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <footer
            class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3"
          >
            <div class="text-sm text-slate-500">
              <template v-if="selectionCode">
                <span class="font-mono font-medium text-slate-700">{{ selectionCode }}</span>
                <span class="ml-2">({{ selectionLabel }})</span>
              </template>
              <template v-else> 분류를 선택해주세요. </template>
            </div>
            <div class="flex gap-3">
              <button
                class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                @click="emit('close')"
              >
                취소
              </button>
              <button
                class="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canConfirm"
                @click="confirm"
              >
                선택 완료
              </button>
            </div>
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
  transform: scale(0.95);
}
</style>
