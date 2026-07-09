export type Season = "봄" | "여름" | "가을" | "겨울";

export type Signal = "good" | "neutral" | "bad";

export interface IndicatorReading {
  value: string;
  changePct: number;
  signal: Signal;
}

export type IndicatorKey =
  | "cpi"
  | "usRate"
  | "usdKrw"
  | "gold"
  | "wti"
  | "sp500"
  | "nasdaq"
  | "kospi";

export interface SeasonActionPlan {
  position: string;
  recommended: string[];
  avoid: string[];
}

export interface SeasonResult {
  season: Season;
  evidence: Record<IndicatorKey, IndicatorReading>;
  summary: string;
  assetNote: string;
  actionPlan: SeasonActionPlan;
}
