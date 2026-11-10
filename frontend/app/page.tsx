import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Showcase } from "@/components/marketing/showcase";
import { UseCases } from "@/components/marketing/use-cases";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata = {
  title: "DeadlineOS — Your AI-Powered Opportunity Inbox",
  description:
    "Stop missing internship, scholarship, hackathon, and job deadlines. DeadlineOS captures any opportunity and organizes it with AI-extracted details, smart reminders, and a clean dashboard.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-base text-ink">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Showcase />
      <UseCases />
      <FooterCta />
      <SiteFooter />
    </div>
  );
}
