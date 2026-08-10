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
    clientQueryMock.mockReset();
    clientQueryMock.mockResolvedValue({ rows: [], rowCount: 0 });
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

  it("scopes applications to the tenant organization", async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });

    await dbService.createJobApplication(44, 22, "alice", "alice@example.com", undefined, true, "00000000-0000-0000-0000-000000000001", {}, []);

    expect(queryMock.mock.calls[0][0]).toContain("j.organization_id = $2");
    expect(queryMock.mock.calls[0][1].slice(0, 3)).toEqual([44, 22, "alice"]);
  });

  it("updates and duplicates jobs only inside the resolved organization", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 44 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 45, title: "Copy" }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 45 }], rowCount: 1 });

    await dbService.updateJob(44, 22, { status: "paused" });
    await dbService.duplicateJob(44, 22, 7);

    expect(queryMock.mock.calls[0][0]).toContain("organization_id = $2");
    expect(queryMock.mock.calls[0][1].slice(0, 2)).toEqual([44, 22]);
    expect(queryMock.mock.calls[1][0]).toContain("j.organization_id = $2");
    expect(queryMock.mock.calls[1][1]).toEqual([44, 22, 7]);
  });

  it("revokes discovery and removes retained sourcing access with application consent", async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 9, developer_username: "alice" }], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 });

    await dbService.updateDeveloperApplication("00000000-0000-0000-0000-000000000001", "revoke_consent");

    const sql = clientQueryMock.mock.calls.map(([statement]) => statement).join("\n");
    expect(sql).toContain("discoverable = FALSE");
    expect(sql).toContain("DELETE FROM organization_talent_list_members");
    expect(sql).toContain("DELETE FROM job_sourced_candidates");
    expect(sql).toContain("COMMIT");
  });
});
