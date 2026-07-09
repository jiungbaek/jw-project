import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchCpiYoY } from "./fred";

// 14개월치 CPI 지수 (오래된 것 → 최신). 마지막 값 기준 YoY와 전월 YoY를 계산할 수 있는 최소 길이.
function csvOf(values: number[]): string {
  const lines = values.map((v, i) => `2025-${String(i + 1).padStart(2, "0")}-01,${v}`);
  return ["DATE,CPIAUCSL", ...lines].join("\n");
}

describe("fetchCpiYoY", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes the latest YoY and its change vs the previous month", async () => {
    // 지수 100 → 103 (전월 YoY 2.0%), 최신월 YoY 3.0%
    const values = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 102, 103];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => csvOf(values),
    });

    const cpi = await fetchCpiYoY();

    expect(cpi.yoy).toBeCloseTo(3.0);
    expect(cpi.deltaPp).toBeCloseTo(1.0);
  });

  it("throws when the response status is not ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    await expect(fetchCpiYoY()).rejects.toThrow();
  });

  it("throws when there are not enough observations", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => csvOf([100, 101, 102]),
    });

    await expect(fetchCpiYoY()).rejects.toThrow();
  });
});
