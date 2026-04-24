import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Sparkles, ShieldAlert, Search } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Link } from "react-router-dom";

const qualityClass = (q: string) =>
  q === "EXCELLENT" ? "bg-quality-excellent text-primary-foreground"
  : q === "GOOD" ? "bg-quality-good text-primary-foreground"
  : "bg-quality-poor text-primary-foreground";

export default function MarketplacePage() {
  const { user, role } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qualityFilter, setQualityFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<any | null>(null);
  const [orderQty, setOrderQty] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [step, setStep] = useState<"form" | "review">("form");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setListings([]);
      setLoading(false);
      return;
    }

    const farmerIds = Array.from(new Set((data ?? []).map((l) => l.farmer_id)));
    let profilesMap: Record<string, any> = {};
    if (farmerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, location, phone")
        .in("id", farmerIds);
      profilesMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    }

    const merged = (data ?? []).map((l) => ({ ...l, profiles: profilesMap[l.farmer_id] ?? null }));
    setListings(merged);
    setLoading(false);
  }

  const filtered = listings.filter((l) => {
    const matchesSearch = !search || l.crop_name.toLowerCase().includes(search.toLowerCase()) || l.location.toLowerCase().includes(search.toLowerCase());
    const matchesQuality = qualityFilter === "ALL" || l.quality === qualityFilter;
    return matchesSearch && matchesQuality;
  });

  async function placeOrder() {
    if (!user) return toast.error("Please sign in");
    if (!selected) return;
    const qty = Number(orderQty);
    if (!qty || qty <= 0 || qty > Number(selected.quantity_kg)) return toast.error("Enter a valid quantity");
    setPlacing(true);
    const { error } = await supabase.from("orders").insert({
      listing_id: selected.id,
      buyer_id: user.id,
      farmer_id: selected.farmer_id,
      quantity_kg: qty,
      total_price: qty * Number(selected.price_per_kg),
    });
    setPlacing(false);
    if (error) return toast.error(error.message);
    toast.success("Order placed! The farmer has been notified.");
    setSelected(null);
    setOrderQty("");
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="gradient-earth py-14">
        <div className="container">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Fresh, AI-graded crops listed directly by farmers. Buy at fair prices.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search crop or location" className="pl-9" />
            </div>
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All qualities</SelectItem>
                <SelectItem value="EXCELLENT">Excellent</SelectItem>
                <SelectItem value="GOOD">Good</SelectItem>
                <SelectItem value="POOR">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="container py-12">
        {loading ? (
          <p className="text-muted-foreground">Loading listings…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No listings yet. Be the first to list a crop!</p>
            <Link to="/auth"><Button variant="hero">Get started</Button></Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((l) => (
              <article key={l.id} className="rounded-2xl overflow-hidden bg-card border border-border shadow-soft hover:shadow-card transition-smooth hover:-translate-y-1">
                <div className="relative h-48">
                  <img src={l.image_url} alt={l.crop_name} className="h-full w-full object-cover" loading="lazy" />
                  <Badge className={`absolute top-3 right-3 ${qualityClass(l.quality)} border-0`}>
                    <Sparkles className="h-3 w-3 mr-1" />{l.quality}
                  </Badge>
                  {l.disease_detected && (
                    <Badge className="absolute top-3 left-3 bg-destructive border-0 text-destructive-foreground">
                      <ShieldAlert className="h-3 w-3 mr-1" />Disease alert
                    </Badge>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg">{l.crop_name}</h3>
                  <p className="text-sm text-muted-foreground">by {l.profiles?.full_name ?? "Farmer"}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />{l.location}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="font-semibold">{l.quantity_kg} kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-display text-2xl font-bold text-primary">₹{l.price_per_kg}/kg</p>
                    </div>
                  </div>
                  <Button className="w-full mt-4" onClick={() => { setSelected(l); setOrderQty(""); }}>
                    {user && role === "buyer" ? "Place order" : "View details"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.crop_name}</DialogTitle></DialogHeader>
              <img src={selected.image_url} alt="" className="rounded-xl w-full h-48 object-cover" />
              <div className="space-y-2 text-sm">
                <p><strong>Farmer:</strong> {selected.profiles?.full_name ?? "—"}</p>
                <p><strong>Location:</strong> {selected.location}</p>
                <p><strong>Quality:</strong> {selected.quality}</p>
                <p><strong>Available:</strong> {selected.quantity_kg} kg</p>
                <p><strong>Price:</strong> ₹{selected.price_per_kg}/kg</p>
                {selected.description && <p className="text-muted-foreground">{selected.description}</p>}
              </div>
              {!user ? (
                <Link to="/auth"><Button className="w-full" variant="hero">Sign in to order</Button></Link>
              ) : role === "farmer" ? (
                <p className="text-sm text-muted-foreground">Switch to a buyer account to place orders.</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Quantity (kg)</Label>
                    <Input type="number" min="1" max={selected.quantity_kg} value={orderQty} onChange={(e) => setOrderQty(e.target.value)} />
                  </div>
                  {orderQty && Number(orderQty) > 0 && (
                    <p className="text-sm">Total: <strong>₹{(Number(orderQty) * Number(selected.price_per_kg)).toFixed(2)}</strong></p>
                  )}
                  <Button className="w-full" variant="hero" disabled={placing} onClick={placeOrder}>
                    {placing ? "Placing…" : "Confirm Order"}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  );
}
