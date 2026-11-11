import { describe, it, expect } from 'vitest';
import { validateDigitalPrice, validatePrintPrices, printCosts, MIN_PRICE } from './pricing';

const costs = { A5: 600, A4: 900, A3: 1500 };

describe('validateDigitalPrice', () => {
  it('accepts the allowed range', () => {
    expect(validateDigitalPrice(MIN_PRICE)).toBeNull();
    expect(validateDigitalPrice(100000)).toBeNull();
  });
  it('rejects too low, too high and non-integers', () => {
    expect(validateDigitalPrice(199)).not.toBeNull();
    expect(validateDigitalPrice(100001)).not.toBeNull();
    expect(validateDigitalPrice(1500.5)).not.toBeNull();
    expect(validateDigitalPrice(NaN)).not.toBeNull();
  });
});

describe('validatePrintPrices', () => {
  const ok = { A5: 1500, A4: 2200, A3: 3200 };
  it('accepts normal prices', () => {
    expect(validatePrintPrices(ok, { printsEnabled: true, costs })).toBeNull();
  });
  it('rejects prices under cost + 3.00 when prints are enabled', () => {
    expect(validatePrintPrices({ ...ok, A3: 1799 }, { printsEnabled: true, costs })).toMatch(/A3/);
    expect(validatePrintPrices({ ...ok, A3: 1800 }, { printsEnabled: true, costs })).toBeNull();
  });
  it('skips the margin guard when prints are disabled, but still enforces the minimum', () => {
    expect(validatePrintPrices({ ...ok, A3: 500 }, { printsEnabled: false, costs })).toBeNull();
    expect(validatePrintPrices({ ...ok, A3: 100 }, { printsEnabled: false, costs })).not.toBeNull();
  });
});

describe('printCosts', () => {
  it('reads PRINT_COST_* and falls back to defaults', () => {
    expect(printCosts({ PRINT_COST_A4: '1200' })).toEqual({ A5: 600, A4: 1200, A3: 1500 });
  });
});
