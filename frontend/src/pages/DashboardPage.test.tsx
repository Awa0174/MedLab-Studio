import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DashboardPage } from "@/pages/DashboardPage";

describe("DashboardPage", () => {
  it("renders ten laboratory cards with status badges", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    const cards = screen.getAllByTestId(/lab-card-/);
    expect(cards).toHaveLength(10);
    expect(screen.getByText("ECG Signal Lab")).toBeInTheDocument();
    expect(within(screen.getByTestId("lab-card-ecg")).getByText("available")).toBeInTheDocument();
    expect(screen.getAllByText(/planned · phase/)).toHaveLength(7);
    expect(screen.getByTestId("lab-card-ecg")).toHaveAttribute("href", "/labs/ecg");
  });
});
