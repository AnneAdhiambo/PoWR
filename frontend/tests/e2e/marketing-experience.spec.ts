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
    const menuButton = page.getByRole("button", { name: "Open menu" });
    await menuButton.focus();
    await expect(menuButton).toBeFocused();
    await menuButton.press("Enter");
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jobs", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request demo" })).toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });

  test("developer calls to action lead to onboarding and job discovery", async ({ page }) => {
    await page.goto("/developers");

    await expect(page.getByRole("link", { name: "Build your profile" })).toHaveAttribute("href", "/auth");
    await expect(page.getByRole("link", { name: "Explore jobs" })).toHaveAttribute("href", "/jobs");
  });

  test("publishes crawler metadata endpoints", async ({ request }) => {
    const [sitemap, robots] = await Promise.all([request.get("/sitemap.xml"), request.get("/robots.txt")]);

    await expect(sitemap).toBeOK();
    await expect(robots).toBeOK();
    expect(await sitemap.text()).toContain("/developers");
    expect(await robots.text()).toContain("Disallow: /recruiter/");
  });
});
