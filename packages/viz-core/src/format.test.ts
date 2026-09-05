import { describe, expect, it } from 'vitest';
import { toDisplayString } from './format';

describe('toDisplayString — ngam #46', () => {
  it.each([
    [Number.POSITIVE_INFINITY, '\u221e'],
    [Number.MAX_SAFE_INTEGER, '\u221e'],
    [0x7fffffff, '\u221e'],
    [Number.NEGATIVE_INFINITY, '-\u221e'],
    [Number.MIN_SAFE_INTEGER, '-\u221e'],
    [-0x80000000, '-\u221e'],
  ])('%p hien thi la ky hieu vo cuc', (input, expected) => {
    expect(toDisplayString(input)).toBe(expected);
  });

  it('so nguyen giu nguyen, so thuc lam tron 3 chu so', () => {
    expect(toDisplayString(42)).toBe('42');
    expect(toDisplayString(1 / 3)).toBe('0.333');
    expect(toDisplayString(-2.5)).toBe('-2.500');
  });

  it('boolean thanh T va F', () => {
    expect(toDisplayString(true)).toBe('T');
    expect(toDisplayString(false)).toBe('F');
  });

  it('null va undefined thanh chuoi rong', () => {
    expect(toDisplayString(null)).toBe('');
    expect(toDisplayString(undefined)).toBe('');
  });

  it('chuoi giu nguyen, cau truc thanh JSON', () => {
    expect(toDisplayString('xin chao')).toBe('xin chao');
    expect(toDisplayString([1, 2])).toBe('[1,2]');
  });

  it('NaN hien ro chu khong thanh vo cuc', () => {
    expect(toDisplayString(Number.NaN)).toBe('NaN');
  });
});
