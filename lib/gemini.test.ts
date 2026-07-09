import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

import { getSeasonResult, SEASON_PROMPT } from "./gemini";

describe("getSeasonResult", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("returns a parsed SeasonResult when Gemini responds with valid JSON", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "가을",
        evidence: { cpi: "둔화세 지속", rate: "동결 기조 유지", index: "상승 둔화" },
        assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
      }),
    });

    const result = await getSeasonResult();

    expect(result).toEqual({
      season: "가을",
      evidence: { cpi: "둔화세 지속", rate: "동결 기조 유지", index: "상승 둔화" },
      assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
    });
  });

  it("parses JSON wrapped in a markdown code fence", async () => {
    generateContentMock.mockResolvedValue({
      text: "```json\n" + JSON.stringify({
        season: "겨울",
        evidence: { cpi: "상승", rate: "인상", index: "하락" },
        assetNote: "안전자산 선호가 높아지는 경향이 있습니다.",
      }) + "\n```",
    });

    const result = await getSeasonResult();

    expect(result.season).toBe("겨울");
  });

  it("throws when the Gemini call itself fails", async () => {
    generateContentMock.mockRejectedValue(new Error("network error"));

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("throws when the response cannot be parsed as JSON", async () => {
    generateContentMock.mockResolvedValue({
      text: "지금은 가을 국면입니다 (JSON 아님)",
    });

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("throws when the parsed JSON is missing required fields", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ season: "가을" }),
    });

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("includes an instruction against stock names, buy/sell signals, and price targets in the prompt", () => {
    expect(SEASON_PROMPT).toContain("종목명");
    expect(SEASON_PROMPT).toMatch(/매수\/매도 시그널|매수·매도 시그널/);
    expect(SEASON_PROMPT).toContain("목표가");
  });

  it("throws when the model ignores the prompt and includes a buy/sell signal in assetNote", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "여름",
        evidence: { cpi: "상승", rate: "동결", index: "강세" },
        assetNote: "지금은 A전자 매수 추천 시점입니다.",
      }),
    });

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("throws when the model includes a price target in the evidence fields", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "겨울",
        evidence: { cpi: "상승", rate: "인상", index: "목표가 5000 하향" },
        assetNote: "안전자산 선호가 높아지는 경향이 있습니다.",
      }),
    });

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("strips unexpected extra fields from the model response before returning", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "봄",
        evidence: { cpi: "안정", rate: "인하 기대", index: "상승 시작" },
        assetNote: "성장주가 주목받는 경향이 있습니다.",
        recommendedTicker: "AAPL",
      }),
    });

    const result = await getSeasonResult();

    expect(result).not.toHaveProperty("recommendedTicker");
    expect(Object.keys(result)).toEqual(["season", "evidence", "assetNote"]);
  });
});
