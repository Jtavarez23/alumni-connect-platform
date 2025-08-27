import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import heroYearbook from "@/assets/hero-yearbook.jpg";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/10 pt-16">
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left fade-in-up">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Your yearbook{" "}
              <span className="gradient-text">just got social</span>
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-2xl">
              Connect with classmates, share your journey, and build meaningful professional networks from your school memories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                asChild
                size="lg" 
                className="text-lg px-8 py-6 hover-scale"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <Link to="/signup">Find My Yearbook</Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 hover-scale border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => {
                  const howItWorks = document.getElementById('how-it-works');
                  howItWorks?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See How It Works
              </Button>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Floating geometric shapes */}
              <div className="absolute -top-10 -left-10 w-20 h-20 bg-primary/20 rounded-full float-animation" style={{animationDelay: '0s'}}></div>
              <div className="absolute -bottom-10 -right-10 w-16 h-16 bg-secondary/20 rounded-lg float-animation" style={{animationDelay: '2s'}}></div>
              <div className="absolute top-1/2 -left-5 w-12 h-12 bg-accent/20 rounded-full float-animation" style={{animationDelay: '4s'}}></div>
              
              {/* Main yearbook image */}
              <div className="relative z-10 float-animation">
                <img
                  src={heroYearbook}
                  alt="3D floating yearbook pages"
                  className="w-full max-w-lg rounded-2xl shadow-2xl"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;