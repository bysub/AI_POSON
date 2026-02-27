import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSTT } from "./useSTT";
import { useTTS } from "./useTTS";
import { useCartStore } from "@/stores/cart";
import { useProductsStore } from "@/stores/products";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useVoiceEventStore } from "@/stores/voiceEvent";
import { matchProducts, levenshtein } from "@/utils/productMatcher";
import { getLocalizedName } from "@/utils/i18n";
import type { Product } from "@/types";

/**
 * 한국어 음소 유사어 사전 — Whisper가 자주 혼동하는 패턴
 * key: Whisper 오인식 결과, value: 올바른 키워드
 */
const KO_PHONETIC_MAP: Record<string, string> = {
  결재: "결제", 결재해: "결제해", 결재해줘: "결제해줘", 결재하기: "결제하기",
  게산: "계산", 게산해: "계산해",
  춰소: "취소", 최소: "취소",
  확인해: "확인", 확인해줘: "확인",
  쥬문: "주문", 주문해: "주문",
  도와줘: "도움말",
};

export type VoiceAction =
  | "add"
  | "remove"
  | "quantity"
  | "pay"
  | "cancel"
  | "back"
  | "confirm"
  | "help"
  | "dineIn"
  | "takeout"
  | "earnPoint"
  | "skipPoint"
  | "home"
  | "unknown";

export interface VoiceCommand {
  action: VoiceAction;
  productQuery?: string;
  quantity?: number;
  rawTranscript: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  fallbackMessage?: string;
  action: VoiceAction;
  product?: Product;
  candidates?: Product[];
}

const ACTION_KEYWORDS: Record<string, Record<VoiceAction, string[]>> = {
  ko: {
    add: ["추가", "담아", "넣어", "줘", "주세요", "주문"],
    remove: ["삭제", "빼", "제거", "취소해"],
    quantity: ["개", "잔", "그릇", "인분", "병", "캔"],
    pay: ["결제", "결재", "계산", "카드", "현금", "결제해", "결재해", "계산해","결제해줘","결재해줘","결제하기","결재하기"],
    cancel: ["취소", "처음으로", "다시", "초기화", "리셋"],
    back: ["뒤로", "이전"],
    confirm: ["확인", "주문확인", "장바구니"],
    help: ["도움말", "도움", "뭐라고", "어떻게"],
    dineIn: ["매장", "먹고가", "여기서", "매장식사"],
    takeout: ["포장", "가져가", "테이크아웃", "싸줘"],
    earnPoint: ["적립", "포인트적립", "포인트"],
    skipPoint: ["미적립", "건너뛰기", "안할래", "바로결제"],
    home: ["홈", "시작", "처음화면"],
    unknown: [],
  },
  en: {
    add: ["add", "order", "want", "get", "give"],
    remove: ["remove", "delete", "cancel"],
    quantity: ["one", "two", "three", "four", "five"],
    pay: ["pay", "checkout", "payment", "card", "cash"],
    cancel: ["cancel", "reset", "start over", "clear"],
    back: ["back", "previous", "go back"],
    confirm: ["confirm", "cart", "review"],
    help: ["help", "what can i say", "commands"],
    dineIn: ["dine in", "eat here", "for here"],
    takeout: ["takeout", "take out", "to go"],
    earnPoint: ["earn points", "points", "earn"],
    skipPoint: ["skip", "no points", "skip points"],
    home: ["home", "start over"],
    unknown: [],
  },
  ja: {
    add: ["追加", "入れて", "ください", "注文"],
    remove: ["削除", "取って", "消して", "キャンセル"],
    quantity: ["つ", "杯", "個", "皿"],
    pay: ["会計", "お会計", "カード", "現金"],
    cancel: ["キャンセル", "最初から", "リセット"],
    back: ["戻る", "前へ"],
    confirm: ["確認", "カート"],
    help: ["ヘルプ", "助けて"],
    dineIn: ["店内", "ここで", "店内で"],
    takeout: ["持ち帰り", "テイクアウト", "お持ち帰り"],
    earnPoint: ["ポイント", "ポイント貯める"],
    skipPoint: ["ポイントなし", "スキップ"],
    home: ["ホーム", "最初"],
    unknown: [],
  },
  zh: {
    add: ["加", "添加", "要", "来"],
    remove: ["删除", "去掉", "不要"],
    quantity: ["个", "杯", "碗", "份"],
    pay: ["结账", "付款", "刷卡", "现金"],
    cancel: ["取消", "重新开始", "清空"],
    back: ["返回", "上一步"],
    confirm: ["确认", "购物车"],
    help: ["帮助", "怎么说"],
    dineIn: ["堂食", "在这吃", "店里吃"],
    takeout: ["打包", "外带", "带走"],
    earnPoint: ["积分", "积分累积"],
    skipPoint: ["不积分", "跳过"],
    home: ["首页", "重新开始"],
    unknown: [],
  },
};

