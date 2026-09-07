import { type JsonValue } from '@av/protocol';

/**
 * Một bước thực thi: dòng code vừa chạy xong, kèm giá trị các biến cục bộ tại đó.
 *
 * Đây là giao diện DUY NHẤT giữa "ngôn ngữ" và "cách vẽ". Mỗi ngôn ngữ chỉ cần phát ra
 * chuỗi bước này — bằng hook lúc chạy (Python `sys.settrace`) hay bằng biến đổi mã nguồn
 * (Java, JavaScript). Toàn bộ phần suy ra vẽ gì được viết một lần ở đây.
 */
export interface Step {
  readonly line: number;
  readonly vars: Readonly<Record<string, JsonValue>>;
}

/** Chú thích `@viz` người dùng viết trong comment để chỉ định cách vẽ. */
export interface VizHint {
  readonly kind: 'array' | 'grid' | 'pointer' | 'value' | 'ignore';
  readonly names: readonly string[];
}

const HINT_PATTERN = /@viz\s+(array|grid|pointer|value|ignore)\s+([\w\s,]+)/gi;

/**
 * Đọc chú thích `@viz` từ mã nguồn.
 *
 * Cố ý nhận diện bằng comment thay vì bằng lời gọi hàm: comment thì ngôn ngữ nào cũng có,
 * và code vẫn chạy được nguyên vẹn bên ngoài nền tảng này.
 */
export function parseHints(source: string): readonly VizHint[] {
  const hints: VizHint[] = [];
  for (const match of source.matchAll(HINT_PATTERN)) {
    const kind = match[1]?.toLowerCase() as VizHint['kind'] | undefined;
    const names = (match[2] ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== '');
    if (kind !== undefined && names.length > 0) hints.push({ kind, names });
  }
  return hints;
}

export type Role = 'array' | 'grid' | 'pointer' | 'value' | 'ignore';

function isNumberArray(value: JsonValue): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'number');
}

function isGrid(value: JsonValue): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isNumberArray);
}

/**
 * Đoán vai trò của từng biến khi người dùng không chú thích.
 *
 * Quy tắc cố ý giữ đơn giản và dễ đoán trước, vì người học phải hiểu được vì sao
 * màn hình hiện cái này chứ không phải cái kia:
 * mảng số → vẽ mảng; mảng hai chiều → vẽ lưới; số nguyên nằm trong khoảng chỉ số của
 * một mảng nào đó → con trỏ; còn lại → giá trị hiển thị trong nhật ký.
 */
export function inferRoles(
  steps: readonly Step[],
  hints: readonly VizHint[],
): ReadonlyMap<string, Role> {
  const roles = new Map<string, Role>();

  for (const hint of hints) {
    for (const name of hint.names) roles.set(name, hint.kind);
  }

  const names = new Set<string>();
  for (const step of steps) {
    for (const name of Object.keys(step.vars)) names.add(name);
  }

  // Độ dài lớn nhất từng thấy của mỗi mảng, để nhận ra biến nào là chỉ số hợp lệ
  const arrayLengths: number[] = [];
  for (const name of names) {
    if (roles.has(name)) continue;
    const sample = lastDefined(steps, name);
    if (sample === undefined) continue;

    if (isGrid(sample)) {
      roles.set(name, 'grid');
    } else if (isNumberArray(sample)) {
      roles.set(name, 'array');
      arrayLengths.push(sample.length);
    }
  }

  const maxIndex = Math.max(0, ...arrayLengths);

  for (const name of names) {
    if (roles.has(name)) continue;
    const values = steps
      .map((step) => step.vars[name])
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) {
      roles.set(name, 'value');
      continue;
    }

    const looksLikeIndex =
      arrayLengths.length > 0 &&
      values.every((value) => Number.isInteger(value) && value >= -1 && value <= maxIndex);
    roles.set(name, looksLikeIndex ? 'pointer' : 'value');
  }

  return roles;
}

function lastDefined(steps: readonly Step[], name: string): JsonValue | undefined {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const value = steps[i]?.vars[name];
    if (value !== undefined) return value;
  }
  return undefined;
}
