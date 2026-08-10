import { describe, expect, it } from "vitest";
import { CURATED_OPEN_SOURCE_PROJECTS } from "../src/data/openSourceProjects";

describe("Open Source Network catalog", () => {
  it("ships at least one hundred unique curated repositories", () => {
    expect(CURATED_OPEN_SOURCE_PROJECTS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(CURATED_OPEN_SOURCE_PROJECTS).size).toBe(CURATED_OPEN_SOURCE_PROJECTS.length);
  });

  it("uses valid GitHub owner/repository identifiers", () => {
    for (const repository of CURATED_OPEN_SOURCE_PROJECTS) {
      expect(repository).toMatch(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    }
  });
});
