import { type JsonValue } from '@av/protocol';
import { toDisplayString } from '../format';
import { createPrng, seedFromKey } from '../prng';
import { Tracer } from './tracer';
import { type LogTracer } from './log';

export interface GraphNode {
  id: JsonValue;
  weight: JsonValue;
  x: number;
  y: number;
  /** Bo dem, KHONG phai boolean — ngam #38: DFS de quy visit chong nhau roi lui ra */
  visitedCount: number;
  selectedCount: number;
}

export interface GraphEdge {
  source: JsonValue;
  target: JsonValue;
  weight: JsonValue;
  visitedCount: number;
  selectedCount: number;
}

export interface GraphDimensions {
  readonly baseWidth: number;
  readonly baseHeight: number;
  readonly padding: number;
  readonly nodeRadius: number;
  readonly arrowGap: number;
  readonly nodeWeightGap: number;
  readonly edgeWeightGap: number;
}

/** Lay nguyen tu `legacy/src/core/tracers/GraphTracer.js` de bo cuc trong giong ban cu. */
export const GRAPH_DIMENSIONS: GraphDimensions = {
  baseWidth: 320,
  baseHeight: 320,
  padding: 32,
  nodeRadius: 12,
  arrowGap: 4,
  nodeWeightGap: 4,
  edgeWeightGap: 4,
};

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

type LayoutCall =
  { kind: 'circle' } | { kind: 'tree'; root: JsonValue; sorted: boolean } | { kind: 'random' };

/** Tran so lan thu cho layoutRandom — sua loi ngam #39: ban cu lap vo han. */
const RANDOM_PLACEMENT_ATTEMPTS = 200;
const RANDOM_MIN_DISTANCE = 48;

export class GraphTracer extends Tracer {
  readonly kind = 'GraphTracer';
  readonly dimensions = GRAPH_DIMENSIONS;

  isDirected = true;
  isWeighted = false;

  private nodeList: GraphNode[] = [];
  private edgeList: GraphEdge[] = [];

  /**
   * Chỉ mục trả cứu O(1). Không có chung thì addNode gọi findNode quet tuyen tính,
   * nên dùng đồ thị 10.000 node thành O(V^2) — đó là phần còn lại của 103ms so với
   * ngân sách 40ms sau khi đã hoan bố cục.
   */
  private nodeIndex = new Map<JsonValue, GraphNode>();
  private edgeIndex = new Map<string, GraphEdge>();
  private layoutCall: LayoutCall = { kind: 'circle' };
  private logTracer: LogTracer | null = null;

  /**
   * Bố cục được HOAN lai thay vì tính ngay mỗi lan thêm node hay canh.
   *
   * Bản cũ gọi layout() ngay trong addNode/addEdge (ngầm #37). Dùng ve hanh vi nhưng
   * dùng đồ thị 10.000 node thì thành 20.000 lan chạy layout, mỗi lan O(V+E) — đó là
   * lý do benchmark đó được 7.903ms so với ngân sách 40ms. Bay gio chỉ đánh dấu ban,
   * và tính lại khi có ai đọc toi vi tri. Kết quả quan sát được không doi.
   */
  private layoutDirty = true;

  /** Doc `nodes` luon thay vi tri da cap nhat — bo cuc tinh lazy. */
  get nodes(): GraphNode[] {
    this.ensureLayout();
    return this.nodeList;
  }

  set nodes(value: GraphNode[]) {
    this.nodeList = value;
    this.nodeIndex = new Map(value.map((node) => [node.id, node]));
    this.layoutDirty = true;
  }

  get edges(): GraphEdge[] {
    return this.edgeList;
  }

  set edges(value: GraphEdge[]) {
    this.edgeList = value;
    this.edgeIndex = new Map(value.map((edge) => [edgeKey(edge.source, edge.target), edge]));
    this.layoutDirty = true;
  }

  override reset(): void {
    this.nodeList = [];
    this.edgeList = [];
    this.nodeIndex = new Map();
    this.edgeIndex = new Map();
    this.isDirected = true;
    this.isWeighted = false;
    this.layoutCall = { kind: 'circle' };
    this.logTracer = null;
    this.layoutDirty = true;
  }

  override clone(): GraphTracer {
    const copy = new GraphTracer(this.key, this.title);
    copy.nodeList = this.nodeList.map((node) => ({ ...node }));
    copy.edgeList = this.edgeList.map((edge) => ({ ...edge }));
    copy.nodeIndex = new Map(copy.nodeList.map((node) => [node.id, node]));
    copy.edgeIndex = new Map(
      copy.edgeList.map((edge) => [edgeKey(edge.source, edge.target), edge]),
    );
    copy.layoutDirty = this.layoutDirty;
    copy.isDirected = this.isDirected;
    copy.isWeighted = this.isWeighted;
    copy.layoutCall = this.layoutCall;
    return copy;
  }

