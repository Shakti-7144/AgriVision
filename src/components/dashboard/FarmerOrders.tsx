import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Package, MapPin, Phone, User, Copy, Star } from "lucide-react";

const statusClass: Record<string, string> = {
  pending: "bg-accent text-accent-foreground",
  accepted: "bg-quality-good text-primary-foreground",
  packed: "bg-quality-good text-primary-foreground",
  shipped: "bg-primary text-primary-foreground",
  delivered: "bg-quality-excellent text-primary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const PLATFORM_COMMISSION_PCT = 2.5;

type OrderMeta = {
  buyer_name?: string;
  buyer_phone?: string;
  buyer_address?: string;
  address_parts?: { house?: string; street?: string; city?: string; state?: string; pincode?: string };
  notes?: string;
  subtotal?: number;
  delivery_charge?: number;
  rating?: number;
  review?: string;
};

function parseMeta(notes: string | null): OrderMeta {
  if (!notes) return {};
  try { return JSON.parse(notes); } catch { return { notes }; }
}

export default function FarmerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, listings(crop_name, image_url, price_per_kg)")
      .eq("farmer_id", user!.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders(data ?? []);
    setLoading(false);
  }

  async function updateOrder(o: any, status: string, addDelivery = false) {
    setBusyId(o.id);
    try {
      const meta = parseMeta(o.notes);
      let total = Number(o.total_price);
      if (addDelivery) {
        const charge = Number(delivery[o.id] ?? 0);
        if (isNaN(charge) || charge < 0) {
          toast.error("Enter a valid delivery charge");
          setBusyId(null);
          return;
        }
        meta.delivery_charge = charge;
        const subtotal = Number(meta.subtotal ?? Number(o.quantity_kg) * Number(o.listings?.price_per_kg ?? 0));
        meta.subtotal = subtotal;
        total = subtotal + charge;
      }
      const { error } = await supabase
        .from("orders")
        .update({ status: status as any, total_price: total, notes: JSON.stringify(meta) })
        .eq("id", o.id);
      if (error) throw error;
      toast.success(`Order ${status}`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading orders…</p>;
  if (orders.length === 0) {
    return (
      <div className="text-center bg-card border border-border rounded-2xl p-8 text-muted-foreground text-sm">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No orders yet. Buyers will appear here when they purchase your listings.
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {orders.map((o) => {
        const meta = parseMeta(o.notes);
        const subtotal = Number(meta.subtotal ?? o.total_price);
        const charge = Number(meta.delivery_charge ?? 0);
        return (
          <div key={o.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft space-y-3">
            <div className="flex gap-3">
              {o.listings?.image_url && (
                <img src={o.listings.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.listings?.crop_name ?? "Listing"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <Badge className={`${statusClass[o.status] ?? ""} border-0 capitalize`}>{o.status}</Badge>
                </div>
                <p className="text-sm mt-1">{o.quantity_kg} kg · <strong>₹{Number(o.total_price).toFixed(2)}</strong></p>
              </div>
            </div>

            <div className="rounded-xl bg-secondary/50 p-3 text-sm space-y-1.5">
              <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{meta.buyer_name ?? "Buyer"}</p>
              {meta.buyer_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${meta.buyer_phone}`} className="hover:underline">{meta.buyer_phone}</a>
                </p>
              )}
              {meta.buyer_address && (
                <div className="rounded-lg bg-background/60 border border-border p-2 mt-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-start gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="whitespace-pre-line">
                        <span className="font-semibold text-foreground block mb-0.5">Delivery address</span>
                        {meta.buyer_address}
                      </span>
                    </p>
                    <Button
                      type="button" size="sm" variant="ghost" className="h-7 px-2 shrink-0"
                      onClick={() => { navigator.clipboard.writeText(meta.buyer_address ?? ""); toast.success("Address copied"); }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meta.buyer_address)}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:underline mt-1.5 inline-block"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              )}
              {meta.notes && <p className="text-muted-foreground italic">"{meta.notes}"</p>}
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>₹{charge.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                <span>Order total</span><span>₹{Number(o.total_price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-quality-good">
                <span>− Platform fee ({PLATFORM_COMMISSION_PCT}%)</span>
                <span>−₹{((Number(o.total_price) * PLATFORM_COMMISSION_PCT) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>You receive</span>
                <span>₹{(Number(o.total_price) * (1 - PLATFORM_COMMISSION_PCT / 100)).toFixed(2)}</span>
              </div>
            </div>

            {o.status === "delivered" && meta.rating && (
              <div className="rounded-xl border border-quality-excellent/40 bg-quality-excellent/10 p-3 text-sm space-y-1">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`h-4 w-4 ${n <= (meta.rating ?? 0) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">Buyer rated this order</span>
                </div>
                {meta.review && <p className="text-xs italic">"{meta.review}"</p>}
              </div>
            )}

            {o.status === "pending" && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery charge (₹)</Label>
                  <Input
                    type="number" min="0" placeholder="0"
                    value={delivery[o.id] ?? ""}
                    onChange={(e) => setDelivery((d) => ({ ...d, [o.id]: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => updateOrder(o, "cancelled")}>
                    Decline
                  </Button>
                  <Button size="sm" variant="hero" disabled={busyId === o.id} onClick={() => updateOrder(o, "accepted", true)}>
                    {busyId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Accept"}
                  </Button>
                </div>
              </div>
            )}

            {o.status === "accepted" && (
              <Button size="sm" className="w-full" disabled={busyId === o.id} onClick={() => updateOrder(o, "shipped")}>
                Mark as shipped
              </Button>
            )}
            {o.status === "shipped" && (
              <Button size="sm" className="w-full" variant="hero" disabled={busyId === o.id} onClick={() => updateOrder(o, "delivered")}>
                Mark as delivered
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
