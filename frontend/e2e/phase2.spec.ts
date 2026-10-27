import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("reaction time lab: synthetic data, measured block, save", async ({ page }) => {
  await page.goto("/labs/reaction-time");
  await expect(page.getByRole("heading", { name: "Reaction Time Lab" })).toBeVisible();

  await page.getByRole("button", { name: "Load synthetic data" }).click();
  await expect(page.getByText("Median").first()).toBeVisible();
  await expect(page.locator("footer", { hasText: "source synthetic" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Uncertainty budget" })).toBeVisible();

  // A short measured block: 5 trials with short foreperiods, answered by pressing Space.
  await page.getByLabel("Trials value in 1").fill("5");
  await page.getByLabel("Trials value in 1").press("Enter");
  await page.getByLabel("Foreperiod min value in ms").fill("300");
  await page.getByLabel("Foreperiod min value in ms").press("Enter");
  await page.getByLabel("Foreperiod max value in ms").fill("500");
  await page.getByLabel("Foreperiod max value in ms").press("Enter");
  await page.getByTestId("rt-start").click();
  const stimulus = page.getByTestId("stimulus");
  for (let i = 0; i < 5; i++) {
    await expect(stimulus).toHaveAttribute("data-on", "simple", { timeout: 5000 });
    await page.keyboard.press("Space");
    await expect(stimulus).not.toHaveAttribute("data-on", "simple");
  }
  await expect(page.getByText("Block complete.")).toBeVisible();
  await expect(page.locator("footer", { hasText: "source measured" })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("minimum valid trials")).toBeVisible();

  const name = `rt smoke ${Date.now()}`;
  await page.getByRole("button", { name: "Save experiment" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByTestId("save-experiment-confirm").click();
  await expect(page.getByText(`experiment · ${name}`)).toBeVisible();
  await expect(page.getByText("stored result · hash identical")).toBeVisible();
});

async function solveVariantB(page: Page, instruction: string) {
  if (instruction.startsWith("Acknowledge")) {
    await page.getByTestId("variant-b-ack").click();
    return;
  }
  const value = /to ([\d.]+) /.exec(instruction)?.[1] ?? "1";
  for (const ch of value) {
    await page.getByRole("button", { name: ch === "." ? "decimal point" : `digit ${ch}` }).click();
  }
  await page.getByTestId("variant-b-next").click();
  await page.getByTestId("variant-b-confirm").click();
}

async function solveVariantA(page: Page, instruction: string) {
  if (instruction.startsWith("Acknowledge")) {
    const label = instruction.replace("Acknowledge the alarm: ", "");
    await page.getByRole("button", { name: new RegExp(label) }).click();
    return;
  }
  const value = /to ([\d.]+) /.exec(instruction)?.[1] ?? "1";
  const field = instruction.includes("infusion rate")
    ? "Rate"
    : instruction.includes("volume")
      ? "VTBI"
      : "Bolus";
  // Deliberately type a comma: variant A drops it (decimal error for values with a fraction).
  await page.getByLabel(`${field} value`).fill(value.replace(".", ","));
  await page.getByTestId("variant-a-apply").click();
}

test("hmi lab: full A/B session with ratings, analysis and save", async ({ page }) => {
  await page.goto("/labs/hmi");
  await expect(page.getByRole("heading", { name: "Human-Machine Interaction Lab" })).toBeVisible();
  await page.getByLabel("Tasks per variant value in 1").fill("4");
  await page.getByLabel("Tasks per variant value in 1").press("Enter");
  await expect(page.getByRole("heading", { name: "Task set" })).toBeVisible();

  await page.getByTestId("hmi-start").click();
  for (let i = 0; i < 8; i++) {
    const instruction = await page.getByTestId("hmi-instruction").textContent({ timeout: 10000 });
    const variantA = (await page.getByTestId("variant-a").count()) > 0;
    if (variantA) await solveVariantA(page, instruction ?? "");
    else await solveVariantB(page, instruction ?? "");
    if (i === 3 || i === 7) {
      await expect(page.getByTestId("tlx-done")).toBeVisible();
      await page.getByTestId("tlx-done").click();
    }
  }
  await expect(page.getByText("Session complete.")).toBeVisible();
  await expect(page.getByText("Comparison A − B")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("decimal error").first()).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(3);

  const name = `hmi smoke ${Date.now()}`;
  await page.getByRole("button", { name: "Save experiment" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByTestId("save-experiment-confirm").click();
  await expect(page.getByText(`experiment · ${name}`)).toBeVisible();

  await page.getByRole("link", { name: "Experiments" }).click();
  const row = page.getByTestId("experiment-row").filter({ hasText: name });
  await row.click();
  await page.getByRole("button", { name: "Re-run & verify" }).click();
  await expect(page.getByText("re-run reproduced the identical result hash")).toBeVisible();
  await page.getByTestId("open-in-lab").click();
  await expect(page.getByText(`experiment · ${name}`)).toBeVisible();
  await expect(page.getByText("stored result · hash identical")).toBeVisible();
});
