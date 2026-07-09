import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IndicatorKey, IndicatorReading } from "@/types/season";

const { fetchQuoteMock, fetchCpiYoYMock } = vi.hoisted(() => ({
  fetchQuoteMock: vi.fn(),
  fetchCpiYoYMock: vi.fn(),
}));

vi.mock("@/lib/yahoo", () => ({ fetchQuote: fetchQuoteMock }));
vi.mock("@/lib/cpi", () => ({ fetchCpiYoY: fetchCpiYoYMock }));

import { getSeasonResult, judgeSeason, toSignal } from "./season";

function reading(signal: IndicatorReading["signal"]): IndicatorReading {
  return { value: "0", changePct: 0, signal };
}

function evidenceWith(
  equity: IndicatorReading["signal"],
  macro: IndicatorReading["signal"]
): Record<IndicatorKey, IndicatorReading> {
  return {
    cpi: reading(macro),
    usRate: reading(macro),
    usdKrw: reading(macro),
    gold: reading(macro),
    wti: reading(macro),
    sp500: reading(equity),
    nasdaq: reading(equity),
    kospi: reading(equity),
  };
}

describe("toSignal", () => {
  it("treats small moves as neutral", () => {
    expect(toSignal("equity", 0.1)).toBe("neutral");
    expect(toSignal("rate", -0.1)).toBe("neutral");
  });

  it("marks rising equities as good and falling as bad", () => {
    expect(toSignal("equity", 0.5)).toBe("good");
    expect(toSignal("equity", -0.5)).toBe("bad");
  });

  it("marks rising rates, fx and commodities as bad and falling as good", () => {
    expect(toSignal("rate", 0.5)).toBe("bad");
    expect(toSignal("fx", 0.5)).toBe("bad");
    expect(toSignal("commodity", -0.5)).toBe("good");
  });

  it("uses a narrower neutral band for inflation (monthly %p moves)", () => {
    expect(toSignal("inflation", 0.03)).toBe("neutral");
    expect(toSignal("inflation", 0.1)).toBe("bad");
    expect(toSignal("inflation", -0.1)).toBe("good");
  });
});

describe("judgeSeason", () => {
  it("maps equity up + macro good to 봄", () => {
    expect(judgeSeason(evidenceWith("good", "good"))).toBe("봄");
  });

  it("maps equity up + macro bad to 여름", () => {
    expect(judgeSeason(evidenceWith("good", "bad"))).toBe("여름");
  });

  it("maps equity down + macro bad to 가을", () => {
    expect(judgeSeason(evidenceWith("bad", "bad"))).toBe("가을");
  });

  it("maps equity down + macro good to 겨울", () => {
    expect(judgeSeason(evidenceWith("bad", "good"))).toBe("겨울");
  });
});

describe("getSeasonResult", () => {
  beforeEach(() => {
    fetchQuoteMock.mockReset();
    fetchCpiYoYMock.mockReset();
    fetchCpiYoYMock.mockResolvedValue({ yoy: 2.7, deltaPp: -0.1 });
  });

  it("builds a SeasonResult with 8 readings, a season, summary and asset note", async () => {
    fetchQuoteMock.mockResolvedValue({ price: 100, changePct: 1.0 });

    const result = await getSeasonResult();

    expect(Object.keys(result.evidence)).toHaveLength(8);
    expect(["봄", "여름", "가을", "겨울"]).toContain(result.season);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.assetNote.length).toBeGreaterThan(0);
    expect(result.actionPlan.position.length).toBeGreaterThan(0);
    expect(result.actionPlan.recommended.length).toBeGreaterThan(0);
    expect(result.actionPlan.avoid.length).toBeGreaterThan(0);
  });

  it("formats each indicator value and derives its signal", async () => {
    // 모든 시세가 1% 상승: 지수는 good, 금리·환율·원자재는 bad.
    // CPI YoY는 -0.1%p 둔화(good)지만 매크로 점수는 -3으로 부담 우세 → 여름
    fetchQuoteMock.mockResolvedValue({ price: 1380.4, changePct: 1.0 });

    const result = await getSeasonResult();

    expect(result.evidence.cpi.value).toBe("2.7%");
    expect(result.evidence.cpi.signal).toBe("good");
    expect(result.evidence.usdKrw.value).toBe("1,380원");
    expect(result.evidence.usdKrw.signal).toBe("bad");
    expect(result.evidence.sp500.signal).toBe("good");
    expect(result.season).toBe("여름");
  });

  it("rejects when any quote fetch fails", async () => {
    fetchQuoteMock.mockRejectedValue(new Error("시세 조회에 실패했습니다: ^GSPC"));

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("rejects when the CPI fetch fails", async () => {
    fetchQuoteMock.mockResolvedValue({ price: 100, changePct: 1.0 });
    fetchCpiYoYMock.mockRejectedValue(new Error("CPI 조회에 실패했습니다."));

    await expect(getSeasonResult()).rejects.toThrow();
  });
});
