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
