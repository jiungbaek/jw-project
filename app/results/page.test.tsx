import { render, screen, waitFor } from "@testing-library/react";
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
});
