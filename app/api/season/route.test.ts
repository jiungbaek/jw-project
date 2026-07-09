import { describe, it, expect, vi } from "vitest";

const { getSeasonResultMock } = vi.hoisted(() => ({
  getSeasonResultMock: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  getSeasonResult: getSeasonResultMock,
}));

import { GET } from "./route";

describe("GET /api/season", () => {
  it("returns 200 with a SeasonResult when Gemini succeeds", async () => {
    const seasonResult = {
      season: "가을",
      evidence: {
        cpi: { value: "4.2%", signal: "bad" },
        usRate: { value: "4.58%", signal: "neutral" },
        krRate: { value: "4.27%", signal: "neutral" },
        usdKrw: { value: "1,507원", signal: "neutral" },
        gold: { value: "$3,320", signal: "good" },
        wti: { value: "$68", signal: "neutral" },
        sp500: { value: "7,500선", signal: "good" },
        nasdaq: { value: "29,000선", signal: "good" },
        kospi: { value: "7,200선", signal: "bad" },
      },
      summary: "물가와 지수 모두 둔화 신호를 보이고 있어 가을 국면으로 판단됩니다.",
      assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
    };
    getSeasonResultMock.mockResolvedValue(seasonResult);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(seasonResult);
  });

  it("returns a non-2xx status when the Gemini call rejects", async () => {
    getSeasonResultMock.mockRejectedValue(new Error("network error"));

    const response = await GET();

    expect(response.status).not.toBe(200);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("returns a non-2xx status when the response cannot be parsed", async () => {
    getSeasonResultMock.mockRejectedValue(new Error("계절 판정 응답을 JSON으로 해석할 수 없습니다."));

    const response = await GET();

    expect(response.status).not.toBe(200);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
