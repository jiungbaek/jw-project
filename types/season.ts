export type Season = "봄" | "여름" | "가을" | "겨울";

export interface SeasonResult {
  season: Season;
  evidence: {
    cpi: string;
    rate: string;
    index: string;
  };
  assetNote: string;
}
