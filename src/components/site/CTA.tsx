import { Button } from "@/components/ui/button";
import { ScanLine, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();
  return (
    <section className="py-24 bg-background">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl gradient-primary p-10 md:p-16 text-center shadow-glow">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary-glow/40 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground text-balance max-w-2xl mx-auto">
              Your harvest deserves a fair price. Let's start today.
            </h2>
            <p className="mt-5 text-primary-foreground/80 max-w-xl mx-auto">
              Join thousands of farmers using AI to grow smarter and sell with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate("/dashboard")}>
                <ScanLine className="h-5 w-5" />Analyze Crop
              </Button>
              <Button variant="glass" size="xl" onClick={() => navigate("/marketplace")}>
                <Store className="h-5 w-5" />Explore Marketplace
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
