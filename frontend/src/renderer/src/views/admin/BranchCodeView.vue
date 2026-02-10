<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { LBranch, MBranch, SBranch } from "@/types";
import { apiClient } from "@/services/api/client";

// 목록 데이터
const largeBranches = ref<LBranch[]>([]);
const mediumBranches = ref<MBranch[]>([]);
const smallBranches = ref<SBranch[]>([]);

// 선택 상태
const selectedLarge = ref<LBranch | null>(null);
const selectedMedium = ref<MBranch | null>(null);

// 폼 데이터
const largeForm = ref({ lCode: "", lName: "" });
const mediumForm = ref({ mCode: "", mName: "" });
const smallForm = ref({ sCode: "", sName: "", profitRate: 0 });

// 로딩 상태
const isLoading = ref({ large: false, medium: false, small: false });

// 편집 모드
const isEditingLarge = ref(false);
const isEditingMedium = ref(false);
const isEditingSmall = ref(false);

// ========== 대분류 ==========

async function loadLargeBranches(): Promise<void> {
  isLoading.value.large = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: LBranch[] }>(
      "/api/v1/branches/large",
    );
    largeBranches.value = res.data.data;
  } catch {
    alert("대분류 목록 조회에 실패했습니다.");
  } finally {
    isLoading.value.large = false;
  }
}

function selectLarge(item: LBranch): void {
  selectedLarge.value = item;
  selectedMedium.value = null;
  largeForm.value = { lCode: item.lCode, lName: item.lName };
  isEditingLarge.value = true;
  // 중분류 로드, 소분류 초기화
  mediumBranches.value = [];
  smallBranches.value = [];
  mediumForm.value = { mCode: "", mName: "" };
  smallForm.value = { sCode: "", sName: "", profitRate: 0 };
  isEditingMedium.value = false;
  isEditingSmall.value = false;
  loadMediumBranches(item.lCode);
}

function newLargeForm(): void {
  largeForm.value = { lCode: "", lName: "" };
  isEditingLarge.value = false;
}

function resetLargeForm(): void {
  largeForm.value = { lCode: "", lName: "" };
  isEditingLarge.value = false;
  selectedLarge.value = null;
  mediumBranches.value = [];
  smallBranches.value = [];
  selectedMedium.value = null;
  mediumForm.value = { mCode: "", mName: "" };
  smallForm.value = { sCode: "", sName: "", profitRate: 0 };
  isEditingMedium.value = false;
  isEditingSmall.value = false;
}

async function saveLarge(): Promise<void> {
  if (!largeForm.value.lCode || !largeForm.value.lName) {
    alert("코드와 이름을 입력해주세요.");
    return;
  }
  try {
    await apiClient.post("/api/v1/branches/large", largeForm.value);
    await loadLargeBranches();
    // 편집 중이었으면 선택 상태 유지
    if (isEditingLarge.value && selectedLarge.value) {
      const updated = largeBranches.value.find((b) => b.lCode === largeForm.value.lCode);
      if (updated) selectLarge(updated);
    } else {
      resetLargeForm();
    }
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "저장에 실패했습니다.";
    alert(msg);
  }
}

async function deleteLarge(): Promise<void> {
  if (!selectedLarge.value) return;
  if (
    !confirm(
      `대분류 [${selectedLarge.value.lCode}] ${selectedLarge.value.lName}을(를) 삭제하시겠습니까?`,
    )
  )
    return;
  try {
    await apiClient.delete(`/api/v1/branches/large/${selectedLarge.value.lCode}`);
    resetLargeForm();
    await loadLargeBranches();
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "삭제에 실패했습니다.";
    alert(msg);
  }
}

// ========== 중분류 ==========

async function loadMediumBranches(lCode: string): Promise<void> {
  isLoading.value.medium = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: MBranch[] }>(
      `/api/v1/branches/medium?lCode=${lCode}`,
    );
    mediumBranches.value = res.data.data;
  } catch {
    alert("중분류 목록 조회에 실패했습니다.");
  } finally {
    isLoading.value.medium = false;
  }
}

