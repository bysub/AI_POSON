import { describe, it, expect } from "vitest";
import { getChosung, levenshtein, matchProducts } from "@/utils/productMatcher";
import type { Product } from "@/types";

function makeProduct(id: number, name: string, overrides?: Partial<Product>): Product {
  return {
    id,
    barcode: String(id),
    name,
    sellPrice: 1000 * id,
    isDiscount: false,
    status: "SELLING",
    isActive: true,
    ...overrides,
  } as Product;
}

describe("getChosung", () => {
  it("한글 초성을 추출한다", () => {
    expect(getChosung("불고기")).toBe("ㅂㄱㄱ");
    expect(getChosung("치킨")).toBe("ㅊㅋ");
    expect(getChosung("감자튀김")).toBe("ㄱㅈㅌㄱ");
  });

  it("비한글 문자는 그대로 유지한다", () => {
    expect(getChosung("ABC")).toBe("ABC");
    expect(getChosung("123")).toBe("123");
  });

  it("혼합 문자열을 처리한다", () => {
    expect(getChosung("불고기A")).toBe("ㅂㄱㄱA");
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(getChosung("")).toBe("");
  });
});

describe("levenshtein", () => {
  it("동일 문자열은 거리 0이다", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("삽입 거리를 계산한다", () => {
    expect(levenshtein("cat", "cats")).toBe(1);
  });

  it("삭제 거리를 계산한다", () => {
    expect(levenshtein("cats", "cat")).toBe(1);
  });

  it("치환 거리를 계산한다", () => {
    expect(levenshtein("cat", "car")).toBe(1);
  });

  it("복합 편집 거리를 계산한다", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("빈 문자열과의 거리", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("matchProducts", () => {
  const products = [
    makeProduct(1, "불고기버거 세트", { nameEn: "Bulgogi Burger Set", nameJa: "プルコギバーガーセット", nameZh: "烤肉汉堡套餐" }),
    makeProduct(2, "치킨버거 세트", { nameEn: "Chicken Burger Set", nameJa: "チキンバーガーセット", nameZh: "鸡肉汉堡套餐" }),
    makeProduct(3, "감자튀김", { nameEn: "French Fries", nameJa: "フライドポテト", nameZh: "薯条" }),
    makeProduct(4, "콜라", { nameEn: "Cola", nameJa: "コーラ", nameZh: "可乐" }),
    makeProduct(5, "사이다", { nameEn: "Sprite", nameJa: "サイダー", nameZh: "雪碧" }),
  ];

  describe("정확 매칭", () => {
    it("정확히 일치하는 상품을 찾는다", () => {
      const results = matchProducts("콜라", products);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toBe("콜라");
      expect(results[0].score).toBe(1.0);
      expect(results[0].matchType).toBe("exact");
    });
  });

  describe("포함 매칭", () => {
    it("이름에 쿼리가 포함된 상품을 찾는다", () => {
      const results = matchProducts("버거", products);
      expect(results.length).toBe(2);
      expect(results.every((r) => r.matchType === "includes")).toBe(true);
    });
  });

  describe("초성 매칭", () => {
    it("초성으로 상품을 찾는다", () => {
      const results = matchProducts("ㅂㄱㄱ", products, { locale: "ko" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toBe("불고기버거 세트");
      expect(results[0].matchType).toBe("chosung");
    });

    it("1글자 초성은 매칭하지 않는다", () => {
      const results = matchProducts("ㅂ", products, { locale: "ko" });
      const chosungMatches = results.filter((r) => r.matchType === "chosung");
      expect(chosungMatches.length).toBe(0);
    });
  });

  describe("Fuzzy 매칭", () => {
    it("유사한 이름의 상품을 찾는다 (영어)", () => {
      const results = matchProducts("coola", products, { threshold: 0.4, locale: "en" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toBe("콜라");
      expect(results[0].matchType).toBe("fuzzy");
    });
  });

  describe("영어 매칭", () => {
    it("영어 이름으로 매칭한다", () => {
      const results = matchProducts("cola", products, { locale: "en" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toBe("콜라");
    });
  });

  describe("옵션", () => {
    it("maxResults로 결과 개수를 제한한다", () => {
      const results = matchProducts("세트", products, { maxResults: 1 });
      expect(results.length).toBe(1);
    });

    it("빈 쿼리는 빈 배열을 반환한다", () => {
      expect(matchProducts("", products)).toEqual([]);
      expect(matchProducts("  ", products)).toEqual([]);
    });
  });

  describe("점수 정렬", () => {
    it("결과가 점수 내림차순으로 정렬된다", () => {
      const results = matchProducts("버거", products);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });
});
