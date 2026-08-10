import { dbService } from "./database";

export interface ProgressState {
  username: string;
  status: "running" | "complete" | "failed";
  stage: string;
  message: string;
  progress: number;
  updatedAt: string;
}

const STALE_ANALYSIS_MS = 30 * 60 * 1000;

class ProgressTrackerService {
  async setProgress(username: string, stage: string, message: string, progress: number) {
    await dbService.setAnalysisProgress(username, {
      status: stage === "complete" ? "complete" : "running",
      stage,
      message,
      progress,
    });
  }

  async failProgress(username: string, message: string, error?: unknown) {
    const previous = await dbService.getAnalysisProgress(username);
    const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;
    await dbService.setAnalysisProgress(username, {
      status: "failed",
      stage: "failed",
      message,
      progress: previous?.progress || 0,
      errorMessage,
    });
  }

  async getProgress(username: string): Promise<ProgressState | null> {
    const progress = await dbService.getAnalysisProgress(username);
    if (!progress) return null;

    if (progress.status === "running" && Date.now() - progress.updatedAt.getTime() > STALE_ANALYSIS_MS) {
      await this.failProgress(username, "Analysis was interrupted before it finished. You can retry safely.");
      return this.getProgress(username);
    }

    return {
      username: progress.username,
      status: progress.status,
      stage: progress.stage,
      message: progress.message,
      progress: progress.progress,
      updatedAt: progress.updatedAt.toISOString(),
    };
  }
}

export const progressTracker = new ProgressTrackerService();
