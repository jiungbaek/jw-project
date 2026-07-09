import { describe, it, expect, vi } from "vitest";

const { getSeasonResultMock } = vi.hoisted(() => ({
  getSeasonResultMock: vi.fn(),
}));

vi.mock("@/lib/season", () => ({
  getSeasonResult: getSeasonResultMock,
}));

import { GET } from "./route";

describe("GET /api/season", () => {
  it("returns 200 with a SeasonResult when quotes resolve", async () => {
    const seasonResult = {
      season: "가을",
      evidence: {
        usRate: { value: "4.58%", changePct: 0.3, signal: "bad" },
        usdKrw: { value: "1,507원", changePct: 0.1, signal: "neutral" },
        gold: { value: "$3,320", changePct: -0.4, signal: "good" },
        wti: { value: "$68.0", changePct: 0.05, signal: "neutral" },
        sp500: { value: "7,500", changePct: -0.5, signal: "bad" },
        nasdaq: { value: "29,000", changePct: -0.8, signal: "bad" },
        kospi: { value: "7,200", changePct: -1.2, signal: "bad" },
      },
      summary: "매크로 역풍 속에 지수가 흔들리는 둔화 국면입니다.",
      assetNote: "둔화기에는 방어적인 자산군이 주목받는 경향이 있습니다.",
    };
    getSeasonResultMock.mockResolvedValue(seasonResult);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(seasonResult);
  });

  it("returns a non-2xx status when quote fetching fails", async () => {
    getSeasonResultMock.mockRejectedValue(new Error("시세 조회에 실패했습니다: ^GSPC"));

    const response = await GET();

    expect(response.status).not.toBe(200);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
