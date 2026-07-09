import { GoogleGenAI } from "@google/genai";
import type { Season, SeasonResult } from "@/types/season";

const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];

const PROMPT = `당신은 매크로 경제 리포터입니다. 오늘 날짜 기준으로 웹 검색을 통해 다음 3개 지표의 최신 추세를 확인하세요:
1. 미국 CPI(소비자물가지수) 추세
2. 미국채 10년물 금리 추세
3. S&P500 등 주요 지수 추세

확인한 내용을 바탕으로 현재 매크로 국면을 아래 4계절 중 하나로 판정하세요:
- 봄: 회복기 — 물가 안정 + 금리 하락 기대 + 지수 상승 시작
- 여름: 과열기 — 물가·금리 상승, 지수 강세
- 가을: 둔화기 — 성장 둔화 신호, 지수 정체/변동성 확대
- 겨울: 침체기 — 물가·금리·지수 모두 하방 압력

중요한 제약: 특정 종목명, 매수/매도 시그널, 목표가는 절대 언급하지 마세요. 자산군(성장주/가치주/원자재/채권/금 등) 단위의 일반적인 경향만 서술하세요.

다음 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운 코드 펜스 없이 순수 JSON만 출력하세요:
{
  "season": "봄" | "여름" | "가을" | "겨울" 중 하나,
  "evidence": {
    "cpi": "CPI 추세 한 줄 요약",
    "rate": "금리 추세 한 줄 요약",
    "index": "주요 지수 추세 한 줄 요약"
  },
  "assetNote": "판정된 계절의 자산군 경향 한두 문장 (종목명·시그널·목표가 금지)"
}`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function isSeasonResult(value: unknown): value is SeasonResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!SEASONS.includes(v.season as Season)) return false;
  if (typeof v.evidence !== "object" || v.evidence === null) return false;
  const evidence = v.evidence as Record<string, unknown>;
  if (typeof evidence.cpi !== "string") return false;
  if (typeof evidence.rate !== "string") return false;
  if (typeof evidence.index !== "string") return false;
  if (typeof v.assetNote !== "string") return false;
  return true;
}

export async function getSeasonResult(): Promise<SeasonResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: PROMPT,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("계절 판정 응답이 비어 있습니다.");
  }

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new Error("계절 판정 응답을 JSON으로 해석할 수 없습니다.");
  }

  if (!isSeasonResult(parsed)) {
    throw new Error("계절 판정 응답 형식이 올바르지 않습니다.");
  }

  return parsed;
}

export { PROMPT as SEASON_PROMPT };
