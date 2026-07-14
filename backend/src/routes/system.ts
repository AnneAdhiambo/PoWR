import express from "express";
import { blockchainService } from "../services/blockchain";
import { dbService } from "../services/database";

const router = express.Router();

// Get system status
router.get("/status", async (req, res) => {
    const blockchainConfigured = blockchainService.isConfigured();

    const blockchainStatus = {
        configured: blockchainConfigured,
        network: process.env.STACKS_NETWORK === "mainnet" ? "Stacks Mainnet" : "Stacks Testnet",
        connected: blockchainConfigured,
        registryContract: process.env.POWR_REGISTRY_CONTRACT_ADDRESS
            ? `${process.env.POWR_REGISTRY_CONTRACT_ADDRESS}.powr-registry`
            : "not configured",
        badgesContract: process.env.POWR_BADGES_CONTRACT_ADDRESS
            ? `${process.env.POWR_BADGES_CONTRACT_ADDRESS}.powr-badges`
            : "not configured",
        error: null as string | null
    };

    // Check DB
    let dbStatus = "unknown";
    try {
        // efficient check
        await dbService.getUser("test");
        dbStatus = "connected";
    } catch (e) {
        dbStatus = "error";
    }

    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        database: dbStatus,
        blockchain: blockchainStatus,
        env: {
            node_env: process.env.NODE_ENV,
            has_oracle_key: !!process.env.STACKS_ORACLE_PRIVATE_KEY
        }
    });
});

export default router;
