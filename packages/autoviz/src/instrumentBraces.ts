/**
 * Chèn lời gọi theo dõi vào ngôn ngữ dùng ngoặc nhọn — Java, Go, JavaScript, C++.
 *
 * Bốn ngôn ngữ này khác nhau ở cú pháp khai báo biến và cách viết lời gọi, nhưng giống nhau
 * ở phần khó: theo dõi phạm vi bằng độ sâu ngoặc, và biết dòng nào là câu lệnh thật.
 * Gom phần chung vào đây để thêm ngôn ngữ thứ năm chỉ là mô tả vài mẫu chữ.
 *
 * PHẠM VI CÓ CHỦ Ý: không phân tích cú pháp đầy đủ. Đủ dùng cho hình dạng phổ biến của bài
 * thuật toán (vòng lặp, gán, điều kiện); gặp cấu trúc lạ thì bỏ qua chứ không đoán bừa.
 */

export const NEWLINE = String.fromCharCode(10);

export interface BraceDialect {
  /** Mẫu bắt tên biến khai báo trong thân hàm. Nhóm bắt số 1 là tên. */
  readonly declaration: readonly RegExp[];
  /**
   * Mẫu bắt biến thuộc phạm vi BÊN TRONG khối mở trên cùng dòng —
   * biến vòng lặp `for (int i ...)` và tham số hàm.
   */
  readonly innerScoped: readonly RegExp[];
  /**
   * Mẫu bắt DANH SÁCH tham số của một hàm; nhóm 1 là cả danh sách.
   *
   * Tách riêng vì tham số cần xử lý khác: phải cắt theo dấu phẩy rồi bỏ phần kiểu
   * (`int[] prices` -> `prices`). Bắt bằng một regex chung thì hoặc lấy cả cụm làm tên,
   * hoặc vơ nhầm mọi dấu phẩy trong file.
   */
  readonly params?: RegExp;
  /** Dòng bắt đầu bằng những từ này thì không chèn gì phía sau. */
  readonly skipPrefixes: readonly string[];
  /** Ký hiệu comment một dòng. */
  readonly comment: string;
  /** Sinh lời gọi ghi lại trạng thái. */
  emit(line: number, names: readonly string[]): string;
}

interface Scoped {
  readonly name: string;
  readonly depth: number;
}

export function namesFrom(patterns: readonly RegExp[], text: string): string[] {
  const names: string[] = [];
  for (const pattern of patterns) {
    // Mẫu dùng cờ `g` nên phải đặt lại con trỏ trước mỗi lần dùng
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      if (name !== undefined && name !== 'args') names.push(name);
    }
  }
  return names;
}

/**
 * Cấu trúc điều khiển cũng có hình dạng `từ (…) {` giống hệt chữ ký hàm.
 *
 * Không loại chúng ra thì điều kiện bị đọc như danh sách tham số: `while (right < prices.length)`
 * cho ra một "tham số" tên `length` — sinh ra `AvTrace.step(…, "length", length)` với một biến
 * không hề tồn tại, và Java không biên dịch nổi. `isStatement` đã phân biệt hai thứ này rồi;
 * chỗ này phải dùng cùng luật.
 */
