/**
 * Ma hoa giá trị sang JSON sao cho 18 ngôn ngữ sinh ra byte giong hết nhau —
 * PLAN.md §3.5 quy tắc 2 và 3.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [k: string]: JsonValue };

/**
 * NaN và Infinity không phải JSON hợp lệ (§3.5 quy tắc 3). Boc chung trong một object
 * có khóa đánh dấu thay vì dùng chuỗi tran, để không lan với chuỗi "NaN" that của người dùng.
 */
export const NON_FINITE_KEY = '$num';

export type NonFiniteTag = 'NaN' | 'Infinity' | '-Infinity';

export interface NonFiniteNumber {
  readonly [NON_FINITE_KEY]: NonFiniteTag;
}

export function isNonFiniteNumber(value: unknown): value is NonFiniteNumber {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const tag: unknown = (value as Record<string, unknown>)[NON_FINITE_KEY];
  return tag === 'NaN' || tag === 'Infinity' || tag === '-Infinity';
}

export function encodeNumber(value: number): number | NonFiniteNumber {
  if (Number.isFinite(value)) return value;
  if (Number.isNaN(value)) return { [NON_FINITE_KEY]: 'NaN' };
  return { [NON_FINITE_KEY]: value > 0 ? 'Infinity' : '-Infinity' };
}

export function decodeNumber(value: number | NonFiniteNumber): number {
  if (typeof value === 'number') return value;
  switch (value[NON_FINITE_KEY]) {
    case 'NaN':
      return Number.NaN;
    case 'Infinity':
      return Number.POSITIVE_INFINITY;
    case '-Infinity':
      return Number.NEGATIVE_INFINITY;
  }
}

/**
 * Giới hạn an toàn của giao thức.
 *
 * JavaScript dùng double nên chỉ bieu dien chính xác số nguyên trong khóang +-2^53.
 * Python `int` và Java `long` KHONG có giới hạn này: cùng một thuật toán dùng số nguyên
 * lớn sẽ sinh command list khác nhau giữa các ngôn ngữ, pha bất biến byte-identical
 * o Phụ lục C. Thư viện tracer phải báo lỗi thay vì im lặng làm tròn.
 *
 * Kiểm trả theo DO LON chu không theo kieu du lieu: từ 2^53 tro lên, mỗi double đều là
 * số nguyên theo `Number.isInteger`, nên JavaScript không thể phần biet giá trị đến từ
 * phep toàn nguyen hay phep toàn thuc. Hậu quả là 1e300 cũng bi chan. Chấp nhận được vi
 * trực quan hóa thuật toán gan như không bao giờ dùng giá trị lớn đến vậy.
 */
export const SAFE_INTEGER_LIMIT = Number.MAX_SAFE_INTEGER;

export function isSafeForProtocol(value: number): boolean {
  // So không huu han di theo quy tắc 3 (encodeNumber), không phải quy tắc này
  if (!Number.isFinite(value)) return true;
  return Math.abs(value) <= SAFE_INTEGER_LIMIT;
}

/**
 * Bieu dien ngắn nhat khu hoi được của một so.
 *
 * `Number.prototype.toString` của ECMAScript đã dùng thuật toán này san, nên ban TypeScript
 * chỉ cần ủy quyền. Thư viện tracer của các ngôn ngữ KHAC phải từ đạt được kết quả giong hết:
 * Python dùng `repr`, Java dùng `Double.toString`, C++ phải dùng `std::to_chars`
 * chu không được dùng `printf("%f")` — no làm tròn ve 6 chu so và làm đó bỏ tuân thủ.
 */
export function serializeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return JSON.stringify(encodeNumber(value));
  }
  // -0 phải ra "-0" chu không phải "0": hai giá trị này khác nhau ve ngu nghia
  if (Object.is(value, -0)) return '-0';
  return String(value);
}

/**
 * Tuần tự hóa theo thứ tự khóa cố định. `JSON.stringify` giữ thứ tự chèn của object,
 * ma thứ tự đó khác nhau giữa các ngôn ngữ — nên mỗi cấu trúc di vào command list
 * đều phải được ghi ra qua ham này (§3.5 quy tắc 4).
 */
export function serializeJson(value: JsonValue): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return serializeNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(serializeJson).join(',')}]`;

  const entries = Object.entries(value as Record<string, JsonValue>);
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${serializeJson(v)}`).join(',')}}`;
}
