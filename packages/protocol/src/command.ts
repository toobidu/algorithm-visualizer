import { z } from 'zod';
import { type JsonValue, serializeJson } from './json';

/**
 * Một lệnh trong command list. Thứ tự khóa khi ghi ra là cố định:
 * key, method, args — xem `serializeCommand`.
 */
export interface Command {
  /** `null` cho lenh toan cuc (setRoot, delay); nguoc lai la khoa cua object */
  readonly key: string | null;
  readonly method: string;
  readonly args: readonly JsonValue[];
}

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const commandSchema: z.ZodType<Command> = z.object({
  key: z.string().min(1).nullable(),
  method: z.string().min(1),
  args: z.array(jsonValueSchema),
});

/**
 * Ghi một lệnh ra JSON với thứ tự khóa cố định.
 *
 * Bất biến o Phụ lục C doi hai ngôn ngữ chạy cùng thuật toán phải sinh ra byte giong hết.
 * `JSON.stringify` giữ thứ tự chèn, ma thứ tự đó khác nhau giữa các ngôn ngữ, nên không
 * được dùng trực tiếp.
 */
export function serializeCommand(command: Command): string {
  const key = command.key === null ? 'null' : JSON.stringify(command.key);
  const method = JSON.stringify(command.method);
  const args = command.args.map(serializeJson).join(',');
  return `{"key":${key},"method":${method},"args":[${args}]}`;
}

/** Chunk la mot khung hinh: cac lenh chay lien tuc toi khi gap `delay`. */
export interface Chunk {
  readonly commands: readonly Command[];
  /** So dong code ung voi khung hinh nay; `undefined` khi chunk chua ket thuc bang delay */
  readonly lineNumber: number | undefined;
}

export function isDelay(command: Command): boolean {
  return command.key === null && command.method === 'delay';
}

export function isSetRoot(command: Command): boolean {
  return command.key === null && command.method === 'setRoot';
}
