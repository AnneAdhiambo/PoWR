import { test, expect } from "@playwright/test";

/**
 * E2E tests for the On-Chain Proofs panel.
 *
 * These tests run against the Next.js dev server (baseURL configured in
 * playwright.config.ts) and mock the backend API so no real blockchain
 * calls are made.
 */

const MOCK_PROOFS = [
  {
    id: 1,
    transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    artifactHash: "a".repeat(64),
    stacksBlockHeight: 500,
    timestamp: 1700000000,
    skillScores: [85, 72, 60, 90],
  },
  {
    id: 2,
    transactionHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    artifactHash: "b".repeat(64),
    stacksBlockHeight: 450,
    timestamp: 1699000000,
    skillScores: [80, 68, 55, 88],
  },
];

test.describe("OnChainProofs panel", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API that returns proofs for the dashboard
    await page.route("**/api/user/proofs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ proofs: MOCK_PROOFS }),
      });
    });

    // Mock the Stacks node read-only call (verify-snapshot)
    await page.route("**/v2/contracts/call-read/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ okay: true, result: "0x03" }), // Clarity true
      });
    });
  });

  test("shows the On-Chain Proofs heading", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("On-Chain Proofs")).toBeVisible();
  });

  test("displays the correct network label (Stacks Devnet)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/Stacks (Devnet|Testnet|Mainnet)/)).toBeVisible();
  });

  test("shows the latest snapshot with skill scores", async ({ page }) => {
    await page.goto("/dashboard");
    // All four skill scores from the first proof should render
    for (const score of [85, 72, 60, 90]) {
      await expect(page.getByText(String(score))).toBeVisible();
    }
  });

  test("'View TX' link points to Hiro Explorer", async ({ page }) => {
    await page.goto("/dashboard");
    const viewTxLink = page.getByRole("link", { name: /View TX/i }).first();
    await expect(viewTxLink).toHaveAttribute("href", /explorer\.hiro\.so/);
    await expect(viewTxLink).toHaveAttribute("href", /0xabcdef/);
  });

  test("block height link points to Hiro Explorer block URL", async ({ page }) => {
    await page.goto("/dashboard");
    const blockLink = page.getByRole("link", { name: /#500/ });
    await expect(blockLink).toHaveAttribute("href", /explorer\.hiro\.so.*500/);
  });

  test("contract link opens Hiro Explorer", async ({ page }) => {
    await page.goto("/dashboard");
    const contractLinks = page.locator('a[href*="explorer.hiro.so"]');
    await expect(contractLinks.first()).toBeVisible();
  });

  test("'View All' navigates to /proofs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "View All" }).click();
    await expect(page).toHaveURL(/\/proofs/);
  });

  test("shows 'No on-chain proofs yet' when proofs list is empty", async ({ page }) => {
    await page.route("**/api/user/proofs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ proofs: [] }),
      });
    });
    await page.goto("/dashboard");
    await expect(page.getByText(/No on-chain proofs yet/i)).toBeVisible();
  });
});

test.describe("proof hash verification", () => {
  test("shows 'On-Chain Verified' badge when hash is confirmed", async ({ page }) => {
    await page.route("**/api/user/proofs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ proofs: [MOCK_PROOFS[0]] }),
      });
    });

    // Stacks node confirms hash is anchored
    await page.route("**/v2/contracts/call-read/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ okay: true, result: "0x03" }), // true
      });
    });

    await page.goto("/dashboard");
    await expect(page.getByText("On-Chain Verified")).toBeVisible({ timeout: 10000 });
  });
});
