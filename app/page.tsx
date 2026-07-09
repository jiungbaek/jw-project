import Link from "next/link";
import { CloudSunIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="@container flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <CloudSunIcon className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-bold">AI 투자 4계절 웨더캐스터</h1>
      <p className="max-w-xs text-sm text-muted-foreground @md:max-w-md">
        오늘의 CPI·금리·주요 지수를 AI가 실시간으로 읽고, 지금이 투자의 어느 계절인지
        알려드려요.
      </p>
      <Button asChild size="lg">
        <Link href="/results">
          <SparklesIcon />
          오늘의 계절 확인하기
        </Link>
      </Button>
    </div>
  );
}
