import { Leaf } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container py-12 grid md:grid-cols-4 gap-8">
      <div>
        <div className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </span>
          AgriVision
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Smart agriculture, fair pricing, direct trade.</p>
      </div>
      {[
        { h: "Product", l: ["AI Analysis", "Marketplace", "Price Insights", "Reports"] },
        { h: "Company", l: ["About", "Careers", "Press", "Contact"] },
        { h: "Resources", l: ["Help Center", "Farmer Guides", "API Docs", "Privacy"] },
      ].map((c) => (
        <div key={c.h}>
          <p className="font-semibold mb-3">{c.h}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {c.l.map((i) => <li key={i}><a href="#" className="hover:text-foreground transition-smooth">{i}</a></li>)}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-border py-6 text-center text-sm text-muted-foreground">
      © {new Date().getFullYear()} AgriVision Market. Built for farmers, with farmers.
    </div>
  </footer>
);

export default Footer;
