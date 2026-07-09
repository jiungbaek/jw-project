import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

import { getSeasonResult, SEASON_PROMPT } from "./gemini";

const VALID_EVIDENCE = {
  cpi: "둔화세 지속",
  usRate: "동결 기조 유지",
  krRate: "동결 기조 유지",
  usdKrw: "안정세",
  sp500: "상승 둔화",
  nasdaq: "상승 둔화",
  kospi: "박스권",
};

describe("getSeasonResult", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("returns a parsed SeasonResult when Gemini responds with valid JSON", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "가을",
        evidence: VALID_EVIDENCE,
        summary: "물가와 지수 모두 둔화 신호를 보이고 있어 가을 국면으로 판단됩니다.",
        assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
      }),
    });

    const result = await getSeasonResult();

    expect(result).toEqual({
      season: "가을",
      evidence: VALID_EVIDENCE,
      summary: "물가와 지수 모두 둔화 신호를 보이고 있어 가을 국면으로 판단됩니다.",
      assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
    });
  });

  it("parses JSON wrapped in a markdown code fence", async () => {
    generateContentMock.mockResolvedValue({
      text:
        "```json\n" +
        JSON.stringify({
          season: "겨울",
          evidence: VALID_EVIDENCE,
          summary: "전반적으로 하방 압력이 우세합니다.",
          assetNote: "안전자산 선호가 높아지는 경향이 있습니다.",
        }) +
        "\n```",
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

  it("throws when an evidence field is missing (e.g. usdKrw)", async () => {
    const { usdKrw, ...incompleteEvidence } = VALID_EVIDENCE;
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "가을",
        evidence: incompleteEvidence,
        summary: "요약",
        assetNote: "자산 경향",
      }),
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
        evidence: VALID_EVIDENCE,
        summary: "요약",
        assetNote: "지금은 A전자 매수 추천 시점입니다.",
      }),
    });

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("throws when the model includes a price target in the evidence fields", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "겨울",
        evidence: { ...VALID_EVIDENCE, sp500: "목표가 5000 하향" },
        summary: "요약",
        assetNote: "안전자산 선호가 높아지는 경향이 있습니다.",
      }),
    });

    await expect(getSeasonResult()).rejects.toThrow();
  });

  it("does not reject generic market-flow language that happens to contain 매수/매도 (regression)", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "여름",
        evidence: {
          ...VALID_EVIDENCE,
          krRate: "외국인 매도세로 국채 금리가 상승했습니다.",
          usdKrw: "역외 매수 수요로 원화가 약세를 보였습니다.",
        },
        summary: "채권 매도와 환율 매수 흐름이 겹치며 과열 국면으로 판단됩니다.",
        assetNote: "가치주와 원자재가 상대적으로 견조한 경향이 있습니다.",
      }),
    });

    const result = await getSeasonResult();

    expect(result.season).toBe("여름");
  });

  it("strips unexpected extra fields from the model response before returning", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        season: "봄",
        evidence: VALID_EVIDENCE,
        summary: "요약",
        assetNote: "성장주가 주목받는 경향이 있습니다.",
        recommendedTicker: "AAPL",
      }),
    });

    const result = await getSeasonResult();

    expect(result).not.toHaveProperty("recommendedTicker");
    expect(Object.keys(result)).toEqual(["season", "evidence", "summary", "assetNote"]);
  });
});
