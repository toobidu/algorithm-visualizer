import { type PlainAdapter, type PlainProgram } from '../adapter';
import { instrumentBraces, NEWLINE, type BraceDialect } from '../instrumentBraces';

const dialect: BraceDialect = {
  comment: '//',
  declaration: [
    // `x := ...` và `var x = ...`
    /(?:^\s*|[;{]\s*)([A-Za-z_]\w*)\s*:=/g,
    /(?:^\s*|[;{]\s*)var\s+([A-Za-z_]\w*)\s*[\w[\]*]*\s*=/g,
  ],
  innerScoped: [
    // `for i := 0; ...` và `for i, v := range xs`
    /for\s+([A-Za-z_]\w*)\s*(?::=|,)/g,
    /for\s+[A-Za-z_]\w*\s*,\s*([A-Za-z_]\w*)\s*:=/g,
  ],
  // Chữ ký hàm: `func sort(arr []int, n int) {`
  params: /func\s+\w*\s*\(([^)]*)\)/,
  skipPrefixes: ['return', 'panic', 'import', 'package ', 'func ', 'type ', 'go ', 'defer '],
  emit: (line, names) => `AvStep(${String(line)}, ${names.map((n) => `"${n}", ${n}`).join(', ')})`,
};

export const goAdapter: PlainAdapter = {
  languageId: 'go',
  strategy: 'source-instrumentation',
  runtimeFile: 'av_plain.go',

  build(userCode, runtime): PlainProgram {
    const { lines } = instrumentBraces(userCode, dialect);
    // Go biên dịch mọi file `.go` gửi lên nên runtime đi thành file riêng —
    // nhờ vậy số dòng của người dùng không lệch chút nào.
    return {
      files: [
        { name: 'main.go', content: lines.join(NEWLINE) },
        { name: 'av_plain.go', content: runtime },
      ],
      lineOffset: 0,
    };
  },
};
