import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Store, Star, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const statusClass: Record<string, string> = {
  pending: "bg-accent text-accent-foreground",
  accepted: "bg-quality-good text-primary-foreground",
  packed: "bg-quality-good text-primary-foreground",
  shipped: "bg-primary text-primary-foreground",
  delivered: "bg-quality-excellent text-primary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

type Meta = {
  buyer_name?: string;
  buyer_phone?: string;
  buyer_address?: string;
  notes?: string;
  subtotal?: number;
  delivery_charge?: number;
  buyer_confirmed_total?: boolean;
  rating?: number;
  review?: string;
};

function parseMeta(notes: string | null): Meta {
  if (!notes) return {};
  try { return JSON.parse(notes); } catch { return {}; }
}

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirmation dialog (delivery charge added by farmer)
  const [confirmOrder, setConfirmOrder] = useState<any | null>(null);
  // Rating dialog
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, listings(crop_name, image_url, location)")
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }

  async function confirmTotal(order: any) {
    setBusy(true);
    const meta = parseMeta(order.notes);
    meta.buyer_confirmed_total = true;
    const { error } = await supabase
      .from("orders")
      .update({ notes: JSON.stringify(meta) })
      .eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Total confirmed. The farmer will dispatch your order.");
    setConfirmOrder(null);
    load();
  }

  async function submitReview() {
    if (!reviewOrder) return;
    if (rating < 1) return toast.error("Please pick a star rating");
    setBusy(true);
    const meta = parseMeta(reviewOrder.notes);
    meta.rating = rating;
    meta.review = review.trim();
    const { error } = await supabase
      .from("orders")
      .update({ notes: JSON.stringify(meta) })
      .eq("id", reviewOrder.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for your review!");
    setReviewOrder(null);
    setRating(0);
    setReview("");
    load();
  }

  return (
    <DashboardLayout title="My Orders">
      <div className="mb-6">
        <Link to="/marketplace">
          <Button variant="hero"><Store className="h-4 w-4" /> Browse Marketplace</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="text-center bg-card border border-border rounded-2xl p-12 text-muted-foreground">
          No orders yet. Browse the marketplace to place your first order.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {orders.map((o) => {
            const meta = parseMeta(o.notes);
            const subtotal = Number(meta.subtotal ?? o.total_price);
            const charge = Number(meta.delivery_charge ?? 0);
            const needsConfirm = charge > 0 && !meta.buyer_confirmed_total && o.status === "accepted";
            const canReview = o.status === "delivered" && !meta.rating;
            return (
              <div key={o.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft space-y-3">
                <div className="flex gap-4">
                  <img src={o.listings?.image_url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{o.listings?.crop_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{o.listings?.location}</p>
                      </div>
                      <Badge className={`${statusClass[o.status] ?? ""} border-0 capitalize`}>{o.status}</Badge>
                    </div>
                    <p className="text-sm mt-2">{o.quantity_kg} kg</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Delivery</span><span>₹{charge.toFixed(2)}</span></div>
                      <div className="flex justify-between text-foreground font-semibold pt-1 border-t border-border mt-1">
                        <span>Total</span><span>₹{Number(o.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {needsConfirm && (
                  <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <Truck className="h-4 w-4" /> Farmer added a delivery charge
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The farmer added <strong>₹{charge.toFixed(2)}</strong> for delivery. New total is <strong className="text-foreground">₹{Number(o.total_price).toFixed(2)}</strong>. Please confirm to proceed.
                    </p>
                    <Button size="sm" variant="hero" className="w-full" onClick={() => setConfirmOrder(o)}>
                      Review & confirm new total
                    </Button>
                  </div>
                )}

                {canReview && (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setReviewOrder(o); setRating(0); setReview(""); }}>
                    <Star className="h-4 w-4" /> Rate & review this order
                  </Button>
                )}

                {meta.rating && (
                  <div className="rounded-xl bg-secondary/50 p-3 text-sm space-y-1">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`h-4 w-4 ${n <= (meta.rating ?? 0) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">Your review</span>
                    </div>
                    {meta.review && <p className="text-xs italic">"{meta.review}"</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm new total dialog */}
      <Dialog open={!!confirmOrder} onOpenChange={(o) => !o && setConfirmOrder(null)}>
        <DialogContent>
          {confirmOrder && (() => {
            const meta = parseMeta(confirmOrder.notes);
            const subtotal = Number(meta.subtotal ?? confirmOrder.total_price);
            const charge = Number(meta.delivery_charge ?? 0);
            return (
              <>
                <DialogHeader><DialogTitle>Confirm latest total</DialogTitle></DialogHeader>
                <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span>{confirmOrder.listings?.crop_name} ({confirmOrder.quantity_kg} kg)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery (set by farmer)</span><span>₹{charge.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
                    <span>New total</span><span className="text-primary">₹{Number(confirmOrder.total_price).toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">By confirming you agree to pay the new total upon delivery.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setConfirmOrder(null)} disabled={busy}>Cancel</Button>
                  <Button variant="hero" onClick={() => confirmTotal(confirmOrder)} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" /> {busy ? "Saving…" : "Confirm total"}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewOrder} onOpenChange={(o) => !o && setReviewOrder(null)}>
        <DialogContent>
          {reviewOrder && (
            <>
              <DialogHeader><DialogTitle>Rate {reviewOrder.listings?.crop_name}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">How was your experience? Your rating helps other buyers.</p>
              <div className="flex items-center gap-1 justify-center py-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="p-1">
                    <Star className={`h-8 w-8 transition-smooth ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground hover:text-accent"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share what you liked or what could be better (optional)"
                rows={3}
              />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setReviewOrder(null)} disabled={busy}>Cancel</Button>
                <Button variant="hero" onClick={submitReview} disabled={busy || rating < 1}>
                  {busy ? "Submitting…" : "Submit review"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
