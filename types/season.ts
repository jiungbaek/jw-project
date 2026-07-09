export type Season = "봄" | "여름" | "가을" | "겨울";

export interface SeasonResult {
  season: Season;
  evidence: {
    cpi: string;
    usRate: string;
    krRate: string;
    usdKrw: string;
    sp500: string;
    nasdaq: string;
    kospi: string;
  };
  summary: string;
  assetNote: string;
}
