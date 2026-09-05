import { describe, expect, it } from 'vitest';
import { type Command } from './command';
import { isValidCursor, toChunks } from './chunk';

const cmd = (key: string | null, method: string, ...args: number[]): Command => ({
  key,
  method,
  args,
});
const delay = (line: number): Command => cmd(null, 'delay', line);
const op = (n: number): Command => cmd('a', 'select', n);

/**
 * Bản sao nguyên văn thuật toán cắt chunk của bản cũ
 * (`legacy/src/components/Player/index.js`, ham `reset`).
 * Dùng làm doi chung để bat mỗi sai lệch ve hanh vi.
 */
function legacyChunker(commands: Command[]): { commands: Command[]; lineNumber: unknown }[] {
  const input = [...commands];
  const chunks: { commands: Command[]; lineNumber: unknown }[] = [
    { commands: [], lineNumber: undefined },
  ];
  while (input.length) {
    const command = input.shift();
    if (command === undefined) break;
    const { key, method, args } = command;
    if (key === null && method === 'delay') {
      const [lineNumber] = args;
      const last = chunks[chunks.length - 1];
      if (last !== undefined) last.lineNumber = lineNumber;
      chunks.push({ commands: [], lineNumber: undefined });
    } else {
      chunks[chunks.length - 1]?.commands.push(command);
    }
  }
  return chunks;
}

describe('toChunks', () => {
  it('lenh truoc delay dau tien nam trong chunk[0], khong bi bo', () => {
    const chunks = toChunks([op(1), op(2), delay(5), op(3)]);

    expect(chunks[0]).toEqual({ commands: [op(1), op(2)], lineNumber: 5 });
  });

  it('luon mo mot chunk moi sau delay cuoi cung', () => {
    const chunks = toChunks([op(1), delay(5)]);

    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toEqual({ commands: [], lineNumber: undefined });
  });

  it('command list rong van cho dung mot chunk rong', () => {
    expect(toChunks([])).toEqual([{ commands: [], lineNumber: undefined }]);
  });

  it('chunk[0] rong khi lenh dau tien la delay', () => {
    expect(toChunks([delay(1), op(1)])[0]).toEqual({ commands: [], lineNumber: 1 });
  });

  it('delay khong co so dong cho lineNumber undefined', () => {
    expect(toChunks([{ key: null, method: 'delay', args: [] }])[0]?.lineNumber).toBeUndefined();
  });

  it.each<{ ten: string; input: Command[] }>([
    { ten: 'rong', input: [] },
    { ten: 'chi mot delay', input: [delay(1)] },
    { ten: 'delay lien tiep', input: [delay(1), delay(2), delay(3)] },
    { ten: 'khong co delay nao', input: [op(1), op(2)] },
    { ten: 'ket thuc bang delay', input: [op(1), delay(4)] },
    { ten: 'ket thuc bang lenh thuong', input: [op(1), delay(4), op(2)] },
    { ten: 'delay o dau va cuoi', input: [delay(1), op(1), delay(9)] },
  ])('khop voi thuat toan ban cu: $ten', ({ input }) => {
    expect(toChunks(input)).toEqual(legacyChunker(input));
  });
});

describe('isValidCursor', () => {
  const chunks = toChunks([op(1), delay(2)]);

  it('cursor 0 khong hop le vi nghia la chua apply gi', () => {
    expect(isValidCursor(chunks, 0)).toBe(false);
  });

  it('nhan cursor tu 1 toi chunks.length', () => {
    expect(isValidCursor(chunks, 1)).toBe(true);
    expect(isValidCursor(chunks, chunks.length)).toBe(true);
  });

  it('tu choi cursor vuot qua va cursor khong nguyen', () => {
    expect(isValidCursor(chunks, chunks.length + 1)).toBe(false);
    expect(isValidCursor(chunks, 1.5)).toBe(false);
  });
});
