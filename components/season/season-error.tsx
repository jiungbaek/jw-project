import { CloudOffIcon, RefreshCwIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SeasonError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <CloudOffIcon className="size-8 text-muted-foreground" />
        <div className="text-sm font-bold">지금 계절을 파악하기 어려워요</div>
        <p className="text-xs text-muted-foreground">잠시 후 다시 시도해주세요</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCwIcon />
          다시 시도
        </Button>
      </CardContent>
    </Card>
  );
}
