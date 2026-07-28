import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, clientQueryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  clientQueryMock: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

vi.mock("pg", () => ({
  Pool: class {
    query = queryMock;
    on() {}
    async connect() {
      return { query: clientQueryMock, release() {} };
    }
  },
}));

import { dbService } from "../src/services/database";

describe("organization-scoped sourcing persistence", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("scopes talent-list member reads to the active organization", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await dbService.getTalentListMembers(22, 91);

    expect(result).toBeNull();
    expect(queryMock.mock.calls[0][1]).toEqual([91, 22]);
    expect(queryMock.mock.calls[1][1]).toEqual([91, 22]);
  });

  it("prevents a cross-tenant talent-list mutation", async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const added = await dbService.addTalentListMember(22, 91, "alice", 7);

    expect(added).toBe(false);
    expect(queryMock.mock.calls[0][1]).toEqual([91, 22, "alice", 7]);
    expect(queryMock.mock.calls[0][0]).toContain("tl.organization_id = $2");
  });

  it("authorizes job deletion at organization level", async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 1 });

    const deleted = await dbService.deleteJob(44, 22);

    expect(deleted).toBe(true);
    expect(queryMock).toHaveBeenCalledWith(
      "DELETE FROM jobs WHERE id = $1 AND organization_id = $2",
      [44, 22]
    );
  });

  it("requires contact consent in addition to discovery consent", async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });

    expect(await dbService.canDiscoverDeveloper("alice", true)).toBe(false);
    expect(queryMock.mock.calls[0][1]).toEqual(["alice", true]);
    expect(queryMock.mock.calls[0][0]).toContain("contactable = TRUE");
  });
});
