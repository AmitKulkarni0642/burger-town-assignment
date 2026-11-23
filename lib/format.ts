const whole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const number = (n: number) => whole.format(n);
export const rupees = (n: number) => `₹${whole.format(n)}`;
export const percent = (share: number) => `${(share * 100).toFixed(share < 0.0995 ? 1 : 0)}%`;

/** Short form using lakh (L, 1,00,000) and crore (Cr, 1,00,00,000). */
export function short(n: number): string {
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  return whole.format(n);
}

/** Axis labels all use the unit that suits the largest value, so they compare easily. */
export function axisLabel(n: number, largest: number): string {
  if (n === 0) return "0";
  if (largest >= 1e7) return `${Number((n / 1e7).toFixed(2))} Cr`;
  if (largest >= 1e5) return `${Number((n / 1e5).toFixed(2))} L`;
  return whole.format(n);
}

export const shortRupees = (n: number) => `₹${short(n)}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2025-06-17 -> 17 Jun 2025 */
export function longDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
/** 2025-06-17 -> 17 Jun */
export const shortDate = (day: string) => longDate(day).replace(/ \d{4}$/, "");
/** 2025-06-01 -> Jun 25 */
export const monthLabel = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(2, 4)}`;

/** 20 -> 8 pm */
export const hourLabel = (h: number) => `${h % 12 || 12} ${h % 24 < 12 ? "am" : "pm"}`;
