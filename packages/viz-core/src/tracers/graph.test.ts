import { describe, expect, it } from 'vitest';
import { GraphTracer } from './graph';

const graph = (): GraphTracer => new GraphTracer('g', 'Do thi');

describe('GraphTracer — node va canh', () => {
  it('set dung ma tran ke tao node va canh', () => {
    const g = graph();
    g.set([
      [0, 1],
      [1, 0],
    ]);

    expect(g.nodes).toHaveLength(2);
    expect(g.edges).toHaveLength(2);
  });

  it('set bo qua o co gia tri rong', () => {
    const g = graph();
    g.set([
      [0, 0],
      [0, 0],
    ]);

    expect(g.edges).toHaveLength(0);
  });

  it('weighted lam canh mang trong so tu ma tran', () => {
    const g = graph();
    g.weighted();
    g.set([
      [0, 5],
      [0, 0],
    ]);

    expect(g.edges[0]?.weight).toBe(5);
  });

  it('addNode trung id bi bo qua', () => {
    const g = graph();
    g.addNode(1);
    g.addNode(1);

    expect(g.nodes).toHaveLength(1);
  });

  it('addEdge trung bi bo qua', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);
    g.addEdge(0, 1);

    expect(g.edges).toHaveLength(1);
  });

  it('updateNode chi sua truong duoc truyen', () => {
    const g = graph();
    g.addNode(1, 'w', 10, 20, 3, 4);
    g.updateNode(1, undefined, 99);

    const node = g.findNode(1);
    expect(node?.x).toBe(99);
    expect(node?.weight).toBe('w');
    expect(node?.visitedCount).toBe(3);
  });

  it('updateNode va updateEdge tren doi tuong khong ton tai khong nem loi', () => {
    const g = graph();

    expect(() => {
      g.updateNode(99, 1);
      g.updateEdge(1, 2, 5);
    }).not.toThrow();
  });

  it('updateEdge sua trong so va bo dem', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);
    g.updateEdge(0, 1, 7, 2, 3);

    const edge = g.findEdge(0, 1);
    expect(edge).toMatchObject({ weight: 7, visitedCount: 2, selectedCount: 3 });
  });

  it('removeNode va removeEdge go dung phan tu', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);

    g.removeEdge(0, 1);
    expect(g.edges).toHaveLength(0);

    g.removeNode(0);
    expect(g.nodes).toHaveLength(1);
    expect(g.findNode(0)).toBeUndefined();
  });

  it('remove tren thu khong ton tai khong lam gi', () => {
    const g = graph();
    g.addNode(0);

    g.removeNode(99);
    g.removeEdge(1, 2);
    expect(g.nodes).toHaveLength(1);
  });

  it('do thi vo huong tim thay canh theo ca hai chieu', () => {
    const g = graph();
    g.directed(false);
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);

    expect(g.findEdge(1, 0)).toBeDefined();
  });

  it('do thi co huong khong tim thay canh nguoc chieu', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);

    expect(g.findEdge(1, 0)).toBeUndefined();
  });

  it('findLinkedNodeIds theo huong va khong theo huong', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);

    expect(g.findLinkedNodeIds(0)).toEqual([1]);
    expect(g.findLinkedNodeIds(1)).toEqual([]);
    expect(g.findLinkedNodeIds(1, false)).toEqual([0]);
  });

  it('visit tren node khong ton tai khong nem loi', () => {
    expect(() => {
      graph().visit(99);
    }).not.toThrow();
  });

  it('select va deselect dieu chinh bo dem tren ca node lan canh', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);

    g.select(1, 0);
    expect(g.findNode(1)?.selectedCount).toBe(1);
    expect(g.findEdge(0, 1)?.selectedCount).toBe(1);

    g.deselect(1, 0);
    expect(g.findNode(1)?.selectedCount).toBe(0);
  });

  it('visit kem trong so cap nhat trong so node', () => {
    const g = graph();
    g.addNode(0);
    g.visit(0, null, 42);

    expect(g.findNode(0)?.weight).toBe(42);
  });
});

