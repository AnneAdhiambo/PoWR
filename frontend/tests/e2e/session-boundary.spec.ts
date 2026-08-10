import { expect, test } from "@playwright/test";

test.describe("protected application shells", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("logged-out recruiter never sees private navigation", async ({ page }) => {
    await page.goto("/recruiter/jobs");

    await expect(page).toHaveURL(/\/recruiter\/auth\?returnTo=/);
    await expect(page.getByRole("link", { name: "Talent Search" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Applications" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
  });

  test("logged-out developer never sees private navigation", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/auth\?returnTo=/);
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "On-Chain Proofs" })).toHaveCount(0);
  });
});
