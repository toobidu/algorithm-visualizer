import { FIXTURES, toChunks } from '@av/protocol';
import { describe, expect, it } from 'vitest';
import { VizEngine } from '../engine';
import { Layout } from '../layouts/layout';
import { Array1DTracer, Array2DTracer, ChartTracer, ScatterTracer } from '../tracers/array';
import { GraphTracer } from '../tracers/graph';
import { LogTracer, MarkdownTracer } from '../tracers/log';
import { buildScene } from './build';

const none = (): undefined => undefined;

describe('buildScene — bang o', () => {
  it('Array2D co cot chi so ben trai', () => {
    const t = new Array2DTracer('a', 'Luoi');
    t.set([
      [1, 2],
      [3, 4],
    ]);
    const scene = buildScene(t, none);

    expect(scene).toMatchObject({ kind: 'grid', showRowIndex: true });
    expect(scene.kind === 'grid' && scene.rows[0]?.header?.text).toBe('0');
  });

  it('Array1D KHONG co cot chi so ben trai', () => {
    const t = new Array1DTracer('a', 'Mang');
    t.set([1, 2]);
    const scene = buildScene(t, none);

    expect(scene).toMatchObject({ kind: 'grid', showRowIndex: false });
    expect(scene.kind === 'grid' && scene.rows[0]?.header).toBeUndefined();
  });

  it('hang tieu de lay theo hang dai nhat', () => {
    const t = new Array2DTracer('a', 'Luoi');
    t.set([[1], [1, 2, 3]]);
    const scene = buildScene(t, none);

    expect(scene.kind === 'grid' && scene.columnHeader).toHaveLength(3);
  });

  it('trang thai o thanh ton mau ngu nghia', () => {
    const t = new Array1DTracer('a', 'Mang');
    t.set([1, 2, 3]);
    t.select(0);
    t.patch(1, 9);
    const scene = buildScene(t, none);

    const cells = scene.kind === 'grid' ? scene.rows[0]?.cells : [];
    expect(cells?.map((c) => c.tone)).toEqual(['selected', 'patched', 'default']);
  });

  it('gia tri di qua toDisplayString', () => {
    const t = new Array1DTracer('a', 'Mang');
    t.set([Number.POSITIVE_INFINITY, true]);
    const scene = buildScene(t, none);

    const cells = scene.kind === 'grid' ? scene.rows[0]?.cells : [];
    expect(cells?.map((c) => c.text)).toEqual(['∞', 'T']);
  });
});

describe('buildScene — bieu do', () => {
  it('ChartTracer thanh cot', () => {
    const t = new ChartTracer('c', 'Bieu do');
    t.set([3, 1]);
    const scene = buildScene(t, none);

    expect(scene).toMatchObject({ kind: 'bars' });
    expect(scene.kind === 'bars' && scene.bars.map((b) => b.value)).toEqual([3, 1]);
  });

  it('gia tri khong phai so thanh 0 nhung giu nhan', () => {
    const t = new ChartTracer('c', 'Bieu do');
    t.set(['abc']);
    const scene = buildScene(t, none);

    expect(scene.kind === 'bars' && scene.bars[0]).toMatchObject({ value: 0, label: 'abc' });
  });

  it('ScatterTracer bo qua o khong phai cap toa do', () => {
    const t = new ScatterTracer('s', 'Phan tan');
    t.set([[[1, 2], 'hong', [3, 4]]]);
    const scene = buildScene(t, none);

    expect(scene.kind === 'scatter' && scene.series[0]?.points).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });
});

