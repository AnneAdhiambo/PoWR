import express from "express";
import { dbService } from "../services/database";

const router = express.Router();

router.get("/context", async (req, res) => {
  try {
    const hostname = String(req.headers["x-powr-hostname"] || req.hostname || "")
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
