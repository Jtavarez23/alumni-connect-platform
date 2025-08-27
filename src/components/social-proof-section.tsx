import { Star } from "lucide-react";
import avatarSarah from "@/assets/avatar-sarah.jpg";
import avatarMarcus from "@/assets/avatar-marcus.jpg";

const testimonials = [
  {
    text: "Found my best friend from high school after 20 years!",
    author: "Sarah Chen",
    role: "Class of 2003",
    avatar: avatarSarah,
    rating: 5
  },
  {
    text: "The peer verification gives me confidence everyone is who they say they are.",
    author: "Marcus Johnson", 
    role: "Class of 1998",
    avatar: avatarMarcus,
    rating: 5
  }
];

const schoolLogos = ["Harvard", "Stanford", "Lincoln High", "Roosevelt High"];

const SocialProofSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Main Headline */}
        <div className="text-center mb-16 fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Join <span className="gradient-text">50,000+</span> verified alumni already reconnected
          </h2>
        </div>

        {/* School Logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-16 fade-in-up" style={{animationDelay: '0.2s'}}>
          {schoolLogos.map((school) => (
            <div
              key={school}
              className="px-6 py-3 bg-white rounded-lg shadow-md border text-muted-foreground font-medium"
            >
              {school}
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author}
              className="p-8 rounded-2xl glass-card shadow-lg hover-scale"
              style={{ 
                animationDelay: `${0.4 + index * 0.2}s`,
                boxShadow: "var(--shadow-soft)"
              }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={20} className="fill-warning text-warning" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-lg font-medium mb-6 text-foreground">
                "{testimonial.text}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover shadow-md"
                />
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;