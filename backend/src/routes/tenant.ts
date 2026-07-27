import express from "express";
import { dbService } from "../services/database";

const router = express.Router();

router.get("/context", async (req, res) => {
  try {
    const developmentHostname = process.env.NODE_ENV === "development" && process.env.ALLOW_TENANT_HEADER === "true"
      ? req.headers["x-powr-hostname"]
      : undefined;
    const hostname = String(developmentHostname || req.hostname || "")
      .toLowerCase()
      .split(":")[0];
    const organization = await dbService.getOrganizationByHostname(hostname);
    if (!organization) return res.status(404).json({ error: "Tenant not found" });
    res.json({ organization });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
