import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { dbService } from "../services/database";

export interface RecruiterJwtPayload {
  role: "recruiter";
  recruiterId: number;
  email: string;
}

export interface OrganizationContext {
  organizationId: number;
  role: "owner" | "admin" | "recruiter" | "hiring_manager" | "interviewer";
}

function readCookie(req: Request, name: string): string | null {
  const cookie = String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export function requireRecruiter(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ")
    ? auth.slice(7)
    : readCookie(req, "powr_recruiter_session");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }
    const payload = jwt.verify(token, secret) as RecruiterJwtPayload;
    if (payload.role !== "recruiter") {
      return res.status(403).json({ error: "Forbidden: recruiter access required" });
    }
    (req as any).recruiter = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireOrganizationMember(req: Request, res: Response, next: NextFunction) {
  try {
    const recruiter = (req as any).recruiter as RecruiterJwtPayload | undefined;
    if (!recruiter) return res.status(401).json({ error: "Recruiter authentication required" });
    const organization = await dbService.getOrganizationForRecruiter(recruiter.recruiterId);
    if (!organization) return res.status(403).json({ error: "No active organization membership" });
    (req as any).organization = {
      organizationId: organization.organization_id,
      role: organization.role as OrganizationContext["role"],
    } satisfies OrganizationContext;
    next();
  } catch (error) {
    console.error("[Auth] Organization lookup failed:", error);
    res.status(500).json({ error: "Unable to resolve organization context" });
  }
}

export function requireOrganizationRole(...roles: OrganizationContext["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const organization = (req as any).organization as OrganizationContext | undefined;
    if (!organization || !roles.includes(organization.role)) {
      return res.status(403).json({ error: "Insufficient organization permissions" });
    }
    next();
  };
}
