/**
 * Format a number as a currency string in CZK.
 */
export function formatCzk(amount: number): string {
  return `${amount.toFixed(2)} Kč`;
}
