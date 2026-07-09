import type { IndicatorKey, IndicatorReading, Season, SeasonResult, Signal } from "@/types/season";
import { fetchQuote } from "@/lib/yahoo";

type IndicatorKind = "rate" | "fx" | "commodity" | "equity";

interface IndicatorSpec {
  key: IndicatorKey;
  symbol: string;
  kind: IndicatorKind;
  format: (price: number) => string;
}

const INDICATORS: IndicatorSpec[] = [
  { key: "usRate", symbol: "^TNX", kind: "rate", format: (v) => `${v.toFixed(2)}%` },
  { key: "usdKrw", symbol: "KRW=X", kind: "fx", format: (v) => `${Math.round(v).toLocaleString("ko-KR")}원` },
  { key: "gold", symbol: "GC=F", kind: "commodity", format: (v) => `$${Math.round(v).toLocaleString("en-US")}` },
  { key: "wti", symbol: "CL=F", kind: "commodity", format: (v) => `$${v.toFixed(1)}` },
  { key: "sp500", symbol: "^GSPC", kind: "equity", format: (v) => Math.round(v).toLocaleString("en-US") },
  { key: "nasdaq", symbol: "^IXIC", kind: "equity", format: (v) => Math.round(v).toLocaleString("en-US") },
  { key: "kospi", symbol: "^KS11", kind: "equity", format: (v) => Math.round(v).toLocaleString("en-US") },
];

// 이 범위(%) 안의 일간 변동은 방향성 없음(중립)으로 본다.
const NEUTRAL_BAND = 0.15;

// 신호등 기준: 지수는 상승이 투자 환경에 유리(good), 금리·환율·유가·금은 상승이 부담(bad).
export function toSignal(kind: IndicatorKind, changePct: number): Signal {
  if (Math.abs(changePct) < NEUTRAL_BAND) return "neutral";
  const up = changePct > 0;
  if (kind === "equity") return up ? "good" : "bad";
  return up ? "bad" : "good";
}

const SIGNAL_SCORE: Record<Signal, number> = { good: 1, neutral: 0, bad: -1 };

// 매크로(금리·환율·원자재) 우호 여부 × 지수 방향으로 4계절 매핑.
// 봄: 매크로 우호 + 지수 상승 / 여름: 매크로 부담 + 지수 상승
// 가을: 매크로 부담 + 지수 하락 / 겨울: 매크로 우호 + 지수 하락
export function judgeSeason(evidence: Record<IndicatorKey, IndicatorReading>): Season {
  const equityScore = (["sp500", "nasdaq", "kospi"] as const).reduce(
    (sum, key) => sum + SIGNAL_SCORE[evidence[key].signal],
    0
  );
  const macroScore = (["usRate", "usdKrw", "gold", "wti"] as const).reduce(
    (sum, key) => sum + SIGNAL_SCORE[evidence[key].signal],
    0
  );

  const equityUp = equityScore >= 0;
  const macroGood = macroScore >= 0;

  if (equityUp && macroGood) return "봄";
  if (equityUp && !macroGood) return "여름";
  if (!equityUp && !macroGood) return "가을";
  return "겨울";
}

const SEASON_SUMMARY: Record<Season, string> = {
  봄: "금리·환율 부담이 줄어드는 가운데 지수가 힘을 받는 회복 국면입니다.",
  여름: "물가·금리 부담 속에서도 지수가 강세를 이어가는 과열 국면입니다.",
  가을: "매크로 역풍 속에 지수가 흔들리는 둔화 국면입니다.",
  겨울: "금리는 꺾였지만 지수도 힘을 잃은 침체 국면입니다.",
};

const SEASON_ASSET_NOTE: Record<Season, string> = {
  봄: "회복기에는 통상 성장주와 경기민감주가 주목받는 경향이 있습니다.",
  여름: "과열기에는 원자재와 인플레이션 헤지 자산이 강세를 보이는 경향이 있으며, 가치주에 대한 관심도 높아질 수 있습니다.",
  가을: "둔화기에는 변동성이 커질 수 있어 방어적인 자산군이나 가치주, 금 같은 안전자산이 주목받는 경향이 있습니다.",
  겨울: "침체기에는 채권과 현금성 자산의 상대 매력이 높아지는 경향이 있습니다.",
};

function buildSummary(season: Season, evidence: Record<IndicatorKey, IndicatorReading>): string {
  const equityGood = (["sp500", "nasdaq", "kospi"] as const).filter(
    (key) => evidence[key].signal === "good"
  ).length;
  const macroGood = (["usRate", "usdKrw", "gold", "wti"] as const).filter(
    (key) => evidence[key].signal === "good"
  ).length;
  return `지수 3개 중 ${equityGood}개, 매크로 지표 4개 중 ${macroGood}개가 우호 신호입니다. ${SEASON_SUMMARY[season]}`;
}

export async function getSeasonResult(): Promise<SeasonResult> {
  const quotes = await Promise.all(INDICATORS.map((spec) => fetchQuote(spec.symbol)));

  const evidence = {} as Record<IndicatorKey, IndicatorReading>;
  INDICATORS.forEach((spec, i) => {
    const quote = quotes[i];
    evidence[spec.key] = {
      value: spec.format(quote.price),
      changePct: quote.changePct,
      signal: toSignal(spec.kind, quote.changePct),
    };
  });

  const season = judgeSeason(evidence);

  return {
    season,
    evidence,
    summary: buildSummary(season, evidence),
    assetNote: SEASON_ASSET_NOTE[season],
  };
}
