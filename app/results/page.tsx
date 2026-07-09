"use client";

import { useEffect, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SeasonCard } from "@/components/season/season-card";
import type { SeasonResult } from "@/types/season";

type State =
  | { status: "loading" }
  | { status: "success"; result: SeasonResult }
  | { status: "error" };

export default function ResultsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let ignore = false;
    setState({ status: "loading" });

    fetch("/api/season", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("season judgement failed");
        return (await response.json()) as SeasonResult;
      })
      .then((result) => {
        if (!ignore) setState({ status: "success", result });
      })
      .catch(() => {
        if (!ignore) setState({ status: "error" });
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="@container max-w-md mx-auto p-6">
      {state.status === "loading" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <LoaderCircleIcon className="size-6 animate-spin" />
            <div className="text-sm font-bold">오늘의 계절을 판정하는 중...</div>
            <p className="text-xs text-muted-foreground">
              CPI·금리·주요 지수를 실시간으로 확인하고 있어요
            </p>
          </CardContent>
        </Card>
      )}
      {state.status === "success" && <SeasonCard result={state.result} />}
      {state.status === "error" && (
        <Card>
          <CardContent className="py-12 text-center text-sm">
            지금 계절을 파악하기 어려워요
          </CardContent>
        </Card>
      )}
    </div>
  );
}