const CONTROL_STRUCTURE = /\b(?:if|for|while|else|switch|do|try|catch|synchronized)\s*\(/;

/** Tên tham số: cắt theo dấu phẩy rồi lấy định danh cuối cùng của mỗi phần. */
export function paramNames(pattern: RegExp | undefined, line: string): string[] {
  if (pattern === undefined) return [];
  if (CONTROL_STRUCTURE.test(line)) return [];
  pattern.lastIndex = 0;
  const match = pattern.exec(line);
  const list = match?.[1];
  if (list === undefined || list.trim() === '') return [];

  const names: string[] = [];
  for (const part of list.split(',')) {
    const identifiers = part.match(/[A-Za-z_$][\w$]*/g);
    const last = identifiers?.[identifiers.length - 1];
    if (last !== undefined && last !== 'args') names.push(last);
  }
  return names;
}

/**
 * Chênh lệch ngoặc nhọn của một dòng, kèm độ sâu THẤP NHẤT chạm tới giữa chừng.
 *
 * `min` là thứ không thể suy ra từ `delta`, và thiếu nó thì `} else {` trông như không
 * đổi gì (delta = 0) trong khi nó đã ĐÓNG một khối: biến khai báo trong nhánh `if` sẽ
 * sống tiếp sang nhánh `else` và sinh ra lời gọi tham chiếu biến ngoài phạm vi.
 *
 * Bỏ qua ngoặc nằm trong chuỗi hoặc ký tự.
 */
export function depthProfile(line: string): { delta: number; min: number } {
  let delta = 0;
  let min = 0;
  let inString = false;
  let inChar = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    const escaped = line[i - 1] === String.fromCharCode(92);
    if (c === '"' && !escaped && !inChar) inString = !inString;
    else if (c === "'" && !escaped && !inString) inChar = !inChar;
    else if (!inString && !inChar) {
      if (c === '{') delta += 1;
      else if (c === '}') {
        delta -= 1;
        if (delta < min) min = delta;
      }
    }
  }
  return { delta, min };
}

/** Đếm chênh lệch ngoặc nhọn, bỏ qua ngoặc nằm trong chuỗi hoặc ký tự. */
export function depthDelta(line: string): number {
  return depthProfile(line).delta;
}

function isStatement(line: string, dialect: BraceDialect): boolean {
  const trimmed = line.trim();
  if (trimmed === '') return false;
  if (trimmed.startsWith(dialect.comment) || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return false;
  }
  if (trimmed.startsWith('}') || trimmed.startsWith('{') || trimmed.startsWith('@')) return false;
  for (const prefix of dialect.skipPrefixes) {
    if (trimmed.startsWith(prefix)) return false;
  }
  // Chữ ký hàm kết thúc bằng `) {` nhưng không phải cấu trúc điều khiển
  if (/\)\s*\{$/.test(trimmed) && !/\b(if|for|while|else|switch|do|try|catch)\b/.test(trimmed)) {
    return false;
  }
  return trimmed.endsWith(';') || trimmed.endsWith('{');
}

export interface BraceResult {
  readonly lines: readonly string[];
  readonly locals: readonly string[];
}

/** Chèn lời gọi vào từng câu lệnh, chỉ truyền biến còn trong phạm vi. */
export function instrumentBraces(source: string, dialect: BraceDialect): BraceResult {
  const out: string[] = [];
  const scope: Scoped[] = [];
  const seen = new Set<string>();
  let depth = 0;

  source.split(NEWLINE).forEach((line, index) => {
    out.push(line);

    const before = depth;
    const { delta, min } = depthProfile(line);
    depth = before + delta;

    // Dọn theo độ sâu THẤP NHẤT của dòng chứ không theo độ sâu cuối dòng: `} else {`
    // đóng rồi mở lại nên kết thúc ở đúng độ sâu cũ, nhưng biến của nhánh trước phải chết.
    const lowest = Math.min(depth, before + min);
    while (scope.length > 0 && (scope[scope.length - 1]?.depth ?? 0) > lowest) scope.pop();

    const innerDepth = Math.max(before, depth);
    for (const name of namesFrom(dialect.innerScoped, line)) add(scope, seen, name, innerDepth);
    for (const name of paramNames(dialect.params, line)) add(scope, seen, name, innerDepth);
    for (const name of namesFrom(dialect.declaration, line)) add(scope, seen, name, before);

    if (!isStatement(line, dialect)) return;

    const visible = scope.filter((entry) => entry.depth <= depth).map((entry) => entry.name);
    if (visible.length === 0) return;

    const indent = /^\s*/.exec(line)?.[0] ?? '';
    out.push(indent + dialect.emit(index + 1, visible));
  });

  return { lines: out, locals: [...seen] };
}

function add(scope: Scoped[], seen: Set<string>, name: string, depth: number): void {
  seen.add(name);
  if (scope.some((entry) => entry.name === name)) return;
  scope.push({ name, depth });
}
