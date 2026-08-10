import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { dbService } from "../services/database";
import { rateLimit } from "../middleware/rateLimit";
import { DeveloperJwtPayload, requireDeveloper } from "../middleware/requireDeveloper";

const router = express.Router();
const oauthRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "developer-oauth" });

// GitHub OAuth initiation
router.get("/github", oauthRateLimit, (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || "http://localhost:3001/api/auth/github/callback";
  const scope = "read:user public_repo";
  
  if (!clientId || clientId === "your_github_client_id") {
    return res.status(500).json({ 
      error: "GitHub OAuth not configured",
      message: "Please set GITHUB_CLIENT_ID in backend/.env file. See GITHUB_APP_SETUP.md for instructions."
    });
  }
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  
  res.redirect(githubAuthUrl);
});

// GitHub OAuth callback
router.get("/github/callback", oauthRateLimit, async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: "No authorization code provided" });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    
    // GitHub returns errors as 200 with an `error` field
    if (tokenResponse.data.error) {
      console.error("[Auth] GitHub token exchange error:", tokenResponse.data);
      return res.status(400).json({
        error: "GitHub token exchange failed",
        reason: tokenResponse.data.error_description || tokenResponse.data.error,
      });
    }

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      console.error("[Auth] No access_token in GitHub response:", tokenResponse.data);
      return res.status(400).json({ error: "Failed to obtain access token" });
    }
    
    // Get user info from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${access_token}`,
      },
    });
    
    const user = userResponse.data;
    
    // Store user and token in database
    await dbService.upsertUser(user.login, user.id, access_token);
    const sessionVersion = await dbService.rotateDeveloperSession(user.login);
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(500).json({ error: "JWT_SECRET is not configured" });
    const session = jwt.sign({ role: "developer", username: user.login, sessionVersion }, jwtSecret, { expiresIn: "7d" });
    res.cookie("powr_developer_session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectUrl = `${frontendUrl}/auth/callback?username=${encodeURIComponent(user.login)}`;
    
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("[Auth] GitHub OAuth error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Authentication failed",
      reason: error.response?.data?.message || error.message,
    });
  }
});

// Validate GitHub token
router.get("/validate", async (req, res) => {
  try {
    const cookies = String(req.headers.cookie || "").split(";");
    const session = cookies.find((cookie) => cookie.trim().startsWith("powr_developer_session="))?.trim().split("=")[1];
    if (!session) return res.status(401).json({ valid: false, error: "Session required" });
    try {
      const payload = jwt.verify(decodeURIComponent(session), process.env.JWT_SECRET || "") as DeveloperJwtPayload;
      if (payload.role !== "developer") return res.status(403).json({ valid: false, error: "Developer session required" });
      const currentVersion = await dbService.getDeveloperSessionVersion(payload.username);
      if (currentVersion === null || currentVersion !== payload.sessionVersion) return res.status(401).json({ valid: false, error: "Session revoked" });
      res.json({ valid: true, user: payload.username });
    } catch {
      res.status(401).json({ valid: false, error: "Session expired or invalid" });
    }
  } catch (error: any) {
    console.error("Token validation error:", error);
    res.status(500).json({ valid: false, error: "Validation failed" });
  }
});

router.post("/logout", requireDeveloper, async (req, res) => {
  const { username } = (req as any).developer as DeveloperJwtPayload;
  await dbService.rotateDeveloperSession(username);
  res.clearCookie("powr_developer_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  res.json({ success: true });
});

export default router;

