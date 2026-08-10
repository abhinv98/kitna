import type { AppraisalResult } from "@/lib/types";
import { formatINR } from "@/lib/currency";

/**
 * One line of coaching for a spoken Mol-bhaav counter attempt: compare what
 * the seller actually said against their asking price and walk-away floor.
 */
export function feedbackForAttempt(result: AppraisalResult, transcript: string): string {
  const t = transcript.trim();

  if (!t) {
    return (
      `Couldn't hear you — tap the mic again and say your counter out loud, like ` +
      `“${result.counterLines[0] ?? "Thoda aur kar do na"}”.`
    );
  }

  const mentioned = extractMentionedPrice(t);
  if (mentioned === null) {
    return (
      "You spoke, but didn't name a price — anchor with your ask: " +
      `${formatINR(result.askingPrice)}.`
    );
  }

  if (mentioned < result.walkAwayFloor) {
    return (
      `${formatINR(mentioned)} is below your floor of ${formatINR(result.walkAwayFloor)} — ` +
      `counter closer to ${formatINR(result.askingPrice)} instead.`
    );
  }

  if (mentioned <= result.askingPrice) {
    return (
      `${formatINR(mentioned)} sits inside your range (floor ` +
      `${formatINR(result.walkAwayFloor)}) — that's a believable counter.`
    );
  }

  return (
    `You asked ${formatINR(mentioned)} — above your own ask of ` +
    `${formatINR(result.askingPrice)}, so buyers will push back. Stick near ` +
    `${formatINR(result.askingPrice)}.`
  );
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lac: 100000,
  k: 1000,
};

/** Best-effort extraction of a rupee figure the seller said out loud. */
function extractMentionedPrice(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, "");

  // Digits first: "7000", "7,000", "12k", "1.5 lakh"
  const digit = t.match(/\b(\d{2,7})\b/);
  if (digit) {
    let n = Number(digit[1]);
    const rest = t.slice((digit.index ?? 0) + digit[0].length);
    if (/^\s*(lakh|lacs?)\b/.test(rest)) n *= 100000;
    else if (/^\s*k\b/.test(rest)) n *= 1000;
    return n >= 50 ? n : null;
  }

  // Spoken words: "seven thousand", "twelve k", "five and a half thousand"
  const parts = t.split(/\s+/);
  let total = 0;
  let current = 0;
  let found = false;
  for (const part of parts) {
    const w = WORD_NUMBERS[part];
    if (w === undefined) {
      if (found) break; // stop scanning past the first number phrase
      continue;
    }
    found = true;
    if (w >= 1000) {
      total += (current || 1) * w;
      current = 0;
    } else if (w === 100) {
      current = (current || 1) * 100;
    } else {
      current += w;
    }
  }
  const value = total + current;
  return found && value >= 50 ? value : null;
}
