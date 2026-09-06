import { toDisplayString } from '../format';
import { Layout, type VizObject } from '../layouts/layout';
import { Array1DTracer, Array2DTracer, ChartTracer, ScatterTracer } from '../tracers/array';
import { GraphTracer } from '../tracers/graph';
import { LogTracer, MarkdownTracer } from '../tracers/log';
import { type Cell } from '../tracers/tracer';
import {
  type BarScene,
  type GraphScene,
  type GridScene,
  type Scene,
  type SceneTone,
  type ScatterScene,
  type SplitScene,
  type TextScene,
} from './scene';

function toneOf(cell: Cell): SceneTone {
  if (cell.patched) return 'patched';
  if (cell.selected) return 'selected';
  return 'default';
}

function buildGrid(tracer: Array2DTracer): GridScene {
  // Bản cũ lấy hang dài nhat để dùng hang tieu để chỉ so; giữ nguyen để bang không bị lệch
  const widest = tracer.data.reduce(
    (longest, row) => (longest.length < row.length ? row : longest),
    [],
  );
  const showRowIndex = !(tracer instanceof Array1DTracer);

  return {
    kind: 'grid',
    title: tracer.title,
    showRowIndex,
    columnHeader: widest.map((_, index) => ({ text: String(index), tone: 'index' as const })),
    rows: tracer.data.map((row, rowIndex) => ({
      header: showRowIndex ? { text: String(rowIndex), tone: 'index' as const } : undefined,
      cells: row.map((cell) => ({ text: toDisplayString(cell.value), tone: toneOf(cell) })),
    })),
  };
}

function buildBars(tracer: ChartTracer): BarScene {
  const row = tracer.data[0] ?? [];
  return {
    kind: 'bars',
    title: tracer.title,
    bars: row.map((cell) => ({
      value: typeof cell.value === 'number' ? cell.value : 0,
      label: toDisplayString(cell.value),
      tone: toneOf(cell),
    })),
  };
}

function buildScatter(tracer: ScatterTracer): ScatterScene {
  return {
    kind: 'scatter',
    title: tracer.title,
    series: tracer.data.map((row, index) => ({
      radius: (index + 1) * 2,
      points: row
        .map((cell) => cell.value)
        .filter((value): value is [number, number] => Array.isArray(value) && value.length >= 2)
        .map(([x, y]) => ({ x, y })),
    })),
  };
}

function buildGraph(tracer: GraphTracer): GraphScene {
  const { baseWidth, baseHeight, nodeRadius, arrowGap, nodeWeightGap, edgeWeightGap } =
    tracer.dimensions;
  const { isDirected, isWeighted } = tracer;

  // Canh đã tham được ve sau để năm trên canh chua tham
  const ordered = [...tracer.edges].sort((a, b) => a.visitedCount - b.visitedCount);

  const edges = ordered.flatMap((edge) => {
    const from = tracer.findNode(edge.source);
    const to = tracer.findNode(edge.target);
    if (from === undefined || to === undefined) return [];

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Rut ngắn canh có huong để mui ten không đè lên hinh tron của node
    const end =
      isDirected && length !== 0
        ? {
            x: from.x + (dx / length) * (length - nodeRadius - arrowGap),
            y: from.y + (dy / length) * (length - nodeRadius - arrowGap),
          }
        : { x: to.x, y: to.y };

    return [
      {
        from: { x: from.x, y: from.y },
        to: end,
        label: isWeighted
          ? {
              x: (from.x + to.x) / 2,
              y: (from.y + to.y) / 2 - edgeWeightGap,
              text: toDisplayString(edge.weight),
              angle: (Math.atan2(dy, dx) / Math.PI) * 180,
            }
          : undefined,
        tone:
          edge.selectedCount > 0
            ? ('selected' as const)
            : edge.visitedCount > 0
              ? ('visited' as const)
              : ('default' as const),
      },
    ];
  });

  return {
    kind: 'graph',
    title: tracer.title,
    viewBox: [-baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight],
    isDirected,
    isWeighted,
    nodeRadius,
    edges,
    nodes: tracer.nodes.map((node) => ({
      x: node.x,
      y: node.y,
      text: toDisplayString(node.id),
      weight: isWeighted
        ? { text: toDisplayString(node.weight), dx: nodeRadius + nodeWeightGap }
        : undefined,
      tone:
        node.selectedCount > 0
          ? ('selected' as const)
          : node.visitedCount > 0
            ? ('visited' as const)
            : ('default' as const),
    })),
  };
}

function buildText(tracer: LogTracer | MarkdownTracer): TextScene {
  return tracer instanceof LogTracer
    ? { kind: 'log', title: tracer.title, text: tracer.log }
    : { kind: 'markdown', title: tracer.title, text: tracer.markdown };
}

/**
 * Dùng mô tả hình học cho một đối tượng.
 *
 * `resolve` để layout trả cứu con của no. Khoa trỏ tới đối tượng đã bi `destroy`
 * cho ra canh rong thay vì làm vỡ cả canh.
 */
export function buildScene(
  object: VizObject | undefined,
  resolve: (key: string) => VizObject | undefined,
): Scene {
  if (object === undefined) return { kind: 'empty', reason: 'Khong co doi tuong goc' };

  if (object instanceof Layout) {
    const children = object.childKeys.map((key) => buildScene(resolve(key), resolve));
    const split: SplitScene = {
      kind: 'split',
      direction: object.direction,
      weights: [...object.weights],
      children,
    };
    return split;
  }

  if (object instanceof ChartTracer) return buildBars(object);
  if (object instanceof ScatterTracer) return buildScatter(object);
  if (object instanceof Array2DTracer) return buildGrid(object);
  if (object instanceof GraphTracer) return buildGraph(object);
  if (object instanceof LogTracer || object instanceof MarkdownTracer) return buildText(object);

  return { kind: 'empty', reason: `Khong biet ve ${object.kind}` };
}
