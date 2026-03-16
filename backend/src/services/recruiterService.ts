import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { dbService } from "./database";

const SALT_ROUNDS = 10;
const FREE_PLAN_VIEW_LIMIT = 10;
const PRO_OUTREACH_LIMIT = 50;

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev_secret";
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export class RecruiterService {
  async signup(email: string, password: string, companyName: string, companySize?: string): Promise<{
    token: string;
    recruiter: { id: number; email: string; companyName: string; plan: string };
  }> {
    if (!email || !password || !companyName) {
      throw new Error("Email, password, and company name are required");
    }
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const existing = await dbService.getRecruiterByEmail(email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const row = await dbService.createRecruiter(email, passwordHash, companyName, companySize);

    const token = jwt.sign(
      { role: "recruiter", recruiterId: row.id, email: row.email },
      getJwtSecret(),
      { expiresIn: "30d" }
    );

    return {
      token,
      recruiter: {
        id: row.id,
        email: row.email,
        companyName: row.company_name,
        plan: row.plan,
      },
    };
  }

  async login(email: string, password: string): Promise<{
    token: string;
    recruiter: { id: number; email: string; companyName: string; plan: string };
  }> {
    const row = await dbService.getRecruiterByEmail(email);
    if (!row) {
      throw new Error("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    await dbService.updateRecruiterLastLogin(row.id);

    const token = jwt.sign(
      { role: "recruiter", recruiterId: row.id, email: row.email },
      getJwtSecret(),
      { expiresIn: "30d" }
    );

    return {
      token,
      recruiter: {
        id: row.id,
        email: row.email,
        companyName: row.company_name,
        plan: row.plan,
      },
    };
  }

  async checkViewLimit(recruiterId: number, plan: string): Promise<{ allowed: boolean; viewsUsed: number; viewsLimit: number | null }> {
    if (plan === "pro" || plan === "enterprise") {
      return { allowed: true, viewsUsed: 0, viewsLimit: null };
    }
    const since = startOfMonth();
    const viewsUsed = await dbService.getRecruiterViewCount(recruiterId, since);
    const allowed = viewsUsed < FREE_PLAN_VIEW_LIMIT;
    return { allowed, viewsUsed, viewsLimit: FREE_PLAN_VIEW_LIMIT };
  }

  async checkOutreachLimit(recruiterId: number, plan: string): Promise<{ allowed: boolean; outreachUsed: number; outreachLimit: number | null }> {
    if (plan === "enterprise") {
      return { allowed: true, outreachUsed: 0, outreachLimit: null };
    }
    if (plan === "free") {
      return { allowed: false, outreachUsed: 0, outreachLimit: 0 };
    }
    const since = startOfMonth();
    const outreachUsed = await dbService.getOutreachCount(recruiterId, since);
    const allowed = outreachUsed < PRO_OUTREACH_LIMIT;
    return { allowed, outreachUsed, outreachLimit: PRO_OUTREACH_LIMIT };
  }
}

export const recruiterService = new RecruiterService();
