import { type JsonValue } from '@av/protocol';
import { Cell, Tracer } from './tracer';

/** Mang 2 chieu. Array1D, Chart, Scatter deu dua tren lop nay. */
export class Array2DTracer extends Tracer {
  readonly kind: string = 'Array2DTracer';

  data: Cell[][] = [];

  override reset(): void {
    this.data = [];
  }

  set(array2d: readonly (readonly JsonValue[])[] = []): void {
    this.data = array2d.map((row) => Array.from(row, (value) => new Cell(value)));
  }

  patch(x: number, y: number, value?: JsonValue): void {
    const cell = this.cellAt(x, y);
    if (value !== undefined) cell.value = value;
    cell.patched = true;
  }

  depatch(x: number, y: number): void {
    this.cellAt(x, y).patched = false;
  }

  select(sx: number, sy: number, ex: number = sx, ey: number = sy): void {
    this.mark(sx, sy, ex, ey, true);
  }

  deselect(sx: number, sy: number, ex: number = sx, ey: number = sy): void {
    this.mark(sx, sy, ex, ey, false);
  }

  selectRow(x: number, sy: number, ey: number): void {
    this.mark(x, sy, x, ey, true);
  }

  deselectRow(x: number, sy: number, ey: number): void {
    this.mark(x, sy, x, ey, false);
  }

  selectCol(y: number, sx: number, ex: number): void {
    this.mark(sx, y, ex, y, true);
  }

  deselectCol(y: number, sx: number, ex: number): void {
    this.mark(sx, y, ex, y, false);
  }

  protected mark(sx: number, sy: number, ex: number, ey: number, selected: boolean): void {
    for (let x = sx; x <= ex; x += 1) {
      for (let y = sy; y <= ey; y += 1) {
        const row = this.data[x];
        const cell = row?.[y];
        // Bỏ qua o ngoài phạm vi thay vì ném lỗi: thuật toán của người học thường
        // quet qua bien một o, và làm sap cả trace vi the là phần ung qua nang
        if (cell !== undefined) cell.selected = selected;
      }
    }
  }

  override clone(): Array2DTracer {
    const copy = new (this.constructor as new (key: string, title: string) => Array2DTracer)(
      this.key,
      this.title,
    );
    copy.data = this.data.map((row) => row.map((cell) => cell.clone()));
    return copy;
  }

  /** Ban cu tu tao o khi patch vao vi tri trong; giu nguyen hanh vi do. */
  protected cellAt(x: number, y: number): Cell {
    let row = this.data[x];
    if (row === undefined) {
      row = [];
      this.data[x] = row;
    }
    let cell = row[y];
    if (cell === undefined) {
      cell = new Cell(null);
      row[y] = cell;
    }
    return cell;
  }
}

/**
 * Mảng 1 chieu — chỉ là Array2D với dùng một hang, nên mỗi chỉ so bi đây xuong hang 0.
 *
 * `chart(key)` gan một ChartTracer DUNG CHUNG THAM CHIEU `data` (ngầm #34): một mảng
 * hiện đóng thoi dang o và dang cot, từ đồng bộ ma không cần lệnh rieng.
 */
export class Array1DTracer extends Array2DTracer {
  override readonly kind: string = 'Array1DTracer';

  private chartTracer: Array2DTracer | null = null;

  override reset(): void {
    super.reset();
    this.chartTracer = null;
  }

  override set(array1d: readonly JsonValue[] = []): void {
    super.set([array1d]);
    this.syncChart();
  }

  override patch(x: number, value?: JsonValue): void {
    super.patch(0, x, value);
  }

  override depatch(x: number): void {
    super.depatch(0, x);
  }

  override select(sx: number, ex: number = sx): void {
    super.mark(0, sx, 0, ex, true);
  }

  override deselect(sx: number, ex: number = sx): void {
    super.mark(0, sx, 0, ex, false);
  }

  chart(key: string | null, resolve?: (key: string) => Tracer | undefined): void {
    const target = key !== null && resolve ? resolve(key) : null;
    this.chartTracer = target instanceof Array2DTracer ? target : null;
    this.syncChart();
  }

  override link(key: string | null, resolve: (key: string) => Tracer | undefined): void {
    this.chart(key, resolve);
  }

  private syncChart(): void {
    if (this.chartTracer !== null) this.chartTracer.data = this.data;
  }

  // Liên kết chart là tham chiếu toi đối tượng khac trong kho; engine nối lại sau khi
  // khôi phục keyframe nên bản sao không mảng theo liên kết cu
  override clone(): Array1DTracer {
    return super.clone() as Array1DTracer;
  }
}

export class ChartTracer extends Array1DTracer {
  override readonly kind: string = 'ChartTracer';
}

export class ScatterTracer extends Array2DTracer {
  override readonly kind: string = 'ScatterTracer';
}
