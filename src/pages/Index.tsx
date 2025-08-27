import Navigation from "@/components/ui/navigation";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import SocialProofSection from "@/components/social-proof-section";
import HowItWorksSection from "@/components/how-it-works-section";
import PricingSection from "@/components/pricing-section";
import Footer from "@/components/footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <SocialProofSection />
        <HowItWorksSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