function selectMedium(item: MBranch): void {
  selectedMedium.value = item;
  mediumForm.value = { mCode: item.mCode, mName: item.mName };
  isEditingMedium.value = true;
  // 소분류 로드
  smallBranches.value = [];
  smallForm.value = { sCode: "", sName: "", profitRate: 0 };
  isEditingSmall.value = false;
  loadSmallBranches(item.lCode, item.mCode);
}

function newMediumForm(): void {
  mediumForm.value = { mCode: "", mName: "" };
  isEditingMedium.value = false;
  selectedMedium.value = null;
  smallBranches.value = [];
  smallForm.value = { sCode: "", sName: "", profitRate: 0 };
  isEditingSmall.value = false;
}

function resetMediumForm(): void {
  mediumForm.value = { mCode: "", mName: "" };
  isEditingMedium.value = false;
  selectedMedium.value = null;
  smallBranches.value = [];
  smallForm.value = { sCode: "", sName: "", profitRate: 0 };
  isEditingSmall.value = false;
}

async function saveMedium(): Promise<void> {
  if (!selectedLarge.value) {
    alert("대분류를 먼저 선택해주세요.");
    return;
  }
  if (!mediumForm.value.mCode || !mediumForm.value.mName) {
    alert("코드와 이름을 입력해주세요.");
    return;
  }
  try {
    await apiClient.post("/api/v1/branches/medium", {
      lCode: selectedLarge.value.lCode,
      ...mediumForm.value,
    });
    await loadMediumBranches(selectedLarge.value.lCode);
    if (isEditingMedium.value && selectedMedium.value) {
      const updated = mediumBranches.value.find((b) => b.mCode === mediumForm.value.mCode);
      if (updated) selectMedium(updated);
    } else {
      resetMediumForm();
    }
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "저장에 실패했습니다.";
    alert(msg);
  }
}

async function deleteMedium(): Promise<void> {
  if (!selectedMedium.value) return;
  if (
    !confirm(
      `중분류 [${selectedMedium.value.mCode}] ${selectedMedium.value.mName}을(를) 삭제하시겠습니까?`,
    )
  )
    return;
  try {
    await apiClient.delete(
      `/api/v1/branches/medium/${selectedMedium.value.lCode}/${selectedMedium.value.mCode}`,
    );
    resetMediumForm();
    if (selectedLarge.value) {
      await loadMediumBranches(selectedLarge.value.lCode);
    }
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "삭제에 실패했습니다.";
    alert(msg);
  }
}

// ========== 소분류 ==========

async function loadSmallBranches(lCode: string, mCode: string): Promise<void> {
  isLoading.value.small = true;
  try {
    const res = await apiClient.get<{ success: boolean; data: SBranch[] }>(
      `/api/v1/branches/small?lCode=${lCode}&mCode=${mCode}`,
    );
    smallBranches.value = res.data.data;
  } catch {
    alert("소분류 목록 조회에 실패했습니다.");
  } finally {
    isLoading.value.small = false;
  }
}

function selectSmall(item: SBranch): void {
  smallForm.value = {
    sCode: item.sCode,
    sName: item.sName,
    profitRate: Number(item.profitRate),
  };
  isEditingSmall.value = true;
}

function newSmallForm(): void {
  smallForm.value = { sCode: "", sName: "", profitRate: 0 };
  isEditingSmall.value = false;
}

function resetSmallForm(): void {
  smallForm.value = { sCode: "", sName: "", profitRate: 0 };
  isEditingSmall.value = false;
}

async function saveSmall(): Promise<void> {
  if (!selectedLarge.value || !selectedMedium.value) {
    alert("대분류와 중분류를 먼저 선택해주세요.");
    return;
  }
  if (!smallForm.value.sCode || !smallForm.value.sName) {
    alert("코드와 이름을 입력해주세요.");
    return;
  }
  try {
    await apiClient.post("/api/v1/branches/small", {
      lCode: selectedLarge.value.lCode,
      mCode: selectedMedium.value.mCode,
      ...smallForm.value,
    });
    await loadSmallBranches(selectedLarge.value.lCode, selectedMedium.value.mCode);
    resetSmallForm();
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "저장에 실패했습니다.";
    alert(msg);
  }
}

