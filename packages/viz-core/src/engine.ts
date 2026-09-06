import { type Chunk, type Command, type JsonValue } from '@av/protocol';
import { Layout, type LayoutDirection, type VizObject } from './layouts/layout';
import { Array1DTracer, Array2DTracer, ChartTracer, ScatterTracer } from './tracers/array';
import { GraphTracer } from './tracers/graph';
import { LogTracer, MarkdownTracer } from './tracers/log';
import { Tracer } from './tracers/tracer';

type TracerCtor = new (key: string, title: string) => Tracer;

const TRACER_CTORS: Readonly<Record<string, TracerCtor>> = {
  Array1DTracer,
  Array2DTracer,
  ChartTracer,
  ScatterTracer,
  GraphTracer,
  LogTracer,
  MarkdownTracer,
};

const LAYOUT_DIRECTIONS: Readonly<Record<string, LayoutDirection>> = {
  HorizontalLayout: 'horizontal',
  VerticalLayout: 'vertical',
};

export interface ApplyError {
  readonly command: Command;
  readonly message: string;
}

/**
 * So chunk giữa hai keyframe. Doi lấy bộ nhớ lấy độ trễ khi tua ngược — PLAN.md quyet định A.
 * 250 là diem cần bang: trace 50.000 chunk sinh 200 keyframe, và replay tối đa 249 chunk.
 */
const KEYFRAME_INTERVAL = 250;

interface Keyframe {
  readonly cursor: number;
  readonly objects: ReadonlyMap<string, VizObject>;
  readonly rootKey: string | null;
}

/**
 * Ap dùng command list lên kho đối tượng và giữ trạng thái hiện tại.
 *
 * KHONG import React (PLAN.md ngầm #14). React nghe thay doi qua `subscribe`.
 */
export class VizEngine {
  private objects = new Map<string, VizObject>();
  private rootKey: string | null = null;
  private chunks: readonly Chunk[] = [];
  private cursorValue = 0;
  private keyframes: Keyframe[] = [];
  private listeners = new Set<() => void>();
  private version = 0;

  readonly errors: ApplyError[] = [];

  /** Nap trace moi va ve trang thai ban dau. */
  load(chunks: readonly Chunk[]): void {
    this.chunks = chunks;
    this.clear();
    this.emit();
  }

  get cursor(): number {
    return this.cursorValue;
  }

  get chunkCount(): number {
    return this.chunks.length;
  }

  get root(): VizObject | undefined {
    return this.rootKey === null ? undefined : this.objects.get(this.rootKey);
  }

