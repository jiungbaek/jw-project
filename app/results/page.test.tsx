import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ResultsPage from "./page";

const VALID_EVIDENCE = {
  cpi: "둔화세 지속",
  usRate: "동결 기조 유지",
  krRate: "동결 기조 유지",
  usdKrw: "안정세",
  sp500: "상승 둔화",
  nasdaq: "상승 둔화",
  kospi: "박스권",
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

  it("shows the judged season, all 7 indicator lines, summary and asset note once the fetch resolves", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        season: "가을",
        evidence: VALID_EVIDENCE,
        summary: "물가와 지수 모두 둔화 신호를 보이고 있어 가을 국면으로 판단됩니다.",
        assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => expect(screen.getByText("가을")).toBeInTheDocument());
    expect(screen.getByText(/둔화세 지속/)).toBeInTheDocument();
    expect(screen.getByText(/안정세/)).toBeInTheDocument();
    expect(screen.getAllByText(/상승 둔화/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/박스권/)).toBeInTheDocument();
    expect(
      screen.getByText(/물가와 지수 모두 둔화 신호를 보이고 있어 가을 국면으로 판단됩니다\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/가치주·에너지 섹터가 상대적으로 견조합니다\./)).toBeInTheDocument();
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
        assetNote: "안전자산 선호가 높아지는 경향이 있습니다.",
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
