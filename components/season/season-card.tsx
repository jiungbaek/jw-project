import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SeasonResult } from "@/types/season";

const SEASON_EMOJI: Record<SeasonResult["season"], string> = {
  봄: "🌱",
  여름: "☀️",
  가을: "🍂",
  겨울: "❄️",
};

const EVIDENCE_LABELS: { key: keyof SeasonResult["evidence"]; label: string }[] = [
  { key: "cpi", label: "CPI" },
  { key: "usRate", label: "미국채 10년물 금리" },
  { key: "krRate", label: "한국채 10년물 금리" },
  { key: "usdKrw", label: "원달러 환율" },
  { key: "sp500", label: "S&P500" },
  { key: "nasdaq", label: "나스닥" },
  { key: "kospi", label: "코스피" },
];

export function SeasonCard({ result }: { result: SeasonResult }) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-center text-center gap-2">
        <span className="text-xs text-muted-foreground">오늘의 국면</span>
        <div className="text-3xl">{SEASON_EMOJI[result.season]}</div>
        <CardTitle className="text-2xl">{result.season}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 rounded-lg bg-muted p-4 text-sm">
          <div className="text-xs font-bold text-muted-foreground">지표 현황</div>
          {EVIDENCE_LABELS.map(({ key, label }) => (
            <div key={key}>
              · {label}: {result.evidence[key]}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <div className="text-xs font-bold text-muted-foreground">판정 설명</div>
          <p>{result.summary}</p>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <div className="text-xs font-bold text-muted-foreground">
            {result.season} 국면 자산 경향
          </div>
          <p>{result.assetNote}</p>
        </div>
        <Button asChild variant="outline" className="self-center">
          <Link href="/">다시 확인하기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