  /** Tang moi khi trang thai doi; dung lam getSnapshot cho useSyncExternalStore. */
  getVersion(): number {
    return this.version;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  objectAt(key: string): VizObject | undefined {
    return this.objects.get(key);
  }

  /** Dong dang duoc to sang trong editor — ngam #15. */
  get lineNumber(): number | undefined {
    return this.cursorValue === 0 ? undefined : this.chunks[this.cursorValue - 1]?.lineNumber;
  }

  /**
   * Đạt cursor. Tien toi thì ap tiep các chunk con thieu; lui lai thì nhay ve keyframe
   * gan nhat roi replay phần du — thay cho viec replay từ đầu của bản cũ (ngầm #10).
   */
  seek(cursor: number): void {
    const target = Math.max(0, Math.min(cursor, this.chunks.length));
    if (target === this.cursorValue) return;

    if (target > this.cursorValue) {
      this.applyRange(this.cursorValue, target);
    } else {
      const keyframe = this.nearestKeyframe(target);
      if (keyframe === undefined) {
        this.clear();
      } else {
        this.restore(keyframe);
      }
      this.applyRange(this.cursorValue, target);
    }

    this.cursorValue = target;
    this.emit();
  }

  private applyRange(from: number, to: number): void {
    for (let index = from; index < to; index += 1) {
      const chunk = this.chunks[index];
      if (chunk === undefined) continue;
      for (const command of chunk.commands) {
        this.applyCommand(command);
      }
      const cursorAfter = index + 1;
      if (cursorAfter % KEYFRAME_INTERVAL === 0) this.recordKeyframe(cursorAfter);
    }
    this.cursorValue = to;
  }

  /**
   * Ap một lệnh. Loi của một lệnh KHONG làm sap cả trace (ngầm #42): no được ghi vào
   * `errors` để giao diện hiện ở panel loi, roi engine di tiep.
   */
  private applyCommand(command: Command): void {
    const { key, method, args } = command;
    try {
      if (key === null) {
        if (method === 'setRoot') {
          this.rootKey = typeof args[0] === 'string' ? args[0] : null;
        }
        return;
      }

      if (method === 'destroy') {
        this.objects.delete(key);
        return;
      }

      const direction = LAYOUT_DIRECTIONS[method];
      if (direction !== undefined) {
        const childKeys = Array.isArray(args[0]) ? args[0].filter(isString) : [];
        this.objects.set(key, new Layout(key, direction, childKeys));
        return;
      }

      const Ctor = TRACER_CTORS[method];
      if (Ctor !== undefined) {
        const title = typeof args[0] === 'string' ? args[0] : method;
        this.objects.set(key, new Ctor(key, title));
        return;
      }

      this.invokeMethod(key, method, args);
    } catch (error) {
      this.errors.push({
        command,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private invokeMethod(key: string, method: string, args: readonly JsonValue[]): void {
    const object = this.objects.get(key);
    if (object === undefined) {
      throw new Error(`Khong co doi tuong nao mang khoa "${key}"`);
    }

    // `chart` và `log` cần trả cứu đối tượng khac nên đi qua `link`
    if ((method === 'chart' || method === 'log') && object instanceof Tracer) {
      const target = args[0];
      object.link(typeof target === 'string' ? target : null, (k) => {
        const found = this.objects.get(k);
        return found instanceof Tracer ? found : undefined;
      });
      return;
    }

    const fn = (object as unknown as Record<string, unknown>)[method];
    if (typeof fn !== 'function') {
      throw new Error(`"${method}" khong phai method cua doi tuong "${key}"`);
    }
    (fn as (...a: JsonValue[]) => void).apply(object, [...args]);
  }

  private clear(): void {
    this.objects = new Map();
    this.rootKey = null;
    this.cursorValue = 0;
    this.keyframes = [];
    this.errors.length = 0;
  }

  private nearestKeyframe(cursor: number): Keyframe | undefined {
    let found: Keyframe | undefined;
    for (const keyframe of this.keyframes) {
      if (keyframe.cursor <= cursor) found = keyframe;
      else break;
    }
    return found;
  }

  /**
   * Chup bản sao SAU toàn bỏ kho đối tượng. Phải là bản sao sau: giữ tham chiếu thì
   * lệnh sau đó sẽ sửa thang vào keyframe và khôi phục sẽ cho ra trạng thái sai.
   */
  private recordKeyframe(cursor: number): void {
    if (this.keyframes.some((frame) => frame.cursor === cursor)) return;

    const objects = new Map<string, VizObject>();
    for (const [key, object] of this.objects) {
      objects.set(key, object.clone());
    }

    this.keyframes.push({ cursor, objects, rootKey: this.rootKey });
    this.keyframes.sort((a, b) => a.cursor - b.cursor);
  }

  /**
   * Khôi phục từ keyframe là O(so đối tượng), không phải O(so lệnh đã chạy).
   * Nhỏ vậy tua ngược chỉ phải replay tối đa KEYFRAME_INTERVAL chunk — ngân sách §4.2.
   */
  private restore(keyframe: Keyframe): void {
    this.objects = new Map();
    for (const [key, object] of keyframe.objects) {
      this.objects.set(key, object.clone());
    }
    this.rootKey = keyframe.rootKey;
    this.errors.length = 0;
    this.cursorValue = keyframe.cursor;
    this.relinkTracers();
  }

  /**
   * Nối lại liên kết chart/log sau khi khôi phục: bản sao không mảng tham chiếu toi
   * đối tượng khac, và các liên kết đó được thiet lap boi lệnh nên phải dùng lai từ lệnh.
   */
  private relinkTracers(): void {
    for (let index = 0; index < this.cursorValue; index += 1) {
      const chunk = this.chunks[index];
      if (chunk === undefined) continue;
      for (const command of chunk.commands) {
        if (command.key === null) continue;
        if (command.method !== 'chart' && command.method !== 'log') continue;
        this.applyCommand(command);
      }
    }
  }

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
