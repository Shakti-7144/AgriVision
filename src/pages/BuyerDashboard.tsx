import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";

const statusClass: Record<string, string> = {
  pending: "bg-accent text-accent-foreground",
  accepted: "bg-quality-good text-primary-foreground",
  packed: "bg-quality-good text-primary-foreground",
  shipped: "bg-primary text-primary-foreground",
  delivered: "bg-quality-excellent text-primary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
            let meta: any = {};
            try { meta = o.notes ? JSON.parse(o.notes) : {}; } catch { meta = {}; }
            const subtotal = Number(meta.subtotal ?? o.total_price);
            const charge = Number(meta.delivery_charge ?? 0);
            return (
              <div key={o.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft flex gap-4">
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
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
