import { describe, expect, it } from 'vitest';
import { goAdapter } from './adapters/go';
import { javaAdapter } from './adapters/java';
import { javascriptAdapter, typescriptAdapter } from './adapters/javascript';
import { phpAdapter } from './adapters/php';
import { pythonAdapter } from './adapters/python';
import { rubyAdapter } from './adapters/ruby';
import { depthDelta, depthProfile, NEWLINE } from './instrumentBraces';
import { findAdapter, PLAIN_ADAPTERS, supportsPlainMode } from './registry';
import { inferRoles, parseHints, type Step } from './steps';
import { stepsToCommands } from './toCommands';

const JAVA = [
  'class Solution {',
  '    public int bruteForce(int[] prices) {',
  '        int maxProfit = 0;',
  '        for (int i = 0; i < prices.length; i++) {',
  '            for (int j = i + 1; j < prices.length; j++) {',
  '                int profit = prices[j] - prices[i];',
  '            }',
  '        }',
  '        return maxProfit;',
  '    }',
  '}',
].join(NEWLINE);

const mainOf = (content: string): string[] => content.split(NEWLINE);

describe('danh mục adapter', () => {
  it('mỗi languageId chỉ xuất hiện một lần', () => {
    const ids = PLAIN_ADAPTERS.map((adapter) => adapter.languageId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tra cứu được theo id và báo đúng ngôn ngữ chưa hỗ trợ', () => {
    expect(findAdapter('java')).toBe(javaAdapter);
    expect(findAdapter('rust')).toBeUndefined();
    expect(supportsPlainMode('python')).toBe(true);
    expect(supportsPlainMode('scala')).toBe(false);
  });

  it('adapter dùng hook lúc chạy đều khai báo file runtime', () => {
    const hooks = PLAIN_ADAPTERS.filter((a) => a.strategy === 'runtime-hook');
    expect(hooks.length).toBeGreaterThan(0);
    for (const adapter of hooks) expect(adapter.runtimeFile).toBeDefined();
  });

  it('mọi adapter dựng được chương trình có ít nhất một file', () => {
    for (const adapter of PLAIN_ADAPTERS) {
      const program = adapter.build('x = 1', '# runtime');
      expect(program.files.length).toBeGreaterThan(0);
      expect(program.lineOffset).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('depthDelta', () => {
  it('đếm ngoặc nhọn', () => {
    expect(depthDelta('if (x) {')).toBe(1);
    expect(depthDelta('}')).toBe(-1);
    expect(depthDelta('if (x) { y(); }')).toBe(0);
  });

  it('bỏ qua ngoặc nằm trong chuỗi', () => {
    expect(depthDelta('print("{")')).toBe(0);
    expect(depthDelta("print('}')")).toBe(0);
  });
});

describe('depthProfile', () => {
  it('ghi lại độ sâu thấp nhất chạm tới giữa dòng', () => {
    // `} else {` kết thúc ở đúng độ sâu cũ nhưng đã đóng một khối ở giữa
    expect(depthProfile('} else {')).toEqual({ delta: 0, min: -1 });
    expect(depthProfile('if (x) {')).toEqual({ delta: 1, min: 0 });
    expect(depthProfile('}')).toEqual({ delta: -1, min: -1 });
  });
});

describe('chèn mã Java: hai lỗi sinh ra biến không tồn tại', () => {
  const TWO_POINTER = [
    'class Solution {',
    '    public int maxProfit(int[] prices) {',
    '        int left = 0;',
    '        int right = 1;',
    '        int best = 0;',
    '        while (right < prices.length) {',
    '            if (prices[right] > prices[left]) {',
    '                int profit = prices[right] - prices[left];',
    '                if (profit > best) best = profit;',
    '            } else {',
    '                left = right;',
    '            }',
    '            right++;',
    '        }',
    '        return best;',
    '    }',
    '}',
  ].join(NEWLINE);

  const instrumented = (): string =>
    mainOf(javaAdapter.build(TWO_POINTER, '').files[0]?.content ?? '').join(NEWLINE);

  it('`prices.length` không biến `length` thành tham số', () => {
    // Điều kiện của `while` từng bị đọc như danh sách tham số của một hàm
    expect(instrumented()).not.toContain('"length", length');
  });

  it('biến khai báo trong nhánh `if` không sống sang nhánh `else`', () => {
    const elseBranch = instrumented()
      .split(NEWLINE)
      .filter((line) => line.includes('left = right'));

    expect(elseBranch.length).toBeGreaterThan(0);
    expect(elseBranch.join(NEWLINE)).not.toContain('profit');
  });
});

describe('adapter Java', () => {
  const build = (runtime = ''): string => javaAdapter.build(JAVA, runtime).files[0]?.content ?? '';

  it('runtime nằm SAU code người dùng nên số dòng không lệch', () => {
    const program = javaAdapter.build(JAVA, 'final class AvTrace {}');
    expect(program.lineOffset).toBe(0);
    expect(program.files[0]?.content.startsWith('class Solution {')).toBe(true);
    expect(program.files[0]?.content).toContain('final class AvTrace {}');
  });

  it('không chèn sau return: mã đó không bao giờ chạy tới', () => {
    const lines = mainOf(build());
    const at = lines.findIndex((line) => line.includes('return maxProfit'));
    expect(lines[at + 1]).not.toContain('AvTrace.step');
  });

  it('chỉ truyền biến còn trong phạm vi', () => {
    const calls = mainOf(build()).filter((line) => line.includes('AvTrace.step'));
    expect(calls[0]).toContain('"maxProfit"');
    expect(calls[0]).not.toContain('"j"');
  });

  it('biến vòng lặp lồng nhau đều có mặt ở thân trong cùng', () => {
    const deepest = mainOf(build()).find((line) => line.includes('"profit"')) ?? '';
    expect(deepest).toContain('"i"');
    expect(deepest).toContain('"j"');
  });

  it('không chèn sau khai báo class hay chữ ký phương thức', () => {
    expect(mainOf(build())[1]).not.toContain('AvTrace.step');
  });
});

describe('adapter Go', () => {
  const GO = [
    'package main',
    '',
    'func main() {',
    '\tarr := []int{3, 1, 2}',
    '\tfor i := 0; i < len(arr); i++ {',
    '\t\tx := arr[i]',
    '\t}',
    '}',
  ].join(NEWLINE);

  it('runtime đi thành file riêng nên số dòng không lệch', () => {
    const program = goAdapter.build(GO, 'package main');
    expect(program.lineOffset).toBe(0);
    expect(program.files).toHaveLength(2);
    expect(program.files[1]?.name).toBe('av_plain.go');
  });

  it('nhận ra khai báo bằng := và biến vòng lặp', () => {
    const content = goAdapter.build(GO, '').files[0]?.content ?? '';
    expect(content).toContain('"arr"');
    expect(content).toContain('"i"');
  });

  it('không chèn sau package hay func', () => {
    const lines = mainOf(goAdapter.build(GO, '').files[0]?.content ?? '');
    expect(lines[1]).not.toContain('AvStep');
  });
});

describe('adapter JavaScript', () => {
  const JS = [
    'function sort(arr) {',
    '  let n = arr.length;',
    '  for (let i = 0; i < n; i++) {',
    '    let tmp = arr[i];',
    '  }',
    '}',
  ].join(NEWLINE);

  it('sinh lời gọi dạng object literal kèm tham số hàm', () => {
    const content = javascriptAdapter.build(JS, '').files[0]?.content ?? '';
    const call = mainOf(content).find((line) => line.includes('__avStep(')) ?? '';
    expect(call).toContain('arr');
    expect(call).toContain('n');
    expect(call).toMatch(/__avStep\(\d+, \{/);
  });

  it('tham số hàm nhiều biến được tách đúng', () => {
    const src = ['function f(a, b) {', '  let c = a + b;', '}'].join(NEWLINE);
    const call = mainOf(javascriptAdapter.build(src, '').files[0]?.content ?? '').find((l) =>
      l.includes('__avStep('),
    );
    expect(call).toContain('a');
    expect(call).toContain('b');
    expect(call).toContain('c');
  });

  it('TypeScript dùng chung bộ chèn với JavaScript', () => {
    expect(typescriptAdapter.languageId).toBe('typescript');
    expect(typescriptAdapter.strategy).toBe(javascriptAdapter.strategy);
  });
});

describe('adapter dùng hook lúc chạy', () => {
  it('Python không sửa code người dùng, chỉ bọc try/finally', () => {
    const program = pythonAdapter.build('x = 1', '# runtime');
    const content = program.files[0]?.content ?? '';
    expect(content).toContain('    x = 1');
    expect(content).toContain('av_plain.stop()');
    expect(program.lineOffset).toBe(3);
  });

  it('Ruby nhúng runtime lên đầu và báo đúng số dòng lệch', () => {
    const runtime = ['a', 'b'].join(NEWLINE);
    const program = rubyAdapter.build('puts 1', runtime);
    expect(program.lineOffset).toBe(4);
    expect(program.files[0]?.content).toContain('  puts 1');
  });

  it('PHP bỏ thẻ mở của người dùng để declare(ticks) đứng đầu file', () => {
    const program = phpAdapter.build('<?php\n$x = 1;', 'declare(ticks=1);');
    const content = program.files[0]?.content ?? '';
    expect(content.startsWith('declare(ticks=1);')).toBe(true);
    expect(content).not.toContain('<?php');
  });
});

describe('parseHints', () => {
  it('đọc chú thích @viz từ comment', () => {
    const hints = parseHints('// @viz array prices\n// @viz pointer i, j');
    expect(hints).toEqual([
      { kind: 'array', names: ['prices'] },
      { kind: 'pointer', names: ['i', 'j'] },
    ]);
  });

  it('bỏ qua chú thích sai định dạng', () => {
    expect(parseHints('// @viz khongbiet x')).toEqual([]);
  });

  it('nhận chú thích ở mọi kiểu comment', () => {
    expect(parseHints('# @viz array xs')).toHaveLength(1);
    expect(parseHints('-- @viz array xs')).toHaveLength(1);
  });
});

describe('inferRoles', () => {
  const steps: Step[] = [
    { line: 1, vars: { arr: [5, 2, 9], i: 0, total: 1000 } },
    { line: 2, vars: { arr: [5, 2, 9], i: 1, total: 1200 } },
  ];

  it('mảng số là panel mảng', () => {
    expect(inferRoles(steps, []).get('arr')).toBe('array');
  });

  it('số nguyên nằm trong khoảng chỉ số là con trỏ', () => {
    expect(inferRoles(steps, []).get('i')).toBe('pointer');
  });

  it('số vượt khoảng chỉ số là giá trị thường', () => {
    expect(inferRoles(steps, []).get('total')).toBe('value');
  });

  it('chú thích của người dùng thắng suy đoán', () => {
    expect(inferRoles(steps, [{ kind: 'value', names: ['i'] }]).get('i')).toBe('value');
  });

  it('mảng hai chiều là lưới', () => {
    const grid: Step[] = [
      {
        line: 1,
        vars: {
          g: [
            [1, 2],
            [3, 4],
          ],
        },
      },
    ];
    expect(inferRoles(grid, []).get('g')).toBe('grid');
  });

  it('không có mảng nào thì không có con trỏ nào', () => {
    const plain: Step[] = [{ line: 1, vars: { a: 1, b: 2 } }];
    const roles = inferRoles(plain, []);
    expect(roles.get('a')).toBe('value');
    expect(roles.get('b')).toBe('value');
  });
});

describe('stepsToCommands', () => {
  const steps: Step[] = [
    { line: 3, vars: { arr: [5, 2, 9], i: 0 } },
    { line: 4, vars: { arr: [2, 5, 9], i: 1 } },
  ];

  it('tạo panel cho mảng và một khung nhật ký', () => {
    const created = stepsToCommands(steps, '')
      .filter((c) => c.method.endsWith('Tracer'))
      .map((c) => c.method);
    expect(created).toEqual(['Array1DTracer', 'LogTracer']);
  });

  it('mỗi bước thành một khung hình mang đúng số dòng', () => {
    const delays = stepsToCommands(steps, '').filter((c) => c.method === 'delay');
    expect(delays.map((c) => c.args[0])).toEqual([3, 4]);
  });

  it('cập nhật nội dung mảng theo từng bước', () => {
    const sets = stepsToCommands(steps, '').filter((c) => c.method === 'set' && c.key === 'av0');
    expect(sets.map((c) => c.args[0])).toEqual([
      [5, 2, 9],
      [2, 5, 9],
    ]);
  });

  it('con trỏ được tô rồi bỏ tô ở khung sau', () => {
    const commands = stepsToCommands(steps, '');
    expect(commands.some((c) => c.method === 'select')).toBe(true);
    expect(commands.some((c) => c.method === 'deselect')).toBe(true);
  });

  it('không có bước nào vẫn dựng được khung rỗng', () => {
    expect(stepsToCommands([], '').some((c) => c.method === 'setRoot')).toBe(true);
  });

  it('con trỏ ngoài phạm vi mảng thì không tô nhầm ô nào', () => {
    const out: Step[] = [{ line: 1, vars: { arr: [1, 2], i: 99 } }];
    expect(stepsToCommands(out, '').some((c) => c.method === 'select')).toBe(false);
  });
});
