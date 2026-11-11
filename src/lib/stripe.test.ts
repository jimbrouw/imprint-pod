import { describe, it, expect } from 'vitest';
import { computePlatformFee } from './stripe';

const base = { bps: 1000, minFee: 50, printCost: 900 };

describe('computePlatformFee (digital)', () => {
  it('takes the percentage on normal prices', () => {
    expect(computePlatformFee(1500, 'digital', base)).toBe(150);
  });
  it('applies the minimum fee on small prices', () => {
    expect(computePlatformFee(200, 'digital', base)).toBe(50); // 10% would be 20
  });
  it('never exceeds the amount', () => {
    expect(computePlatformFee(30, 'digital', base)).toBe(30);
    expect(computePlatformFee(0, 'digital', base)).toBe(0);
    expect(computePlatformFee(1000, 'digital', { ...base, bps: 10000 })).toBe(1000);
  });
  it('is zero-fee only when both bps and minFee are zero', () => {
    expect(computePlatformFee(1500, 'digital', { ...base, bps: 0, minFee: 0 })).toBe(0);
  });
});

describe('computePlatformFee (print)', () => {
  it('recovers the print cost plus a percentage of the remainder', () => {
    expect(computePlatformFee(2200, 'print', base)).toBe(900 + 130);
  });
  it('recovers the full cost when the price equals the cost', () => {
    expect(computePlatformFee(900, 'print', base)).toBe(900);
  });
  it('never exceeds the amount when the price is below cost', () => {
    expect(computePlatformFee(500, 'print', base)).toBe(500);
  });
});
