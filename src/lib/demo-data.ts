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
    typicalPrice: 7500,
    retailPrice: 19999,
    priceSource: "estimate",
    comparablePrices: [
      {
        merchant: "Amazon",
        price: 19999,
        url: "https://www.amazon.in/Ember-Temperature-Control-Smart-Mug/dp/B07RB3H1XV",
      },
      {
        merchant: "Croma",
        price: 20990,
        url: "https://www.croma.com/ember-temperature-control-mug-2-355ml-/p/258897",
      },
      {
        merchant: "Flipkart",
        price: 19499,
        url: "https://www.flipkart.com/ember-temperature-control-mug/p/itm8f3f3b0e8a5b1",
      },
    ],
    searchQuery: "Ember Temperature Control Mug 2",
    bestChannel: "olx",
    listingTitle: "Ember Temperature Control Mug — Great Condition, Rare Find",
    listingDescription:
      "Selling my Ember Temperature Control Mug. Works perfectly — keeps your coffee at the exact temperature for up to 1.5 hours. Minor scuffs near the base, charging ring has light wear. Charging dock and app included.",
    suggestedPrice: 8000,
    askingPrice: 8000,
    walkAwayFloor: 6200,
    counterLines: [
      "That's a bit lower than I was hoping — can we meet at ₹7,000?",
      "I can do ₹6,800 if you can pick up today.",
    ],
    confidence: 0.88,
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
    typicalPrice: 10000,
    retailPrice: 29990,
    priceSource: "estimate",
    comparablePrices: [
      {
        merchant: "Amazon",
        price: 29990,
        url: "https://www.amazon.in/Sony-WH-1000XM4-Cancelling-Headphones-Bluetooth/dp/B08HV2Y2LM",
      },
      {
        merchant: "Headphone Zone",
        price: 27990,
        url: "https://www.headphonezone.in/products/sony-wh-1000xm4",
      },
      {
        merchant: "Flipkart",
        price: 25990,
        url: "https://www.flipkart.com/sony-wh-1000xm4-wireless-noise-cancelling-over-ear-headphones/p/itm2f8d33d4ab1f2",
      },
    ],
    searchQuery: "Sony WH-1000XM4 wireless headphones good condition",
    bestChannel: "olx",
    listingTitle: "Sony WH-1000XM4 Wireless Headphones — Excellent Condition",
    listingDescription:
      "Sony WH-1000XM4 in excellent condition. Original ear pads, carry case included, USB-C charging works perfectly. Around 6 months of light use. Industry-leading noise cancellation and 30-hour battery life.",
    suggestedPrice: 11000,
    askingPrice: 11000,
    walkAwayFloor: 8500,
    counterLines: [
      "Appreciate the offer! I can do ₹10,000 since they're barely used.",
      "Meet me at ₹9,500 and they're yours — case included.",
    ],
    confidence: 0.93,
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
    typicalPrice: 75000,
    retailPrice: 129000,
    priceSource: "estimate",
    comparablePrices: [
      {
        merchant: "Apple India",
        price: 129000,
        url: "https://www.apple.com/in/shop/buy-iphone/iphone-14-pro-max",
      },
      {
        merchant: "Amazon",
        price: 124990,
        url: "https://www.amazon.in/Apple-iPhone-14-Pro-Max-256/dp/B0BDJ2B93K",
      },
      {
        merchant: "Reliance Digital",
        price: 127900,
        url: "https://www.reliancedigital.in/apple-iphone-14-pro-max-256-gb-deep-purple/p/491957413",
      },
    ],
    searchQuery: "iPhone 14 Pro Max 256GB Deep Purple excellent condition",
    bestChannel: "olx",
    listingTitle: "iPhone 14 Pro Max 256GB Deep Purple — Excellent, 88% Battery",
    listingDescription:
      "iPhone 14 Pro Max 256GB in Deep Purple. Flawless screen, barely-visible micro-scratches on the frame. Battery health 88%, Face ID perfect. Includes a case — no original box.",
    suggestedPrice: 80000,
    askingPrice: 80000,
    walkAwayFloor: 68000,
    counterLines: [
      "That's a little low for this condition — how about ₹75,000?",
      "I can meet you at ₹72,000 with the case included.",
    ],
    confidence: 0.91,
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
    typicalPrice: 6200,
    retailPrice: 11995,
    priceSource: "estimate",
    comparablePrices: [
      {
        merchant: "Nike India",
        price: 11995,
        url: "https://www.nike.com/in/t/air-force-1-07-mens-shoes-kFcGWs/CT2302-100",
      },
      {
        merchant: "Superkicks",
        price: 12495,
        url: "https://superkicks.in/products/nike-air-force-1-07-white",
      },
      {
        merchant: "Myntra",
        price: 10999,
        url: "https://www.myntra.com/sneakers/nike/nike-men-white-air-force-1-07-sneakers/13154630/buy",
      },
    ],
    searchQuery: "Nike Air Force 1 07 White UK 9 used",
    bestChannel: "facebook",
    listingTitle: "Nike Air Force 1 '07 White — UK 9, Clean, Good Condition",
    listingDescription:
      "Classic white AF1s, UK 9 / US 10. Worn ~15–20 times, plenty of tread left. Light toe-box creasing, uppers are clean. No box, original laces. Pickup preferred.",
    suggestedPrice: 6500,
    askingPrice: 6500,
    walkAwayFloor: 5200,
    counterLines: [
      "I can do ₹6,000 — these are really clean for the price.",
      "Best I can do is ₹5,500, they're barely broken in.",
    ],
    confidence: 0.85,
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
    typicalPrice: 300,
    retailPrice: 699,
    priceSource: "estimate",
    comparablePrices: [
      {
        merchant: "Amazon",
        price: 699,
        url: "https://www.amazon.in/Atomic-Habits-English-James-Clear/dp/1847941834",
      },
      {
        merchant: "Bookswagon",
        price: 629,
        url: "https://www.bookswagon.com/book/atomic-habits/james-clear/9781847941831",
      },
      {
        merchant: "Blossoms",
        price: 350,
        url: "https://www.blossombookhouse.com/search?type=product&q=atomic+habits",
      },
    ],
    searchQuery: "Atomic Habits James Clear used book fair condition",
    bestChannel: "olx",
    listingTitle: "Atomic Habits by James Clear — Fair Condition, No Highlights",
    listingDescription:
      "Atomic Habits by James Clear. Fair condition — dog-eared pages, light spine creasing, no highlights or notes. All pages intact. Perfect for someone who just wants the content without paying full price.",
    suggestedPrice: 300,
    askingPrice: 300,
    walkAwayFloor: 200,
    counterLines: [
      "Could you do ₹250? It's in decent shape.",
      "I'll let it go at ₹200 if you pick it up.",
    ],
    confidence: 0.9,
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
    facebook: `${brand} ${itemName} - Like New, Great Deal!`,
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
    `Asking price: ₹${item.askingPrice.toLocaleString("en-IN")} (negotiable)`,
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