  set(array2d: readonly (readonly JsonValue[])[] = []): void {
    this.nodeList = [];
    this.edgeList = [];
    this.nodeIndex = new Map();
    this.edgeIndex = new Map();
    for (let i = 0; i < array2d.length; i += 1) {
      this.addNode(i);
      const row = array2d[i] ?? [];
      for (let j = 0; j < array2d.length; j += 1) {
        const value = row[j];
        if (value !== undefined && value !== 0 && value !== null && value !== false) {
          this.addEdge(i, j, this.isWeighted ? value : null);
        }
      }
    }
    this.layout();
  }

  directed(isDirected = true): void {
    this.isDirected = isDirected;
  }

  weighted(isWeighted = true): void {
    this.isWeighted = isWeighted;
  }

  addNode(
    id: JsonValue,
    weight: JsonValue = null,
    x = 0,
    y = 0,
    visitedCount = 0,
    selectedCount = 0,
  ): void {
    if (this.findNode(id) !== undefined) return;
    const node: GraphNode = { id, weight, x, y, visitedCount, selectedCount };
    this.nodeList.push(node);
    this.nodeIndex.set(id, node);
    this.layout();
  }

  updateNode(
    id: JsonValue,
    weight?: JsonValue,
    x?: number,
    y?: number,
    visitedCount?: number,
    selectedCount?: number,
  ): void {
    const node = this.findNode(id);
    if (node === undefined) return;
    if (weight !== undefined) node.weight = weight;
    if (x !== undefined) node.x = x;
    if (y !== undefined) node.y = y;
    if (visitedCount !== undefined) node.visitedCount = visitedCount;
    if (selectedCount !== undefined) node.selectedCount = selectedCount;
  }

  removeNode(id: JsonValue): void {
    const index = this.nodeList.findIndex((node) => node.id === id);
    if (index < 0) return;
    this.nodeList.splice(index, 1);
    this.nodeIndex.delete(id);
    this.layout();
  }

  addEdge(
    source: JsonValue,
    target: JsonValue,
    weight: JsonValue = null,
    visitedCount = 0,
    selectedCount = 0,
  ): void {
    if (this.findEdge(source, target) !== undefined) return;
    const edge: GraphEdge = { source, target, weight, visitedCount, selectedCount };
    this.edgeList.push(edge);
    this.edgeIndex.set(edgeKey(source, target), edge);
    this.layout();
  }

  updateEdge(
    source: JsonValue,
    target: JsonValue,
    weight?: JsonValue,
    visitedCount?: number,
    selectedCount?: number,
  ): void {
    const edge = this.findEdge(source, target);
    if (edge === undefined) return;
    if (weight !== undefined) edge.weight = weight;
    if (visitedCount !== undefined) edge.visitedCount = visitedCount;
    if (selectedCount !== undefined) edge.selectedCount = selectedCount;
  }

  removeEdge(source: JsonValue, target: JsonValue): void {
    const edge = this.findEdge(source, target);
    if (edge === undefined) return;
    this.edgeList.splice(this.edgeList.indexOf(edge), 1);
    this.edgeIndex.delete(edgeKey(edge.source, edge.target));
    this.layout();
  }

  findNode(id: JsonValue): GraphNode | undefined {
    return this.nodeIndex.get(id);
  }

  findEdge(
    source: JsonValue,
    target: JsonValue,
    isDirected = this.isDirected,
  ): GraphEdge | undefined {
    const forward = this.edgeIndex.get(edgeKey(source, target));
    if (isDirected || forward !== undefined) return forward;
    return this.edgeIndex.get(edgeKey(target, source));
  }

  findLinkedNodeIds(source: JsonValue, isDirected = this.isDirected): JsonValue[] {
    const linked = isDirected
      ? this.edgeList.filter((edge) => edge.source === source)
      : this.edgeList.filter((edge) => edge.source === source || edge.target === source);
    return linked.map((edge) => (edge.source === source ? edge.target : edge.source));
  }

  visit(target: JsonValue, source: JsonValue = null, weight?: JsonValue): void {
    this.visitOrLeave(true, target, source, weight);
  }

  leave(target: JsonValue, source: JsonValue = null, weight?: JsonValue): void {
    this.visitOrLeave(false, target, source, weight);
  }

  select(target: JsonValue, source: JsonValue = null): void {
    this.selectOrDeselect(true, target, source);
  }

