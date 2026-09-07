/**
 * Chuẩn hoá thụt lề cho các ngôn ngữ dùng ngoặc nhọn (Java, C++, C#, Go, Kotlin…).
 *
 * KHÔNG phải Prettier: không ngắt dòng lại, không đụng vào khoảng trắng giữa dòng. Chỉ
 * đếm độ sâu ngoặc rồi đặt lại phần đầu mỗi dòng. Đây là giới hạn cố ý — không có parser
 * thật cho từng ngôn ngữ thì mọi thao tác mạnh tay hơn đều có ngày làm hỏng code người dùng.
 *
 * Chuỗi và comment bị bỏ qua khi đếm ngoặc, nếu không thì `printf("}")` cũng làm lệch cả file.
 */

interface IndentOptions {
  /** Một cấp thụt lề, ví dụ hai dấu cách hoặc một tab. */
  readonly indent: string;
}

interface Block {
  readonly isSwitch: boolean;
  inCase: boolean;
}

const OPENERS = '{[(';
const CLOSERS = '}])';

/** Trạng thái vắt qua nhiều dòng: chỉ block comment và chuỗi backtick mới vắt được. */
interface ScanState {
  blockComment: boolean;
  rawString: boolean;
}

const SWITCH_LINE = /(^|[^\w$])switch\s*\(/;
const CASE_LABEL = /^(case[^\w$]|default\s*(:|->))/;

/**
 * Nháy đơn là ký tự nhập nhằng nhất: nó vừa mở char literal (`'x'`) vừa là lifetime của
 * Rust (`&'a str`) và dấu lược trong tiếng Anh. Chỉ coi là literal khi thấy nháy đóng ngay
 * sau 1-2 ký tự; còn lại coi như ký tự code bình thường.
 */
const CHAR_LITERAL = /^'(\\.|[^'\\]{1,2})'/;

function skipQuoted(text: string, start: number, quote: string): number {
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === quote) return i + 1;
  }
  // Chuỗi không đóng trước khi hết dòng: nuốt nốt phần còn lại rồi trả trạng thái về code.
  // Chuỗi thật hiếm khi vắt dòng, còn dấu nháy lẻ trong code hỏng thì thường xuyên.
  return text.length;
}

/** Duyệt một đoạn code, gọi `onOpen`/`onClose` cho từng ngoặc nằm ngoài chuỗi và comment. */
function scanSegment(
  text: string,
  state: ScanState,
  onOpen: (ch: string) => void,
  onClose: () => void,
): void {
  let i = 0;
  while (i < text.length) {
    const ch = text[i] ?? '';

    if (state.blockComment) {
      if (ch === '*' && text[i + 1] === '/') {
        state.blockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (state.rawString) {
      if (ch === '`') state.rawString = false;
      i += 1;
      continue;
    }

    if (ch === '/' && text[i + 1] === '/') return;
    if (ch === '/' && text[i + 1] === '*') {
      state.blockComment = true;
      i += 2;
      continue;
    }
    if (ch === '`') {
      state.rawString = true;
      i += 1;
      continue;
    }
    if (ch === '"') {
      i = skipQuoted(text, i, '"');
      continue;
    }
    if (ch === "'") {
      const literal = CHAR_LITERAL.exec(text.slice(i));
      i += literal === null ? 1 : literal[0].length;
      continue;
    }

    if (OPENERS.includes(ch)) onOpen(ch);
    else if (CLOSERS.includes(ch)) onClose();
    i += 1;
  }
}

/** Số ngoặc đóng liền nhau ở đầu dòng — chúng thuộc về cấp thụt lề NÔNG hơn dòng hiện tại. */
function leadingClosers(trimmed: string): number {
  let count = 0;
  while (count < trimmed.length && CLOSERS.includes(trimmed[count] ?? '')) count += 1;
  return count;
}

/**
 * Nhãn `case`/`default` nằm nông hơn thân của nó một cấp. Đếm số switch đang mở đã gặp
 * nhãn để cộng thêm cấp cho các dòng thân.
 */
function caseDepth(blocks: readonly Block[]): number {
  return blocks.filter((block) => block.isSwitch && block.inCase).length;
}

export function indentBraces(source: string, options: IndentOptions): string {
  const blocks: Block[] = [];
  const state: ScanState = { blockComment: false, rawString: false };
  const out: string[] = [];
  let blankRun = 0;

  for (const rawLine of source.split('\n')) {
    const line = rawLine.replace(/[ \t]+$/, '');
    const trimmed = line.trim();
    const insideMultiline = state.blockComment || state.rawString;

    const isSwitchLine = SWITCH_LINE.test(trimmed);
    const open = (ch: string): void => {
      blocks.push({ isSwitch: ch === '{' && isSwitchLine, inCase: false });
    };
    const close = (): void => {
      blocks.pop();
    };

    if (trimmed === '' && !state.rawString) {
      blankRun += 1;
      // Gộp nhiều dòng trống liền nhau còn một, giống Prettier
      if (blankRun === 1 && out.length > 0) out.push('');
      continue;
    }
    blankRun = 0;

    if (insideMultiline) {
      // Thân chuỗi nhiều dòng phải giữ NGUYÊN XI, đổi một khoảng trắng là đổi dữ liệu.
      // Dòng tiếp của block comment thì căn theo dấu `*` cho thẳng hàng.
      if (state.blockComment && trimmed.startsWith('*')) {
        out.push(`${options.indent.repeat(blocks.length + caseDepth(blocks))} ${trimmed}`);
      } else {
        out.push(line);
      }
      scanSegment(line, state, open, close);
      continue;
    }

    const closers = leadingClosers(trimmed);
    for (let i = 0; i < closers; i += 1) close();

    // Nhãn `case` tự nó nông hơn thân một cấp: tắt cờ trước khi tính thụt lề, bật lại sau
    const label = CASE_LABEL.test(trimmed)
      ? [...blocks].reverse().find((block) => block.isSwitch)
      : undefined;
    if (label !== undefined) label.inCase = false;

    out.push(options.indent.repeat(blocks.length + caseDepth(blocks)) + trimmed);
    if (label !== undefined) label.inCase = true;

    scanSegment(trimmed.slice(closers), state, open, close);
  }

  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out.length === 0 ? '' : `${out.join('\n')}\n`;
}
