// Pure price-validation helpers (no Convex imports) so they can be unit tested.

export const MIN_PRICE = 200; // minor units (£2.00): below this Stripe's processing fee eats the sale
export const MAX_PRICE = 100000;
export const MIN_PRINT_MARGIN = 300; // pence above print cost

export type PrintSize = 'A5' | 'A4' | 'A3';

/**
 * Print lab cost per size in pence. PRINT_COST_* MUST include Prodigi postage,
 * otherwise the margin guard below lets through prints that lose money.
 */
export function printCosts(env: Record<string, string | undefined> = process.env): Record<PrintSize, number> {
  const read = (size: PrintSize, fallback: number) => {
    const n = parseInt(env[`PRINT_COST_${size}`] || '', 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return { A5: read('A5', 600), A4: read('A4', 900), A3: read('A3', 1500) };
}

export function validateDigitalPrice(price: number): string | null {
  if (!Number.isInteger(price) || price < MIN_PRICE || price > MAX_PRICE) {
    return 'Prices must be between 2.00 and 1000.00';
  }
  return null;
}

/** Returns an error message, or null when valid. The margin guard only applies when prints are enabled. */
export function validatePrintPrices(
  prices: Record<PrintSize, number>,
  opts: { printsEnabled: boolean; costs?: Record<PrintSize, number> }
): string | null {
  const costs = opts.costs ?? printCosts();
  for (const size of ['A5', 'A4', 'A3'] as PrintSize[]) {
    const bad = validateDigitalPrice(prices[size]);
    if (bad) return bad;
    if (opts.printsEnabled && prices[size] < costs[size] + MIN_PRINT_MARGIN) {
      return `${size} print price is too low: it must be at least ${((costs[size] + MIN_PRINT_MARGIN) / 100).toFixed(2)}`;
    }
  }
  return null;
}
