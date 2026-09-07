import { frame, parseStdout, serializeCommand, toChunks, type Command } from '@av/protocol';
import { buildScene, VizEngine, type Scene } from '@av/viz-core';
import { describe, expect, it } from 'vitest';
import { bubbleSort, TRACER_PROGRAMS } from './programs.fixture';
import { TRACER_RUNTIME_LINE_COUNT, TRACER_RUNTIME_SOURCE } from '@av/tracer-javascript';

/**
 * Chạy dùng đoạn mã ma worker chạy, nhưng trên Node.
 *
 * Nhỏ vậy duong JavaScript dau-cuoi được kiểm chứng ma không cần trình duyệt:
 * code người dùng -> thư viện tracer -> command list -> parser -> engine -> canh.
 */
function runCode(code: string): readonly Command[] {
  const lineOffset = TRACER_RUNTIME_LINE_COUNT + 2;
  const source = [
    `const __LINE_OFFSET = ${String(lineOffset)};`,
    TRACER_RUNTIME_SOURCE,
    code,
    'return __commands;',
  ].join('\n');

  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Chạy code người dùng bang new Function chinh là có che dang được kiểm chứng o đây
  const run = new Function(source) as () => unknown[];
  const commands = run();
  const stdout = commands.map((c) => frame(serializeCommand(c as Command))).join('\n');
  const parsed = parseStdout(stdout);
  expect(parsed.issues).toEqual([]);
  return parsed.commands;
}

/** Tim bang o dau tien trong cay canh, khong phu thuoc vao khoa noi bo cua tracer. */
function findGrid(scene: Scene): Extract<Scene, { kind: 'grid' }> | undefined {
  if (scene.kind === 'grid') return scene;
  if (scene.kind === 'split') {
    for (const child of scene.children) {
      const found = findGrid(child);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

describe('duong chay JavaScript dau-cuoi', () => {
  it.each(TRACER_PROGRAMS)('%s chay ra command list hop le', (_name, code) => {
    const commands = runCode(code);
    expect(commands.length).toBeGreaterThan(10);
  });

  it.each(TRACER_PROGRAMS)('%s dung duoc canh khong loi', (_name, code) => {
    const commands = runCode(code);
    const engine = new VizEngine();
    engine.load(toChunks(commands));
    engine.seek(engine.chunkCount);

    expect(engine.errors).toEqual([]);
    const scene = buildScene(engine.root, (key) => engine.objectAt(key));
    expect(scene.kind).not.toBe('empty');
  });

  it('bubble sort thuc su sap xep duoc mang', () => {
    const commands = runCode(bubbleSort);
    const chunks = toChunks(commands);
    const engine = new VizEngine();
    engine.load(chunks);

    const readRow = (): number[] => {
      const grid = findGrid(buildScene(engine.root, (key) => engine.objectAt(key)));
      return (grid?.rows[0]?.cells ?? []).map((cell) => Number(cell.text));
    };

    engine.seek(1);
    expect(readRow()).toEqual([5, 2, 9, 1, 7, 3, 8, 4]);

    engine.seek(chunks.length);
    expect(readRow()).toEqual([1, 2, 3, 4, 5, 7, 8, 9]);
  });

  it('tua nguoc ve dau cho lai dung mang chua sap xep', () => {
    const commands = runCode(bubbleSort);
    const chunks = toChunks(commands);
    const engine = new VizEngine();
    engine.load(chunks);

    engine.seek(chunks.length);
    engine.seek(1);

    const grid = findGrid(buildScene(engine.root, (key) => engine.objectAt(key)));
    expect((grid?.rows[0]?.cells ?? []).map((cell) => Number(cell.text))).toEqual([
      5, 2, 9, 1, 7, 3, 8, 4,
    ]);
  });

  it('delay tu suy ra so dong code cua nguoi dung', () => {
    const commands = runCode(
      [
        'const t = new Array1DTracer("A");',
        'Layout.setRoot(t);',
        't.set([1]);',
        'Tracer.delay();',
      ].join('\n'),
    );
    const delay = commands.find((c) => c.key === null && c.method === 'delay');

    expect(delay).toBeDefined();
    expect(typeof delay?.args[0]).toBe('number');
  });

  it('lien ket chart giu duoc qua ca duong chay', () => {
    const commands = runCode(
      [
        'const a = new Array1DTracer("A");',
        'const c = new ChartTracer("C");',
        'Layout.setRoot(new VerticalLayout([a, c]));',
        'a.chart(c);',
        'a.set([3, 1, 2]);',
      ].join('\n'),
    );

    const engine = new VizEngine();
    engine.load(toChunks(commands));
    engine.seek(engine.chunkCount);

    expect(engine.errors).toEqual([]);
    expect(commands.some((c) => c.method === 'chart')).toBe(true);
  });

  it('so nguyen vuot khoang an toan bi chan ngay trong thu vien tracer — §3.5 quy tac 2b', () => {
    expect(() =>
      runCode(['const t = new Array1DTracer("A");', 't.set([9007199254740994]);'].join('\n')),
    ).toThrow(/khoang so nguyen an toan/);
  });

  it('NaN va vo cuc duoc boc theo §3.5 quy tac 3', () => {
    const commands = runCode(
      ['const t = new Array1DTracer("A");', 't.set([NaN, Infinity]);'].join('\n'),
    );
    const set = commands.find((c) => c.method === 'set');

    expect(set?.args[0]).toEqual([{ $num: 'NaN' }, { $num: 'Infinity' }]);
  });

  it('loi trong code nguoi dung noi len thanh ngoai le', () => {
    expect(() => runCode('khongTonTai();')).toThrow();
  });
});
