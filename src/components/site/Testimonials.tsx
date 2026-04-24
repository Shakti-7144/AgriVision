import { Quote } from "lucide-react";

const stories = [
  { name: "Lakshmi N.", role: "Tomato Farmer, Karnataka", quote: "AgriVision flagged early blight before I lost the harvest. Sold the rest at a fair ₹32/kg." },
  { name: "Mohit Agro Buyers", role: "Bulk Buyer, Delhi", quote: "AI-graded listings save us hours of physical inspection. Trust is built into every order." },
  { name: "Rajesh Kumar", role: "Wheat Farmer, Punjab", quote: "First time I knew the real price of my crop. No more selling blind to middlemen." },
];

const Testimonials = () => (
  <section id="testimonials" className="py-24 bg-secondary/40">
    <div className="container">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Trusted by farmers & buyers</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold text-balance">Real harvests. Real outcomes.</h2>
      </div>

      <div className="mt-14 grid md:grid-cols-3 gap-6">
        {stories.map((s) => (
          <figure key={s.name} className="p-8 rounded-2xl bg-card border border-border shadow-soft">
            <Quote className="h-8 w-8 text-accent" />
            <blockquote className="mt-4 text-lg leading-relaxed text-foreground">"{s.quote}"</blockquote>
            <figcaption className="mt-6 pt-6 border-t border-border">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-muted-foreground">{s.role}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
