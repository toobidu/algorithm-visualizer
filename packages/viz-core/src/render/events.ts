/**
 * Suy ra HÀNH ĐỘNG giữa hai khung hình liên tiếp — xem docs/y-tuong-hoat-canh.md.
 *
 * Bộ lệnh chỉ mô tả trạng thái tĩnh: `select` nói ô nào đang được chọn, `patch` nói ô nào
 * vừa đổi giá trị. Không có lệnh nào nói "vừa đổi chỗ ô 0 với ô 1". Nhưng engine giữ mọi
 * khung hình, nên so hai khung liên tiếp là đủ suy ra — không phải thêm lệnh mới, không
 * phải sửa thư viện tracer của 7 ngôn ngữ, bộ tuân thủ không đỏ.
 *
 * Trả về dữ liệu THUẦN: không mã màu, không toạ độ pixel, không thời lượng. Quyết định vẽ
 * thế nào là việc của lớp giao diện.
 */
import { type BarScene, type GridScene } from './scene';

export type SceneEvent =
  /** Hai ô hoán đổi giá trị cho nhau */
  | { readonly kind: 'swap'; readonly row: number; readonly a: number; readonly b: number }
  /** Một dải liền mạch trượt sang trái hoặc phải đúng một ô */
  | { readonly kind: 'shift'; readonly row: number; readonly from: number; readonly to: number }
  /** Một ô nhận giá trị mới, không phải do đổi chỗ */
  | { readonly kind: 'assign'; readonly row: number; readonly index: number };

/**
 * Trần số ô đổi mà vẫn coi là "một hành động".
 *
 * Vượt ngưỡng gần như luôn là `set` thay cả mảng — nạp dữ liệu mới chứ không phải một
 * bước thuật toán. Cho nó chạy hoạt cảnh thì mỗi lần nạp lại là cả mảng nhấp nháy.
 */
const MAX_ASSIGNS = 3;

function diffRow(row: number, before: readonly string[], after: readonly string[]): SceneEvent[] {
  if (before.length !== after.length) return [];

  const changed: number[] = [];
  for (let i = 0; i < after.length; i += 1) {
    if (before[i] !== after[i]) changed.push(i);
  }
  if (changed.length === 0) return [];

  // Đổi chỗ: đúng hai ô, và giá trị của chúng hoán cho nhau
  if (changed.length === 2) {
    const [a, b] = changed as [number, number];
    if (before[a] === after[b] && before[b] === after[a]) {
      return [{ kind: 'swap', row, a, b }];
    }
  }

  // Trượt: dải đổi phải LIỀN MẠCH, và mỗi ô nhận đúng giá trị của ô kề bên
  const lo = changed[0] ?? 0;
  const hi = changed[changed.length - 1] ?? 0;
  if (changed.length >= 2 && hi - lo + 1 === changed.length) {
    let rightward = true;
    let leftward = true;
    for (let i = lo; i <= hi; i += 1) {
      if (after[i] !== before[i - 1]) rightward = false;
      if (after[i] !== before[i + 1]) leftward = false;
    }
    if (rightward) return [{ kind: 'shift', row, from: lo - 1, to: hi }];
    if (leftward) return [{ kind: 'shift', row, from: hi + 1, to: lo }];
  }

  if (changed.length > MAX_ASSIGNS) return [];
  return changed.map((index) => ({ kind: 'assign', row, index }) as const);
}

export function diffGrid(before: GridScene | undefined, after: GridScene): readonly SceneEvent[] {
  if (before?.rows.length !== after.rows.length) return [];

  const events: SceneEvent[] = [];
  for (let row = 0; row < after.rows.length; row += 1) {
    const beforeRow = before.rows[row]?.cells.map((cell) => cell.text) ?? [];
    const afterRow = after.rows[row]?.cells.map((cell) => cell.text) ?? [];
    events.push(...diffRow(row, beforeRow, afterRow));
  }
  return events;
}

export function diffBars(before: BarScene | undefined, after: BarScene): readonly SceneEvent[] {
  if (before === undefined) return [];
  return diffRow(
    0,
    before.bars.map((bar) => bar.label),
    after.bars.map((bar) => bar.label),
  );
}

export interface Comparison {
  readonly row: number;
  readonly left: number;
  readonly right: number;
  /** Quan hệ giữa GIÁ TRỊ ở hai ô, đọc từ trái sang phải */
  readonly relation: '<' | '>' | '=';
}

/**
 * Hai ô đang được chọn trong cùng một hàng thì gần như chắc chắn là một phép so sánh —
 * đó là hình dạng của mọi vòng lặp sắp xếp và mọi thuật toán hai con trỏ.
 *
 * Chỉ nhận khi cả hai đọc được thành số: so chuỗi thì `"10" < "9"` và huy hiệu sẽ nói dối.
 */
export function findComparison(scene: GridScene): Comparison | undefined {
  for (let row = 0; row < scene.rows.length; row += 1) {
    const cells = scene.rows[row]?.cells ?? [];
    const picked: number[] = [];
    for (let i = 0; i < cells.length; i += 1) {
      if (cells[i]?.tone === 'selected') picked.push(i);
    }
    if (picked.length !== 2) continue;

    const [left, right] = picked as [number, number];
    const a = Number(cells[left]?.text);
    const b = Number(cells[right]?.text);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    return { row, left, right, relation: a < b ? '<' : a > b ? '>' : '=' };
  }
  return undefined;
}
