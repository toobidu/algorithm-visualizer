import { commandSchema, type Command } from '@av/protocol';
import { RunCancelled, type RunResult } from './runInWorker';

interface GatewayResponse {
  readonly status?: unknown;
  readonly commands?: unknown;
  readonly userOutput?: unknown;
  readonly message?: unknown;
}

/**
 * Chạy code qua gateway cho các ngôn ngữ không chạy được trong trình duyệt.
 *
 * Không tin thẳng dữ liệu từ mạng: mỗi lệnh đều đi qua schema của `@av/protocol`,
 * giống hệt đường chạy trong Worker. Hai đường dùng chung một bộ kiểm tra thì mới
 * không trôi lệch nhau.
 */
export async function runOnGateway(
  languageId: string,
  code: string,
  signal: AbortSignal,
  plain: boolean,
): Promise<RunResult> {
  let response: Response;
  try {
    response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ languageId, code, plain }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw new RunCancelled();
    throw new Error(
      error instanceof Error
        ? `Không gọi được dịch vụ chạy code: ${error.message}`
        : 'Không gọi được dịch vụ chạy code',
    );
  }

  /**
   * Đọc thân phản hồi bằng `text()` rồi mới parse, chứ không gọi thẳng `json()`.
   *
   * Gateway chưa chạy thì proxy của Vite trả 500 với thân RỖNG. Gọi `json()` lúc đó
   * ném ra "Unexpected end of JSON input" — người dùng đọc xong không biết là thiếu dịch vụ.
   */
  const raw = await response.text();
  let body: GatewayResponse = {};
  if (raw !== '') {
    try {
      body = JSON.parse(raw) as GatewayResponse;
    } catch {
      throw new Error(
        `Dịch vụ chạy code trả về dữ liệu không đọc được (HTTP ${String(response.status)}).`,
      );
    }
  }
  const message = typeof body.message === 'string' ? body.message : undefined;

  if (!response.ok) {
    if (message !== undefined) throw new Error(message);
    // 500 rỗng gần như luôn là proxy không nối được tới gateway
    if (raw === '') {
      throw new Error(
        'Không gọi được dịch vụ chạy code ở 127.0.0.1:3001. ' +
          'Ngôn ngữ này cần gateway — chạy `pnpm dev:gateway` rồi thử lại.',
      );
    }
    throw new Error(`Dịch vụ chạy code trả về ${String(response.status)}`);
  }

  // Trace không hoàn chỉnh vẫn phát được phần thu thập — §3.6.
  // Chỉ ném lỗi khi không có lệnh nào để hiển thị.
  const rawCommands = Array.isArray(body.commands) ? body.commands : [];
  const commands: Command[] = [];
  for (const item of rawCommands) {
    const parsed = commandSchema.safeParse(item);
    if (parsed.success) commands.push(parsed.data);
  }

  if (commands.length === 0 && message !== undefined) {
    throw new Error(message);
  }

  return {
    commands,
    userOutput: typeof body.userOutput === 'string' ? body.userOutput : '',
    warning: body.status === 'ok' ? undefined : message,
  };
}
