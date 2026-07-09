// BLS(미국 노동통계국) 공개 API v1 — API 키 불필요.
// FRED CSV 엔드포인트는 Vercel 등 데이터센터 IP에서 차단(ETIMEDOUT)되어 BLS를 사용한다.
const BLS_URL = "https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0";

export interface CpiReading {
  /** 최신월 CPI 전년동월비 (%) */
  yoy: number;
  /** 전월 YoY 대비 변화 (%p) */
  deltaPp: number;
}

interface BlsRow {
  year: string;
  period: string;
  value: string;
}

export async function fetchCpiYoY(): Promise<CpiReading> {
  const response = await fetch(BLS_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("CPI 조회에 실패했습니다.");
  }

  const data = await response.json();
  const rows: unknown = data?.Results?.series?.[0]?.data;
  if (data?.status !== "REQUEST_SUCCEEDED" || !Array.isArray(rows)) {
    throw new Error("CPI 응답 형식이 올바르지 않습니다.");
  }

  // 최신순 정렬로 오며, M13(연평균) 행은 제외한다.
  const monthly = (rows as BlsRow[]).filter((r) => /^M(0[1-9]|1[0-2])$/.test(r.period));
  const find = (year: string, period: string) =>
    monthly.find((r) => r.year === year && r.period === period);

  const latest = monthly[0];
  const prev = monthly[1];
  const yearAgo = latest && find(String(Number(latest.year) - 1), latest.period);
  const prevYearAgo = prev && find(String(Number(prev.year) - 1), prev.period);

  if (!latest || !prev || !yearAgo || !prevYearAgo) {
    throw new Error("CPI 응답 형식이 올바르지 않습니다.");
  }

  const yoy = (Number(latest.value) / Number(yearAgo.value) - 1) * 100;
  const prevYoy = (Number(prev.value) / Number(prevYearAgo.value) - 1) * 100;

  if (!Number.isFinite(yoy) || !Number.isFinite(prevYoy)) {
    throw new Error("CPI 응답 형식이 올바르지 않습니다.");
  }

  return { yoy, deltaPp: yoy - prevYoy };
}
