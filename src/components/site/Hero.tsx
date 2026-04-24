import { Button } from "@/components/ui/button";
import { ScanLine, Store, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImg from "@/assets/hero-farm.jpg";

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Sunlit green farmland representing AgriVision Market's smart agriculture platform"
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero" />
      </div>

      <div className="container relative py-24 md:py-36 lg:py-44">
        <div className="max-w-3xl animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur px-4 py-1.5 text-sm text-primary-foreground border border-primary-foreground/20">
            <Sparkles className="h-4 w-4 text-accent" />
            Powered by Gemini Vision AI
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground text-balance leading-[1.05]">
            Grow smarter.<br />
            <span className="text-accent">Sell fairer.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-2xl">
            Upload a photo of your crop and get instant AI quality analysis, disease detection, and a
            fair market price — then list directly to verified buyers, no middlemen.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="hero" size="xl" onClick={() => navigate("/dashboard")}>
              <ScanLine className="h-5 w-5" />
              Analyze Crop
            </Button>
            <Button variant="glass" size="xl" onClick={() => navigate("/marketplace")}>
              <Store className="h-5 w-5" />
              Explore Marketplace
            </Button>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-6 max-w-xl">
            {[
              { k: "12K+", v: "Farmers onboard" },
              { k: "98%", v: "AI accuracy" },
              { k: "₹40Cr", v: "Fair trades" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">{s.k}</dt>
                <dd className="text-sm text-primary-foreground/70 mt-1">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default Hero;
