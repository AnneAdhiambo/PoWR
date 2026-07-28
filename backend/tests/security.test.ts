import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const { databaseMock } = vi.hoisted(() => ({
  databaseMock: {
    getRecruiterSessionVersion: vi.fn(),
    getDeveloperSessionVersion: vi.fn(),
    getOrganizationForRecruiter: vi.fn(),
  },
}));

vi.mock("../src/services/database", () => ({ dbService: databaseMock }));

import { requireRecruiter, requireOrganizationRole } from "../src/middleware/requireRecruiter";
import { requireDeveloper } from "../src/middleware/requireDeveloper";

function responseMock() {
  const response: any = {};
  response.status = vi.fn(() => response);
  response.json = vi.fn(() => response);
  return response;
}

describe("session and role authorization", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-security-secret";
    vi.clearAllMocks();
  });

  it("accepts the current recruiter session version", async () => {
    databaseMock.getRecruiterSessionVersion.mockResolvedValue(3);
    const token = jwt.sign({ role: "recruiter", recruiterId: 7, email: "owner@example.com", sessionVersion: 3 }, process.env.JWT_SECRET!);
    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const response = responseMock();
    const next = vi.fn();

    await requireRecruiter(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(request.recruiter.recruiterId).toBe(7);
  });

  it("rejects a revoked recruiter session", async () => {
    databaseMock.getRecruiterSessionVersion.mockResolvedValue(4);
    const token = jwt.sign({ role: "recruiter", recruiterId: 7, email: "owner@example.com", sessionVersion: 3 }, process.env.JWT_SECRET!);
    const response = responseMock();

    await requireRecruiter({ headers: { authorization: `Bearer ${token}` } } as any, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Session revoked" });
  });

  it("rejects a revoked developer session", async () => {
    databaseMock.getDeveloperSessionVersion.mockResolvedValue(2);
    const token = jwt.sign({ role: "developer", username: "anne", sessionVersion: 1 }, process.env.JWT_SECRET!);
    const response = responseMock();

    await requireDeveloper({ headers: { cookie: `powr_developer_session=${encodeURIComponent(token)}` } } as any, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("enforces organization role allow and deny behavior", () => {
    const middleware = requireOrganizationRole("owner", "admin");
    const allowedNext = vi.fn();
    middleware({ organization: { organizationId: 1, role: "owner" } } as any, responseMock(), allowedNext);
    expect(allowedNext).toHaveBeenCalledOnce();

    const deniedResponse = responseMock();
    middleware({ organization: { organizationId: 1, role: "interviewer" } } as any, deniedResponse, vi.fn());
    expect(deniedResponse.status).toHaveBeenCalledWith(403);
  });
});
