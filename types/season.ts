export type Season = "봄" | "여름" | "가을" | "겨울";

export type Signal = "good" | "neutral" | "bad";

export interface IndicatorReading {
  value: string;
  signal: Signal;
}

export interface SeasonResult {
  season: Season;
  evidence: {
    cpi: IndicatorReading;
    usRate: IndicatorReading;
    krRate: IndicatorReading;
    usdKrw: IndicatorReading;
    gold: IndicatorReading;
    wti: IndicatorReading;
    sp500: IndicatorReading;
    nasdaq: IndicatorReading;
    kospi: IndicatorReading;
  };
  summary: string;
  assetNote: string;
}
