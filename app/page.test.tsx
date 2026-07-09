import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Page from "./page";

describe("Main page", () => {
  it("shows the intro copy and a link to the results page", () => {
    render(<Page />);

    expect(screen.getByText("AI 투자 4계절 웨더캐스터")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /오늘의 계절 확인하기/ });
    expect(cta).toHaveAttribute("href", "/results");
  });
});
