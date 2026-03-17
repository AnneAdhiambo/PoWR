import express from "express";
import axios from "axios";
import { dbService } from "../services/database";

const router = express.Router();

// GitHub OAuth initiation
router.get("/github", (req, res) => {
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
router.get("/github/callback", async (req, res) => {
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
    
    // Redirect to frontend with token in query params
    // In production, use JWT tokens and secure session management
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectUrl = `${frontendUrl}/auth/callback?token=${access_token}&username=${user.login}`;
    
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
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ valid: false, error: "Token required" });
    }

    // Validate token by making a test API call to GitHub
    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      
      // Token is valid
      res.json({ valid: true, user: response.data.login });
    } catch (error: any) {
      // Token is invalid or expired
      if (error.response?.status === 401) {
        res.json({ valid: false, error: "Token expired or invalid" });
      } else {
        res.status(500).json({ valid: false, error: "Error validating token" });
      }
    }
  } catch (error: any) {
    console.error("Token validation error:", error);
    res.status(500).json({ valid: false, error: "Validation failed" });
  }
});

export default router;

