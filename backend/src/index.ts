// Force IPv4 DNS resolution — required in WSL2 where IPv6 is unreachable
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "https://powr-xi.vercel.app",
  process.env.FRONTEND_URL?.replace(/\/$/, ""), // Remove trailing slash
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Check if origin is allowed (strip trailing slash for comparison)
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.some(allowed => allowed === normalizedOrigin)) {
      return callback(null, origin);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import subscriptionRoutes from "./routes/subscription";
import paymentRoutes from "./routes/payments";
import webhookRoutes from "./routes/webhooks";
import systemRoutes from "./routes/system";
import recruiterRoutes from "./routes/recruiter";
import badgeRoutes from "./routes/badges";

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/badges", badgeRoutes);

// Start scheduler service
import { schedulerService } from "./services/schedulerService";
schedulerService.start();

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

