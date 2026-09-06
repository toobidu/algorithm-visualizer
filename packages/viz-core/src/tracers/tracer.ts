import { type JsonValue } from '@av/protocol';

/**
 * Lop có so cho mỗi đối tượng hiển thị.
 *
 * `viz-core` KHONG import React — PLAN.md ngầm #14 và #33. Tracer chỉ giữ du lieu;
 * viec dùng ra hình học đó renderer làm, và viec bao cho React biet đó `VizEngine` làm.
 */
export abstract class Tracer {
  readonly key: string;
  title: string;

  constructor(key: string, title: string) {
    this.key = key;
    this.title = title;
    this.reset();
  }

  /** Ten lop, dung de renderer chon cach ve. */
  abstract readonly kind: string;

  /**
   * Đặt lại du lieu ve trạng thái rong. Gọi trong constructor nên lop con không được
   * dựa vào truong khởi tạo bang property initializer — chung chạy SAU constructor cha.
   */
  abstract reset(): void;

  /** Cho phep tracer nay lien ket voi tracer khac (Array1D.chart, Graph.log). */
  link(_key: string | null, _resolve: (key: string) => Tracer | undefined): void {
    // Mặc định không liên kết gi
  }

  /**
   * Bản sao độc lập, dùng cho keyframe của engine.
   * Phải sao chep SAU du lieu: keyframe chia sẻ tham chiếu sẽ bi lệnh sau đó sửa vào.
   */
  abstract clone(): Tracer;

  /** Method khong nam trong lop con se roi vao day thay vi lam sap ca trace — ngam #42. */
  applyUnknown(method: string): never {
    throw new Error(`${this.kind} khong co method "${method}"`);
  }
}

/** Mot o trong mang, mang theo trang thai hien thi. */
export class Cell {
  value: JsonValue;
  patched = false;
  selected = false;

  constructor(value: JsonValue) {
    this.value = value;
  }

  clone(): Cell {
    const copy = new Cell(this.value);
    copy.patched = this.patched;
    copy.selected = this.selected;
    return copy;
  }
}
