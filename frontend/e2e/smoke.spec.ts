import { expect, test } from "@playwright/test";

test("dashboard → ECG lab → save → experiments → reload", async ({ page }) => {
  const name = `smoke ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Laboratory overview" })).toBeVisible();
  await expect(page.getByTestId(/lab-card-/)).toHaveCount(10);
  await expect(page.getByText("api 127.0.0.1:8000")).toBeVisible();

  await page.getByTestId("lab-card-ecg").click();
  await expect(page.getByRole("heading", { name: "ECG Signal Analysis" })).toBeVisible();
  // Simulation ran: a hash appears in the status line and the chart canvas is drawn.
  await expect(page.locator("footer", { hasText: "hash" })).not.toContainText("hash –", {
    timeout: 20_000,
  });
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByText("all passed")).toBeVisible();

  // Stacked comparison renders two linked charts; spectrum tab renders its own chart.
  await page.getByRole("radio", { name: "Stacked" }).click();
  await expect(page.locator("canvas")).toHaveCount(2);
  await page.getByRole("radio", { name: "Overlay" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("tab", { name: "Spectrum" }).click();
  await expect(page.getByText(/welch\(nperseg/)).toBeVisible();
  await page.getByRole("tab", { name: "Time" }).click();

  // Change a parameter via the numeric input and see the status line update.
  const hr = page.getByLabel("Heart rate value in bpm");
  await hr.fill("90");
  await hr.press("Enter");
  await expect(page.getByText("Nominal HR").locator("..")).toContainText("90");

  await page.getByRole("button", { name: "Save experiment" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByTestId("save-experiment-confirm").click();
  await expect(page.getByText(`experiment · ${name}`)).toBeVisible();
  await expect(page.getByText("reproduced · hash identical")).toBeVisible();

  await page.getByRole("link", { name: "Experiments" }).click();
  const row = page.getByTestId("experiment-row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.click();
  await page.getByRole("button", { name: "Re-run & verify" }).click();
  await expect(page.getByText("re-run reproduced the identical result hash")).toBeVisible();

  await page.getByTestId("open-in-lab").click();
  await expect(page.getByText(`experiment · ${name}`)).toBeVisible();
  await expect(page.getByLabel("Heart rate value in bpm")).toHaveValue("90");
});
