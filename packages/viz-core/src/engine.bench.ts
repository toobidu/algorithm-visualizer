import { syntheticTrace, toChunks } from '@av/protocol';
import { bench, describe } from 'vitest';
import { VizEngine } from './engine';
import { GraphTracer } from './tracers/graph';

// Ngân sách PLAN.md §4.3
const commands = syntheticTrace(200_000);
const chunks = toChunks(commands);

const bigTrace = toChunks(syntheticTrace(150_000));

describe('viz-core', () => {
  // >= 500.000 lệnh/giay
  bench('ap dung 200.000 lenh tu dau den cuoi', () => {
    const engine = new VizEngine();
    engine.load(chunks);
    engine.seek(chunks.length);
  });

  // <= 120ms p95: tua ngược toi vi tri bất kỳ trong trace 50.000 chunk
  const seekEngine = new VizEngine();
  seekEngine.load(bigTrace);
  seekEngine.seek(bigTrace.length);
  let probe = 0;
  bench('tua nguoc toi chunk bat ky', () => {
    probe = (probe + 7919) % bigTrace.length;
    seekEngine.seek(probe + 1);
  });

  // <= 40ms. Bố cục được tính lazy nên phải DOC `nodes` để ep tính that,
  // nếu không benchmark chỉ đó thoi gian đạt có ban và cho kết quả sai.
  bench('layoutTree voi 10.000 node', () => {
    const graph = new GraphTracer('g', 'G');
    for (let i = 0; i < 10_000; i += 1) graph.addNode(i);
    for (let i = 1; i < 10_000; i += 1) graph.addEdge(Math.floor((i - 1) / 2), i);
    graph.layoutTree(0, false);
    if (graph.nodes.length === 0) throw new Error('bo cuc khong chay');
  });

  // <= 25ms, và không bao giờ treo — sửa loi ngầm #39
  bench('layoutRandom voi 500 node', () => {
    const graph = new GraphTracer('g', 'G');
    for (let i = 0; i < 500; i += 1) graph.addNode(i);
    graph.layoutRandom();
    if (graph.nodes.length === 0) throw new Error('bo cuc khong chay');
  });
});