  deselect(target: JsonValue, source: JsonValue = null): void {
    this.selectOrDeselect(false, target, source);
  }

  log(key: string | null, resolve?: (key: string) => Tracer | undefined): void {
    const target = key !== null && resolve ? resolve(key) : null;
    this.logTracer =
      target !== null && target !== undefined && 'println' in target ? (target as LogTracer) : null;
  }

  override link(key: string | null, resolve: (key: string) => Tracer | undefined): void {
    this.log(key, resolve);
  }

  private visitOrLeave(
    visit: boolean,
    target: JsonValue,
    source: JsonValue,
    weight?: JsonValue,
  ): void {
    const edge = this.findEdge(source, target);
    if (edge !== undefined) edge.visitedCount += visit ? 1 : -1;
    const node = this.findNode(target);
    if (node === undefined) return;
    if (weight !== undefined) node.weight = weight;
    node.visitedCount += visit ? 1 : -1;
    this.logTracer?.println(
      `${toDisplayString(source ?? '')} ${visit ? '->' : '<-'} ${toDisplayString(target)}`,
    );
  }

  private selectOrDeselect(select: boolean, target: JsonValue, source: JsonValue): void {
    const edge = this.findEdge(source, target);
    if (edge !== undefined) edge.selectedCount += select ? 1 : -1;
    const node = this.findNode(target);
    if (node === undefined) return;
    node.selectedCount += select ? 1 : -1;
    this.logTracer?.println(
      `${toDisplayString(source ?? '')} ${select ? '=>' : '<='} ${toDisplayString(target)}`,
    );
  }

