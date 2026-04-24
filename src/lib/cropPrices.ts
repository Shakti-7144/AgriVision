// Price reference dataset (₹/kg). Values from ai_studio_code.csv.
// Crops not present here fall back to AI-predicted price.
export type Quality = "EXCELLENT" | "GOOD" | "POOR";

export interface PriceRow {
  crop: string;
  excellent: number;
  good: number;
  poor: number;
  market: string;
}

export const CROP_PRICE_TABLE: PriceRow[] = [
  { crop: "Bajra", excellent: 25.64, good: 19.72, poor: 13.8, market: "National Market" },
  { crop: "Barley", excellent: 27.58, good: 21.21, poor: 14.85, market: "National Market" },
  { crop: "Wheat", excellent: 33.52, good: 25.78, poor: 18.05, market: "National Market" },
  { crop: "Cotton", excellent: 108.58, good: 83.53, poor: 58.47, market: "National Market" },
  { crop: "Soyabean", excellent: 72.94, good: 56.11, poor: 39.28, market: "National Market" },
  { crop: "Bengal Gram", excellent: 69.07, good: 53.13, poor: 37.19, market: "National Market" },
  { crop: "Rice Basmati", excellent: 83.2, good: 64, poor: 44.8, market: "Delhi Wholesale" },
  { crop: "Arhar Dal", excellent: 97.5, good: 75, poor: 52.5, market: "Delhi Wholesale" },
  { crop: "Sugar", excellent: 53.95, good: 41.5, poor: 29.05, market: "Delhi Wholesale" },
  { crop: "Peas", excellent: 27.3, good: 21, poor: 14.7, market: "Delhi Wholesale" },
  { crop: "Brinjal", excellent: 25.35, good: 19.5, poor: 13.65, market: "Delhi Wholesale" },
  { crop: "Ladyfinger", excellent: 91, good: 70, poor: 49, market: "Delhi Wholesale" },
  { crop: "Ginger", excellent: 68.9, good: 53, poor: 37.1, market: "Delhi Wholesale" },
  { crop: "Onion", excellent: 13.56, good: 10.43, poor: 7.3, market: "National Market" },
  { crop: "Potato", excellent: 7.68, good: 5.91, poor: 4.14, market: "National Market" },
  { crop: "Tomato", excellent: 23.1, good: 17.77, poor: 12.44, market: "National Market" },
  // Common aliases
  { crop: "Rice", excellent: 83.2, good: 64, poor: 44.8, market: "Delhi Wholesale" },
  { crop: "Lady Finger", excellent: 91, good: 70, poor: 49, market: "Delhi Wholesale" },
  { crop: "Okra", excellent: 91, good: 70, poor: 49, market: "Delhi Wholesale" },
];

const norm = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z]/g, "").trim();

export interface PriceLookup {
  price: number;
  source: "dataset" | "ai";
  market?: string;
  crop?: string;
}

/** Look up reference price for a crop+quality. Returns null if no dataset match. */
export function lookupReferencePrice(cropName: string, quality: Quality): PriceLookup | null {
  if (!cropName) return null;
  const target = norm(cropName);
  const row = CROP_PRICE_TABLE.find((r) => {
    const n = norm(r.crop);
    return n === target || n.includes(target) || target.includes(n);
  });
  if (!row) return null;
  const price =
    quality === "EXCELLENT" ? row.excellent : quality === "GOOD" ? row.good : row.poor;
  return { price, source: "dataset", market: row.market, crop: row.crop };
}

/** Resolve final reference price: prefer dataset, otherwise use AI-predicted fallback. */
export function resolveReferencePrice(
  cropName: string,
  quality: Quality,
  aiPrice: number
): PriceLookup {
  const ref = lookupReferencePrice(cropName, quality);
  if (ref) return ref;
  return { price: aiPrice, source: "ai" };
}

/** Compare farmer's listed price to reference price; returns suitability label + tone. */
export interface PriceSuitability {
  label: string;
  tone: "good" | "warn" | "bad";
  diffPct: number;
  reference: number;
  source: "dataset" | "ai";
  market?: string;
}

export function evaluatePriceSuitability(
  cropName: string,
  quality: Quality,
  listedPrice: number,
  aiPrice?: number
): PriceSuitability {
  const ref = resolveReferencePrice(cropName, quality, aiPrice ?? listedPrice);
  const diffPct = ((listedPrice - ref.price) / ref.price) * 100;
  let label: string;
  let tone: "good" | "warn" | "bad";
  if (diffPct <= -15) {
    label = "Great deal — well below market";
    tone = "good";
  } else if (diffPct <= 5) {
    label = "Fair price";
    tone = "good";
  } else if (diffPct <= 20) {
    label = "Slightly above market";
    tone = "warn";
  } else {
    label = "Overpriced vs market";
    tone = "bad";
  }
  return { label, tone, diffPct, reference: ref.price, source: ref.source, market: ref.market };
}
