/**
 * PRNG có hạt giống — PLAN.md §3.5 quy tắc 6.
 *
 * `viz-core` không được dùng `Math.random()`: bố cục đồ thị phải snapshot được và phải
 * giong nhau giữa hai lan chạy. ESLint chan `Math.random` trong package này.
 *
 * Thuật toán mulberry32: nhỏ, nhanh, chat luong du cho viec rai node trên mat phang.
 */
export interface Prng {
  next(): number;
}

export function createPrng(seed: number): Prng {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Hat giong suy tu khoa tracer de hai do thi khac nhau co bo cuc khac nhau. */
export function seedFromKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
