/**
 * Định dạng giá trị để hiển thị — hanh vi ngầm #46, trích từ `legacy/.../Renderer/index.js`.
 *
 * Các giá trị "vô cực gia" được quy ve ký hiệu vô cực: thuật toán duong di ngắn nhat
 * thường dùng 0x7fffffff hoặc MAX_SAFE_INTEGER làm giá trị khởi tạo, và người học cần
 * thay chung là vô cực chu không phải một so lớn vỡ nghia.
 */
const POSITIVE_INFINITIES: readonly number[] = [
  Number.POSITIVE_INFINITY,
  Number.MAX_SAFE_INTEGER,
  0x7fffffff,
];

const NEGATIVE_INFINITIES: readonly number[] = [
  Number.NEGATIVE_INFINITY,
  Number.MIN_SAFE_INTEGER,
  -0x80000000,
];

export function toDisplayString(value: unknown): string {
  if (typeof value === 'number') {
    if (POSITIVE_INFINITIES.includes(value)) return '\u221e';
    if (NEGATIVE_INFINITIES.includes(value)) return '-\u221e';
    if (Number.isNaN(value)) return 'NaN';
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  if (typeof value === 'boolean') return value ? 'T' : 'F';
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
