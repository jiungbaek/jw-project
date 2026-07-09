const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

export interface Quote {
  price: number;
  changePct: number;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const response = await fetch(
    `${CHART_URL}${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`시세 조회에 실패했습니다: ${symbol}`);
  }

  const data = await response.json();
  const meta = data?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const previousClose = meta?.chartPreviousClose ?? meta?.previousClose;

  if (typeof price !== "number" || typeof previousClose !== "number" || previousClose === 0) {
    throw new Error(`시세 응답 형식이 올바르지 않습니다: ${symbol}`);
  }

  return { price, changePct: ((price - previousClose) / previousClose) * 100 };
}
