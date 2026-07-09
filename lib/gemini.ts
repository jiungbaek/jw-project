import { GoogleGenAI } from "@google/genai";
import type { Season, SeasonResult, Signal } from "@/types/season";

const SEASONS: Season[] = ["봄", "여름", "가을", "겨울"];
const SIGNALS: Signal[] = ["good", "neutral", "bad"];

const EVIDENCE_FIELDS = [
  "cpi",
  "usRate",
  "krRate",
  "usdKrw",
  "gold",
  "wti",
  "sp500",
  "nasdaq",
  "kospi",
] as const;

// 불변 규칙(spec.md): 종목명·매수/매도 시그널·목표가는 어떤 경로로도 표시되지 않는다.
// 프롬프트 지시만으로는 LLM이 grounding 검색 결과에 딸려온 표현을 그대로 옮길 수 있으므로,
// 응답을 반환하기 전 서버에서 한 번 더 걸러낸다 (fail closed: 하나라도 걸리면 응답 자체를 무효로 처리).
// 주의: "매수"/"매도" 단독은 채권·외환 시장 흐름을 설명하는 일반적인 금융 용어(예: "외국인 매도세")에도
// 흔히 등장해 정상 응답을 오탐하므로, 실제 투자 추천으로 읽히는 구체적 표현만 금칙어로 둔다.
const PROHIBITED_TERMS = ["매수 추천", "매도 추천", "매수 의견", "매도 의견", "매수 시그널", "매도 시그널", "목표가"];

const PROMPT = `당신은 매크로 경제 리포터입니다. 오늘 날짜 기준으로 웹 검색을 통해 다음 9개 지표의 최신 수치와 추세를 확인하세요:
1. 미국 CPI(소비자물가지수)
2. 미국채 10년물 수익률
3. 국고채 10년물 수익률 (한국)
4. 원달러 환율(USD/KRW)
5. 금 현물 가격 (온스당 달러)
6. WTI 원유 선물 가격 (배럴당 달러)
7. S&P500 지수
8. 나스닥 지수
9. 코스피 지수

각 지표에 대해:
- value: 오직 숫자와 단위 기호만, 최대 12자. 날짜·괄호·부연 설명·전월 대비 문구를 절대 넣지 마세요. 좋은 예: "4.2%", "1,380원", "7,500선". 나쁜 예: "4.2% (2026년 5월 기준, 전월 대비 상승)"
- signal: 이 지표가 현재 투자 환경에 유리하면 "good", 불리하면 "bad", 애매하거나 중립이면 "neutral"

지표별 날짜·근거·부연 설명은 value에 넣지 말고 summary에 종합해서 서술하세요.

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
    "cpi": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "usRate": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "krRate": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "usdKrw": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "gold": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "wti": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "sp500": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "nasdaq": { "value": "...", "signal": "good" | "neutral" | "bad" },
    "kospi": { "value": "...", "signal": "good" | "neutral" | "bad" }
  },
  "summary": "위 9개 지표를 종합해 왜 이 계절로 판정했는지 두세 문장으로 설명",
  "assetNote": "판정된 계절의 자산군 경향 한두 문장 (종목명·시그널·목표가 금지)"
}`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function isIndicatorReading(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.value === "string" && SIGNALS.includes(v.signal as Signal);
}

function isSeasonResultShape(value: unknown): value is SeasonResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!SEASONS.includes(v.season as Season)) return false;
  if (typeof v.evidence !== "object" || v.evidence === null) return false;
  const evidence = v.evidence as Record<string, unknown>;
  for (const field of EVIDENCE_FIELDS) {
    if (!isIndicatorReading(evidence[field])) return false;
  }
  if (typeof v.summary !== "string") return false;
  if (typeof v.assetNote !== "string") return false;
  return true;
}

function containsProhibitedTerms(result: SeasonResult): boolean {
  const text = [
    ...EVIDENCE_FIELDS.map((field) => result.evidence[field].value),
    result.summary,
    result.assetNote,
  ].join(" ");
  return PROHIBITED_TERMS.some((term) => text.includes(term));
}

export async function getSeasonResult(): Promise<SeasonResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
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
      cpi: { value: parsed.evidence.cpi.value, signal: parsed.evidence.cpi.signal },
      usRate: { value: parsed.evidence.usRate.value, signal: parsed.evidence.usRate.signal },
      krRate: { value: parsed.evidence.krRate.value, signal: parsed.evidence.krRate.signal },
      usdKrw: { value: parsed.evidence.usdKrw.value, signal: parsed.evidence.usdKrw.signal },
      gold: { value: parsed.evidence.gold.value, signal: parsed.evidence.gold.signal },
      wti: { value: parsed.evidence.wti.value, signal: parsed.evidence.wti.signal },
      sp500: { value: parsed.evidence.sp500.value, signal: parsed.evidence.sp500.signal },
      nasdaq: { value: parsed.evidence.nasdaq.value, signal: parsed.evidence.nasdaq.signal },
      kospi: { value: parsed.evidence.kospi.value, signal: parsed.evidence.kospi.signal },
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
