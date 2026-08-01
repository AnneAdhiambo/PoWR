import { LandingPage } from "./components/marketing/LandingPage";
import { MarketingLayout } from "./components/marketing/MarketingLayout";

export default function Home() {
  return (
    <MarketingLayout>
      <LandingPage />
    </MarketingLayout>
  );
}
