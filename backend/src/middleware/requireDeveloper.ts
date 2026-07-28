import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { dbService } from "../services/database";

export interface DeveloperJwtPayload {
  role: "developer";
  username: string;
  sessionVersion: number;
}

function readCookie(req: Request, name: string): string | undefined {
  const cookies = String(req.headers.cookie || "").split(";");
  const match = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.trim().slice(name.length + 1)) : undefined;
}

export async function requireDeveloper(req: Request, res: Response, next: NextFunction) {
  const token = readCookie(req, "powr_developer_session");
  if (!token) return res.status(401).json({ error: "Developer authentication required" });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "JWT_SECRET is not configured" });
    const payload = jwt.verify(token, secret) as DeveloperJwtPayload;
    if (payload.role !== "developer" || !payload.username) return res.status(403).json({ error: "Developer access required" });
    const currentVersion = await dbService.getDeveloperSessionVersion(payload.username);
    if (currentVersion === null || currentVersion !== payload.sessionVersion) return res.status(401).json({ error: "Developer session revoked" });
    (req as any).developer = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired developer session" });
  }
}
