/**
 * Tách kênh lệnh khỏi stdout thường — PLAN.md §3.5 quy tắc 1.
 *
 * Người dùng có toàn quyền gọi print/console.log trong code của họ. Nếu lệnh và output
 * của họ dùng chung stdout không có khung bao thì luồng lệnh vỡ ngay lần đầu ai đó in debug.
 */

/**
 * U+001E RECORD SEPARATOR. Dùng fromCharCode thay vì nhúng thẳng ký tự vào chuỗi:
 * ký tự điều khiển là vô hình trong editor và để bị nuốt khi copy hoặc chuyển mã hóa.
 * Thư viện tracer của 18 ngôn ngữ phải dùng đúng byte này.
 */
const RECORD_SEPARATOR = String.fromCharCode(0x1e);

export const COMMAND_PREFIX = `${RECORD_SEPARATOR}@AV|`;

export interface FramedLine {
  readonly kind: 'command' | 'stdout';
  readonly text: string;
}

/** Boc mot dong lenh de thu vien tracer in ra stdout. */
export function frame(payload: string): string {
  return COMMAND_PREFIX + payload;
}

/**
 * Phân loại một dòng stdout. Đóng không mang tiền tố được GIU LAI thay vì bỏ di —
 * đó là output thật của người dùng và phải hiện ở panel riêng.
 */
export function classifyLine(line: string): FramedLine {
  return line.startsWith(COMMAND_PREFIX)
    ? { kind: 'command', text: line.slice(COMMAND_PREFIX.length) }
    : { kind: 'stdout', text: line };
}

export interface SplitStream {
  readonly commandLines: readonly string[];
  readonly userOutput: string;
}

/** Tach stdout tho cua Piston thanh hai luong: lenh, va output cua nguoi dung. */
export function splitStream(stdout: string): SplitStream {
  const commandLines: string[] = [];
  const userLines: string[] = [];

  for (const line of stdout.split('\n')) {
    const framed = classifyLine(line);
    if (framed.kind === 'command') {
      commandLines.push(framed.text);
    } else {
      userLines.push(framed.text);
    }
  }

  // Bỏ dòng rỗng cuối đó split sinh ra, nhưng giữ mỗi dòng rỗng o giữa
  while (userLines.length > 0 && userLines[userLines.length - 1] === '') {
    userLines.pop();
  }

  return { commandLines, userOutput: userLines.join('\n') };
}
