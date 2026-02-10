<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiClient } from "@/services/api/client";

const isLoading = ref(false);
const isSavingBusiness = ref(false);
const isSavingReceipt = ref(false);

const businessInfo = ref({
  name: "",
  businessCode: "",
  businessNumber: "",
  owner: "",
  address: "",
  phone: "",
  mobile: "",
  fax: "",
  businessType: "",
  businessItem: "",
  email: "",
});

const receiptInfo = ref({
  receiptBusinessName: "",
  receiptHeader: "",
  receiptFooter: "",
});

async function loadSettings(): Promise<void> {
  isLoading.value = true;
  try {
    const [bizRes, rcpRes] = await Promise.all([
      apiClient.get<{ success: boolean; data: Record<string, string> }>(
        "/api/v1/settings/business",
      ),
      apiClient.get<{ success: boolean; data: Record<string, string> }>("/api/v1/settings/receipt"),
    ]);

    if (bizRes.data.success) {
      const d = bizRes.data.data;
      businessInfo.value = {
        name: d["biz.name"] ?? "",
        businessCode: d["biz.businessCode"] ?? "",
        businessNumber: d["biz.businessNumber"] ?? "",
        owner: d["biz.owner"] ?? "",
        address: d["biz.address"] ?? "",
        phone: d["biz.phone"] ?? "",
        mobile: d["biz.mobile"] ?? "",
        fax: d["biz.fax"] ?? "",
        businessType: d["biz.businessType"] ?? "",
        businessItem: d["biz.businessItem"] ?? "",
        email: d["biz.email"] ?? "",
      };
    }

    if (rcpRes.data.success) {
      const d = rcpRes.data.data;
      receiptInfo.value = {
        receiptBusinessName: d["rcp.businessName"] ?? "",
        receiptHeader: d["rcp.header"] ?? "",
        receiptFooter: d["rcp.footer"] ?? "",
      };
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  } finally {
    isLoading.value = false;
  }
}

async function saveBusiness(): Promise<void> {
  isSavingBusiness.value = true;
  try {
    const payload: Record<string, string> = {
      "biz.name": businessInfo.value.name,
      "biz.businessCode": businessInfo.value.businessCode,
      "biz.businessNumber": businessInfo.value.businessNumber,
      "biz.owner": businessInfo.value.owner,
      "biz.address": businessInfo.value.address,
      "biz.phone": businessInfo.value.phone,
      "biz.mobile": businessInfo.value.mobile,
      "biz.fax": businessInfo.value.fax,
      "biz.businessType": businessInfo.value.businessType,
      "biz.businessItem": businessInfo.value.businessItem,
      "biz.email": businessInfo.value.email,
    };
    await apiClient.put("/api/v1/settings/business", payload);
    alert("사업자 정보가 저장되었습니다.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "저장에 실패했습니다";
    alert(`저장 실패: ${msg}`);
  } finally {
    isSavingBusiness.value = false;
  }
}

async function saveReceipt(): Promise<void> {
  isSavingReceipt.value = true;
  try {
    const payload: Record<string, string> = {
      "rcp.businessName": receiptInfo.value.receiptBusinessName,
      "rcp.header": receiptInfo.value.receiptHeader,
      "rcp.footer": receiptInfo.value.receiptFooter,
    };
    await apiClient.put("/api/v1/settings/receipt", payload);
    alert("영수증 설정이 저장되었습니다.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "저장에 실패했습니다";
    alert(`저장 실패: ${msg}`);
  } finally {
    isSavingReceipt.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-slate-800">사업자 관리</h2>
      <p class="mt-1 text-sm text-slate-500">사업자 정보를 관리합니다</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
      />
    </div>

    <template v-else>
      <!-- 기본 정보 -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-6 font-semibold text-slate-800">기본 정보</h3>
        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">상호 코드</label>
            <input
              v-model="businessInfo.businessCode"
              type="text"
              placeholder="사업장 식별 코드"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">상호명</label>
            <input
              v-model="businessInfo.name"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">사업자등록번호</label>
            <input
              v-model="businessInfo.businessNumber"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">대표자명</label>
            <input
              v-model="businessInfo.owner"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">전화번호</label>
            <input
              v-model="businessInfo.phone"
              type="text"
              placeholder="02-1234-5678"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">휴대폰 번호</label>
            <input
              v-model="businessInfo.mobile"
              type="text"
              placeholder="010-1234-5678"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">Fax 번호</label>
            <input
              v-model="businessInfo.fax"
              type="text"
              placeholder="02-1234-5679"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">업태</label>
            <input
              v-model="businessInfo.businessType"
              type="text"
              placeholder="음식점업, 도소매업 등"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">종목</label>
            <input
              v-model="businessInfo.businessItem"
              type="text"
              placeholder="한식, 커피 등"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-slate-700">주소</label>
            <input
              v-model="businessInfo.address"
              type="text"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-slate-700">이메일</label>
            <input
              v-model="businessInfo.email"
              type="email"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="isSavingBusiness"
            @click="saveBusiness"
          >
            {{ isSavingBusiness ? "저장 중..." : "저장" }}
          </button>
        </div>
      </div>

      <!-- 영수증 설정 -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 font-semibold text-slate-800">영수증 설정</h3>
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">영수증 상호명</label>
            <input
              v-model="receiptInfo.receiptBusinessName"
              type="text"
              placeholder="영수증에 표시될 상호명 (미입력 시 기본 상호명 사용)"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p class="mt-1 text-xs text-slate-400">비워두면 기본 정보의 상호명이 사용됩니다</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">영수증 헤더 문구</label>
            <textarea
              v-model="receiptInfo.receiptHeader"
              rows="2"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="영수증 상단에 표시될 문구"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">영수증 푸터 문구</label>
            <textarea
              v-model="receiptInfo.receiptFooter"
              rows="2"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="영수증 하단에 표시될 문구"
            />
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            class="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="isSavingReceipt"
            @click="saveReceipt"
          >
            {{ isSavingReceipt ? "저장 중..." : "저장" }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
