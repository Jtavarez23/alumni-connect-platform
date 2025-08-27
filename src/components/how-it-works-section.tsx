import { Upload, UserCheck, Shield, Network } from "lucide-react";

const steps = [
  {
    step: 1,
    title: "Upload or Find Your Yearbook",
    description: "Search our database or upload your own",
    icon: Upload
  },
  {
    step: 2,
    title: "Claim Your Profile", 
    description: "Find yourself and link your social accounts",
    icon: UserCheck
  },
  {
    step: 3,
    title: "Connect & Verify",
    description: "Get verified by classmates you trust",
    icon: Shield
  },
  {
    step: 4,
    title: "Grow Your Network",
    description: "Discover professional opportunities with alumni",
    icon: Network
  }
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Getting started is simple. Follow these four steps to reconnect with your past and build your future.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.step}
                className="relative text-center fade-in-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Connection Line (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent z-0" />
                )}

                {/* Step Content */}
                <div className="relative z-10">
                  {/* Step Number */}
                  <div className="w-24 h-24 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <span className="text-2xl font-bold text-white">{step.step}</span>
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent size={32} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;