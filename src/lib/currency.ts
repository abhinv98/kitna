/**
 * Format a numeric price in Indian Rupees.
 * Examples: ₹699, ₹29,990, ₹1,29,000
 */
export function formatINR(amount: number): string {
  // Indian numbering system: the first thousands group is 3 digits, then 2-digit groups
  const str = Math.round(amount).toString();
  const lastThree = str.slice(-3);
  const rest = str.slice(0, -3);
  if (rest === "") return `₹${lastThree}`;

  // Add commas every 2 digits from the right in the rest
  const withCommas = rest
    .split("")
    .reverse()
    .reduce((acc, digit, i) => {
      if (i > 0 && i % 2 === 0) {
        return digit + "," + acc;
      }
      return digit + acc;
    }, lastThree);
  return `₹${withCommas}`;
}