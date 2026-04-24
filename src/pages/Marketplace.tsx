import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Sparkles, ShieldAlert, Search, Clock, Calendar, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { evaluatePriceSuitability, type Quality } from "@/lib/cropPrices";
import { timeAgo, formatDate } from "@/lib/timeAgo";
import { INDIAN_STATES } from "@/lib/indianStates";

const qualityClass = (q: string) =>
  q === "EXCELLENT" ? "bg-quality-excellent text-primary-foreground"
  : q === "GOOD" ? "bg-quality-good text-primary-foreground"
  : "bg-quality-poor text-primary-foreground";

const toneClass = {
  good: "bg-quality-good/15 text-quality-good border-quality-good/30",
  warn: "bg-accent/20 text-accent-foreground border-accent/40",
  bad: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

const toneIcon = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: AlertTriangle,
} as const;

/** Parse hidden metadata stored inside listing.description */
function parseListingMeta(desc: string | null) {
  const meta: { harvestDate?: string; aiPrice?: number; refPrice?: number; refSource?: string; refMarket?: string; clean: string } = { clean: "" };
  if (!desc) return meta;
  const lines = desc.split("\n");
  const cleanLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("__HARVEST__:")) meta.harvestDate = line.slice("__HARVEST__:".length).trim();
    else if (line.startsWith("__AI_PRICE__:")) meta.aiPrice = Number(line.slice("__AI_PRICE__:".length));
    else if (line.startsWith("__REF_PRICE__:")) {
      const [p, s, m] = line.slice("__REF_PRICE__:".length).split("|");
      meta.refPrice = Number(p);
      meta.refSource = s;
      meta.refMarket = m;
    } else cleanLines.push(line);
  }
  meta.clean = cleanLines.join("\n").trim();
  return meta;
}

