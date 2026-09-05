import { type Chunk, type Command, isDelay } from './command';

/**
 * Cắt command list thành các khung hình — PLAN.md ngầm #08 và #09.
 *
 * Giữ đúng hai đặc điểm của bản cũ (`legacy/src/components/Player/index.js`), cả hai đều
 * dễ bị làm sai khi viết lại:
 *
 * 1. Các lệnh TRƯỚC `delay` đầu tiên nằm trong chunk[0], không bị bỏ đi. Chunk[0] chỉ rỗng
 *    khi lệnh đầu tiên là `delay`.
 * 2. Sau MỖI `delay`, kể cả cái cuối cùng, luôn có một chunk mới được mở. Nên trace luôn
 *    kết thúc bằng một khung hình không tô sáng dòng code nào — đó là trạng thái nghỉ
 *    sau khi thuật toán chạy xong.
 */
export function toChunks(commands: readonly Command[]): readonly Chunk[] {
  const commandsPerChunk: Command[][] = [[]];
  const lineNumbers: (number | undefined)[] = [undefined];

  for (const command of commands) {
    if (isDelay(command)) {
      lineNumbers[lineNumbers.length - 1] = readLineNumber(command);
      commandsPerChunk.push([]);
      lineNumbers.push(undefined);
    } else {
      commandsPerChunk[commandsPerChunk.length - 1]?.push(command);
    }
  }

  return commandsPerChunk.map((chunkCommands, index) => ({
    commands: chunkCommands,
    lineNumber: lineNumbers[index],
  }));
}

function readLineNumber(delay: Command): number | undefined {
  const [first] = delay.args;
  return typeof first === 'number' && Number.isFinite(first) ? first : undefined;
}

/**
 * Cursor hợp lệ theo ngầm #09: từ 1 toi `chunks.length`.
 * `cursor === 0` nghĩa là chua áp dụng gi.
 */
export function isValidCursor(chunks: readonly Chunk[], cursor: number): boolean {
  return Number.isInteger(cursor) && cursor >= 1 && cursor <= chunks.length;
}