const KO_NUMBER_MAP: Record<string, number> = {
  하나: 1,
  한: 1,
  일: 1,
  두: 2,
  둘: 2,
  이: 2,
  세: 3,
  셋: 3,
  삼: 3,
  네: 4,
  넷: 4,
  사: 4,
  다섯: 5,
  오: 5,
};

// ── Module-level singleton state (모든 useVoiceCommand() 호출이 동일 refs 공유) ──
const lastCommand = ref<CommandResult | null>(null);
const subtitleText = ref("");
const showSubtitle = ref(false);
const highlightedProductId = ref<number | null>(null);
const candidateProducts = ref<Product[]>([]);

export function useVoiceCommand() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const stt = useSTT();
  const tts = useTTS();
  const cartStore = useCartStore();
  const productsStore = useProductsStore();
  const a11yStore = useAccessibilityStore();
  const voiceEventStore = useVoiceEventStore();

  const isActive = computed(() => stt.isListening.value || stt.status.value === "processing");

  /**
   * 퍼지 키워드 매칭: exact match 실패 시 Levenshtein 거리 기반 매칭
   * threshold: 편집 거리 ≤ ceil(keyword.length * 0.35) 이면 매칭
   */
  function fuzzyMatchKeyword(text: string, keywordList: string[]): boolean {
    // 1단계: exact includes (기존 로직)
    if (keywordList.some((k) => text.includes(k))) return true;

    // 2단계: 각 키워드와 텍스트 내 동일 길이 서브스트링 비교
    const words = text.split(/\s+/);
    for (const kw of keywordList) {
      if (!kw) continue;
      const maxDist = Math.ceil(kw.length * 0.35);
      for (const word of words) {
        if (levenshtein(word, kw) <= maxDist) return true;
      }
    }
    return false;
  }

  function parseCommand(transcript: string): VoiceCommand {
    const lang = locale.value;
    const keywords = ACTION_KEYWORDS[lang] || ACTION_KEYWORDS.ko;
    let text = transcript.toLowerCase().trim();

    // 한국어: 음소 유사어 정규화 (Whisper 오인식 보정)
    if (lang === "ko") {
      for (const [wrong, correct] of Object.entries(KO_PHONETIC_MAP)) {
        if (text.includes(wrong)) {
          text = text.replace(new RegExp(wrong, "g"), correct);
        }
      }
    }

    // 수량 추출
    let quantity = 1;
    const numMatch = text.match(/(\d+)/);
    if (numMatch) {
      quantity = parseInt(numMatch[1], 10);
    }
    if (lang === "ko") {
      for (const [word, num] of Object.entries(KO_NUMBER_MAP)) {
        if (text.includes(word)) {
          quantity = num;
          break;
        }
      }
    }

    // 동작 식별 (우선순위: cancel > pay > dineIn/takeout > earnPoint/skipPoint > home > confirm > back > help > remove > add)
    // fuzzyMatchKeyword: exact match + Levenshtein 퍼지 매칭
    let action: VoiceAction = "unknown";

    if (fuzzyMatchKeyword(text, keywords.cancel)) action = "cancel";
    else if (fuzzyMatchKeyword(text, keywords.pay)) action = "pay";
    else if (fuzzyMatchKeyword(text, keywords.dineIn)) action = "dineIn";
    else if (fuzzyMatchKeyword(text, keywords.takeout)) action = "takeout";
    else if (fuzzyMatchKeyword(text, keywords.earnPoint)) action = "earnPoint";
    else if (fuzzyMatchKeyword(text, keywords.skipPoint)) action = "skipPoint";
    else if (fuzzyMatchKeyword(text, keywords.home)) action = "home";
    else if (fuzzyMatchKeyword(text, keywords.confirm)) action = "confirm";
    else if (fuzzyMatchKeyword(text, keywords.back)) action = "back";
    else if (fuzzyMatchKeyword(text, keywords.help)) action = "help";
    else if (fuzzyMatchKeyword(text, keywords.remove)) action = "remove";
    else if (fuzzyMatchKeyword(text, keywords.add)) action = "add";
    else {
      // 키워드 없이 상품명만 말한 경우 → add로 간주
      action = "add";
    }

    // 상품명 추출: 키워드/숫자/조사 제거
    let productQuery = text;
    for (const actionKeywords of Object.values(keywords)) {
      for (const kw of actionKeywords) {
        productQuery = productQuery.replace(new RegExp(kw, "g"), "");
      }
    }
    productQuery = productQuery.replace(/\d+/g, "");
    if (lang === "ko") {
      for (const word of Object.keys(KO_NUMBER_MAP)) {
        productQuery = productQuery.replace(new RegExp(word, "g"), "");
      }
      productQuery = productQuery.replace(/(?:주세요|할게요|할래요|하나요|인분|그릇|잔|병|캔|개|으로|에서|하고|이랑|랑|이요|요|을|를|은|는|이|가|에|서|로|도|해|줘|좀|만)/g, "");
    }
    productQuery = productQuery.trim();

    return {
      action,
      productQuery: productQuery || undefined,
      quantity,
      rawTranscript: transcript,
    };
  }

  function executeCommand(command: VoiceCommand): CommandResult {
    switch (command.action) {
      case "add":
        return handleAdd(command);
      case "remove":
        return handleRemove(command);
      case "pay": {
        const currentPath = router.currentRoute.value.path;
        if (currentPath === "/payment") {
          // 결제 페이지에서: 결제 수단 선택
          const text = command.rawTranscript.toLowerCase();
          let method = "";
          if (text.includes("카드") || text.includes("card")) method = "card";
          else if (text.includes("현금") || text.includes("cash")) method = "cash";
          else if (text.includes("모바일") || text.includes("mobile")) method = "mobile";

          if (method) {
            voiceEventStore.emitPaymentMethod(method);
            return { success: true, message: t(`payment.${method}`), action: "pay" };
          }
          // 결제 수단 미지정 → 결제 진행 시도
          voiceEventStore.emitPaymentMethod("proceed");
          return { success: true, message: t("voice.response.goPayment"), action: "pay" };
        }
        if (cartStore.isEmpty) {
          return { success: false, message: t("cart.empty"), action: "pay" };
        }
        router.push("/payment");
        return { success: true, message: t("voice.response.goPayment"), action: "pay" };
      }
      case "cancel":
        cartStore.clear();
        router.push("/");
        return { success: true, message: t("voice.response.cancelled"), action: "cancel" };
      case "back":
        router.back();
        return { success: true, message: t("voice.response.goBack"), action: "back" };
      case "confirm":
        if (cartStore.isEmpty) {
          return { success: false, message: t("cart.empty"), action: "confirm" };
        }
        router.push("/order-confirm");
        return { success: true, message: t("voice.response.goConfirm"), action: "confirm" };
      case "dineIn":
        voiceEventStore.emitOrderType("DINE_IN");
        return { success: true, message: t("voice.response.dineIn"), action: "dineIn" };
      case "takeout":
        voiceEventStore.emitOrderType("TAKEOUT");
        return { success: true, message: t("voice.response.takeout"), action: "takeout" };
      case "earnPoint":
        voiceEventStore.emitPointAction("earn");
        return { success: true, message: t("voice.response.earnPoint"), action: "earnPoint" };
      case "skipPoint":
        voiceEventStore.emitPointAction("skip");
        return { success: true, message: t("voice.response.skipPoint"), action: "skipPoint" };
      case "home":
        router.push("/");
        return { success: true, message: t("voice.response.goHome"), action: "home" };
      case "help":
        return { success: true, message: t("voice.response.help"), action: "help" };
      default:
        return { success: false, message: t("voice.response.notUnderstood"), action: "unknown" };
    }
  }

  function handleAdd(command: VoiceCommand): CommandResult {
    if (!command.productQuery) {
      return { success: false, message: t("voice.response.whatProduct"), action: "add" };
    }

    const matches = matchProducts(command.productQuery, productsStore.products, {
      locale: locale.value,
      threshold: 0.5,
    });

    if (matches.length === 0) {
      return {
        success: false,
        message: t("voice.response.notFound", { query: command.productQuery }),
        action: "add",
      };
    }

    if (matches.length === 1 || matches[0].score >= 0.8) {
      const product = matches[0].product;
      cartStore.addItem(product, command.quantity ?? 1);
      highlightedProductId.value = product.id;
      setTimeout(() => {
        highlightedProductId.value = null;
      }, 2000);

      const localizedName = getLocalizedName(product, locale.value);
      const koMessage = t("voice.response.added", { name: product.name, count: command.quantity ?? 1 }, { locale: "ko" });
      // 현지화 이름 없이 한국어 fallback인 경우 → 한국어 메시지 직접 사용 (TTS 혼합 언어 무음 방지)
      const hasLocName =
        locale.value === "ko" ||
        (locale.value === "en" && !!product.nameEn) ||
        (locale.value === "ja" && !!product.nameJa) ||
        (locale.value === "zh" && !!product.nameZh);

      return {
        success: true,
        message: hasLocName
          ? t("voice.response.added", { name: localizedName, count: command.quantity ?? 1 })
          : koMessage,
        fallbackMessage: koMessage,
        action: "add",
        product,
      };
    }

    // 다수 매칭 → 후보 안내
    candidateProducts.value = matches.map((m) => m.product);
    const names = matches
      .slice(0, 3)
      .map((m) => getLocalizedName(m.product, locale.value))
      .join(", ");
    return {
      success: false,
      message: t("voice.response.multipleCandidates", { names }),
      action: "add",
      candidates: candidateProducts.value,
    };
  }

  function handleRemove(command: VoiceCommand): CommandResult {
    if (!command.productQuery) {
      return { success: false, message: t("voice.response.whatRemove"), action: "remove" };
    }

    const cartItems = cartStore.items;
    const matches = matchProducts(
      command.productQuery,
      cartItems.map(
        (item) =>
          ({
            id: item.productId,
            name: item.name,
            nameEn: item.nameEn,
            nameJa: item.nameJa,
            nameZh: item.nameZh,
          }) as Product,
      ),
      { locale: locale.value },
    );

    if (matches.length === 0) {
      return {
        success: false,
        message: t("voice.response.notInCart", { query: command.productQuery }),
        action: "remove",
      };
    }

    const targetItem = cartItems.find((i) => i.productId === matches[0].product.id);
    if (targetItem) {
      cartStore.removeItem(targetItem.id);
      const removedName = getLocalizedName(
        { name: targetItem.name, nameEn: targetItem.nameEn, nameJa: targetItem.nameJa, nameZh: targetItem.nameZh },
        locale.value,
      );
      return {
        success: true,
        message: t("voice.response.removed", { name: removedName }),
        action: "remove",
      };
    }

    return { success: false, message: t("voice.response.removeFailed"), action: "remove" };
  }

  function buildVocabulary(): string[] {
    const commands: string[] = [];
    const products: string[] = [];

    // 명령어 키워드 (우선 배치 — Whisper prompt 앞쪽에 오도록)
    const lang = locale.value;
    const keywords = ACTION_KEYWORDS[lang] || ACTION_KEYWORDS.ko;
    for (const [action, actionWords] of Object.entries(keywords)) {
      if (action === "unknown") continue;
      for (const w of actionWords) {
        if (w) commands.push(w);
      }
    }

    // 한국어 숫자
    if (lang === "ko") {
      for (const w of Object.keys(KO_NUMBER_MAP)) {
        commands.push(w);
      }
    }

    // 상품명 (현재 언어)
    for (const product of productsStore.products) {
      const name = getLocalizedName(product, locale.value);
      if (name) products.push(name);
    }

    // 숫자 1~10
    for (let i = 1; i <= 10; i++) products.push(String(i));

    // 명령어를 먼저, 상품명을 뒤에 배치
    return [...new Set([...commands, ...products])];
  }

  async function toggleListening() {
    if (stt.isListening.value) {
      stt.stop();
      return;
    }

    // TTS 출력 중이면 중단 후 STT 시작 (에코 방지)
    tts.stop();
    subtitleText.value = t("voice.micListening");
    showSubtitle.value = true;

    const vocab = buildVocabulary();
    await stt.start(vocab);

    // Native STT는 Promise 완료 시 transcript가 이미 설정됨
    processTranscript();
  }

  function processTranscript() {
    const newTranscript = stt.transcript.value;
    if (!newTranscript) {
      // 에러 메시지 표시
      if (stt.errorMessage.value) {
        subtitleText.value = stt.errorMessage.value;
        showSubtitle.value = true;
        setTimeout(() => {
          showSubtitle.value = false;
        }, 3000);
      } else {
        showSubtitle.value = false;
      }
      return;
    }

    const minConfidence = parseFloat(a11yStore.voiceConfidence ?? "0.7");

    if (stt.confidence.value < minConfidence) {
      subtitleText.value = newTranscript;
      showSubtitle.value = true;
      tts.speak(t("voice.response.lowConfidence"));
      setTimeout(() => {
        showSubtitle.value = false;
      }, 3000);
      return;
    }

    const command = parseCommand(newTranscript);
    const result = executeCommand(command);
    lastCommand.value = result;

    subtitleText.value = result.message;
    showSubtitle.value = true;
    tts.speak(result.message, { fallbackText: result.fallbackMessage });

    setTimeout(() => {
      showSubtitle.value = false;
    }, 3000);
  }

  return {
    isListening: stt.isListening,
    isSupported: stt.isSupported,
    sttStatus: stt.status,
    lastCommand,
    subtitleText,
    showSubtitle,
    highlightedProductId,
    candidateProducts,
    isActive,
    toggleListening,
    parseCommand,
    executeCommand,
    reset: stt.reset,
  };
}
