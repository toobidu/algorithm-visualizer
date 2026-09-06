import { FIXTURES, syntheticTrace, toChunks, type Command } from '@av/protocol';
import { describe, expect, it } from 'vitest';
import { VizEngine } from './engine';
import { Layout } from './layouts/layout';
import { Array1DTracer, Array2DTracer } from './tracers/array';
import { GraphTracer } from './tracers/graph';
import { LogTracer } from './tracers/log';

const engineWith = (commands: readonly Command[]): VizEngine => {
  const engine = new VizEngine();
  engine.load(toChunks(commands));
  return engine;
};

/** Chup trang thai co the so sanh duoc, de doi chieu hai duong di khac nhau. */
function snapshot(engine: VizEngine): string {
  const keys = ['arr', 'grid', 'g', 'log', 'cht', 'sc', 'md', 'a', 'b', 'inner', 'outer', 'lay'];
  const parts: string[] = [`cursor=${String(engine.cursor)}`];
  for (const key of keys) {
    const object = engine.objectAt(key);
    if (object === undefined) continue;
    if (object instanceof Array2DTracer) {
      parts.push(
        `${key}:${JSON.stringify(
          object.data.map((row) => row.map((c) => [c.value, c.patched, c.selected])),
        )}`,
      );
    } else if (object instanceof GraphTracer) {
      parts.push(
        `${key}:${JSON.stringify(
          object.nodes.map((n) => [
            n.id,
            n.visitedCount,
            n.selectedCount,
            Math.round(n.x),
            Math.round(n.y),
          ]),
        )}`,
      );
    } else if (object instanceof LogTracer) {
      parts.push(`${key}:${JSON.stringify(object.log)}`);
    } else if (object instanceof Layout) {
      parts.push(`${key}:${JSON.stringify(object.childKeys)}`);
    }
  }
  return parts.join('|');
}

describe('VizEngine — ap dung lenh', () => {
  it.each(FIXTURES.map((f) => [f.name, f] as const))('chay het %s khong loi', (_name, fixture) => {
    const engine = engineWith(fixture.commands);
    engine.seek(engine.chunkCount);

    expect(engine.errors).toEqual([]);
  });

  it('setRoot tro dung doi tuong goc', () => {
    const engine = engineWith([
      { key: 'arr', method: 'Array1DTracer', args: ['Mang'] },
      { key: null, method: 'setRoot', args: ['arr'] },
    ]);
    engine.seek(1);

    expect(engine.root).toBeInstanceOf(Array1DTracer);
  });

  it('destroy xoa doi tuong khoi kho', () => {
    const engine = engineWith([
      { key: 'arr', method: 'Array1DTracer', args: [] },
      { key: 'arr', method: 'destroy', args: [] },
    ]);
    engine.seek(1);

    expect(engine.objectAt('arr')).toBeUndefined();
  });

  it('lenh loi khong lam dung trace — ngam #42', () => {
    const engine = engineWith([
      { key: 'arr', method: 'Array1DTracer', args: [] },
      { key: 'khongCo', method: 'set', args: [[1]] },
      { key: 'arr', method: 'set', args: [[9]] },
    ]);
    engine.seek(1);

    expect(engine.errors).toHaveLength(1);
    expect((engine.objectAt('arr') as Array1DTracer).data[0]?.[0]?.value).toBe(9);
  });

  it('method khong ton tai bi ghi nhan la loi', () => {
    const engine = engineWith([
      { key: 'arr', method: 'Array1DTracer', args: [] },
      { key: 'arr', method: 'khongCoMethodNay', args: [] },
    ]);
    engine.seek(1);

    expect(engine.errors[0]?.message).toContain('khongCoMethodNay');
  });

  it('lineNumber lay tu chunk dang hien — ngam #15', () => {
    const engine = engineWith([
      { key: 'arr', method: 'Array1DTracer', args: [] },
      { key: null, method: 'delay', args: [42] },
    ]);

    expect(engine.lineNumber).toBeUndefined();
    engine.seek(1);
    expect(engine.lineNumber).toBe(42);
  });
});

describe('lien ket cheo giua tracer', () => {
  it('Array1D.chart dung chung tham chieu data — ngam #34', () => {
    const engine = engineWith([
      { key: 'arr', method: 'Array1DTracer', args: [] },
      { key: 'cht', method: 'ChartTracer', args: [] },
      { key: 'arr', method: 'chart', args: ['cht'] },
      { key: 'arr', method: 'set', args: [[1, 2, 3]] },
    ]);
    engine.seek(1);

    const arr = engine.objectAt('arr') as Array1DTracer;
    const cht = engine.objectAt('cht') as Array2DTracer;
    expect(cht.data).toBe(arr.data);
  });

  it('Graph.log tu in duong di moi lan visit — ngam #35', () => {
    const engine = engineWith([
      { key: 'g', method: 'GraphTracer', args: [] },
      { key: 'log', method: 'LogTracer', args: [] },
      { key: 'g', method: 'log', args: ['log'] },
      { key: 'g', method: 'addNode', args: [0] },
      { key: 'g', method: 'addNode', args: [1] },
      { key: 'g', method: 'visit', args: [1, 0] },
    ]);
    engine.seek(1);

    expect((engine.objectAt('log') as LogTracer).log).toBe('0 -> 1\n');
  });
});

