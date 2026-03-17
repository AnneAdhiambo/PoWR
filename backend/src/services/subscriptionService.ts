import { dbService } from "./database";

export type PlanType = "free" | "basic" | "pro";

export interface SubscriptionPlan {
  type: PlanType;
  name: string;
  price: number;
  priceInStx: string;
  priceInCrypto: {
    usdc: string;
  };
  updateFrequency: string;
  features: string[];
}

export class SubscriptionService {
  private static readonly PLANS: Record<PlanType, SubscriptionPlan> = {
    free: {
      type: "free",
      name: "Free",
      price: 0,
      priceInStx: "0",
      priceInCrypto: { usdc: "0" },
      updateFrequency: "Every two weeks",
      features: [
        "Basic PoW profile",
        "Onchain proofs",
        "Public profile page",
      ],
    },
    basic: {
      type: "basic",
      name: "Basic",
      price: 6,
      priceInStx: "20",
      priceInCrypto: { usdc: "6" },
      updateFrequency: "Weekly (every Monday)",
      features: [
        "All free features",
        "Weekly profile updates",
        "Priority support",
      ],
    },
    pro: {
      type: "pro",
      name: "Pro",
      price: 15,
      priceInStx: "50",
      priceInCrypto: { usdc: "15" },
      updateFrequency: "Real-time (GitHub webhooks)",
      features: [
        "All basic features",
        "Real-time updates on commits/PRs",
        "Advanced analytics",
        "API access",
      ],
    },
  };

  getAvailablePlans(): SubscriptionPlan[] {
    return Object.values(SubscriptionService.PLANS).map((plan) => ({
      ...plan,
      priceInCrypto: { ...plan.priceInCrypto },
    }));
  }

  getPlan(planType: PlanType): SubscriptionPlan {
    return SubscriptionService.PLANS[planType];
  }

  async getUserPlan(username: string): Promise<any> {
    return await dbService.getSubscription(username);
  }

  async ensureFreePlan(username: string): Promise<any> {
    let subscription = await dbService.getSubscription(username);
    if (!subscription) {
      await dbService.createSubscription(username, "free");
      subscription = await dbService.getSubscription(username);
    }
    return subscription;
  }

  async upgradePlan(
    username: string,
    planType: PlanType,
    paymentTxHash: string
  ): Promise<void> {
    const payment = await dbService.getPaymentTransaction(paymentTxHash);
    if (!payment || payment.status !== "confirmed") {
      throw new Error("Payment not confirmed");
    }

    const nextUpdateDate = this.getNextUpdateDate(planType);
    await dbService.createSubscription(username, planType, undefined, paymentTxHash);
    await dbService.updateSubscription(username, {
      nextUpdateDate: nextUpdateDate ?? undefined,
    });

    await this.scheduleUpdate(username, planType);
  }

  async cancelPlan(username: string): Promise<void> {
    await dbService.cancelSubscription(username);
  }

  async scheduleUpdate(username: string, planType: PlanType): Promise<void> {
    const nextDate = this.getNextUpdateDate(planType);
    if (nextDate) {
      await dbService.scheduleUpdate(username, nextDate, planType);
      await dbService.updateSubscription(username, { nextUpdateDate: nextDate });
    }
  }

  getNextUpdateDate(planType: PlanType): Date | null {
    const now = new Date();
    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    switch (planType) {
      case "free":
        const twoWeeksFromNow = new Date(utcNow);
        twoWeeksFromNow.setUTCDate(utcNow.getUTCDate() + 14);
        twoWeeksFromNow.setUTCHours(0, 0, 0, 0);
        return twoWeeksFromNow;

      case "basic":
        const daysUntilMonday = (8 - utcNow.getUTCDay()) % 7 || 7;
        const nextMonday = new Date(utcNow);
        nextMonday.setUTCDate(utcNow.getUTCDate() + daysUntilMonday);
        nextMonday.setUTCHours(0, 0, 0, 0);
        return nextMonday;

      case "pro":
        return null;

      default:
        return null;
    }
  }

  async canUserUpdate(username: string): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getUserPlan(username);

    // No subscription = first time user, always allow
    if (!subscription) {
      return { allowed: true };
    }

    const planType = subscription.planType as PlanType;

    // Pro users always allowed
    if (planType === "pro") {
      return { allowed: true };
    }

    if (planType === "free" || planType === "basic") {
      const now = new Date();
      const nextUpdate = subscription.nextUpdateDate
        ? new Date(subscription.nextUpdateDate)
        : null;

      // No scheduled update yet = first analysis, allow
      if (!nextUpdate) {
        return { allowed: true };
      }

      const timeDiff = nextUpdate.getTime() - now.getTime();
      const hoursUntilUpdate = timeDiff / (1000 * 60 * 60);

      // Allow if within 24 hours of scheduled update (before or after)
      if (hoursUntilUpdate <= 24 && hoursUntilUpdate >= -24) {
        return { allowed: true };
      }

      // Also allow if update was scheduled in the past (missed update)
      if (hoursUntilUpdate < -24) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `Next update scheduled for ${nextUpdate.toLocaleDateString()}`,
      };
    }

    // Unknown plan type - allow to prevent blocking users
    return { allowed: true };
  }
}

export const subscriptionService = new SubscriptionService();