describe('bo cuc', () => {
  it('layoutCircle rai node tren duong tron quanh goc', () => {
    const g = graph();
    for (let i = 0; i < 4; i += 1) g.addNode(i);
    g.layoutCircle();

    const radii = g.nodes.map((n) => Math.round(Math.sqrt(n.x * n.x + n.y * n.y)));
    expect(new Set(radii).size).toBe(1);
  });

  it('do thi mot node duoc dat giua khung', () => {
    const g = graph();
    g.addNode(0);
    g.layoutTree(0);

    expect(g.nodes[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('layoutTree xep con sau cha theo chieu doc', () => {
    const g = graph();
    g.directed(false);
    for (let i = 0; i < 3; i += 1) g.addNode(i);
    g.addEdge(0, 1);
    g.addEdge(0, 2);
    g.layoutTree(0);

    const [root, left, right] = g.nodes;
    expect(root?.y).toBeLessThan(left?.y ?? 0);
    expect(left?.y).toBe(right?.y);
    expect(left?.x).not.toBe(right?.x);
  });

  it('layoutTree voi root khong ton tai van chay duoc', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);

    expect(() => {
      g.layoutTree(99);
      expect(g.nodes).toHaveLength(2);
    }).not.toThrow();
  });

  it('layoutTree khong tran ngan xep voi cay lech 20.000 node', () => {
    const g = graph();
    g.directed(false);
    for (let i = 0; i < 20_000; i += 1) g.addNode(i);
    for (let i = 1; i < 20_000; i += 1) g.addEdge(i - 1, i);
    g.layoutTree(0);

    expect(() => g.nodes.length).not.toThrow();
    expect(g.nodes).toHaveLength(20_000);
  });

  it('layoutRandom khong treo voi do thi dong node — sua loi ngam #39', () => {
    const g = graph();
    for (let i = 0; i < 400; i += 1) g.addNode(i);
    g.layoutRandom();

    const started = Date.now();
    expect(g.nodes).toHaveLength(400);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('layoutRandom tat dinh: cung khoa cho cung ket qua', () => {
    const build = (): GraphTracer => {
      const g = new GraphTracer('cung-khoa', 'G');
      for (let i = 0; i < 20; i += 1) g.addNode(i);
      g.layoutRandom();
      return g;
    };

    const a = build().nodes.map((n) => [n.x, n.y]);
    const b = build().nodes.map((n) => [n.x, n.y]);
    expect(a).toEqual(b);
  });

  it('do thi rong khong lam vo bo cuc', () => {
    expect(() => {
      const g = graph();
      g.layoutTree(0);
      expect(g.nodes).toHaveLength(0);
    }).not.toThrow();
  });

  // Node đầu tiên luôn năm định duong tron (goc -pi/2) nên vi tri của no không doi;
  // phải nhin node thứ hai mỗi thay bố cục đã được tính lại.
  it('bo cuc duoc tinh lai khi them node — ngam #37', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.layoutCircle();
    const before = g.nodes[1]?.y;

    g.addNode(2);
    expect(g.nodes[1]?.y).not.toBe(before);
  });
});

describe('clone', () => {
  it('ban sao doc lap voi ban goc', () => {
    const g = graph();
    g.addNode(0);
    g.addNode(1);
    g.addEdge(0, 1);

    const copy = g.clone();
    g.visit(1, 0);

    expect(copy.findNode(1)?.visitedCount).toBe(0);
    expect(g.findNode(1)?.visitedCount).toBe(1);
  });

  it('ban sao giu duoc chi muc tra cuu', () => {
    const g = graph();
    g.addNode(7);
    g.addNode(8);
    g.addEdge(7, 8);

    const copy = g.clone();
    expect(copy.findNode(7)).toBeDefined();
    expect(copy.findEdge(7, 8)).toBeDefined();
  });
});