  getRect(): Rect {
    const { baseWidth, baseHeight, padding } = this.dimensions;
    const left = -baseWidth / 2 + padding;
    const top = -baseHeight / 2 + padding;
    const right = baseWidth / 2 - padding;
    const bottom = baseHeight / 2 - padding;
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  /** Danh dau can tinh lai bo cuc — ngam #37. Tinh that xay ra o `ensureLayout`. */
  layout(): void {
    this.layoutDirty = true;
  }

  private ensureLayout(): void {
    if (!this.layoutDirty) return;
    this.layoutDirty = false;
    switch (this.layoutCall.kind) {
      case 'circle':
        this.applyCircle();
        break;
      case 'tree':
        this.applyTree(this.layoutCall.root, this.layoutCall.sorted);
        break;
      case 'random':
        this.applyRandom();
        break;
    }
  }

  layoutCircle(): void {
    this.layoutCall = { kind: 'circle' };
    this.layoutDirty = true;
  }

  layoutTree(root: JsonValue = 0, sorted = false): void {
    this.layoutCall = { kind: 'tree', root, sorted };
    this.layoutDirty = true;
  }

  layoutRandom(): void {
    this.layoutCall = { kind: 'random' };
    this.layoutDirty = true;
  }

  private applyCircle(): void {
    const rect = this.getRect();
    const unitAngle = (2 * Math.PI) / this.nodeList.length;
    let angle = -Math.PI / 2;
    for (const node of this.nodeList) {
      node.x = (Math.cos(angle) * rect.width) / 2;
      node.y = (Math.sin(angle) * rect.height) / 2;
      angle += unitAngle;
    }
  }

  /**
   * Chỉ mục ke dùng một lan cho mỗi lan tính bố cục.
   * Trước đây `findLinkedNodeIds` quet toàn bỏ canh cho tung node, thành O(V*E).
   */
  private buildAdjacency(sorted = false): Map<JsonValue, JsonValue[]> {
    const adjacency = new Map<JsonValue, JsonValue[]>();
    for (const node of this.nodeList) adjacency.set(node.id, []);
    for (const edge of this.edgeList) {
      adjacency.get(edge.source)?.push(edge.target);
      adjacency.get(edge.target)?.push(edge.source);
    }
    if (sorted) {
      for (const neighbours of adjacency.values()) {
        neighbours.sort((a, b) =>
          toDisplayString(a).localeCompare(toDisplayString(b), 'en', { numeric: true }),
        );
      }
    }
    return adjacency;
  }

  /**
   * Bố cục dang cay.
   *
   * Duyet LAP chu không đệ quy: cay 10.000 node lệch một ben sẽ làm tran ngăn xếp.
   * Và dùng chỉ mục ke dùng một lan — trước đây `findLinkedNodeIds` quet toàn bỏ canh
   * cho tung node, thành O(V*E), là nguyên nhân benchmark đó được 7.903ms/40ms.
   */
  private applyTree(root: JsonValue, sorted: boolean): void {
    const rect = this.getRect();
    if (this.nodeList.length === 0) return;

    const first = this.nodeList[0];
    if (this.nodeList.length === 1) {
      if (first !== undefined) {
        first.x = (rect.left + rect.right) / 2;
        first.y = (rect.top + rect.bottom) / 2;
      }
      return;
    }

    const rootNode = this.findNode(root) ?? first;
    if (rootNode === undefined) return;

    const adjacency = this.buildAdjacency(sorted);
    const nodeById = new Map(this.nodeList.map((node) => [node.id, node]));

    // BFS lấy thứ tự duyet, cha, và đó sau
    const parentOf = new Map<JsonValue, JsonValue>();
    const depthOf = new Map<JsonValue, number>([[rootNode.id, 0]]);
    const childrenOf = new Map<JsonValue, JsonValue[]>();
    const order: JsonValue[] = [rootNode.id];
    let maxDepth = 0;

    // Hàng đợi BFS: `order` dài thêm ngay trong luc duyet nên không phải vòng lặp don gian
    let head = 0;
    while (head < order.length) {
      const id = order[head];
      head += 1;
      if (id === undefined) continue;
      const depth = depthOf.get(id) ?? 0;
      const children: JsonValue[] = [];
      for (const linkedId of adjacency.get(id) ?? []) {
        if (depthOf.has(linkedId)) continue;
        depthOf.set(linkedId, depth + 1);
        parentOf.set(linkedId, id);
        children.push(linkedId);
        order.push(linkedId);
      }
      childrenOf.set(id, children);
      if (depth > maxDepth) maxDepth = depth;
    }

    // Đếm là từ dưới lên, duyet nguoc thứ tự BFS
    const leafCounts = new Map<JsonValue, number>();
    for (let i = order.length - 1; i >= 0; i -= 1) {
      const id = order[i];
      if (id === undefined) continue;
      let count = 0;
      for (const childId of childrenOf.get(id) ?? []) count += leafCounts.get(childId) ?? 1;
      leafCounts.set(id, count === 0 ? 1 : count);
    }

    const hGap = rect.width / (leafCounts.get(rootNode.id) ?? 1);
    const vGap = maxDepth === 0 ? 0 : rect.height / maxDepth;

    // Đạt vi tri bang ngăn xếp tường minh
    const stack: { id: JsonValue; offset: number }[] = [{ id: rootNode.id, offset: 0 }];
    while (stack.length > 0) {
      const frame = stack.pop();
      if (frame === undefined) break;
      const node = nodeById.get(frame.id);
      if (node === undefined) continue;

      node.x = rect.left + (frame.offset + (leafCounts.get(frame.id) ?? 1) / 2) * hGap;
      node.y = rect.top + (depthOf.get(frame.id) ?? 0) * vGap;

      let offset = frame.offset;
      const children = childrenOf.get(frame.id) ?? [];
      // Đây nguoc vào ngăn xếp để con đầu tiên được xử lý trước
      const frames = children.map((childId) => {
        const at = offset;
        offset += leafCounts.get(childId) ?? 1;
        return { id: childId, offset: at };
      });
      for (let i = frames.length - 1; i >= 0; i -= 1) {
        const childFrame = frames[i];
        if (childFrame !== undefined) stack.push(childFrame);
      }
    }
  }

  /**
   * Rai node ngẫu nhiên nhưng tranh đè chồng, VOI TRAN so lan thu — sửa loi ngầm #39.
   *
   * Bản cũ lap `đó/while` cho tới khi mỗi node cach nhau 48px, không có loi thoat:
   * đồ thị đóng node làm treo trình duyệt. Bay gio sau khi hết luot thu thì chấp nhận
   * vi tri cuối cùng, và khóang cach yeu cau giảm dan để vẫn con có gang giai chong.
   */
  private applyRandom(): void {
    const rect = this.getRect();
    const prng = createPrng(seedFromKey(this.key));
    const placed: GraphNode[] = [];

    for (const node of this.nodes) {
      let minDistance = RANDOM_MIN_DISTANCE;
      for (let attempt = 0; attempt < RANDOM_PLACEMENT_ATTEMPTS; attempt += 1) {
        node.x = rect.left + prng.next() * rect.width;
        node.y = rect.top + prng.next() * rect.height;
        if (!placed.some((other) => distance(node, other) < minDistance)) break;
        // Nối dan yeu cau: đồ thị đóng node không thể thoa man khóang cach ban đầu
        if (attempt % 20 === 19) minDistance *= 0.8;
      }
      placed.push(node);
    }
  }
}

/** U+0000 khong xuat hien trong id hop le nen khong the gay nham lan khoa. */
function edgeKey(source: JsonValue, target: JsonValue): string {
  return `${toDisplayString(source)} ${toDisplayString(target)}`;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
