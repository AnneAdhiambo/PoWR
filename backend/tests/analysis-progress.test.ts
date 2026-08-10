import { beforeEach, describe, expect, it, vi } from "vitest";

const { databaseMock } = vi.hoisted(() => ({
  databaseMock: {
    setAnalysisProgress: vi.fn(),
    getAnalysisProgress: vi.fn(),
  },
}));

vi.mock("../src/services/database", () => ({ dbService: databaseMock }));

import { progressTracker } from "../src/services/progressTracker";

describe("analysis progress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists running progress", async () => {
    await progressTracker.setProgress("anne", "repositories", "Reviewing repositories…", 30);

    expect(databaseMock.setAnalysisProgress).toHaveBeenCalledWith("anne", {
      status: "running",
      stage: "repositories",
      message: "Reviewing repositories…",
      progress: 30,
    });
  });

  it("persists completion instead of clearing it", async () => {
    await progressTracker.setProgress("anne", "complete", "Your evidence profile is ready", 100);

    expect(databaseMock.setAnalysisProgress).toHaveBeenCalledWith("anne", {
      status: "complete",
      stage: "complete",
      message: "Your evidence profile is ready",
      progress: 100,
    });
  });

  it("returns durable progress in the API shape", async () => {
    databaseMock.getAnalysisProgress.mockResolvedValue({
      username: "anne",
      status: "running",
      stage: "scoring",
      message: "Calculating contribution depth…",
      progress: 64,
      errorMessage: null,
      updatedAt: new Date(),
    });

    await expect(progressTracker.getProgress("anne")).resolves.toMatchObject({
      username: "anne",
      status: "running",
      stage: "scoring",
      progress: 64,
    });
  });
});
