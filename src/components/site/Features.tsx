import { ScanLine, ShieldCheck, TrendingUp, Store, Bell, FileText } from "lucide-react";

const features = [
  { icon: ScanLine, title: "AI Crop Analysis", desc: "Snap a photo and get quality, freshness, and damage scores in seconds." },
  { icon: ShieldCheck, title: "Disease Detection", desc: "Spot diseases and pests early with computer vision before they spread." },
  { icon: TrendingUp, title: "Fair Price Prediction", desc: "Live mandi data + ML to suggest a fair price range for your harvest." },
  { icon: Store, title: "Direct Marketplace", desc: "List analyzed crops and sell directly to verified buyers — no middlemen." },
  { icon: Bell, title: "Smart Notifications", desc: "Get alerts on buyer interest, price changes, and disease warnings." },
  { icon: FileText, title: "PDF Reports", desc: "Download a professional crop report to share with buyers and exporters." },
];

const Features = () => (
  <section id="features" className="py-24 bg-background">
    <div className="container">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Why AgriVision</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold text-foreground text-balance">
          Everything a modern farm needs, in one place.
        </h2>
      </div>

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="group p-7 rounded-2xl bg-card border border-border shadow-soft hover:shadow-card transition-smooth hover:-translate-y-1"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-soft group-hover:shadow-glow transition-smooth">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
