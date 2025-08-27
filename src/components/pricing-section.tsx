import { Button } from "./ui/button";
import { Check } from "lucide-react";

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "Access 1 yearbook",
      "Basic profile",
      "Connect with classmates",
      "Send friend requests"
    ],
    cta: "Get Started",
    highlighted: false
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "per month",
    features: [
      "Unlimited yearbook access",
      "Advanced search",
      "Social media integration",
      "Verification badge",
      "Priority support"
    ],
    cta: "Start Free Trial",
    highlighted: true
  },
  {
    name: "School",
    price: "$299",
    period: "per year",
    features: [
      "Bulk upload tools",
      "Alumni analytics",
      "Custom branding",
      "Event management",
      "Dedicated support"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Simple, <span className="gradient-text">transparent</span> pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative p-8 rounded-2xl border-2 hover-scale fade-in-up ${
                tier.highlighted
                  ? "border-primary bg-gradient-to-b from-primary/5 to-primary/10 shadow-2xl"
                  : "border-border bg-card"
              }`}
              style={{ 
                animationDelay: `${index * 0.2}s`,
                boxShadow: tier.highlighted ? "var(--shadow-strong)" : "var(--shadow-soft)"
              }}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period !== "forever" && (
                    <span className="text-muted-foreground ml-1">/{tier.period.split(" ")[1]}</span>
                  )}
                </div>
                <p className="text-muted-foreground">{tier.period}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check size={20} className="text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={`w-full ${
                  tier.highlighted
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                    : ""
                }`}
                variant={tier.highlighted ? "default" : "outline"}
                size="lg"
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;