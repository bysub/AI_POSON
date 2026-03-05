import type { Product } from "@/types";

export interface MatchResult {
  product: Product;
  score: number;
  matchType: "exact" | "includes" | "chosung" | "fuzzy";
}

export interface MatchOptions {
  threshold?: number;
  maxResults?: number;
  locale?: string;
}

const CHOSUNG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

export function getChosung(str: string): string {
  return [...str]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return ch;
      return CHOSUNG[Math.floor(code / 588)];
    })
    .join("");
}

export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

/**
 * カタカナ → ひらがな 변환 (일본어 매칭용)
 * 범위: U+30A1..U+30F6 → U+3041..U+3096
 */
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

/**
 * 중국어 상품명 → 병음 이니셜 (성모) 추출
 * 음식/음료 관련 상용 한자 ~150자 매핑
 */
const ZH_PINYIN_MAP: Record<string, string> = {
  // 饮料
  咖: "k", 啡: "f", 茶: "c", 奶: "n", 水: "s", 汁: "z", 酒: "j",
  可: "k", 乐: "l", 雪: "x", 碧: "b", 露: "l", 泉: "q", 冰: "b",
  热: "r", 温: "w", 凉: "l", 甜: "t", 苦: "k", 拿: "n", 铁: "t",
  美: "m", 式: "s", 摩: "m", 卡: "k", 芒: "m", 莓: "m", 柠: "n",
  檬: "m", 桃: "t", 橙: "c", 苹: "p", 葡: "p", 萄: "t", 梨: "l",
  瓜: "g", 椰: "y", 蕉: "j", 草: "c", 薄: "b", 荷: "h",
  // 主食
  饭: "f", 面: "m", 粥: "z", 汤: "t", 包: "b", 饺: "j", 饼: "b",
  糕: "g", 粉: "f", 条: "t", 片: "p", 丝: "s", 米: "m", 麦: "m",
  豆: "d", 腐: "f", 粒: "l", 皮: "p",
  // 肉类
  鸡: "j", 鸭: "y", 鹅: "e", 鱼: "y", 肉: "r", 牛: "n", 猪: "z",
  羊: "y", 虾: "x", 蟹: "x", 蛋: "d", 排: "p", 翅: "c", 腿: "t",
  // 蔬菜
  菜: "c", 白: "b", 青: "q", 红: "h", 萝: "l", 卜: "b", 番: "f",
  茄: "q", 椒: "j", 葱: "c", 姜: "j", 蒜: "s", 菇: "g", 笋: "s",
  莲: "l", 芹: "q", 菠: "b", 生: "s",
  // 烹饪
  炒: "c", 烤: "k", 煮: "z", 蒸: "z", 炸: "z", 焖: "m", 烧: "s",
  煎: "j", 卤: "l", 拌: "b", 炖: "d",
  // 调味
  辣: "l", 酸: "s", 咸: "x", 麻: "m", 香: "x", 鲜: "x", 油: "y",
  盐: "y", 糖: "t", 醋: "c", 味: "w", 酱: "j",
  // 甜品
  派: "p", 司: "s", 布: "b", 丁: "d", 冻: "d", 芝: "z", 士: "s",
  // 量词/描述
  大: "d", 小: "x", 中: "z", 特: "t", 超: "c", 双: "s", 单: "d",
  份: "f", 碗: "w", 杯: "b", 个: "g", 块: "k", 盘: "p",
  // 其他常用
  套: "t", 餐: "c", 堡: "b", 薯: "s", 沙: "s", 拉: "l", 三: "s",
  明: "m", 治: "z", 吐: "t", 加: "j", 多: "d", 少: "s", 新: "x",
  原: "y", 经: "j", 典: "d", 黑: "h", 绿: "l", 抹: "m", 焦: "j",
  全: "q", 半: "b", 配: "p", 选: "x", 一: "y", 二: "e", 五: "w",
};

function getPinyinInitials(str: string): string {
  return [...str]
    .map((ch) => ZH_PINYIN_MAP[ch] || ch)
    .join("");
}

function getProductName(product: Product, locale: string): string {
  switch (locale) {
    case "en":
      return product.nameEn || product.name;
    case "ja":
      return product.nameJa || product.name;
    case "zh":
      return product.nameZh || product.name;
    default:
      return product.name;
  }
}

export function matchProducts(
  query: string,
  products: Product[],
  options: MatchOptions = {},
): MatchResult[] {
  const { threshold = 0.5, maxResults = 5, locale = "ko" } = options;

  let normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  // 일본어: カタカナ → ひらがな 정규화
  if (locale === "ja") {
    normalizedQuery = katakanaToHiragana(normalizedQuery);
  }

  const results: MatchResult[] = [];

  for (const product of products) {
    let name = getProductName(product, locale).toLowerCase();

    // 일본어: 상품명도 카타카나 → 히라가나 정규화
    if (locale === "ja") {
      name = katakanaToHiragana(name);
    }

    // 1단계: 정확 매칭
    if (name === normalizedQuery) {
      results.push({ product, score: 1.0, matchType: "exact" });
      continue;
    }

    // 2단계: 포함 매칭
    if (name.includes(normalizedQuery) || normalizedQuery.includes(name)) {
      const score = normalizedQuery.length / Math.max(name.length, normalizedQuery.length);
      results.push({ product, score: Math.max(0.7, score), matchType: "includes" });
      continue;
    }

    // 3단계: 초성 매칭 (한국어) / 병음 이니셜 매칭 (중국어)
    if (locale === "ko") {
      const queryChosung = getChosung(normalizedQuery);
      const nameChosung = getChosung(name);
      if (nameChosung.includes(queryChosung) && queryChosung.length >= 2) {
        results.push({ product, score: 0.65, matchType: "chosung" });
        continue;
      }
    } else if (locale === "zh") {
      const queryInitials = getPinyinInitials(normalizedQuery);
      const nameInitials = getPinyinInitials(name);
      if (nameInitials.includes(queryInitials) && queryInitials.length >= 2) {
        results.push({ product, score: 0.65, matchType: "chosung" });
        continue;
      }
    }

    // 4단계: Levenshtein 유사도 (일본어/중국어: 문자 수 기반이므로 임계값 조정)
    const adjustedThreshold = (locale === "ja" || locale === "zh") ? Math.max(threshold - 0.1, 0.3) : threshold;
    const maxLen = Math.max(normalizedQuery.length, name.length);
    // Early-exit: 길이 차이만으로 threshold 달성 불가능하면 Levenshtein 스킵
    const lenDiff = Math.abs(normalizedQuery.length - name.length);
    if (maxLen > 0 && 1 - lenDiff / maxLen < adjustedThreshold) continue;

    const distance = levenshtein(normalizedQuery, name);
    const similarity = 1 - distance / maxLen;
    if (similarity >= adjustedThreshold) {
      results.push({ product, score: similarity, matchType: "fuzzy" });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
