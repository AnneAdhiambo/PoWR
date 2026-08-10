import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { readDeveloperSession } from "../src/middleware/requireDeveloper";

function request(authorization?: string, cookie?: string): Request {
  return {
    headers: { authorization, cookie },
  } as Request;
}

describe("developer authentication", () => {
  it("accepts the SPA bearer session", () => {
    expect(readDeveloperSession(request("Bearer signed-powr-session"))).toBe("signed-powr-session");
  });

  it("keeps cookie sessions as a same-site fallback", () => {
    expect(readDeveloperSession(request(undefined, "powr_developer_session=cookie-session"))).toBe("cookie-session");
  });

  it("prefers an explicit bearer session over a cookie", () => {
    expect(readDeveloperSession(request("Bearer bearer-session", "powr_developer_session=cookie-session"))).toBe("bearer-session");
  });
});
