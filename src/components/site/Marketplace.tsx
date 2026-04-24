import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const listings = [
  { crop: "Alphonso Mango", farmer: "Ravi Patel", location: "Ratnagiri, MH", qty: "500 kg", price: "₹180/kg", quality: "EXCELLENT", img: "🥭" },
  { crop: "Organic Tomato", farmer: "Sunita Devi", location: "Nashik, MH", qty: "1.2 T", price: "₹28/kg", quality: "GOOD", img: "🍅" },
  { crop: "Basmati Rice", farmer: "Harpreet Singh", location: "Karnal, HR", qty: "5 T", price: "₹95/kg", quality: "EXCELLENT", img: "🌾" },
];

const qualityClass = (q: string) =>
  q === "EXCELLENT" ? "bg-quality-excellent text-primary-foreground"
  : q === "GOOD" ? "bg-quality-good text-primary-foreground"
  : "bg-quality-poor text-primary-foreground";

const Marketplace = () => {
  const navigate = useNavigate();
  return (
  <section id="marketplace" className="py-24 bg-background">
    <div className="container">
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">Live marketplace</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold text-balance">
            Fresh, AI-verified listings from real farms.
          </h2>
        </div>
        <Button variant="outline" onClick={() => navigate("/marketplace")}>Browse all listings</Button>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((l) => (
          <article key={l.crop} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-soft hover:shadow-card transition-smooth hover:-translate-y-1">
            <div className="relative h-48 gradient-earth grid place-items-center text-7xl">
              {l.img}
              <Badge className={`absolute top-4 right-4 ${qualityClass(l.quality)} border-0`}>
                <Sparkles className="h-3 w-3 mr-1" />
                {l.quality}
              </Badge>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold">{l.crop}</h3>
              <p className="text-sm text-muted-foreground mt-1">by {l.farmer}</p>
              <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {l.location}
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="font-semibold">{l.qty}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-display text-2xl font-bold text-primary">{l.price}</p>
                </div>
              </div>
              <Button className="w-full mt-5" variant="default" onClick={() => navigate("/marketplace")}>Contact Farmer</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
  );
};

export default Marketplace;
