import { type Command, serializeCommand } from './command';
import { frame } from './framing';

/**
 * Trace mau dùng chung cho cả hệ thống — PLAN.md Task 0.3.5.
 *
 * Phase 1 dùng chung làm đầu vào snapshot cho renderer; Phase 3 dùng làm kết quả doi chung
 * khi kiểm trả gateway; Phase 4 dùng làm khuon cho bỏ tuân thủ 18 ngôn ngữ.
 */
export interface Fixture {
  readonly name: string;
  readonly description: string;
  readonly commands: readonly Command[];
}

const c = (key: string | null, method: string, ...args: Command['args']): Command => ({
  key,
  method,
  args,
});

const array1d: Fixture = {
  name: 'array1d-sort',
  description: 'Sap xep noi bot mang 1 chieu, co to sang o dang so sanh',
  commands: [
    c('arr', 'Array1DTracer', 'Mang'),
    c(null, 'setRoot', 'arr'),
    c('arr', 'set', [5, 3, 8, 1]),
    c(null, 'delay', 10),
    c('arr', 'select', 0, 1),
    c(null, 'delay', 12),
    c('arr', 'patch', 0, 3),
    c('arr', 'patch', 1, 5),
    c(null, 'delay', 14),
    c('arr', 'depatch', 0),
    c('arr', 'depatch', 1),
    c('arr', 'deselect', 0, 1),
    c(null, 'delay', 16),
  ],
};

const array2d: Fixture = {
  name: 'array2d-grid',
  description: 'Luoi 2 chieu, chon theo hang va theo cot',
  commands: [
    c('grid', 'Array2DTracer', 'Luoi'),
    c(null, 'setRoot', 'grid'),
    c('grid', 'set', [
      [1, 2, 3],
      [4, 5, 6],
    ]),
    c(null, 'delay', 5),
    c('grid', 'selectRow', 0, 0, 2),
    c(null, 'delay', 7),
    c('grid', 'deselectRow', 0, 0, 2),
    c('grid', 'selectCol', 1, 0, 1),
    c(null, 'delay', 9),
  ],
};

const graph: Fixture = {
  name: 'graph-dfs',
  description: 'DFS de quy tren do thi vo huong, kiem tra bo dem visitedCount long nhau',
  commands: [
    c('g', 'GraphTracer', 'Do thi'),
    c('log', 'LogTracer', 'Console'),
    c('lay', 'VerticalLayout', ['g', 'log']),
    c(null, 'setRoot', 'lay'),
    c('g', 'directed', false),
    c('g', 'set', [
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
    ]),
    c('g', 'log', 'log'),
    c('g', 'layoutTree', 0, true),
    c(null, 'delay', 20),
    c('g', 'visit', 0),
    c(null, 'delay', 22),
    c('g', 'visit', 1, 0),
    c(null, 'delay', 22),
    c('g', 'leave', 1, 0),
    c(null, 'delay', 24),
    c('g', 'visit', 2, 0),
    c(null, 'delay', 22),
    c('g', 'leave', 2, 0),
    c('g', 'leave', 0),
    c(null, 'delay', 26),
  ],
};

const chart: Fixture = {
  name: 'chart-linked',
  description: 'Array1D gan ChartTracer dung chung tham chieu data — ngam #34',
  commands: [
    c('arr', 'Array1DTracer', 'Mang'),
    c('cht', 'ChartTracer', 'Bieu do'),
    c('lay', 'HorizontalLayout', ['arr', 'cht']),
    c(null, 'setRoot', 'lay'),
    c('arr', 'chart', 'cht'),
    c('arr', 'set', [4, 7, 2]),
    c(null, 'delay', 8),
  ],
};

const scatter: Fixture = {
  name: 'scatter-points',
  description: 'Bieu do phan tan',
  commands: [
    c('sc', 'ScatterTracer', 'Phan tan'),
    c(null, 'setRoot', 'sc'),
    c('sc', 'set', [
      [1, 2],
      [3, 4],
      [5, 6],
    ]),
    c(null, 'delay', 4),
  ],
};

const log: Fixture = {
  name: 'log-printf',
  description: 'LogTracer voi print, println va printf nhieu tham so',
  commands: [
    c('log', 'LogTracer', 'Console'),
    c(null, 'setRoot', 'log'),
    c('log', 'println', 'bat dau'),
    c('log', 'printf', '%s = %d', 'x', 42),
    c('log', 'print', 'khong xuong dong'),
    c(null, 'delay', 3),
  ],
};

const markdown: Fixture = {
  name: 'markdown-doc',
  description: 'Trang mo ta thuat toan — ngam #22',
  commands: [
    c('md', 'MarkdownTracer', 'Markdown'),
    c('md', 'set', '# Tieu de\n\nNoi dung.'),
    c(null, 'setRoot', 'md'),
  ],
};

const nestedLayout: Fixture = {
  name: 'layout-nested',
  description: 'Layout long nhau, them va bo con luc dang chay — ngam #31',
  commands: [
    c('a', 'Array1DTracer', 'A'),
    c('b', 'Array1DTracer', 'B'),
    c('log', 'LogTracer', 'Log'),
    c('inner', 'HorizontalLayout', ['a', 'b']),
    c('outer', 'VerticalLayout', ['inner', 'log']),
    c(null, 'setRoot', 'outer'),
    c('a', 'set', [1]),
    c('b', 'set', [2]),
    c(null, 'delay', 1),
    c('inner', 'remove', 'b'),
    c('b', 'destroy'),
    c(null, 'delay', 2),
  ],
};

export const FIXTURES: readonly Fixture[] = [
  array1d,
  array2d,
  graph,
  chart,
  scatter,
  log,
  markdown,
  nestedLayout,
];

export function fixtureByName(name: string): Fixture | undefined {
  return FIXTURES.find((fixture) => fixture.name === name);
}

/** Dung stdout gia lap dung nhu Piston se tra ve, de test parser va gateway. */
export function toStdout(commands: readonly Command[]): string {
  return commands.map((command) => frame(serializeCommand(command))).join('\n');
}

/**
 * Trace lớn dùng cho benchmark §4.3 và để kiểm trả nguong bộ nhớ §4.2.
 * Sinh ra tai cho thay vì lưu file: 100.000 lệnh nên toi vai MB nếu commit vào repo.
 */
export function syntheticTrace(commandCount: number): readonly Command[] {
  const commands: Command[] = [c('arr', 'Array1DTracer', 'Mang'), c(null, 'setRoot', 'arr')];
  const size = 64;
  commands.push(
    c(
      'arr',
      'set',
      Array.from({ length: size }, (_, i) => i),
    ),
  );

  let index = 0;
  while (commands.length < commandCount) {
    const left = index % size;
    const right = (index + 1) % size;
    commands.push(c('arr', 'select', left, right));
    commands.push(c(null, 'delay', 20 + (index % 8)));
    commands.push(c('arr', 'deselect', left, right));
    index += 1;
  }

  return commands.slice(0, commandCount);
}
