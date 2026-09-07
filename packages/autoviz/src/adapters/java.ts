import { type PlainAdapter, type PlainProgram } from '../adapter';
import { instrumentBraces, NEWLINE, type BraceDialect } from '../instrumentBraces';

const TYPE =
  '(?:int|long|double|float|char|boolean|short|byte|String|var|Integer|Double|Boolean|Long)';

const dialect: BraceDialect = {
  comment: '//',
  declaration: [
    new RegExp(
      String.raw`(?:^\s*|[;{(]\s*)(?:final\s+)?${TYPE}(?:\s*\[\s*\])*\s+([A-Za-z_]\w*)\s*[=;:]`,
      'g',
    ),
  ],
  innerScoped: [
    new RegExp(String.raw`for\s*\(\s*(?:final\s+)?${TYPE}(?:\s*\[\s*\])*\s+([A-Za-z_]\w*)`, 'g'),
  ],
  // Chữ ký phương thức: `public int bruteForce(int[] prices)`
  params: /\w+\s*\(([^)]*)\)\s*\{/,
  // Chèn sau `return` thì mã không bao giờ chạy tới; sau khai báo class thì sai cú pháp
  skipPrefixes: ['return', 'throw', 'import ', 'package ', 'class ', 'public class'],
  emit: (line, names) =>
    `AvTrace.step(${String(line)}, ${names.map((n) => `"${n}", ${n}`).join(', ')});`,
};

export const javaAdapter: PlainAdapter = {
  languageId: 'java',
  strategy: 'source-instrumentation',
  runtimeFile: 'AvTrace.java',

  build(userCode, runtime): PlainProgram {
    const { lines } = instrumentBraces(userCode, dialect);
    // Runtime đặt SAU code người dùng: Java single-file chạy class ĐẦU TIÊN trong file.
    // Đổi lại runtime không được có câu lệnh `import` — Java bắt import đứng trước mọi class.
    return {
      files: [
        { name: 'Main.java', content: [...lines, '', ...runtime.split(NEWLINE)].join(NEWLINE) },
      ],
      lineOffset: 0,
    };
  },
};
