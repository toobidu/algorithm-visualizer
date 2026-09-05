/**
 * Danh mục đầy đủ các lop và method của giao thức — nguồn chân lý của cả hệ thống.
 *
 * Trích từ bản cũ (`legacy/src/core/`). Bộ sinh mã tracer ở Task 0.5 đọc chinh file này
 * để sinh khung thư viện cho 18 ngôn ngữ, nên mỗi thay doi o đây lan ra toàn bỏ hệ thống.
 */

export const TRACER_CLASSES = [
  'Array1DTracer',
  'Array2DTracer',
  'ChartTracer',
  'GraphTracer',
  'LogTracer',
  'MarkdownTracer',
  'ScatterTracer',
] as const;

export const LAYOUT_CLASSES = ['HorizontalLayout', 'VerticalLayout'] as const;

export type TracerClass = (typeof TRACER_CLASSES)[number];
export type LayoutClass = (typeof LAYOUT_CLASSES)[number];

export function isTracerClass(name: string): name is TracerClass {
  return (TRACER_CLASSES as readonly string[]).includes(name);
}

export function isLayoutClass(name: string): name is LayoutClass {
  return (LAYOUT_CLASSES as readonly string[]).includes(name);
}

/** Method dac biet goi voi `key === null`. */
export const GLOBAL_METHODS = {
  /** args: [rootKey] — dat object goc cua khung visualization */
  setRoot: { min: 1, max: 1 },
  /** args: [lineNumber] — cat chunk, mang so dong code dang chay */
  delay: { min: 1, max: 1 },
} as const;

export type GlobalMethod = keyof typeof GLOBAL_METHODS;

export function isGlobalMethod(name: string): name is GlobalMethod {
  return Object.hasOwn(GLOBAL_METHODS, name);
}

export interface MethodSpec {
  /** So tham so toi thieu */
  readonly min: number;
  /** So tham so toi da; `null` nghia la khong gioi han (vi du printf) */
  readonly max: number | null;
}

/** Method moi object deu co. */
const COMMON: Record<string, MethodSpec> = {
  destroy: { min: 0, max: 0 },
  reset: { min: 0, max: 0 },
};

const ARRAY_2D: Record<string, MethodSpec> = {
  set: { min: 0, max: 1 },
  patch: { min: 2, max: 3 },
  depatch: { min: 2, max: 2 },
  select: { min: 2, max: 4 },
  selectRow: { min: 3, max: 3 },
  selectCol: { min: 3, max: 3 },
  deselect: { min: 2, max: 4 },
  deselectRow: { min: 3, max: 3 },
  deselectCol: { min: 3, max: 3 },
};

const ARRAY_1D: Record<string, MethodSpec> = {
  set: { min: 0, max: 1 },
  patch: { min: 1, max: 2 },
  depatch: { min: 1, max: 1 },
  select: { min: 1, max: 2 },
  deselect: { min: 1, max: 2 },
  chart: { min: 1, max: 1 },
};

const GRAPH: Record<string, MethodSpec> = {
  set: { min: 0, max: 1 },
  directed: { min: 0, max: 1 },
  weighted: { min: 0, max: 1 },
  addNode: { min: 1, max: 6 },
  updateNode: { min: 1, max: 6 },
  removeNode: { min: 1, max: 1 },
  addEdge: { min: 2, max: 5 },
  updateEdge: { min: 2, max: 5 },
  removeEdge: { min: 2, max: 2 },
  layoutCircle: { min: 0, max: 0 },
  layoutTree: { min: 0, max: 2 },
  layoutRandom: { min: 0, max: 0 },
  visit: { min: 1, max: 3 },
  leave: { min: 1, max: 3 },
  select: { min: 1, max: 2 },
  deselect: { min: 1, max: 2 },
  log: { min: 1, max: 1 },
};

const LOG: Record<string, MethodSpec> = {
  set: { min: 0, max: 1 },
  print: { min: 1, max: 1 },
  println: { min: 1, max: 1 },
  printf: { min: 1, max: null },
};

const MARKDOWN: Record<string, MethodSpec> = {
  set: { min: 0, max: 1 },
};

const LAYOUT: Record<string, MethodSpec> = {
  add: { min: 1, max: 2 },
  remove: { min: 1, max: 1 },
  removeAll: { min: 0, max: 0 },
};

/** Method cua tung lop, da gop phan ke thua. */
export const METHODS: Readonly<Record<TracerClass | LayoutClass, Record<string, MethodSpec>>> = {
  Array1DTracer: { ...COMMON, ...ARRAY_1D },
  Array2DTracer: { ...COMMON, ...ARRAY_2D },
  ChartTracer: { ...COMMON, ...ARRAY_1D },
  ScatterTracer: { ...COMMON, ...ARRAY_2D },
  GraphTracer: { ...COMMON, ...GRAPH },
  LogTracer: { ...COMMON, ...LOG },
  MarkdownTracer: { ...COMMON, ...MARKDOWN },
  HorizontalLayout: { ...COMMON, ...LAYOUT },
  VerticalLayout: { ...COMMON, ...LAYOUT },
};

/** So tham so cua lenh khoi tao: tracer nhan title, layout nhan danh sach khoa con. */
export const CONSTRUCTOR_SPEC: Readonly<Record<'tracer' | 'layout', MethodSpec>> = {
  tracer: { min: 0, max: 1 },
  layout: { min: 1, max: 1 },
};

export function isArityValid(spec: MethodSpec, count: number): boolean {
  if (count < spec.min) return false;
  return spec.max === null || count <= spec.max;
}
