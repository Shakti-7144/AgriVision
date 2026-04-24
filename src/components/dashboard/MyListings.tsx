import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Package, Check, X } from "lucide-react";

const qualityClass = (q: string) =>
  q === "EXCELLENT" ? "bg-quality-excellent text-primary-foreground"
  : q === "GOOD" ? "bg-quality-good text-primary-foreground"
  : "bg-quality-poor text-primary-foreground";

const statusClass: Record<string, string> = {
  active: "bg-quality-good text-primary-foreground",
  sold: "bg-muted text-muted-foreground",
  inactive: "bg-muted text-muted-foreground",
};

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("farmer_id", user!.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setListings(data ?? []);
    setLoading(false);
  }

  function startEdit(l: any) {
    setEditingId(l.id);
    setDraftPrice(String(l.price_per_kg));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftPrice("");
  }

  async function savePrice(l: any) {
    const newPrice = Number(draftPrice);
    if (!newPrice || newPrice <= 0) return toast.error("Enter a valid price");
    setSavingId(l.id);
    const { error } = await supabase
      .from("listings")
      .update({ price_per_kg: newPrice })
      .eq("id", l.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Price updated");
    setEditingId(null);
    load();
  }

  async function toggleStatus(l: any) {
    const next = l.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("listings")
      .update({ status: next as any })
      .eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success(next === "active" ? "Listing reactivated" : "Listing paused");
    load();
  }

  async function deleteListing(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing deleted");
    load();
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading your listings…</p>;
  if (listings.length === 0) {
    return (
      <div className="text-center bg-card border border-border rounded-2xl p-8 text-muted-foreground text-sm">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        You haven't listed anything yet. Analyze a crop and click "List in Marketplace".
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((l) => (
        <div key={l.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="relative">
            <img src={l.image_url} alt={l.crop_name} className="h-40 w-full object-cover" />
            <Badge className={`absolute top-2 right-2 ${qualityClass(l.quality)} border-0`}>{l.quality}</Badge>
            <Badge className={`absolute top-2 left-2 ${statusClass[l.status] ?? ""} border-0 capitalize`}>{l.status}</Badge>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{l.crop_name}</p>
                <p className="text-xs text-muted-foreground truncate">{l.location}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">{new Date(l.created_at).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <span className="font-semibold">{l.quantity_kg} kg</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Price</span>
              {editingId === l.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm">₹</span>
                  <Input
                    type="number" min="1" step="0.01" autoFocus
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    className="h-8 w-24"
                  />
                  <span className="text-xs text-muted-foreground">/kg</span>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={savingId === l.id} onClick={() => savePrice(l)}>
                    {savingId === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-quality-good" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={savingId === l.id} onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-display text-lg font-bold text-primary">₹{Number(l.price_per_kg).toFixed(2)}/kg</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(l)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => toggleStatus(l)} disabled={l.status === "sold"}>
                {l.status === "active" ? "Pause" : "Activate"}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteListing(l.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
