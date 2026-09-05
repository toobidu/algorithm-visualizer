import { describe, expect, it } from 'vitest';
import { toChunks } from './chunk';
import { FIXTURES, fixtureByName, syntheticTrace, toStdout } from './fixtures';
import { parseStdout } from './parse';

describe('fixtures', () => {
  it('co du 8 trace mau theo Task 0.3.5', () => {
    expect(FIXTURES).toHaveLength(8);
  });

  it('ten fixture la duy nhat', () => {
    const names = FIXTURES.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(FIXTURES.map((f) => [f.name, f] as const))(
    '%s khu hoi duoc qua stdout ma khong loi',
    (_name, fixture) => {
      const result = parseStdout(toStdout(fixture.commands));

      expect(result.issues).toEqual([]);
      expect(result.commands).toEqual(fixture.commands);
    },
  );

  it.each(FIXTURES.map((f) => [f.name, f] as const))('%s cat chunk duoc', (_name, fixture) => {
    expect(toChunks(fixture.commands).length).toBeGreaterThan(0);
  });

  it('fixtureByName tim dung va tra undefined khi khong co', () => {
    expect(fixtureByName('graph-dfs')?.name).toBe('graph-dfs');
    expect(fixtureByName('khong-ton-tai')).toBeUndefined();
  });
});

describe('syntheticTrace', () => {
  it('sinh dung so lenh yeu cau', () => {
    expect(syntheticTrace(1000)).toHaveLength(1000);
  });

  it('trace sinh ra hop le voi parser', () => {
    expect(parseStdout(toStdout(syntheticTrace(500))).issues).toEqual([]);
  });

  it('co du delay de cat thanh nhieu chunk', () => {
    expect(toChunks(syntheticTrace(1000)).length).toBeGreaterThan(100);
  });
});
