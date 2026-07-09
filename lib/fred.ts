// FRED(세인트루이스 연준) 공개 CSV 엔드포인트 — API 키 불필요.
const FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL&cosd=";

export interface CpiReading {
  /** 최신월 CPI 전년동월비 (%) */
  yoy: number;
  /** 전월 YoY 대비 변화 (%p) */
  deltaPp: number;
}

export async function fetchCpiYoY(): Promise<CpiReading> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  const cosd = start.toISOString().slice(0, 10);

  const response = await fetch(`${FRED_CSV_URL}${cosd}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("CPI 조회에 실패했습니다.");
  }

  const csv = await response.text();
  const values = csv
    .trim()
    .split("\n")
    .slice(1) // 헤더 제거
    .map((line) => Number(line.split(",")[1]))
    .filter((v) => Number.isFinite(v));

  // YoY 계산에 최신월 기준 13개월 + 전월 YoY용 1개월 = 최소 14개 관측치 필요
  if (values.length < 14) {
    throw new Error("CPI 응답 형식이 올바르지 않습니다.");
  }

  const latest = values[values.length - 1];
  const prev = values[values.length - 2];
  const latestYearAgo = values[values.length - 13];
  const prevYearAgo = values[values.length - 14];

  const yoy = (latest / latestYearAgo - 1) * 100;
  const prevYoy = (prev / prevYearAgo - 1) * 100;

  return { yoy, deltaPp: yoy - prevYoy };
}
