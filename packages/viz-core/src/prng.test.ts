import { describe, expect, it } from 'vitest';
import { createPrng, seedFromKey } from './prng';

describe('PRNG co hat giong — §3.5 quy tac 6', () => {
  it('cung hat giong cho cung day so', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it('hat giong khac cho day khac', () => {
    expect(createPrng(1).next()).not.toBe(createPrng(2).next());
  });

  it('gia tri nam trong [0, 1)', () => {
    const prng = createPrng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = prng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('seedFromKey tat dinh va phan biet duoc khoa', () => {
    expect(seedFromKey('graph')).toBe(seedFromKey('graph'));
    expect(seedFromKey('graph')).not.toBe(seedFromKey('graph2'));
  });
});
