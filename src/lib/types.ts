/* ── Core data types for the Kitna? appraisal flow ── */

export interface AppraisalResult {
  image: string;
  isDemo: boolean;
  itemName: string;
  brand: string;
  category: string;
  conditionGrade: ConditionGrade;
  conditionNotes: string;
  keyAttributes: string[];
  resaleRangeLow: number;
  resaleRangeHigh: number;
  retailPrice: number | null;
  priceSource: "live" | "estimate";
  comparablePrices: ComparablePrice[];
  searchQuery: string;

  /* ── Phase 1 — Extended fields ── */
  typicalPrice: number;            // single "typical" number at top of resale range
  bestChannel: string;             // e.g. "olx" | "facebook" | "quikr" | "ebay"
  listingTitle: string;            // pre-generated platform-specific title
  listingDescription: string;      // pre-generated platform-specific description
  suggestedPrice: number;          // what to ask
  askingPrice: number;             // initial display price (same as suggestedPrice)
  walkAwayFloor: number;           // lowest acceptable offer
  counterLines: string[];          // e.g. ["That's a bit lower than I was hoping…", "Can we meet at ₹X?"]
  confidence: number;              // 0–1 model self-report. NOT rendered — the UI derives its confidence chip from comparablePrices.length (>=3 high, 1–2 medium, 0 estimate-only).
}

export type ConditionGrade =
  | "Mint"
  | "Excellent"
  | "Good"
  | "Fair"
  | "Poor";

export interface ComparablePrice {
  merchant: string;
  price: number;
  url: string;
}

export interface AppraisalSession {
  image: string;
  isDemo: boolean;
  demoObject?: string;
  result?: AppraisalResult;
}

export type AppScreen = "capture" | "analyzing" | "results" | "listing";

export const CONDITION_COLORS: Record<ConditionGrade, string> = {
  Mint: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Excellent: "bg-green-100 text-green-700 border-green-200",
  Good: "bg-primary/10 text-primary border-primary/20",
  Fair: "bg-amber-100 text-amber-700 border-amber-200",
  Poor: "bg-orange-100 text-orange-700 border-orange-200",
};

export const EXAMPLE_OBJECTS = [
  "mug",
  "headphones",
  "phone",
  "sneaker",
  "book",
] as const;

export type ExampleObject = (typeof EXAMPLE_OBJECTS)[number];