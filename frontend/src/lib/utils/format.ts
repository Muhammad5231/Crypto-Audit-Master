import Decimal from "decimal.js";

/**
 * Format a number string as INR currency.
 * Uses Decimal.js for precision.
 */
export function formatINR(value: string | number, decimals = 2): string {
  try {
    const num = new Decimal(value);
    const formatted = num.toFixed(decimals);
    return "₹" + Number(formatted).toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return "₹0.00";
  }
}

/**
 * Format a crypto quantity.
 */
export function formatQuantity(value: string | number, decimals = 6): string {
  try {
    const num = new Decimal(value);
    return num.toFixed(decimals);
  } catch {
    return "0";
  }
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: string | number, decimals = 2): string {
  try {
    const num = new Decimal(value);
    return num.toFixed(decimals) + "%";
  } catch {
    return "0%";
  }
}

/**
 * Format a large number compactly (e.g., 1.2K, 3.5M).
 */
export function formatCompact(value: string | number): string {
  try {
    const num = new Decimal(value).toNumber();
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toFixed(2);
  } catch {
    return "0";
  }
}

/**
 * Check if a value is positive.
 */
export function isPositive(value: string | number): boolean {
  try {
    return new Decimal(value).greaterThan(0);
  } catch {
    return false;
  }
}

/**
 * Get color class based on value (green for positive, red for negative).
 */
export function getValueColor(value: string | number): string {
  try {
    const num = new Decimal(value);
    if (num.greaterThan(0)) return "text-emerald-500";
    if (num.lessThan(0)) return "text-red-500";
    return "text-muted-foreground";
  } catch {
    return "text-muted-foreground";
  }
}
