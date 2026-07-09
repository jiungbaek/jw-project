import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ResultsPage from "./page";

const VALID_EVIDENCE = {
  cpi: { value: "2.7%", changePct: -0.1, signal: "good" },
  usRate: { value: "4.58%", changePct: 0.3, signal: "bad" },
  usdKrw: { value: "1,507원", changePct: 0.1, signal: "neutral" },
  gold: { value: "$3,320", changePct: -0.4, signal: "good" },
  wti: { value: "$68.0", changePct: 0.05, signal: "neutral" },
  sp500: { value: "7,500", changePct: 0.6, signal: "good" },
  nasdaq: { value: "29,000", changePct: 0.9, signal: "good" },
  kospi: { value: "7,200", changePct: -1.2, signal: "bad" },
};

describe("Results page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state before the season judgement resolves", () => {
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<ResultsPage />);

    expect(screen.getByText("오늘의 계절을 판정하는 중...")).toBeInTheDocument();
  });

  it("shows the judged season, all 8 indicator rows, summary and asset note once the fetch resolves", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        season: "가을",
        evidence: VALID_EVIDENCE,
        summary: "매크로 역풍 속에 지수가 흔들리는 둔화 국면입니다.",
        assetNote: "둔화기에는 방어적인 자산군이 주목받는 경향이 있습니다.",
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => expect(screen.getByText("가을")).toBeInTheDocument());
    expect(screen.getByText("2.7%")).toBeInTheDocument();
    expect(screen.getByText("-0.10%p")).toBeInTheDocument();
    expect(screen.getByText("4.58%")).toBeInTheDocument();
    expect(screen.getByText("1,507원")).toBeInTheDocument();
    expect(screen.getByText("$3,320")).toBeInTheDocument();
    expect(screen.getByText("$68.0")).toBeInTheDocument();
    expect(screen.getByText("7,500")).toBeInTheDocument();
    expect(screen.getByText("7,200")).toBeInTheDocument();
    expect(screen.getByText("+0.30%")).toBeInTheDocument();
    expect(screen.getByText("-1.20%")).toBeInTheDocument();
    expect(
      screen.getByText(/매크로 역풍 속에 지수가 흔들리는 둔화 국면입니다\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/둔화기에는 방어적인 자산군이 주목받는 경향이 있습니다\./)).toBeInTheDocument();
    expect(screen.getAllByText("🟢").length).toBe(4);
    expect(screen.getAllByText("🟡").length).toBe(2);
    expect(screen.getAllByText("🔴").length).toBe(2);
  });

  it("shows a link back to the main page after a successful judgement", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        season: "봄",
        evidence: VALID_EVIDENCE,
        summary: "요약",
        assetNote: "성장주가 주목받는 경향이 있습니다.",
      }),
    });

    render(<ResultsPage />);

    const backLink = await screen.findByRole("link", { name: /다시 확인하기/ });
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("shows an error message and a retry button when the fetch fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    render(<ResultsPage />);

    expect(await screen.findByText("지금 계절을 파악하기 어려워요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeInTheDocument();
  });

  it("retries the fetch and shows loading again when 'retry' is clicked", async () => {
    const user = userEvent.setup();
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({ ok: false });

    render(<ResultsPage />);
    await screen.findByRole("button", { name: /다시 시도/ });

    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    await user.click(screen.getByRole("button", { name: /다시 시도/ }));

    expect(screen.getByText("오늘의 계절을 판정하는 중...")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("starts a fresh loading state on every mount instead of reusing a previous result", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        season: "겨울",
        evidence: VALID_EVIDENCE,
        summary: "요약",
        assetNote: "채권과 현금성 자산의 상대 매력이 높아지는 경향이 있습니다.",
      }),
    });

    const { unmount } = render(<ResultsPage />);
    await screen.findByText("겨울");
    unmount();

    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    render(<ResultsPage />);

    expect(screen.getByText("오늘의 계절을 판정하는 중...")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
