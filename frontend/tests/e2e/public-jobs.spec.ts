import { expect, test } from "@playwright/test";

const job = {
  id: 42,
  public_slug: "staff-platform-engineer-42",
  title: "Staff Platform Engineer",
  company: "Contoso Labs",
  location: "Remote",
  salary: "$140k-$190k",
  type: "full-time",
  description: "Lead the platform foundation for a high-trust engineering team.",
  tags: ["Kubernetes", "TypeScript"],
  status: "active",
  organization_slug: "contoso-labs-1001",
  created_at: new Date().toISOString(),
};

test("public job list and details never render the developer dashboard shell", async ({ page }) => {
  await page.route("**/api/jobs?*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobs: [job], total: 1 }) })
  );
  await page.route("**/api/jobs/staff-platform-engineer-42", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ job }) })
  );

  await page.goto("/jobs");

  await expect(page.getByRole("heading", { name: "Staff Platform Engineer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  await page.getByRole("button", { name: "View Details" }).click();

  await expect(page).toHaveURL("http://contoso-labs-1001.powr.localhost:3000/jobs/staff-platform-engineer-42");
  await expect(page.getByRole("heading", { name: "Staff Platform Engineer" })).toBeVisible();
  await expect(page.getByText("This job is not currently available")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  await page.getByRole("button", { name: "Back to Jobs" }).click();

  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});

test("tenant careers page renders organization branding without private navigation", async ({ page }) => {
  await page.route("**/api/tenant/context", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        organization: {
          id: 42,
          slug: "contoso-labs-1001",
          display_name: "Contoso Labs",
          profile: { primaryColor: "#FF5500" },
        },
      }),
    })
  );
  await page.route("**/api/jobs?*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobs: [job], total: 1 }) })
  );

  await page.goto("http://contoso-labs-1001.powr.localhost:3000/jobs");

  await expect(page.getByText("Careers at Contoso Labs")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Open roles at Contoso Labs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Staff Platform Engineer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});

test("unknown tenant never falls back to global jobs", async ({ page }) => {
  await page.route("**/api/tenant/context", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Tenant not found" }) })
  );
  await page.route("**/api/jobs?*", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Tenant not found" }) })
  );

  await page.goto("http://unknown-company.powr.localhost:3000/jobs");

  await expect(page.getByRole("heading", { name: "Careers site unavailable" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Staff Platform Engineer" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});
