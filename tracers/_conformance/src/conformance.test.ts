import { languageById, type LanguageConfig } from '@av/config';
import { prepareJob } from '@av/gateway/prepare';
import { runOnPiston } from '@av/gateway/piston';
import { frame, parseStdout, serializeCommand, type Command } from '@av/protocol';
import { TRACER_RUNTIME_LINE_COUNT, TRACER_RUNTIME_SOURCE } from '@av/tracer-javascript';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CPP, GO, JAVA, JAVASCRIPT, PHP, PYTHON, RUBY } from './bubbleSort';

/**
 * Bộ tuân thủ — PLAN.md Task 4.1.
 *
 * Cùng một thuật toán, viết ở mỗi ngôn ngữ, phải sinh ra command list GIỐNG HỆT NHAU
 * từng byte. Đây là thứ giữ cho engine animation không phải biết ngôn ngữ nào cả.
 *
 * Bỏ qua khi không có Piston: CI mặc định không dựng Docker. Bật bằng:
 *   PISTON_URL=http://localhost:2000/api/v2 pnpm test
 */
const PISTON_URL = process.env['PISTON_URL'];
const NEWLINE = String.fromCharCode(10);

/** Chạy bản JavaScript trên Node — đây là bản vàng để đối chiếu. */
function runJavaScript(code: string): readonly Command[] {
  const offset = TRACER_RUNTIME_LINE_COUNT + 2;
  const source = [
    `const __LINE_OFFSET = ${String(offset)};`,
    TRACER_RUNTIME_SOURCE,
    code,
    'return __commands;',
  ].join(NEWLINE);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Đây chính là cơ chế mà worker dùng, nên phải chạy đúng như vậy để đối chiếu
  const run = new Function(source) as () => unknown[];
  const stdout = run()
    .map((c) => frame(serializeCommand(c as Command)))
    .join(NEWLINE);
  const parsed = parseStdout(stdout);
  expect(parsed.issues).toEqual([]);
  return parsed.commands;
}

const asText = (commands: readonly Command[]): string =>
  commands.map(serializeCommand).join(NEWLINE);

const GOLDEN = (): string => asText(runJavaScript(JAVASCRIPT));

/**
 * Một dòng cho mỗi ngôn ngữ. Thêm ngôn ngữ thứ tám vào bộ tuân thủ = thêm đúng một dòng
 * ở đây cộng một hằng trong `bubbleSort.ts` — không phải chép cả một khối `it`.
 *
 * `version` là phiên bản Piston đang cài trên máy phát triển; runtime khác phiên bản
 * vẫn chạy được vì tra qua `GET /runtimes` ở gateway, chỗ này cố định cho tái lập.
 */
interface Case {
  readonly id: string;
  readonly version: string;
  readonly code: string;
  readonly tracerPath: string;
}

const CASES: readonly Case[] = [
  {
    id: 'python',
    version: '3.12.0',
    code: PYTHON,
    tracerPath: 'tracers/python/algorithm_visualizer.py',
  },
  { id: 'cpp', version: '10.2.0', code: CPP, tracerPath: 'tracers/cpp/algorithm-visualizer.h' },
  { id: 'go', version: '1.16.2', code: GO, tracerPath: 'tracers/go/algorithm_visualizer.go' },
  { id: 'ruby', version: '3.0.1', code: RUBY, tracerPath: 'tracers/ruby/algorithm_visualizer.rb' },
  { id: 'php', version: '8.2.3', code: PHP, tracerPath: 'tracers/php/AlgorithmVisualizer.php' },
  {
    id: 'java',
    version: '15.0.2',
    code: JAVA,
    tracerPath: 'tracers/java/AlgorithmVisualizer.java',
  },
];

async function runCase(testCase: Case): Promise<{ text: string; status: string }> {
  const language = languageById(testCase.id);
  expect(language).toBeDefined();
  if (language === undefined) return { text: '', status: 'khong co ngon ngu' };

  const job = prepareJob(language, testCase.code, readFileSync(testCase.tracerPath, 'utf8'));
  const [mainFile] = job.files;
  expect(mainFile).toBeDefined();
  if (mainFile === undefined) return { text: '', status: 'khong dung duoc job' };

  const outcome = await runOnPiston(
    language,
    testCase.version,
    mainFile,
    job.files[1] ?? { name: 'unused', content: '' },
    { baseUrl: PISTON_URL ?? '' },
  );

  expect(outcome.message).toBeUndefined();
  return { text: asText(outcome.commands), status: outcome.status };
}

describe.skipIf(PISTON_URL === undefined)('bộ tuân thủ đa ngôn ngữ', () => {
  it.each(CASES.map((c) => [c.id, c] as const))(
    '%s sinh ra command list giống hệt JavaScript từng byte',
    async (_id, testCase) => {
      const result = await runCase(testCase);
      expect(result.status).toBe('ok');
      expect(result.text).toBe(GOLDEN());
    },
    180_000,
  );

  it('mọi ngôn ngữ khớp NHAU, không chỉ khớp bản vàng', async () => {
    const texts = new Map<string, string>();
    for (const testCase of CASES) {
      const result = await runCase(testCase);
      texts.set(testCase.id, result.text);
    }
    expect(new Set(texts.values()).size).toBe(1);
  }, 600_000);
});

/** Kiểm chứng riêng bằng Python — nhanh nhất trong nhóm nên dùng làm ngôn ngữ đại diện. */
describe.skipIf(PISTON_URL === undefined)('hành vi biên của luồng lệnh', () => {
  const python = languageById('python');
  const PYTHON_TRACER = (): string =>
    readFileSync('tracers/python/algorithm_visualizer.py', 'utf8');

  const runPython = async (code: string, override?: Partial<LanguageConfig>) => {
    if (python === undefined) throw new Error('thieu cau hinh python');
    return await runOnPiston(
      { ...python, ...override },
      '3.12.0',
      { name: 'main.py', content: code },
      { name: 'algorithm_visualizer.py', content: PYTHON_TRACER() },
      { baseUrl: PISTON_URL ?? '' },
    );
  };

  it('output print của người dùng không lẫn vào luồng lệnh', async () => {
    const outcome = await runPython(
      [
        'from algorithm_visualizer import Array1DTracer, Layout, Tracer',
        "t = Array1DTracer('A')",
        'Layout.setRoot(t)',
        "print('day la output cua nguoi dung')",
        't.set([1, 2])',
        'Tracer.delay(1)',
      ].join(NEWLINE),
    );

    expect(outcome.status).toBe('ok');
    expect(outcome.userOutput).toBe('day la output cua nguoi dung');
    expect(outcome.commands.length).toBeGreaterThan(3);
  }, 120_000);

  it('số nguyên vượt khoảng an toàn bị chặn ngay trong thư viện tracer', async () => {
    const outcome = await runPython(
      [
        'from algorithm_visualizer import Array1DTracer',
        "t = Array1DTracer('A')",
        't.set([9007199254740994])',
      ].join(NEWLINE),
    );

    expect(outcome.status).toBe('runtime-error');
    expect(outcome.message).toContain('an toan');
  }, 120_000);

  it('vòng lặp vô hạn bị dừng chứ không treo', async () => {
    const outcome = await runPython(['while True:', '    pass'].join(NEWLINE), {
      runTimeoutMs: 3000,
    });
    expect(['timeout', 'runtime-error']).toContain(outcome.status);
  }, 120_000);
});
