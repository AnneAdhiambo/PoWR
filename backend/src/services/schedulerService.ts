import cron from "node-cron";
import { dbService } from "./database";
import { ArtifactIngestionService } from "./artifactIngestion";
import { AIAnalysisService } from "./aiAnalysis";
import { ScoringEngine } from "./scoringEngine";
import { blockchainService } from "./blockchain";
import { subscriptionService } from "./subscriptionService";

export class SchedulerService {
  private cronJobs: cron.ScheduledTask[] = [];

  start() {
    console.log("Starting scheduler service...");

    const dailyJob = cron.schedule("0 0 * * *", async () => {
      console.log("Processing scheduled updates...");
      const now = new Date();
      const scheduledUpdates = await dbService.getScheduledUpdates(now);
      
      const freeUpdates = scheduledUpdates.filter((u: any) => u.planType === "free");
      const basicUpdates = scheduledUpdates.filter((u: any) => u.planType === "basic");
      
      console.log(`Found ${freeUpdates.length} free plan updates and ${basicUpdates.length} basic plan updates due`);
      
      for (const update of scheduledUpdates) {
        try {
          await this.processScheduledUpdate(update.username, update.id);
        } catch (error) {
          console.error(
            `Failed to process scheduled update for ${update.username}:`,
            error
          );
          await dbService.markScheduledUpdateFailed(update.id);
        }
      }
    });
    this.cronJobs.push(dailyJob);

    console.log("Scheduler service started");
  }

  stop() {
    this.cronJobs.forEach((job) => job.stop());
    this.cronJobs = [];
    console.log("Scheduler service stopped");
  }

  private async processScheduledUpdate(username: string, scheduleId: number) {
    console.log(`Processing scheduled update for ${username}...`);

    const user = await dbService.getUser(username);
    if (!user || !user.access_token_encrypted) {
      throw new Error(`No access token found for user ${username}`);
    }

    const ingestionService = new ArtifactIngestionService(user.access_token_encrypted);
    const ingested = await ingestionService.ingestUserArtifacts(username, 12);
    const artifacts = ingestionService.normalizeArtifacts(ingested, username);

    await dbService.saveArtifacts(username, artifacts);

    const aiService = new AIAnalysisService();
    const aiExtraction = await aiService.extractSkills(
      username,
      artifacts,
      ingested.timeWindow
    );

    const scoringEngine = new ScoringEngine();
    const profile = await scoringEngine.generatePoWProfile(artifacts, aiExtraction);

    await dbService.saveProfile(username, profile, artifacts.length);

    try {
      const proof = await blockchainService.anchorSnapshot(artifacts, profile, username);
      await dbService.saveBlockchainProof(
        username,
        proof.txId,
        proof.artifactHash,
        0,
        Math.floor(Date.now() / 1000),
        proof.skillScores
      );
    } catch (error) {
      console.error(`Blockchain anchoring failed for ${username}:`, error);
    }

    await dbService.markScheduledUpdateComplete(scheduleId);

    const subscription = await subscriptionService.getUserPlan(username);
    if (subscription) {
      await subscriptionService.scheduleUpdate(username, subscription.planType as any);
    }

    console.log(`Completed scheduled update for ${username}`);
  }

  async rescheduleNextUpdate(username: string, planType: "free" | "basic" | "pro") {
    if (planType === "pro") {
      return;
    }

    const nextDate = subscriptionService.getNextUpdateDate(planType);
    if (nextDate) {
      await dbService.scheduleUpdate(username, nextDate, planType);
      await dbService.updateSubscription(username, { nextUpdateDate: nextDate });
    }
  }
}

export const schedulerService = new SchedulerService();
