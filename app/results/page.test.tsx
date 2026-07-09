import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ResultsPage from "./page";

const VALID_EVIDENCE = {
  cpi: { value: "4.2%", signal: "bad" },
  usRate: { value: "4.58%", signal: "neutral" },
  krRate: { value: "4.27%", signal: "neutral" },
  usdKrw: { value: "1,507원", signal: "neutral" },
  gold: { value: "$3,320", signal: "good" },
  wti: { value: "$68", signal: "neutral" },
  sp500: { value: "7,500선", signal: "good" },
  nasdaq: { value: "29,000선", signal: "good" },
  kospi: { value: "7,200선", signal: "bad" },
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

  it("shows the judged season, all 9 indicator rows, summary and asset note once the fetch resolves", async () => {
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
    expect(screen.getByText("4.2%")).toBeInTheDocument();
    expect(screen.getByText("1,507원")).toBeInTheDocument();
    expect(screen.getByText("$3,320")).toBeInTheDocument();
    expect(screen.getByText("$68")).toBeInTheDocument();
    expect(screen.getByText("7,500선")).toBeInTheDocument();
    expect(screen.getByText("7,200선")).toBeInTheDocument();
    expect(
      screen.getByText(/물가와 지수 모두 둔화 신호를 보이고 있어 가을 국면으로 판단됩니다\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/가치주·에너지 섹터가 상대적으로 견조합니다\./)).toBeInTheDocument();
    expect(screen.getAllByText("🟢").length).toBe(3);
    expect(screen.getAllByText("🟡").length).toBe(4);
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
