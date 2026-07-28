import { expect, test } from "@playwright/test";

test.describe("public PoWR experience", () => {
  test("homepage explains the product and exposes conversion paths", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("guessing");
    await expect(page.getByRole("link", { name: "Request a demo" }).first()).toBeVisible();
    await expect(page.getByText("Real work", { exact: true })).toBeVisible();
    await expect(page.getByText("Transparent by design")).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it works, privacy, and fairness." })).toBeVisible();
  });

  test("public product routes have no authenticated navigation", async ({ page }) => {
    for (const route of ["/product", "/developers", "/powr-score", "/pricing", "/security", "/request-demo", "/signup"]) {
      await page.goto(route);
      await expect(page.getByRole("link", { name: "Request a demo" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Applications" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
    }
  });

  test("homepage remains usable on mobile and by keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const demoLink = page.getByRole("link", { name: "Request a demo" }).first();
    await demoLink.focus();
    await expect(demoLink).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });
});
