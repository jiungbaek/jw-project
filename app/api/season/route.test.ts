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
    getSeasonResultMock.mockResolvedValue({
      season: "가을",
      evidence: { cpi: "둔화세 지속", rate: "동결 기조 유지", index: "상승 둔화" },
      assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      season: "가을",
      evidence: { cpi: "둔화세 지속", rate: "동결 기조 유지", index: "상승 둔화" },
      assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
    });
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