describe('bo dem visit long nhau — ngam #38', () => {
  it('DFS de quy 5 tang van dung trang thai khi lui ra', () => {
    const commands: Command[] = [
      { key: 'g', method: 'GraphTracer', args: [] },
      { key: 'g', method: 'directed', args: [false] },
    ];
    for (let i = 0; i < 5; i += 1) commands.push({ key: 'g', method: 'addNode', args: [i] });
    // Vào 5 tăng roi lui ra hết
    for (let i = 0; i < 5; i += 1) commands.push({ key: 'g', method: 'visit', args: [2] });
    for (let i = 0; i < 5; i += 1) commands.push({ key: 'g', method: 'leave', args: [2] });

    const engine = engineWith(commands);
    engine.seek(1);

    const graph = engine.objectAt('g') as GraphTracer;
    expect(graph.findNode(2)?.visitedCount).toBe(0);
  });

  it('lui ra chua het thi van con dang duoc tham', () => {
    const engine = engineWith([
      { key: 'g', method: 'GraphTracer', args: [] },
      { key: 'g', method: 'addNode', args: [0] },
      { key: 'g', method: 'visit', args: [0] },
      { key: 'g', method: 'visit', args: [0] },
      { key: 'g', method: 'leave', args: [0] },
    ]);
    engine.seek(1);

    expect((engine.objectAt('g') as GraphTracer).findNode(0)?.visitedCount).toBe(1);
  });
});

describe('tua nguoc bang keyframe — ngam #10, quyet dinh A', () => {
  const commands = syntheticTrace(6000);
  const chunks = toChunks(commands);

  /** Duong di doi chung: nap lai tu dau roi tien thang toi cursor. */
  function replayFromScratch(cursor: number): string {
    const engine = new VizEngine();
    engine.load(chunks);
    engine.seek(cursor);
    return snapshot(engine);
  }

  it('tua nguoc cho ket qua giong het replay tu dau', () => {
    const engine = new VizEngine();
    engine.load(chunks);
    engine.seek(chunks.length);

    for (const cursor of [1500, 900, 100, 1, 1200, 3]) {
      engine.seek(cursor);
      expect(snapshot(engine)).toBe(replayFromScratch(cursor));
    }
  });

  it('1000 lan tua ngau nhien deu khop', () => {
    const engine = new VizEngine();
    engine.load(chunks);
    let state = 12345;
    const nextCursor = (): number => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return (state % chunks.length) + 1;
    };

    for (let i = 0; i < 1000; i += 1) {
      const cursor = nextCursor();
      engine.seek(cursor);
      expect(engine.cursor).toBe(cursor);
    }
    // Doi chieu trạng thái cuối cùng với duong di sach
    expect(snapshot(engine)).toBe(replayFromScratch(engine.cursor));
  });

  it('seek ngoai pham vi bi kep vao [0, chunkCount]', () => {
    const engine = new VizEngine();
    engine.load(chunks);

    engine.seek(-50);
    expect(engine.cursor).toBe(0);
    engine.seek(chunks.length + 999);
    expect(engine.cursor).toBe(chunks.length);
  });

  it('lien ket chart duoc noi lai sau khi khoi phuc keyframe', () => {
    const long: Command[] = [
      { key: 'arr', method: 'Array1DTracer', args: [] },
      { key: 'cht', method: 'ChartTracer', args: [] },
      { key: 'arr', method: 'chart', args: ['cht'] },
    ];
    for (let i = 0; i < 3000; i += 1) {
      long.push({ key: 'arr', method: 'set', args: [[i]] });
      long.push({ key: null, method: 'delay', args: [1] });
    }

    const engine = engineWith(long);
    engine.seek(2900);
    engine.seek(700);

    const arr = engine.objectAt('arr') as Array1DTracer;
    const cht = engine.objectAt('cht') as Array2DTracer;
    expect(cht.data).toBe(arr.data);
  });
});

describe('thong bao thay doi cho React', () => {
  it('subscribe nhan duoc tin hieu khi cursor doi', () => {
    const engine = engineWith(syntheticTrace(100));
    let calls = 0;
    const unsubscribe = engine.subscribe(() => {
      calls += 1;
    });

    engine.seek(2);
    expect(calls).toBe(1);
    expect(engine.getVersion()).toBeGreaterThan(0);

    unsubscribe();
    engine.seek(3);
    expect(calls).toBe(1);
  });

  it('seek toi dung vi tri hien tai khong phat tin hieu thua', () => {
    const engine = engineWith(syntheticTrace(100));
    engine.seek(2);
    const version = engine.getVersion();

    engine.seek(2);
    expect(engine.getVersion()).toBe(version);
  });
});
