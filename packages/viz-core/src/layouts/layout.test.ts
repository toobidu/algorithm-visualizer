import { describe, expect, it } from 'vitest';
import { isLayout, Layout } from './layout';
import { LogTracer } from '../tracers/log';

describe('Layout', () => {
  it('khoi tao trong so bang nhau cho moi con', () => {
    expect(new Layout('l', 'vertical', ['a', 'b', 'c']).weights).toEqual([1, 1, 1]);
  });

  it('add chen dung vi tri va them trong so', () => {
    const layout = new Layout('l', 'horizontal', ['a', 'c']);
    layout.add('b', 1);

    expect(layout.childKeys).toEqual(['a', 'b', 'c']);
    expect(layout.weights).toHaveLength(3);
  });

  it('add ngoai pham vi bi kep vao hai dau', () => {
    const layout = new Layout('l', 'vertical', ['a']);
    layout.add('z', 99);
    layout.add('y', -5);

    expect(layout.childKeys).toEqual(['y', 'a', 'z']);
  });

  it('remove bo ca khoa lan trong so', () => {
    const layout = new Layout('l', 'vertical', ['a', 'b']);
    layout.remove('a');

    expect(layout.childKeys).toEqual(['b']);
    expect(layout.weights).toHaveLength(1);
  });

  it('remove khoa khong ton tai khong lam gi', () => {
    const layout = new Layout('l', 'vertical', ['a']);
    layout.remove('z');

    expect(layout.childKeys).toEqual(['a']);
  });

  it('removeAll xoa het', () => {
    const layout = new Layout('l', 'vertical', ['a', 'b']);
    layout.removeAll();

    expect(layout.childKeys).toEqual([]);
    expect(layout.weights).toEqual([]);
  });

  it('clone doc lap voi ban goc', () => {
    const layout = new Layout('l', 'vertical', ['a']);
    const copy = layout.clone();
    layout.add('b');

    expect(copy.childKeys).toEqual(['a']);
  });

  it('isLayout phan biet voi tracer', () => {
    expect(isLayout(new Layout('l', 'vertical', []))).toBe(true);
    expect(isLayout(new LogTracer('log', 'Log'))).toBe(false);
  });
});
