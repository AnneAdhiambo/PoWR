import { describe, expect, it, vi } from "vitest";

vi.mock("pg", () => ({
  Pool: class {
    query = vi.fn();
    on() {}
    async connect() {
      return {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release() {},
      };
    }
  },
}));

import { calculateJobMatch } from "../src/services/database";

describe("job-specific sourcing match", () => {
  it("keeps job match separate from the PoWR score", () => {
    const result = calculateJobMatch(
      ["TypeScript", "PostgreSQL"],
      91,
      {
        requiredSkills: ["TypeScript", "Go"],
        preferredSkills: ["PostgreSQL"],
        minimumPowrScore: 80,
      }
    );

    expect(result.jobMatchScore).toBe(70);
    expect(result.jobMatchScore).not.toBe(91);
    expect(result.explanation).toEqual({
      matchedRequiredSkills: ["typescript"],
      missingRequiredSkills: ["go"],
      matchedPreferredSkills: ["postgresql"],
      requiredSkillCoverage: 50,
    });
  });

  it("explains a complete requirements match", () => {
    const result = calculateJobMatch(
      ["Rust", "Systems Design"],
      80,
      {
        requiredSkills: ["Rust"],
        preferredSkills: ["Systems Design"],
      }
    );

    expect(result.jobMatchScore).toBe(96);
    expect(result.explanation.missingRequiredSkills).toEqual([]);
  });
});
