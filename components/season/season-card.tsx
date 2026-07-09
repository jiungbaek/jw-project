import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IndicatorKey, Signal, SeasonResult } from "@/types/season";

const SEASON_EMOJI: Record<SeasonResult["season"], string> = {
  봄: "🌱",
  여름: "☀️",
  가을: "🍂",
  겨울: "❄️",
};

const SIGNAL_EMOJI: Record<Signal, string> = {
  good: "🟢",
  neutral: "🟡",
  bad: "🔴",
};

const EVIDENCE_LABELS: { key: IndicatorKey; label: string; changeUnit?: string }[] = [
  { key: "cpi", label: "CPI(YoY)", changeUnit: "%p" },
  { key: "usRate", label: "미국채 10년물" },
  { key: "usdKrw", label: "원달러" },
  { key: "gold", label: "금" },
  { key: "wti", label: "WTI" },
  { key: "sp500", label: "S&P500" },
  { key: "nasdaq", label: "나스닥" },
  { key: "kospi", label: "코스피" },
];

function formatChange(changePct: number, unit = "%"): string {
  const sign = changePct >= 0 ? "+" : "";
  return `${sign}${changePct.toFixed(2)}${unit}`;
}

export function SeasonCard({ result }: { result: SeasonResult }) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-center text-center gap-2">
        <span className="text-xs text-muted-foreground">오늘의 국면</span>
        <div className="text-3xl">{SEASON_EMOJI[result.season]}</div>
        <CardTitle className="text-2xl">{result.season}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 text-left font-normal">지표</th>
              <th className="py-1.5 text-right font-normal">값</th>
              <th className="py-1.5 text-right font-normal">등락</th>
              <th className="py-1.5 text-center font-normal">신호</th>
            </tr>
          </thead>
          <tbody>
            {EVIDENCE_LABELS.map(({ key, label, changeUnit }) => {
              const reading = result.evidence[key];
              return (
                <tr key={key} className="border-b last:border-0">
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5 text-right tabular-nums">{reading.value}</td>
                  <td
                    className={cn(
                      "py-1.5 text-right tabular-nums text-xs",
                      reading.changePct >= 0 ? "text-muted-foreground" : "text-destructive"
                    )}
                  >
                    {formatChange(reading.changePct, changeUnit)}
                  </td>
                  <td className="py-1.5 text-center">{SIGNAL_EMOJI[reading.signal]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <div className="text-xs font-bold text-muted-foreground">판정 설명</div>
          <p>{result.summary}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="text-xs font-bold text-primary">지금 당장 취해야 할 포지션</div>
          <p className="font-medium">{result.actionPlan.position}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              추천 자산
            </div>
            <ul className="flex flex-col gap-1.5">
              {result.actionPlan.recommended.map((asset) => (
                <li key={asset} className="flex items-start gap-1.5">
                  <Badge variant="outline" className="shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                    ✓
                  </Badge>
                  <span>{asset}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="text-xs font-bold text-destructive">피해야 할 자산</div>
            <ul className="flex flex-col gap-1.5">
              {result.actionPlan.avoid.map((asset) => (
                <li key={asset} className="flex items-start gap-1.5">
                  <Badge variant="outline" className="shrink-0 border-destructive/40 text-destructive">
                    ✕
                  </Badge>
                  <span>{asset}</span>
                </li>
              ))}
            </ul>
          </div>
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
