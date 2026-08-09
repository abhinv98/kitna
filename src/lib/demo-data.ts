import type { AppraisalResult, ExampleObject } from "@/lib/types";

/**
 * Pre-canned responses for demo mode — no API calls needed.
 * Each entry is a full AppraisalResult that gets progressively revealed.
 */
export const DEMO_RESULTS: Record<ExampleObject, AppraisalResult> = {
  mug: {
    image: "", // filled at runtime from the captured frame
    isDemo: true,
    itemName: "Ember Temperature Control Mug",
    brand: "Ember",
    category: "Kitchen & Dining",
    conditionGrade: "Good",
    conditionNotes:
      "Minor scuffs on the ceramic finish near the base. The base charging ring shows light wear but functions properly. The LED indicator works and the app connects without issue.",
    keyAttributes: [
      "355ml capacity",
      "Stainless steel interior",
      "App-controlled temperature (50–62.5°C)",
      "Battery lasts ~1.5 hours",
    ],
    resaleRangeLow: 6000,
    resaleRangeHigh: 9000,
    retailPrice: 19999,
    priceSource: "live",
    comparablePrices: [
      { merchant: "Amazon", price: 19999, url: "#" },
      { merchant: "Croma", price: 20990, url: "#" },
      { merchant: "Flipkart", price: 19499, url: "#" },
    ],
    searchQuery: "Ember Temperature Control Mug 2",
  },

  headphones: {
    image: "",
    isDemo: true,
    itemName: "Sony WH-1000XM4 Wireless Headphones",
    brand: "Sony",
    category: "Electronics > Audio",
    conditionGrade: "Excellent",
    conditionNotes:
      "Clean unit with original ear pads — no peeling or wear. Carry case included. Charging via USB-C works perfectly. Minimal use, approximately 6 months old.",
    keyAttributes: [
      "Industry-leading ANC",
      "30-hour battery life",
      "Multipoint Bluetooth",
      "Fold-flat design with case",
      "USB-C charging",
    ],
    resaleRangeLow: 8000,
    resaleRangeHigh: 12000,
    retailPrice: 29990,
    priceSource: "live",
    comparablePrices: [
      { merchant: "Amazon", price: 29990, url: "#" },
      { merchant: "Headphone Zone", price: 27990, url: "#" },
      { merchant: "Flipkart", price: 25990, url: "#" },
    ],
    searchQuery: "Sony WH-1000XM4 wireless headphones good condition",
  },

  phone: {
    image: "",
    isDemo: true,
    itemName: "iPhone 14 Pro Max 256GB",
    brand: "Apple",
    category: "Electronics > Smartphones",
    conditionGrade: "Excellent",
    conditionNotes:
      "Deep Purple colour. Tiny micro-scratches on the stainless steel frame — barely visible. Screen is flawless (no scratches, no dead pixels). Battery health at 88%. Face ID works perfectly. No original box but includes a case.",
    keyAttributes: [
      '6.7" Super Retina XDR display',
      "A16 Bionic chip",
      "48MP main camera",
      "256GB storage",
      "Battery health 88%",
    ],
    resaleRangeLow: 65000,
    resaleRangeHigh: 85000,
    retailPrice: 129000,
    priceSource: "live",
    comparablePrices: [
      { merchant: "Apple India", price: 129000, url: "#" },
      { merchant: "Amazon", price: 124990, url: "#" },
      { merchant: "Reliance Digital", price: 127900, url: "#" },
    ],
    searchQuery: "iPhone 14 Pro Max 256GB Deep Purple excellent condition",
  },

  sneaker: {
    image: "",
    isDemo: true,
    itemName: "Nike Air Force 1 '07",
    brand: "Nike",
    category: "Footwear > Sneakers",
    conditionGrade: "Good",
    conditionNotes:
      "Size UK 9 / US 10. Worn approximately 15–20 times. Outsoles have light tread wear — plenty of life left. Minor creasing on the toe box typical of AF1s. Uppers are clean with no stains or scuffs. Original laces, no box.",
    keyAttributes: [
      "Classic all-white colourway",
      "Leather upper",
      "Air-Sole cushioning",
      "Size: UK 9 / US 10",
    ],
    resaleRangeLow: 5000,
    resaleRangeHigh: 7500,
    retailPrice: 11995,
    priceSource: "live",
    comparablePrices: [
      { merchant: "Nike India", price: 11995, url: "#" },
      { merchant: "Superkicks", price: 12495, url: "#" },
      { merchant: "Myntra", price: 10999, url: "#" },
    ],
    searchQuery: "Nike Air Force 1 07 White UK 9 used",
  },

  book: {
    image: "",
    isDemo: true,
    itemName: "Atomic Habits by James Clear",
    brand: "James Clear",
    category: "Books > Self-Help",
    conditionGrade: "Fair",
    conditionNotes:
      "Some dog-eared pages and light creasing on the spine from normal reading. No highlighting or margin notes. The cover has faint scuff marks on the corners. All pages intact, no tears.",
    keyAttributes: [
      "Paperback edition",
      "320 pages",
      "Published by Penguin Random House",
      "ISBN: 978-0735211292",
    ],
    resaleRangeLow: 200,
    resaleRangeHigh: 400,
    retailPrice: 699,
    priceSource: "live",
    comparablePrices: [
      { merchant: "Amazon", price: 699, url: "#" },
      { merchant: "Bookswagon", price: 629, url: "#" },
      { merchant: "Blossoms", price: 350, url: "#used" },
    ],
    searchQuery: "Atomic Habits James Clear used book fair condition",
  },
};

/**
 * Platform-specific listing templates.
 */
export function generateListingTitle(
  itemName: string,
  brand: string,
  platform: string,
): string {
  const titles: Record<string, string> = {
    olx: `${brand} ${itemName} — Good Condition, Reasonable Price`,
    facebook: `${brand} ${itemName} - Like New, Great Deal! 🚀`,
    quikr: `${itemName} by ${brand} — Lightly Used, Well Maintained`,
    ebay: `${brand} ${itemName} | Pre-owned - Good Condition | Fast Shipping`,
  };
  return titles[platform] ?? `${brand} ${itemName} — For Sale`;
}

export function generateListingDescription(
  item: AppraisalResult,
  platform: string,
): string {
  const conditionLine = {
    olx: `Condition: ${item.conditionGrade} (${item.conditionNotes})`,
    facebook: `Condition: ${item.conditionGrade}\n${item.conditionNotes}`,
    quikr: `Condition: ${item.conditionGrade}\n\n${item.conditionNotes}`,
    ebay: `Condition: Pre-owned — ${item.conditionGrade}\n\nDetailed condition notes: ${item.conditionNotes}\n\nPlease see photos for exact condition.`,
  };

  const base = [
    `${item.brand} ${item.itemName}`,
    "",
    conditionLine[platform as keyof typeof conditionLine] ?? item.conditionNotes,
    "",
    "Key features:",
    ...item.keyAttributes.map((a) => `  • ${a}`),
    "",
    `Suggested price: ₹${item.resaleRangeLow.toLocaleString("en-IN")} – ₹${item.resaleRangeHigh.toLocaleString("en-IN")} (negotiable)`,
    "",
  ];

  if (platform === "ebay") {
    base.push("Ships within 2 business days. No returns but happy to answer questions.");
  } else {
    base.push("Cash on pickup preferred. Reasonable offers welcome.");
  }

  return base.join("\n");
}

/**
 * Timing delays (ms) for progressive reveal in demo mode.
 */
export const DEMO_TIMING = {
  itemName: 1500,
  condition: 3000,
  prices: 5000,
  complete: 5500,
} as const;