async function deleteSmall(): Promise<void> {
  if (!selectedLarge.value || !selectedMedium.value || !smallForm.value.sCode) return;
  if (
    !confirm(`소분류 [${smallForm.value.sCode}] ${smallForm.value.sName}을(를) 삭제하시겠습니까?`)
  )
    return;
  try {
    await apiClient.delete(
      `/api/v1/branches/small/${selectedLarge.value.lCode}/${selectedMedium.value.mCode}/${smallForm.value.sCode}`,
    );
    resetSmallForm();
    await loadSmallBranches(selectedLarge.value.lCode, selectedMedium.value.mCode);
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "삭제에 실패했습니다.";
    alert(msg);
  }
}

onMounted(() => {
  loadLargeBranches();
});
</script>

<template>
  <div>
    <!-- 헤더 -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">분류등록관리</h1>
        <p class="mt-1 text-sm text-slate-500">
          상품 분류 코드 체계를 관리합니다 (대분류 / 중분류 / 소분류)
        </p>
      </div>
    </div>

    <!-- 3-Panel Layout -->
    <div class="grid grid-cols-3 gap-4" >
      <!-- 대분류 패널 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">대분류</h3>
          <button
            class="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            @click="newLargeForm"
          >
            + 신규
          </button>
        </div>

        <!-- 입력 폼 -->
        <div class="border-b border-slate-100 px-4 py-3">
          <div class="flex gap-2">
            <input
              v-model="largeForm.lCode"
              type="text"
              maxlength="2"
              placeholder="코드"
              class="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="isEditingLarge"
            />
            <input
              v-model="largeForm.lName"
              type="text"
              placeholder="분류명"
              class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div class="mt-2 flex gap-2">
            <button
              class="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              @click="saveLarge"
            >
              {{ isEditingLarge ? "수정" : "저장" }}
            </button>
            <button
              v-if="isEditingLarge"
              class="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              @click="deleteLarge"
            >
              삭제
            </button>
            <button
              v-if="isEditingLarge"
              class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
              @click="resetLargeForm"
            >
              취소
            </button>
          </div>
        </div>

        <!-- 목록 -->
        <div class="max-h-96 overflow-y-auto">
          <div
            v-if="isLoading.large"
            class="flex items-center justify-center py-8 text-sm text-slate-500"
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
            :key="item.lCode"
            class="flex cursor-pointer items-center justify-between border-b border-slate-50 px-4 py-2.5 transition-colors hover:bg-slate-50"
            :class="selectedLarge?.lCode === item.lCode ? 'bg-indigo-50 text-indigo-700' : ''"
            @click="selectLarge(item)"
          >
            <div class="flex items-center gap-2">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{{
                item.lCode
              }}</span>
              <span class="text-sm">{{ item.lName }}</span>
            </div>
            <span
              v-if="item._count?.mBranches"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
            >
              {{ item._count.mBranches }}
            </span>
          </div>
        </div>
      </div>

      <!-- 중분류 패널 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">
            중분류
            <span v-if="selectedLarge" class="ml-1 text-xs font-normal text-slate-400">
              ({{ selectedLarge.lCode }} {{ selectedLarge.lName }})
            </span>
          </h3>
          <button
            v-if="selectedLarge"
            class="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            @click="newMediumForm"
          >
            + 신규
          </button>
        </div>

        <!-- 입력 폼 -->
        <div class="border-b border-slate-100 px-4 py-3">
          <div class="flex gap-2">
            <input
              v-model="mediumForm.mCode"
              type="text"
              maxlength="2"
              placeholder="코드"
              class="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="!selectedLarge || isEditingMedium"
            />
            <input
              v-model="mediumForm.mName"
              type="text"
              placeholder="분류명"
              class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="!selectedLarge"
            />
          </div>
          <div class="mt-2 flex gap-2">
            <button
              class="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!selectedLarge"
              @click="saveMedium"
            >
              {{ isEditingMedium ? "수정" : "저장" }}
            </button>
            <button
              v-if="isEditingMedium"
              class="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              @click="deleteMedium"
            >
              삭제
            </button>
            <button
              v-if="isEditingMedium"
              class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
              @click="resetMediumForm"
            >
              취소
            </button>
          </div>
        </div>

        <!-- 목록 -->
        <div class="max-h-96 overflow-y-auto">
          <div v-if="!selectedLarge" class="py-8 text-center text-sm text-slate-400">
            대분류를 선택해주세요.
          </div>
          <div
            v-else-if="isLoading.medium"
            class="flex items-center justify-center py-8 text-sm text-slate-500"
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
            :key="`${item.lCode}-${item.mCode}`"
            class="flex cursor-pointer items-center justify-between border-b border-slate-50 px-4 py-2.5 transition-colors hover:bg-slate-50"
            :class="selectedMedium?.mCode === item.mCode ? 'bg-indigo-50 text-indigo-700' : ''"
            @click="selectMedium(item)"
          >
            <div class="flex items-center gap-2">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{{
                item.mCode
              }}</span>
              <span class="text-sm">{{ item.mName }}</span>
            </div>
            <span
              v-if="item._count?.sBranches"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
            >
              {{ item._count.sBranches }}
            </span>
          </div>
        </div>
      </div>

      <!-- 소분류 패널 -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-700">
            소분류
            <span v-if="selectedMedium" class="ml-1 text-xs font-normal text-slate-400">
              ({{ selectedLarge?.lCode }}{{ selectedMedium.mCode }} {{ selectedMedium.mName }})
            </span>
          </h3>
          <button
            v-if="selectedMedium"
            class="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            @click="newSmallForm"
          >
            + 신규
          </button>
        </div>

        <!-- 입력 폼 -->
        <div class="border-b border-slate-100 px-4 py-3">
          <div class="flex gap-2">
            <input
              v-model="smallForm.sCode"
              type="text"
              maxlength="3"
              placeholder="코드"
              class="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="!selectedMedium || isEditingSmall"
            />
            <input
              v-model="smallForm.sName"
              type="text"
              placeholder="분류명"
              class="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              :disabled="!selectedMedium"
            />
          </div>
          <div class="mt-2 flex gap-2">
            <div class="flex items-center gap-1">
              <label class="text-xs text-slate-500">이익률(%)</label>
              <input
                v-model.number="smallForm.profitRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                class="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                :disabled="!selectedMedium"
              />
            </div>
          </div>
          <div class="mt-2 flex gap-2">
            <button
              class="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!selectedMedium"
              @click="saveSmall"
            >
              {{ isEditingSmall ? "수정" : "저장" }}
            </button>
            <button
              v-if="isEditingSmall"
              class="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              @click="deleteSmall"
            >
              삭제
            </button>
            <button
              v-if="isEditingSmall"
              class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
              @click="resetSmallForm"
            >
              취소
            </button>
          </div>
        </div>

        <!-- 목록 -->
        <div class="max-h-96 overflow-y-auto">
          <div v-if="!selectedMedium" class="py-8 text-center text-sm text-slate-400">
            중분류를 선택해주세요.
          </div>
          <div
            v-else-if="isLoading.small"
            class="flex items-center justify-center py-8 text-sm text-slate-500"
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
            :key="`${item.lCode}-${item.mCode}-${item.sCode}`"
            class="flex cursor-pointer items-center justify-between border-b border-slate-50 px-4 py-2.5 transition-colors hover:bg-slate-50"
            :class="
              isEditingSmall && smallForm.sCode === item.sCode ? 'bg-indigo-50 text-indigo-700' : ''
            "
            @click="selectSmall(item)"
          >
            <div class="flex items-center gap-2">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{{
                item.sCode
              }}</span>
              <span class="text-sm">{{ item.sName }}</span>
            </div>
            <span
              v-if="Number(item.profitRate) > 0"
              class="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600"
            >
              {{ item.profitRate }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.max-h-96 {
  min-height: 530px;
}
</style>