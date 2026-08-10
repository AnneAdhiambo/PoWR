import { beforeEach, describe, expect, it, vi } from "vitest";
import { recruiterApiClient } from "../app/lib/recruiterApi";

describe("recruiter session probes", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("recruiter_email", "recruiter@contoso.test");
    vi.restoreAllMocks();
  });

  it("does not broadcast logout when a passive auth-page probe returns 401", async () => {
    const logout = vi.fn();
    window.addEventListener("powr:recruiter-logout", logout);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )));

    await expect(recruiterApiClient.getMe({ passive: true })).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem("recruiter_email")).toBe("recruiter@contoso.test");
    expect(logout).not.toHaveBeenCalled();
    window.removeEventListener("powr:recruiter-logout", logout);
  });

  it("still clears state when protected session validation returns 401", async () => {
    const logout = vi.fn();
    window.addEventListener("powr:recruiter-logout", logout);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )));

    await expect(recruiterApiClient.getMe()).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem("recruiter_email")).toBeNull();
    expect(logout).toHaveBeenCalledOnce();
    window.removeEventListener("powr:recruiter-logout", logout);
  });
});

describe("recruiter sourcing requests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("recruiter_token", "token");
    vi.restoreAllMocks();
  });

  it("includes job context in talent search", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ developers: [], total: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await recruiterApiClient.searchDevelopers({ jobId: 42, skills: ["TypeScript"] });

    expect(fetchMock.mock.calls[0][0]).toContain("/api/recruiter/search?jobId=42&skills=TypeScript");
  });

  it("persists sourced candidates with their match snapshot", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ candidate: { developer_username: "alice" } }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await recruiterApiClient.addSourcedCandidateToJob(42, "alice", 91);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/recruiter/jobs/42/sourced-candidates");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: "alice", matchSnapshotId: 91 });
  });
});
