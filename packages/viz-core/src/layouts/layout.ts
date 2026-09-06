import type { Tracer } from '../tracers/tracer';

export type LayoutDirection = 'horizontal' | 'vertical';

/**
 * Khung chia panel trong vung visualization.
 *
 * Bản cũ mutate mảng trọng số tai cho roi gọi thang `forceUpdate()` (ngầm #33).
 * Bản mới vẫn mutate — đó là thu giữ được toc đó — nhưng không đúng toi React:
 * `VizEngine` phat tín hiệu thay doi, React nghe qua `useSyncExternalStore`.
 */
export class Layout {
  readonly key: string;
  readonly direction: LayoutDirection;

  childKeys: string[];
  weights: number[];

  constructor(key: string, direction: LayoutDirection, childKeys: readonly string[]) {
    this.key = key;
    this.direction = direction;
    this.childKeys = [...childKeys];
    this.weights = this.childKeys.map(() => 1);
  }

  add(key: string, index: number = this.childKeys.length): void {
    const at = Math.max(0, Math.min(index, this.childKeys.length));
    this.childKeys.splice(at, 0, key);
    this.weights.splice(at, 0, 1);
  }

  remove(key: string): void {
    const index = this.childKeys.indexOf(key);
    if (index < 0) return;
    this.childKeys.splice(index, 1);
    this.weights.splice(index, 1);
  }

  removeAll(): void {
    this.childKeys = [];
    this.weights = [];
  }

  setWeights(weights: readonly number[]): void {
    this.weights = [...weights];
  }

  clone(): Layout {
    const copy = new Layout(this.key, this.direction, this.childKeys);
    copy.weights = [...this.weights];
    return copy;
  }
}

/** Doi tuong dat trong kho cua engine: hoac mot tracer, hoac mot layout. */
export type VizObject = Tracer | Layout;

export function isLayout(object: VizObject): object is Layout {
  return object instanceof Layout;
}
