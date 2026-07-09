import { GoogleGenAI } from "@google/genai";
import type { Season, SeasonResult } from "@/types/season";

const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];

const EVIDENCE_FIELDS = ["cpi", "usRate", "krRate", "usdKrw", "sp500", "nasdaq", "kospi"] as const;

// 불변 규칙(spec.md): 종목명·매수/매도 시그널·목표가는 어떤 경로로도 표시되지 않는다.
// 프롬프트 지시만으로는 LLM이 grounding 검색 결과에 딸려온 표현을 그대로 옮길 수 있으므로,
// 응답을 반환하기 전 서버에서 한 번 더 걸러낸다 (fail closed: 하나라도 걸리면 응답 자체를 무효로 처리).
const PROHIBITED_TERMS = ["매수", "매도", "목표가"];

const PROMPT = `당신은 매크로 경제 리포터입니다. 오늘 날짜 기준으로 웹 검색을 통해 다음 7개 지표의 최신 추세를 확인하세요:
1. 미국 CPI(소비자물가지수) 추세
2. 미국채 10년물 금리 추세
3. 한국채 10년물 금리 추세
4. 원달러 환율(USD/KRW) 추세
5. S&P500 지수 추세
6. 나스닥 지수 추세
7. 코스피 지수 추세

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
    "usRate": "미국채 10년물 금리 추세 한 줄 요약",
    "krRate": "한국채 10년물 금리 추세 한 줄 요약",
    "usdKrw": "원달러 환율 추세 한 줄 요약",
    "sp500": "S&P500 추세 한 줄 요약",
    "nasdaq": "나스닥 추세 한 줄 요약",
    "kospi": "코스피 추세 한 줄 요약"
  },
  "summary": "위 7개 지표를 종합해 왜 이 계절로 판정했는지 두세 문장으로 설명",
  "assetNote": "판정된 계절의 자산군 경향 한두 문장 (종목명·시그널·목표가 금지)"
}`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function isSeasonResultShape(value: unknown): value is SeasonResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!SEASONS.includes(v.season as Season)) return false;
  if (typeof v.evidence !== "object" || v.evidence === null) return false;
  const evidence = v.evidence as Record<string, unknown>;
  for (const field of EVIDENCE_FIELDS) {
    if (typeof evidence[field] !== "string") return false;
  }
  if (typeof v.summary !== "string") return false;
  if (typeof v.assetNote !== "string") return false;
  return true;
}

function containsProhibitedTerms(result: SeasonResult): boolean {
  const text = [...EVIDENCE_FIELDS.map((field) => result.evidence[field]), result.summary, result.assetNote].join(
    " "
  );
  return PROHIBITED_TERMS.some((term) => text.includes(term));
}

export async function getSeasonResult(): Promise<SeasonResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: PROMPT,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
  } catch {
    throw new Error("계절 판정을 위한 검색에 실패했습니다.");
  }

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

  if (!isSeasonResultShape(parsed)) {
    throw new Error("계절 판정 응답 형식이 올바르지 않습니다.");
  }

  // 화이트리스트로 재구성 — 모델이 응답에 끼워 넣은 임의의 추가 필드는 클라이언트로 전달하지 않는다.
  const result: SeasonResult = {
    season: parsed.season,
    evidence: {
      cpi: parsed.evidence.cpi,
      usRate: parsed.evidence.usRate,
      krRate: parsed.evidence.krRate,
      usdKrw: parsed.evidence.usdKrw,
      sp500: parsed.evidence.sp500,
      nasdaq: parsed.evidence.nasdaq,
      kospi: parsed.evidence.kospi,
    },
    summary: parsed.summary,
    assetNote: parsed.assetNote,
  };

  if (containsProhibitedTerms(result)) {
    throw new Error("계절 판정 응답에 허용되지 않는 표현이 포함되어 있습니다.");
  }

  return result;
}

export { PROMPT as SEASON_PROMPT };
