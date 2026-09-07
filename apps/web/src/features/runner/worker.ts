/// <reference lib="webworker" />
import { javascriptAdapter } from '@av/autoviz';
import {
  PLAIN_RUNTIME_SOURCE,
  TRACER_RUNTIME_LINE_COUNT,
  TRACER_RUNTIME_SOURCE,
} from '@av/tracer-javascript';

export interface RunRequest {
  readonly code: string;
  /** Chế độ tự trực quan hóa: code không gọi tracer, worker trả về chuỗi bước. */
  readonly plain?: boolean;
}

export interface RunResponse {
  readonly ok: boolean;
  readonly commands: unknown[];
  readonly error: string | undefined;
  /** Chuỗi bước, chỉ có ở chế độ tự trực quan hóa. */
  readonly steps?: unknown[];
}

const NEWLINE = String.fromCharCode(10);

// +2: dòng `const __LINE_OFFSET` và dòng xuống dòng sau nó
const LINE_OFFSET = TRACER_RUNTIME_LINE_COUNT + 2;

/**
 * Dựng mã nguồn để chạy.
 *
 * Hai chế độ khác hẳn nhau: chế độ thường nạp thư viện tracer rồi lấy command list;
 * chế độ tự trực quan hóa chèn lời gọi vào từng câu lệnh rồi lấy chuỗi bước.
 */
function buildSource(code: string, plain: boolean): string {
  if (plain) {
    const instrumented = javascriptAdapter.build(code, '').files[0]?.content ?? '';
    return [PLAIN_RUNTIME_SOURCE, instrumented, 'return __avSteps;'].join(NEWLINE);
  }
  return [
    `const __LINE_OFFSET = ${String(LINE_OFFSET)};`,
    TRACER_RUNTIME_SOURCE,
    code,
    'return __commands;',
  ].join(NEWLINE);
}

self.onmessage = (event: MessageEvent<RunRequest>) => {
  const plain = event.data.plain === true;
  const source = buildSource(event.data.code, plain);

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Chạy code người dùng chính là mục đích của worker này; worker không có DOM và bị trình duyệt cô lập
    const run = new Function(source) as () => unknown[];
    const result = run();
    const response: RunResponse = plain
      ? { ok: true, commands: [], error: undefined, steps: result }
      : { ok: true, commands: result, error: undefined };
    self.postMessage(response);
  } catch (error) {
    const response: RunResponse = {
      ok: false,
      commands: [],
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
