import { Users, ShieldCheck, Share2, TrendingUp } from "lucide-react";

const features = [
  {
    title: "Find Your People",
    description: "AI-powered search finds your classmates across decades",
    icon: Users,
    color: "primary"
  },
  {
    title: "Verify Connections",
    description: "Peer verification ensures authentic school connections",
    icon: ShieldCheck,
    color: "success"
  },
  {
    title: "Stay Connected",
    description: "Link LinkedIn, Instagram, and Facebook profiles",
    icon: Share2,
    color: "secondary"
  },
  {
    title: "Professional Growth",
    description: "Build your alumni network for career opportunities",
    icon: TrendingUp,
    color: "accent"
  }
];

const colorClasses = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  secondary: "text-secondary bg-secondary/10",
  accent: "text-accent bg-accent/10"
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Everything you need to <span className="gradient-text">reconnect</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From finding old friends to building professional networks, YearbookConnect makes meaningful connections simple and secure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl glass-card hover-scale border-0 shadow-lg"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  boxShadow: "var(--shadow-soft)"
                }}
              >
                <div className={`w-16 h-16 rounded-xl ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-6 mx-auto`}>
                  <IconComponent size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;