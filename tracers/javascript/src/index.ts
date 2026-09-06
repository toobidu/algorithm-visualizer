/**
 * Thư viện tracer cho JavaScript và TypeScript, chạy trong Web Worker.
 *
 * Đây là ban THAM CHIEU của API tracer: 16 thư viện ngôn ngữ còn lại ở Phase 4 phải sinh ra
 * command list giong hết ban này (Phụ lục C). Mỗi thay doi o đây kéo theo bỏ tuân thủ.
 *
 * Không import `@av/protocol`: worker ghep chuỗi này với code người dùng roi chạy bằng
 * `new Function`, nên đoạn mã phải từ chua du.
 */
export const TRACER_RUNTIME_SOURCE = String.raw`
const __commands = [];
const SAFE_INTEGER_LIMIT = Number.MAX_SAFE_INTEGER;

// PLAN.md §3.5 quy tắc 2b và 3: chuẩn hóa số trước khi dựa vào command list
function __normalize(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { $num: Number.isNaN(value) ? 'NaN' : value > 0 ? 'Infinity' : '-Infinity' };
    }
    if (Math.abs(value) > SAFE_INTEGER_LIMIT) {
      throw new Error(
        'Gia tri ' + value + ' vuot khoang so nguyen an toan cua giao thuc. ' +
        'Python va Java se cho ket qua khac JavaScript o gia tri nay.'
      );
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(__normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = __normalize(value[k]);
    return out;
  }
  return value;
}

function __record(key, method, args) {
  __commands.push({ key: key, method: method, args: args.map(__normalize) });
}

let __nextKey = 0;

class __Node {
  constructor(className, args) {
    this.key = 'k' + __nextKey++;
    __record(this.key, className, args);
  }
  destroy() { __record(this.key, 'destroy', []); }
  reset() { __record(this.key, 'reset', []); }
}

function __methods(Class, names) {
  for (const name of names) {
    Class.prototype[name] = function () {
      __record(this.key, name, Array.prototype.slice.call(arguments));
    };
  }
}

const __title = (title) => (title === undefined ? [] : [title]);

class Array2DTracer extends __Node {
  constructor(title, className) { super(className || 'Array2DTracer', __title(title)); }
}
__methods(Array2DTracer, [
  'set', 'patch', 'depatch', 'select', 'selectRow', 'selectCol',
  'deselect', 'deselectRow', 'deselectCol',
]);

class Array1DTracer extends __Node {
  constructor(title, className) { super(className || 'Array1DTracer', __title(title)); }
  chart(tracer) { __record(this.key, 'chart', [tracer ? tracer.key : null]); }
}
__methods(Array1DTracer, ['set', 'patch', 'depatch', 'select', 'deselect']);

class ChartTracer extends Array1DTracer {
  constructor(title) { super(title, 'ChartTracer'); }
}

class ScatterTracer extends Array2DTracer {
  constructor(title) { super(title, 'ScatterTracer'); }
}

class LogTracer extends __Node {
  constructor(title) { super('LogTracer', __title(title)); }
}
__methods(LogTracer, ['set', 'print', 'println', 'printf']);

class MarkdownTracer extends __Node {
  constructor(title) { super('MarkdownTracer', __title(title)); }
}
__methods(MarkdownTracer, ['set']);

class GraphTracer extends __Node {
  constructor(title) { super('GraphTracer', __title(title)); }
  log(tracer) { __record(this.key, 'log', [tracer ? tracer.key : null]); }
}
__methods(GraphTracer, [
  'set', 'directed', 'weighted', 'addNode', 'updateNode', 'removeNode',
  'addEdge', 'updateEdge', 'removeEdge', 'layoutCircle', 'layoutTree', 'layoutRandom',
  'visit', 'leave', 'select', 'deselect',
]);

class __LayoutNode extends __Node {
  constructor(className, children) {
    super(className, [children.map(function (child) { return child.key; })]);
  }
  add(child, index) {
    __record(this.key, 'add', index === undefined ? [child.key] : [child.key, index]);
  }
  remove(child) { __record(this.key, 'remove', [child.key]); }
  removeAll() { __record(this.key, 'removeAll', []); }
}

class VerticalLayout extends __LayoutNode {
  constructor(children) { super('VerticalLayout', children); }
}
class HorizontalLayout extends __LayoutNode {
  constructor(children) { super('HorizontalLayout', children); }
}

const Layout = {
  setRoot: function (node) { __record(null, 'setRoot', [node.key]); },
};

const Tracer = {
  /**
   * Cắt một khung hình. Không truyền số dòng thì suy từ ngăn xếp loi — cach duy nhất
   * lấy được số dòng ma không phải biến đổi mã nguồn của người dùng.
   */
  delay: function (lineNumber) {
    __record(null, 'delay', [lineNumber === undefined ? __currentLine() : lineNumber]);
  },
};

function __currentLine() {
  const stack = new Error().stack;
  if (typeof stack !== 'string') return 0;
  const lines = stack.split('\n');
  for (let i = 2; i < lines.length; i += 1) {
    const match = /:(\d+):\d+\)?\s*$/.exec(lines[i]);
    if (match) {
      const line = Number(match[1]) - __LINE_OFFSET;
      return line > 0 ? line : 0;
    }
  }
  return 0;
}
`;

/**
 * Số dòng ma runtime chiếm trước code người dùng, tính cả đóng `const __LINE_OFFSET`
 * đó worker chèn vào. Trừ ra khi suy số dòng, nếu không vạch sáng trong editor sẽ lệch.
 */
export const TRACER_RUNTIME_LINE_COUNT = TRACER_RUNTIME_SOURCE.split('\n').length;

export { PLAIN_RUNTIME_SOURCE } from './plainRuntime';
