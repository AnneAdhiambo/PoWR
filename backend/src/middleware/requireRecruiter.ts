import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface RecruiterJwtPayload {
  role: "recruiter";
  recruiterId: number;
  email: string;
}

export function requireRecruiter(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7);
  try {
    const secret = process.env.JWT_SECRET || "dev_secret";
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
