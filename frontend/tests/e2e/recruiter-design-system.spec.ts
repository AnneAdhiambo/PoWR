import { expect, test } from "@playwright/test";

test.describe("recruiter design system accessibility", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("auth controls expose names and keyboard focus", async ({ page }) => {
    await page.goto("/recruiter/auth");

    const email = page.getByLabel("Work Email");
    const password = page.getByRole("textbox", { name: "Password" });
    const revealPassword = page.getByRole("button", { name: "Show password" });

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(revealPassword).toBeVisible();

    await email.focus();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(revealPassword).toBeFocused();
  });

  test("auth experience remains usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/recruiter/auth");

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Work Email")).toBeInViewport();
    await expect(page.getByRole("textbox", { name: "Password" })).toBeInViewport();
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });
});
