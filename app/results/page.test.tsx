import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ResultsPage from "./page";

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

  it("shows the judged season and evidence once the fetch resolves", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        season: "가을",
        evidence: { cpi: "둔화세 지속", rate: "동결 기조 유지", index: "상승 둔화" },
        assetNote: "가치주·에너지 섹터가 상대적으로 견조합니다.",
      }),
    });

    render(<ResultsPage />);

    await waitFor(() => expect(screen.getByText("가을")).toBeInTheDocument());
    expect(screen.getByText(/둔화세 지속/)).toBeInTheDocument();
    expect(screen.getByText(/동결 기조 유지/)).toBeInTheDocument();
    expect(screen.getByText(/상승 둔화/)).toBeInTheDocument();
    expect(screen.getByText(/가치주·에너지 섹터가 상대적으로 견조합니다\./)).toBeInTheDocument();
  });

  it("shows a link back to the main page after a successful judgement", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        season: "봄",
        evidence: { cpi: "안정", rate: "인하 기대", index: "상승 시작" },
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
        evidence: { cpi: "상승", rate: "인상", index: "하락" },
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
