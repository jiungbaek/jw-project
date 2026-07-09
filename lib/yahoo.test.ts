import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchQuote } from "./yahoo";

function chartResponse(price: number, previousClose: number) {
  return {
    ok: true,
    json: async () => ({
      chart: { result: [{ meta: { regularMarketPrice: price, chartPreviousClose: previousClose } }] },
    }),
  };
}

describe("fetchQuote", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the price and daily change percent", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(chartResponse(101, 100));

    const quote = await fetchQuote("^GSPC");

    expect(quote.price).toBe(101);
    expect(quote.changePct).toBeCloseTo(1.0);
  });

  it("throws when the response status is not ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    await expect(fetchQuote("^GSPC")).rejects.toThrow();
  });

  it("throws when the payload is missing price fields", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ chart: { result: [{ meta: {} }] } }),
    });

    await expect(fetchQuote("^GSPC")).rejects.toThrow();
  });
});
