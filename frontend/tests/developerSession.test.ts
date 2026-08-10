import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDeveloperSession,
  developerAuthHeaders,
  getDeveloperSession,
  setDeveloperSession,
} from "../app/lib/developerSession";

describe("developer session", () => {
  beforeEach(() => localStorage.clear());

  it("stores and sends the PoWR bearer session", () => {
    setDeveloperSession("signed-powr-session");

    expect(getDeveloperSession()).toBe("signed-powr-session");
    expect(developerAuthHeaders()).toEqual({ Authorization: "Bearer signed-powr-session" });
  });

  it("clears the session on logout", () => {
    setDeveloperSession("signed-powr-session");
    clearDeveloperSession();

    expect(getDeveloperSession()).toBeNull();
    expect(developerAuthHeaders()).toEqual({});
  });
});
