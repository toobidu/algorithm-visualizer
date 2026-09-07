import { stepsToCommands, type Step } from '@av/autoviz';
import { parseStdout, serializeCommand, type Command } from '@av/protocol';
import { frame } from '@av/protocol';
import type { RunResponse } from './worker';

export interface RunResult {
  readonly commands: readonly Command[];
  readonly userOutput: string;
  /** Trace chạy xong nhưng có điều cần báo (bị cắt, chương trình dừng bất thường). */
  readonly warning: string | undefined;
}

export class RunCancelled extends Error {
  constructor() {
    super('Da huy');
    this.name = 'RunCancelled';
  }
}

/** Tran thoi gian chay — PLAN.md §4.6. Vong lap vo han phai bi chan. */
const RUN_TIMEOUT_MS = 10_000;
const MAX_COMMANDS = 2_000_000;

/**
 * Chạy JavaScript/TypeScript ngay trong trình duyệt.
 *
 * Worker bi terminate khi qua thoi gian hoặc khi người dùng bam Run lan nua, nên vòng lặp
 * vỡ han không thể treo giao diện — đây là lý do không chạy code người dùng o luong chinh.
 */
export function runInWorker(code: string, signal: AbortSignal, plain = false): Promise<RunResult> {
  return new Promise<RunResult>((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      worker.terminate();
      fn();
    };

    const onAbort = (): void => {
      finish(() => {
        reject(new RunCancelled());
      });
    };

    const timer = window.setTimeout(() => {
      finish(() => {
        reject(new Error(`Code chạy quá ${String(RUN_TIMEOUT_MS / 1000)} giây và đã bị dừng.`));
      });
    }, RUN_TIMEOUT_MS);

    signal.addEventListener('abort', onAbort);

    worker.onmessage = (event: MessageEvent<RunResponse>) => {
      const data = event.data;
      finish(() => {
        if (!data.ok) {
          reject(new Error(data.error ?? 'Lỗi không xác định'));
          return;
        }
        // Chế độ tự trực quan hóa: worker trả về chuỗi bước, không phải command list
        if (plain) {
          const steps = Array.isArray(data.steps) ? (data.steps as Step[]) : [];
          resolve({ commands: stepsToCommands(steps, code), userOutput: '', warning: undefined });
          return;
        }
        if (data.commands.length > MAX_COMMANDS) {
          reject(
            new Error(`Trace vượt ${String(MAX_COMMANDS)} lenh. Hãy giảm kích thước dữ liệu.`),
          );
          return;
        }
        resolve(decode(data.commands));
      });
    };

    worker.onerror = (event) => {
      finish(() => {
        reject(new Error(event.message || 'Worker gặp lỗi'));
      });
    };

    worker.postMessage({ code, plain });
  });
}

/**
 * Đi qua chinh parser của `@av/protocol` thay vì tin thang vào worker.
 *
 * Duong này đạt hon một chut nhưng đảm bảo ban trình duyệt và ban qua Piston ở Phase 3
 * chạy cùng một đoạn mã kiểm trả — nếu không, hai duong sẽ trôi lệch nhau.
 */
function decode(raw: readonly unknown[]): RunResult {
  const stdout = raw.map((command) => frame(serializeCommand(command as Command))).join('\n');
  const parsed = parseStdout(stdout);
  if (parsed.issues.length > 0) {
    const first = parsed.issues[0];
    throw new Error(`Lệnh không hợp lệ ở dòng ${String(first?.line)}: ${first?.message ?? ''}`);
  }
  return { commands: parsed.commands, userOutput: parsed.userOutput, warning: undefined };
}