export default function MarketplacePage() {
  const { user, role } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qualityFilter, setQualityFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<any | null>(null);
  const [orderQty, setOrderQty] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerHouse, setBuyerHouse] = useState("");
  const [buyerStreet, setBuyerStreet] = useState("");
  const [buyerCity, setBuyerCity] = useState("");
  const [buyerState, setBuyerState] = useState("");
  const [buyerPincode, setBuyerPincode] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [step, setStep] = useState<"form" | "review" | "confirm">("form");
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
      .gt("quantity_kg", 0)
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

    // Fetch ratings (notes JSON contains rating) for these listings
    const listingIds = (data ?? []).map((l) => l.id);
    const rmap: Record<string, { avg: number; count: number }> = {};
    if (listingIds.length > 0) {
      const { data: rated } = await supabase
        .from("orders")
        .select("listing_id, notes")
        .in("listing_id", listingIds)
        .not("notes", "is", null);
      (rated ?? []).forEach((o: any) => {
        try {
          const m = JSON.parse(o.notes);
          if (typeof m?.rating === "number" && m.rating > 0) {
            const cur = rmap[o.listing_id] ?? { avg: 0, count: 0 };
            const total = cur.avg * cur.count + m.rating;
            cur.count += 1;
            cur.avg = total / cur.count;
            rmap[o.listing_id] = cur;
          }
        } catch { /* ignore */ }
      });
    }
    setRatingsMap(rmap);

    const merged = (data ?? []).map((l) => ({ ...l, profiles: profilesMap[l.farmer_id] ?? null }));
    setListings(merged);
    setLoading(false);
  }

  const filtered = listings.filter((l) => {
    const matchesSearch = !search || l.crop_name.toLowerCase().includes(search.toLowerCase()) || l.location.toLowerCase().includes(search.toLowerCase());
    const matchesQuality = qualityFilter === "ALL" || l.quality === qualityFilter;
    return matchesSearch && matchesQuality;
  });

  function fullAddress() {
    return [buyerHouse, buyerStreet, buyerCity, buyerState, buyerPincode].filter(Boolean).join(", ");
  }

  function resetOrderForm() {
    setSelected(null);
    setOrderQty("");
    setBuyerName("");
    setBuyerPhone("");
    setBuyerHouse("");
    setBuyerStreet("");
    setBuyerCity("");
    setBuyerState("");
    setBuyerPincode("");
    setOrderNotes("");
    setStep("form");
  }

  async function placeOrder() {
    if (!user) return toast.error("Please sign in");
    if (!selected) return;
    const qty = Number(orderQty);
    const subtotal = qty * Number(selected.price_per_kg);
    const notesPayload = JSON.stringify({
      buyer_name: buyerName.trim(),
      buyer_phone: buyerPhone.trim(),
      buyer_address: fullAddress(),
      address_parts: {
        house: buyerHouse.trim(),
        street: buyerStreet.trim(),
        city: buyerCity.trim(),
        state: buyerState.trim(),
        pincode: buyerPincode.trim(),
      },
      notes: orderNotes.trim(),
      subtotal,
      delivery_charge: 0,
    });

    setPlacing(true);
    const { error } = await supabase.from("orders").insert({
      listing_id: selected.id,
      buyer_id: user.id,
      farmer_id: selected.farmer_id,
      quantity_kg: qty,
      total_price: subtotal,
      notes: notesPayload,
    });
    setPlacing(false);
    if (error) return toast.error(error.message);
    toast.success("Order placed! The farmer has been notified.");
    resetOrderForm();
  }

  const selMeta = selected ? parseListingMeta(selected.description) : null;
  const selSuitability = selected
    ? evaluatePriceSuitability(selected.crop_name, selected.quality as Quality, Number(selected.price_per_kg), selMeta?.aiPrice)
    : null;

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
            {filtered.map((l) => {
              const meta = parseListingMeta(l.description);
              const suit = evaluatePriceSuitability(l.crop_name, l.quality as Quality, Number(l.price_per_kg), meta.aiPrice);
              const Icon = toneIcon[suit.tone];
              return (
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
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Listed {timeAgo(l.created_at)}</span>
                      {meta.harvestDate && (
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Harvested {timeAgo(meta.harvestDate)}</span>
                      )}
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

                    <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${toneClass[suit.tone]}`}>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">{suit.label}</p>
                        <p className="opacity-80">
                          {suit.diffPct >= 0 ? "+" : ""}{suit.diffPct.toFixed(1)}% vs ₹{suit.reference.toFixed(2)} {suit.source === "dataset" ? `(${suit.market})` : "(AI predicted)"}
                        </p>
                      </div>
                      {suit.diffPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    </div>

                    <Button className="w-full mt-4" onClick={() => { setSelected(l); setOrderQty(""); setStep("form"); }}>
                      {user && role === "buyer" ? "Place order" : "View details"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) resetOrderForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {selected && selSuitability && (
            <>
              <DialogHeader><DialogTitle>{selected.crop_name}</DialogTitle></DialogHeader>
              <img src={selected.image_url} alt="" className="rounded-xl w-full h-40 object-cover" />
              <div className="space-y-1 text-sm">
                <p><strong>Farmer:</strong> {selected.profiles?.full_name ?? "—"}</p>
                <p><strong>Location:</strong> {selected.location}</p>
                <p><strong>Quality:</strong> {selected.quality} · <strong>Available:</strong> {selected.quantity_kg} kg</p>
                <p><strong>Price:</strong> ₹{selected.price_per_kg}/kg</p>
                <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Listed {timeAgo(selected.created_at)} ({formatDate(selected.created_at)})</span>
                  {selMeta?.harvestDate && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Harvested {timeAgo(selMeta.harvestDate)} ({formatDate(selMeta.harvestDate)})</span>
                  )}
                </p>
                {selMeta?.clean && <p className="text-muted-foreground">{selMeta.clean}</p>}
              </div>

              <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${toneClass[selSuitability.tone]}`}>
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">AI price check: {selSuitability.label}</p>
                  <p className="text-xs opacity-80">
                    Listed at ₹{Number(selected.price_per_kg).toFixed(2)} vs market ₹{selSuitability.reference.toFixed(2)} ({selSuitability.diffPct >= 0 ? "+" : ""}{selSuitability.diffPct.toFixed(1)}%) — source: {selSuitability.source === "dataset" ? selSuitability.market : "AI prediction"}.
                  </p>
                </div>
              </div>

              {!user ? (
                <Link to="/auth"><Button className="w-full" variant="hero">Sign in to order</Button></Link>
              ) : role === "farmer" ? (
                <p className="text-sm text-muted-foreground">Switch to a buyer account to place orders.</p>
              ) : step === "form" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Quantity (kg)</Label>
                      <Input type="number" min="1" max={selected.quantity_kg} value={orderQty} onChange={(e) => setOrderQty(e.target.value)} placeholder="10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Your name</Label>
                      <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Full name" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone number</Label>
                    <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>

                  <div className="rounded-xl border border-border p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full delivery address</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">House / Flat / Building</Label>
                      <Input value={buyerHouse} onChange={(e) => setBuyerHouse(e.target.value)} placeholder="House no, building" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Street / Area / Landmark</Label>
                      <Input value={buyerStreet} onChange={(e) => setBuyerStreet(e.target.value)} placeholder="Street, area, landmark" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">City</Label>
                        <Input value={buyerCity} onChange={(e) => setBuyerCity(e.target.value)} placeholder="City" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">State</Label>
                        <Input value={buyerState} onChange={(e) => setBuyerState(e.target.value)} placeholder="State" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pincode</Label>
                      <Input value={buyerPincode} onChange={(e) => setBuyerPincode(e.target.value)} placeholder="6-digit pincode" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Notes for farmer (optional)</Label>
                    <Input value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions" />
                  </div>
                  {orderQty && Number(orderQty) > 0 && (
                    <div className="rounded-xl bg-secondary/60 p-3 text-sm">
                      Subtotal: <strong>₹{(Number(orderQty) * Number(selected.price_per_kg)).toFixed(2)}</strong>
                      <p className="text-xs text-muted-foreground mt-1">Delivery charges (if any) will be added by the farmer after they accept. You'll be asked to confirm the latest total before delivery.</p>
                    </div>
                  )}
                  <Button
                    className="w-full" variant="hero"
                    onClick={() => {
                      const qty = Number(orderQty);
                      if (!qty || qty <= 0 || qty > Number(selected.quantity_kg)) return toast.error("Enter a valid quantity");
                      if (!buyerName.trim() || !buyerPhone.trim()) return toast.error("Enter your name and phone");
                      if (!buyerHouse.trim() || !buyerStreet.trim() || !buyerCity.trim() || !buyerState.trim() || !buyerPincode.trim()) {
                        return toast.error("Please fill the complete delivery address");
                      }
                      setStep("review");
                    }}
                  >
                    Review order
                  </Button>
                </div>
              ) : step === "review" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                    <p className="font-semibold">Order summary</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">Crop</span><span>{selected.crop_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span>{orderQty} kg</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span>₹{selected.price_per_kg}/kg</span></div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span>Subtotal</span>
                      <strong>₹{(Number(orderQty) * Number(selected.price_per_kg)).toFixed(2)}</strong>
                    </div>
                    <p className="text-xs text-muted-foreground">Final total will include delivery charges added by the farmer after acceptance.</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 space-y-1 text-sm">
                    <p className="font-semibold mb-1">Delivery to</p>
                    <p>{buyerName}</p>
                    <p className="text-muted-foreground">{buyerPhone}</p>
                    <p className="text-muted-foreground">{fullAddress()}</p>
                    {orderNotes && <p className="text-muted-foreground italic mt-1">"{orderNotes}"</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => setStep("form")} disabled={placing}>Back</Button>
                    <Button variant="hero" onClick={() => setStep("confirm")} disabled={placing}>Continue</Button>
                  </div>
                </div>
              ) : (
                /* Final confirmation */
                <div className="space-y-3">
                  <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Confirm your order</p>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span>{selected.crop_name} ({orderQty} kg)</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{(Number(orderQty) * Number(selected.price_per_kg)).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="italic text-xs">to be set by farmer</span></div>
                    <div className="flex justify-between text-base font-semibold border-t border-primary/30 pt-2">
                      <span>Total now</span><span className="text-primary">₹{(Number(orderQty) * Number(selected.price_per_kg)).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      By confirming, you agree to pay this amount plus any delivery fee the farmer adds. We'll send you a confirmation prompt with the latest total once the farmer accepts.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => setStep("review")} disabled={placing}>Back</Button>
                    <Button variant="hero" disabled={placing} onClick={placeOrder}>
                      {placing ? "Placing…" : "Confirm & place order"}
                    </Button>
                  </div>
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