describe('buildScene — do thi', () => {
  const built = (setup: (g: GraphTracer) => void): GraphTracer => {
    const g = new GraphTracer('g', 'Do thi');
    setup(g);
    return g;
  };

  it('canh co huong bi rut ngan de mui ten khong de len node', () => {
    const g = built((t) => {
      t.addNode(0);
      t.addNode(1);
      t.updateNode(0, undefined, 0, 0);
      t.updateNode(1, undefined, 100, 0);
      t.addEdge(0, 1);
    });
    const scene = buildScene(g, none);

    // 100 - nodeRadius(12) - arrowGap(4) = 84
    expect(scene.kind === 'graph' && scene.edges[0]?.to.x).toBeCloseTo(84);
  });

  it('do thi vo huong khong rut ngan canh', () => {
    const g = built((t) => {
      t.directed(false);
      t.addNode(0);
      t.addNode(1);
      t.updateNode(0, undefined, 0, 0);
      t.updateNode(1, undefined, 100, 0);
      t.addEdge(0, 1);
    });
    const scene = buildScene(g, none);

    expect(scene.kind === 'graph' && scene.edges[0]?.to.x).toBe(100);
  });

  it('canh da tham duoc ve sau canh chua tham', () => {
    const g = built((t) => {
      t.addNode(0);
      t.addNode(1);
      t.addNode(2);
      t.addEdge(0, 1);
      t.addEdge(0, 2);
      t.visit(2, 0);
    });
    const scene = buildScene(g, none);

    expect(scene.kind === 'graph' && scene.edges.map((e) => e.tone)).toEqual([
      'default',
      'visited',
    ]);
  });

  it('do thi co trong so hien nhan tren canh va node', () => {
    const g = built((t) => {
      t.weighted();
      t.addNode(0, 5);
      t.addNode(1, 6);
      t.addEdge(0, 1, 7);
    });
    const scene = buildScene(g, none);

    expect(scene.kind === 'graph' && scene.edges[0]?.label?.text).toBe('7');
    expect(scene.kind === 'graph' && scene.nodes[0]?.weight?.text).toBe('5');
  });

  it('canh tro toi node da bi xoa bi bo qua', () => {
    const g = built((t) => {
      t.addNode(0);
      t.addNode(1);
      t.addEdge(0, 1);
      t.removeNode(1);
    });
    const scene = buildScene(g, none);

    expect(scene.kind === 'graph' && scene.edges).toHaveLength(0);
  });

  it('node duoc chon co ton uu tien hon node da tham', () => {
    const g = built((t) => {
      t.addNode(0);
      t.visit(0);
      t.select(0);
    });
    const scene = buildScene(g, none);

    expect(scene.kind === 'graph' && scene.nodes[0]?.tone).toBe('selected');
  });
});

describe('buildScene — van ban va layout', () => {
  it('LogTracer va MarkdownTracer thanh canh van ban', () => {
    const log = new LogTracer('l', 'Console');
    log.print('xin chao');
    const md = new MarkdownTracer('m', 'Doc');
    md.set('# Tieu de');

    expect(buildScene(log, none)).toEqual({ kind: 'log', title: 'Console', text: 'xin chao' });
    expect(buildScene(md, none)).toEqual({ kind: 'markdown', title: 'Doc', text: '# Tieu de' });
  });

  it('layout long nhau dung dung cay canh', () => {
    const inner = new Layout('inner', 'horizontal', ['a']);
    const outer = new Layout('outer', 'vertical', ['inner']);
    const a = new Array1DTracer('a', 'A');
    a.set([1]);
    const store = new Map<string, Layout | Array1DTracer>([
      ['inner', inner],
      ['a', a],
    ]);

    const scene = buildScene(outer, (key) => store.get(key));

    expect(scene.kind === 'split' && scene.children[0]).toMatchObject({
      kind: 'split',
      direction: 'horizontal',
    });
  });

  it('khoa tro toi doi tuong da destroy cho canh rong', () => {
    const layout = new Layout('l', 'vertical', ['mat-roi']);
    const scene = buildScene(layout, none);

    expect(scene.kind === 'split' && scene.children[0]).toMatchObject({ kind: 'empty' });
  });

  it('khong co doi tuong goc cho canh rong', () => {
    expect(buildScene(undefined, none)).toMatchObject({ kind: 'empty' });
  });
});

describe('buildScene tren toan bo fixture', () => {
  it.each(FIXTURES.map((f) => [f.name, f] as const))(
    '%s dung duoc canh on dinh',
    (_name, fixture) => {
      const engine = new VizEngine();
      engine.load(toChunks(fixture.commands));
      engine.seek(engine.chunkCount);

      const scene = buildScene(engine.root, (key) => engine.objectAt(key));
      expect(scene).toMatchSnapshot();
    },
  );
});
