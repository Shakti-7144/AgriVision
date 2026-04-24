import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Store, Trash2, ImageIcon, Info, Percent } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FarmerOrders from "@/components/dashboard/FarmerOrders";
import MyListings from "@/components/dashboard/MyListings";
import { resolveReferencePrice, type Quality } from "@/lib/cropPrices";

interface AnalysisResult {
  cropDetected: boolean;
  cropName: string;
  quality: "EXCELLENT" | "GOOD" | "POOR";
  confidence: number;
  diseaseDetected: boolean;
  diseaseName: string | null;
  damageLevel: string;
  freshness: string;
  recommendation: string;
  storageTips: string;
  suggestedPrice: string;
}

const PLATFORM_COMMISSION_PCT = 2.5;

const qualityClass = (q: string) =>
  q === "EXCELLENT" ? "bg-quality-excellent text-primary-foreground"
  : q === "GOOD" ? "bg-quality-good text-primary-foreground"
  : "bg-quality-poor text-primary-foreground";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropType, setCropType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [harvestDate, setHarvestDate] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [listing, setListing] = useState(false);

  // Farmer's custom price (overrides AI/dataset suggestion)
  const [customPrice, setCustomPrice] = useState<string>("");

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  async function loadHistory() {
    const { data } = await supabase
      .from("crop_analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory(data ?? []);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setAnalysisId(null);
    setCustomPrice("");
  }

  // Reference price from dataset (or AI fallback) for the analysis
  const refPrice = useMemo(() => {
    if (!result) return null;
    const aiPriceMatch = (result.suggestedPrice ?? "").match(/(\d+(\.\d+)?)/);
    const aiPrice = aiPriceMatch ? Number(aiPriceMatch[1]) : 20;
    const cropName = result.cropName && result.cropName !== "N/A" ? result.cropName : cropType;
    return resolveReferencePrice(cropName, result.quality as Quality, aiPrice);
  }, [result, cropType]);

  // Effective listing price = farmer override or reference
  const effectivePrice = useMemo(() => {
    const c = Number(customPrice);
    if (customPrice && !isNaN(c) && c > 0) return c;
    return refPrice?.price ?? 0;
  }, [customPrice, refPrice]);

  const estTotal = effectivePrice * Number(quantity || 0);
  const estCommission = (estTotal * PLATFORM_COMMISSION_PCT) / 100;

  async function handleAnalyze() {
    if (!file || !user) return toast.error("Choose an image first");
    if (!cropType || !quantity || !location) return toast.error("Fill all crop details");

    setAnalyzing(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("crop-images")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("crop-images").getPublicUrl(path);
      const url = pub.publicUrl;
      setImageUrl(url);

      const { data, error } = await supabase.functions.invoke("analyze-crop", {
        body: { imageUrl: url, cropType, location },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const analysis = data.analysis as AnalysisResult;
      setResult(analysis);

      const { data: saved, error: saveErr } = await supabase
        .from("crop_analyses")
        .insert({
          user_id: user.id,
          image_url: url,
          crop_name: analysis.cropName ?? cropType,
          crop_detected: analysis.cropDetected,
          quality: analysis.quality,
          confidence: analysis.confidence,
          disease_detected: analysis.diseaseDetected,
          disease_name: analysis.diseaseName,
          damage_level: analysis.damageLevel,
          freshness: analysis.freshness,
          recommendation: analysis.recommendation,
          storage_tips: analysis.storageTips,
          suggested_price: analysis.suggestedPrice,
          quantity_kg: Number(quantity),
          location,
          harvest_date: harvestDate || null,
          raw_response: analysis as any,
        })
        .select()
        .single();
      if (saveErr) throw saveErr;
      setAnalysisId(saved.id);
      toast.success("Analysis complete!");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleListMarketplace() {
    if (!result || !analysisId || !imageUrl || !user) return;
    if (!result.cropDetected) {
      return toast.error("No crop detected in image. Please re-analyze with a clear crop photo.");
    }
    const validQualities = ["EXCELLENT", "GOOD", "POOR"] as const;
    if (!validQualities.includes(result.quality as any)) {
      return toast.error(`Invalid quality "${result.quality}". Cannot list this analysis.`);
    }
    if (!effectivePrice || effectivePrice <= 0) {
      return toast.error("Please set a valid price per kg");
    }

    setListing(true);
    try {
      const cropName = result.cropName && result.cropName !== "N/A" ? result.cropName : (cropType || "Unknown");

      // Embed harvest date + price metadata into description (no schema change)
      const descParts: string[] = [];
      if (result.recommendation) descParts.push(result.recommendation);
      if (harvestDate) descParts.push(`__HARVEST__:${harvestDate}`);
      const aiPriceMatch = (result.suggestedPrice ?? "").match(/(\d+(\.\d+)?)/);
      const aiPrice = aiPriceMatch ? Number(aiPriceMatch[1]) : null;
      if (aiPrice) descParts.push(`__AI_PRICE__:${aiPrice}`);
      if (refPrice) descParts.push(`__REF_PRICE__:${refPrice.price}|${refPrice.source}|${refPrice.market ?? ""}`);

      const payload = {
        farmer_id: user.id,
        analysis_id: analysisId,
        crop_name: cropName,
        image_url: imageUrl,
        quality: result.quality,
        disease_detected: result.diseaseDetected,
        quantity_kg: Number(quantity),
        price_per_kg: effectivePrice,
        location,
        description: descParts.join("\n"),
      };

      const { error } = await supabase.from("listings").insert(payload);
      if (error) {
        console.error("List marketplace error:", error, "payload:", payload);
        throw error;
      }
      toast.success("Listed in marketplace!");
      navigate("/marketplace");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to list in marketplace");
    } finally {
      setListing(false);
    }
  }

  async function deleteAnalysis(id: string) {
    const { error } = await supabase.from("crop_analyses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadHistory();
  }

  return (
    <DashboardLayout title="Farmer Dashboard">
      {/* Commission notice */}
      <div className="mb-6 rounded-2xl border border-accent/40 bg-accent/10 p-4 flex gap-3 items-start">
        <Percent className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Platform fee: 2 – 2.5% commission on total sales</p>
          <p className="text-muted-foreground">
            A minimum of 2% (up to 2.5%) of every successful order is retained by AgriVision as the platform fee. The remainder is paid out to you.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload + form */}
        <section className="bg-card rounded-2xl border border-border p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold mb-4">Analyze a new crop</h2>

          <label className="block">
            <div className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary transition-smooth grid place-items-center cursor-pointer overflow-hidden bg-muted/30">
              {preview ? (
                <img src={preview} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-sm">Click to upload crop image</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="space-y-1.5">
              <Label>Crop type</Label>
              <Input value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="Tomato" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity (kg)</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nashik, MH" />
            </div>
            <div className="space-y-1.5">
              <Label>Harvest date</Label>
              <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={analyzing || !file} className="w-full mt-5" size="lg">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing with Gemini…</> : <><Sparkles className="h-4 w-4" /> Analyze Crop</>}
          </Button>
        </section>

        {/* Result */}
        <section className="bg-card rounded-2xl border border-border p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold mb-4">AI Analysis Report</h2>
          {!result ? (
            <div className="text-center text-muted-foreground py-16">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Upload an image and click Analyze to see the AI report.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Detected crop</p>
                  <p className="font-display text-2xl font-bold">{result.cropName}</p>
                </div>
                <Badge className={`${qualityClass(result.quality)} border-0 text-sm`}>{result.quality}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="AI Accuracy" value={`${result.confidence}%`} />
                <Stat label="AI suggested" value={result.suggestedPrice} accent />
                <Stat label="Freshness" value={result.freshness} />
                <Stat label="Damage" value={result.damageLevel} />
                <Stat label="Disease" value={result.diseaseDetected ? (result.diseaseName ?? "Yes") : "None"} />
                {refPrice && (
                  <Stat
                    label={refPrice.source === "dataset" ? `Market ref (${refPrice.market})` : "AI predicted (no dataset)"}
                    value={`₹${refPrice.price.toFixed(2)}/kg`}
                  />
                )}
              </div>

              {/* Custom price override */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    Don't agree with the estimate? Set your own price per kg below — buyers will see whether your price is fair vs market.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Your price (₹/kg)</Label>
                    <Input
                      type="number" min="1" step="0.01"
                      placeholder={refPrice ? refPrice.price.toFixed(2) : "Enter price"}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                    />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <p className="text-muted-foreground">Listing price</p>
                    <p className="font-display text-xl font-bold text-primary">₹{effectivePrice.toFixed(2)}/kg</p>
                  </div>
                </div>
                {Number(quantity) > 0 && (
                  <div className="text-xs text-muted-foreground border-t border-border/60 pt-2 space-y-0.5">
                    <div className="flex justify-between"><span>Estimated total</span><span>₹{estTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Platform commission ({PLATFORM_COMMISSION_PCT}%)</span><span>− ₹{estCommission.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border/60">
                      <span>You receive (excl. delivery)</span><span>₹{(estTotal - estCommission).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-secondary/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation</p>
                <p className="mt-1 text-sm">{result.recommendation}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage tips</p>
                <p className="mt-1 text-sm">{result.storageTips}</p>
              </div>

              <Button onClick={handleListMarketplace} disabled={listing || !analysisId} className="w-full" variant="hero" size="lg">
                {listing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                List in Marketplace
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Incoming orders */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold mb-4">Incoming orders</h2>
        <FarmerOrders />
      </section>

      {/* My listings (with editable price) */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold mb-4">My listings</h2>
        <p className="text-sm text-muted-foreground mb-4">Update the price of any active listing — the new price applies to future orders only.</p>
        <MyListings />
      </section>

      {/* History */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold mb-4">Previous reports</h2>
        {history.length === 0 ? (
          <div className="text-muted-foreground text-sm bg-card border border-border rounded-2xl p-8 text-center">No analyses yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((h) => (
              <div key={h.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
                <img src={h.image_url} alt={h.crop_name} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{h.crop_name}</p>
                    {h.quality && <Badge className={`${qualityClass(h.quality)} border-0`}>{h.quality}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(h.created_at).toLocaleDateString()}</p>
                  <p className="text-sm mt-2 font-medium text-primary">{h.suggested_price}</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => deleteAnalysis(h.id)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-secondary/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${accent ? "text-primary text-lg" : ""}`}>{value}</p>
    </div>
  );
}
