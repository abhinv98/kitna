import type { AppraisalResult } from "@/lib/types";
import { compressImage } from "@/lib/compressImage";
import { getSupabase } from "@/lib/supabase";

export interface AppraiseOptions {
  image: string; // data URL from camera / upload
}

export interface AppraiseResponse {
  ok: true;
  result: AppraisalResult;
}

export interface AppraiseError {
  ok: false;
  error: string;
  retryable: boolean;
}

export type AppraiseOutcome = AppraiseResponse | AppraiseError;

/**
 * Run the full live appraisal pipeline:
 * 1. Compress the captured image
 * 2. POST the base64-encoded image to the Supabase Edge Function
 * 3. Parse & validate the returned JSON
 */
export async function appraiseItem(options: AppraiseOptions): Promise<AppraiseOutcome> {
  try {
    // 1. Compress
    const blob = await compressImage(options.image, 1200, 0.7);
    const base64 = await blobToBase64(blob);

    // 2. Call Edge Function
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke("appraise", {
      body: { image: `data:image/jpeg;base64,${base64}` },
    });

    if (error) {
      return {
        ok: false,
        error: `Appraisal service error: ${error.message}`,
        retryable: true,
      };
    }

    if (!data || data.error) {
      return {
        ok: false,
        error: data?.error ?? "Empty response from appraisal service",
        retryable: true,
      };
    }

    // 3. Validate
    const validated = validateResult(data);
    if (!validated.valid) {
      return {
        ok: false,
        error: validated.reason,
        retryable: false,
      };
    }

    return {
      ok: true,
      result: {
        ...validated.data,
        image: options.image, // original uncompressed image for display
        isDemo: false,
        priceSource: validated.data.priceSource ?? "estimate",
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error during appraisal",
      retryable: true,
    };
  }
}

/* ── helpers ── */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

interface ValidationResult {
  valid: true;
  data: AppraisalResult;
}

interface ValidationError {
  valid: false;
  reason: string;
}

function validateResult(raw: unknown): ValidationResult | ValidationError {
  if (!raw || typeof raw !== "object") {
    return { valid: false, reason: "Invalid response type" };
  }

  const d = raw as Record<string, unknown>;

  // Required string fields
  const required = ["itemName", "brand", "category", "conditionGrade", "conditionNotes"];
  for (const key of required) {
    if (typeof d[key] !== "string" || (d[key] as string).length === 0) {
      return { valid: false, reason: `Missing or empty field: ${key}` };
    }
  }

  const validGrades = ["Mint", "Excellent", "Good", "Fair", "Poor"];
  if (!validGrades.includes(d.conditionGrade as string)) {
    return { valid: false, reason: `Invalid conditionGrade: ${d.conditionGrade}` };
  }

  // Required numeric fields
  if (typeof d.resaleRangeLow !== "number" || typeof d.resaleRangeHigh !== "number") {
    return { valid: false, reason: "Missing resale range numbers" };
  }

  // Optional numeric
  const retailPrice =
    d.retailPrice != null && typeof d.retailPrice === "number" ? d.retailPrice : null;

  // Comparable prices
  const comparablePrices = Array.isArray(d.comparablePrices)
    ? d.comparablePrices.map((cp: unknown) => {
        const p = cp as Record<string, unknown>;
        return {
          merchant: String(p.merchant ?? ""),
          price: Number(p.price ?? 0),
          url: String(p.url ?? "#"),
        };
      })
    : [];

  // New Phase 1 fields (optional — default gracefully)
  const typicalPrice = typeof d.typicalPrice === "number" ? d.typicalPrice : d.resaleRangeHigh;
  const bestChannel = typeof d.bestChannel === "string" ? d.bestChannel : "olx";
  const listingTitle = typeof d.listingTitle === "string" ? d.listingTitle : `${d.brand} ${d.itemName} — For Sale`;
  const listingDescription = typeof d.listingDescription === "string"
    ? d.listingDescription
    : (d.conditionNotes as string);
  const suggestedPrice = typeof d.suggestedPrice === "number" ? d.suggestedPrice : d.resaleRangeHigh;
  const askingPrice = typeof d.askingPrice === "number" ? d.askingPrice : d.resaleRangeHigh;
  const walkAwayFloor = typeof d.walkAwayFloor === "number" ? d.walkAwayFloor : Math.round(d.resaleRangeLow * 0.85);
  const counterLines = Array.isArray(d.counterLines) ? d.counterLines : [];
  const confidence = typeof d.confidence === "number" ? d.confidence : 0.8;

  const result: AppraisalResult = {
    image: "",
    isDemo: false,
    itemName: d.itemName as string,
    brand: d.brand as string,
    category: d.category as string,
    conditionGrade: d.conditionGrade as AppraisalResult["conditionGrade"],
    conditionNotes: d.conditionNotes as string,
    keyAttributes: Array.isArray(d.keyAttributes) ? d.keyAttributes.map(String) : [],
    resaleRangeLow: d.resaleRangeLow as number,
    resaleRangeHigh: d.resaleRangeHigh as number,
    retailPrice,
    priceSource: (d.priceSource as "live" | "estimate") ?? "estimate",
    comparablePrices,
    searchQuery: typeof d.searchQuery === "string" ? d.searchQuery : "",
    typicalPrice,
    bestChannel,
    listingTitle,
    listingDescription,
    suggestedPrice,
    askingPrice,
    walkAwayFloor,
    counterLines,
    confidence,
  };

  return { valid: true, data: result };
}