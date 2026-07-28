import { expect, test } from "@playwright/test";

const recruiter = { id: 1, email: "owner@contoso.dev", companyName: "Contoso Labs", plan: "team" };

test.describe("hardened recruiter workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("recruiter_token", "test-token"));
    await page.route("**/api/recruiter/me", (route) => route.fulfill({ json: { recruiter } }));
    await page.route("**/api/recruiter/organization/profile", (route) => route.fulfill({ json: { organization: { id: 10, display_name: "Contoso Labs", hostname: "contoso.powr.dev" } } }));
    await page.route("**/api/recruiter/team/members", (route) => route.fulfill({ json: { members: [{ email: recruiter.email, role: "owner" }] } }));
    await page.route("**/api/jobs/my", (route) => route.fulfill({ json: { jobs: [{ id: 1, title: "Platform Engineer", status: "active" }] } }));
    await page.route("**/api/recruiter/applications", (route) => route.fulfill({ json: { applications: [{ id: 2, developer_username: "alex", job_title: "Platform Engineer", stage: "interview", powr_score: 91 }] } }));
    await page.route("**/api/recruiter/employees", (route) => route.fulfill({ json: { employees: [] } }));
  });

  test("dashboard presents a coherent hiring command center", async ({ page }) => {
    await page.goto("/recruiter");
    await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
    await expect(page.getByText("Open jobs")).toBeVisible();
    await expect(page.getByText("Active candidates")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Recruiter workspace" })).toContainText("Applications");
    await expect(page.getByRole("navigation", { name: "Recruiter workspace" })).not.toContainText("Candidates");
  });

  test("legacy candidates route resolves to the authoritative pipeline", async ({ page }) => {
    await page.goto("/recruiter/candidates");
    await expect(page).toHaveURL(/\/recruiter\/applications$/);
    await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  });

  test("workspace navigation remains usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/recruiter");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Recruiter workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Talent Search" })).toBeVisible();
  });
});
