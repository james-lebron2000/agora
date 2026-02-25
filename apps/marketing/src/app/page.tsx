import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Tokenomics } from "@/components/Tokenomics";
import { Roadmap } from "@/components/Roadmap";
import { Team } from "@/components/Team";
import { DeveloperCTA, InvestorCTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Navigation />
      <Hero />
      <Features />
      <Tokenomics />
      <Roadmap />
      <Team />
      <DeveloperCTA />
      <InvestorCTA />
      <Footer />
    </main>
  );
}
