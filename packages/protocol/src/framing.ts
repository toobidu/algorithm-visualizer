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

/**
 * Tach stdout tho cua Piston thanh hai luong: lenh, va output cua nguoi dung.
 *
 * Bản ghi bắt đầu ngay tại tiền tố chứ không đợi đầu dòng. Thư viện tracer của mọi ngôn
 * ngữ in `PREFIX + payload + \n` — có newline đóng nhưng không có newline mở. Nên khi code
 * người dùng in mà không xuống dòng (`echo` của PHP, `print(end='')` của Python,
 * `fmt.Print`, `System.out.print`) thì bản ghi kế tiếp dính vào đuôi dòng đó: cắt theo đầu
 * dòng sẽ vừa mất lệnh vừa đẩy rác giao thức ra panel output người dùng.
 *
 * Cắt xong một bản ghi thì nhảy thẳng qua hết dòng, nên payload có chứa chuỗi giống tiền
 * tố cũng không bị xé làm đôi.
 */
export function splitStream(stdout: string): SplitStream {
  const commandLines: string[] = [];
  let userOutput = '';
  let index = 0;

  while (index < stdout.length) {
    const at = stdout.indexOf(COMMAND_PREFIX, index);
    if (at === -1) {
      userOutput += stdout.slice(index);
      break;
    }

    userOutput += stdout.slice(index, at);

    const start = at + COMMAND_PREFIX.length;
    const end = stdout.indexOf('\n', start);
    commandLines.push(end === -1 ? stdout.slice(start) : stdout.slice(start, end));
    // Nuốt luôn newline đóng bản ghi để nó không thành dòng trống trong output
    index = end === -1 ? stdout.length : end + 1;
  }

  // Bỏ newline thừa ở cuối, nhưng giữ mọi dòng rỗng ở giữa
  return { commandLines, userOutput: userOutput.replace(/\n+$/, '') };
}
