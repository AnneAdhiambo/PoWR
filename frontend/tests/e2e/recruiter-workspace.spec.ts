import { expect, test } from "@playwright/test";

const recruiter = { id: 1, email: "owner@contoso.dev", companyName: "Contoso Labs", plan: "team" };

test.describe("hardened recruiter workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("recruiter_token", "test-token"));
    await page.route("**/api/recruiter/me", (route) => route.fulfill({ json: { recruiter } }));
    await page.route("**/api/recruiter/organization/profile", (route) => route.fulfill({ json: { organization: { id: 10, display_name: "Contoso Labs", hostname: "contoso.powr.dev", profile: { summary: "Evidence-first infrastructure teams", benefits: [] } } } }));
    await page.route("**/api/recruiter/team/members", (route) => route.fulfill({ json: { members: [{ id: 1, email: recruiter.email, role: "owner" }, { id: 2, email: "teammate@contoso.dev", role: "recruiter" }] } }));
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

  test("account guides organization setup", async ({ page }) => {
    await page.goto("/recruiter/account");

    await expect(page.getByRole("heading", { name: "Prepare your organization for candidates" })).toBeVisible();
    await expect(page.getByText(/setup steps complete/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Invite your hiring team/ })).toHaveAttribute("href", "/recruiter/team");
    await expect(page.getByRole("link", { name: /Publish your first role/ })).toHaveAttribute("href", "/recruiter/jobs");
  });

  test("owner removes a teammate through an accessible confirmation dialog", async ({ page }) => {
    await page.route("**/api/recruiter/team/members/2", (route) => route.fulfill({ json: { success: true } }));
    await page.goto("/recruiter/team");

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Remove teammate?" })).toBeVisible();
    await page.getByRole("button", { name: "Remove teammate" }).click();
    await expect(page.getByText("teammate@contoso.dev")).toHaveCount(0);
  });

  test("interviewer sees team membership without management actions", async ({ page }) => {
    await page.unroute("**/api/recruiter/team/members");
    await page.route("**/api/recruiter/team/members", (route) => route.fulfill({ json: { members: [{ id: 1, email: recruiter.email, role: "interviewer" }, { id: 2, email: "teammate@contoso.dev", role: "recruiter" }] } }));
    await page.goto("/recruiter/team");

    await expect(page.getByText(/You have interviewer access/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Invite teammate" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /Role for/ })).toHaveCount(0);
  });
});
