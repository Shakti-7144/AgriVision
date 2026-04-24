import { Camera, Brain, IndianRupee, Handshake } from "lucide-react";

const steps = [
  { icon: Camera, title: "Upload your crop", desc: "Take a clear photo of your harvest from the farmer dashboard." },
  { icon: Brain, title: "AI analyzes instantly", desc: "Quality grade, disease detection, and freshness score in seconds." },
  { icon: IndianRupee, title: "Get a fair price", desc: "We compare mandi rates and suggest a transparent price range." },
  { icon: Handshake, title: "Sell to verified buyers", desc: "List in the marketplace and connect directly — no middlemen." },
];

const HowItWorks = () => (
  <section id="how" className="py-24 gradient-earth">
    <div className="container">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">How it works</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold text-foreground text-balance">
          From field to fair sale in four steps.
        </h2>
      </div>

      <ol className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <li key={s.title} className="relative p-7 rounded-2xl bg-card border border-border shadow-soft">
            <span className="absolute -top-4 left-7 grid h-8 w-8 place-items-center rounded-full gradient-harvest text-accent-foreground font-bold text-sm shadow-soft">
              {i + 1}
            </span>
            <s.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
