import { type PlainAdapter, type PlainProgram } from '../adapter';
import { NEWLINE } from '../instrumentBraces';

export const rubyAdapter: PlainAdapter = {
  languageId: 'ruby',
  strategy: 'runtime-hook',
  runtimeFile: 'av_plain.rb',

  build(userCode, runtime): PlainProgram {
    // `TracePoint` là hook sạch nhất trong cả nhóm: không sửa một ký tự nào của người dùng.
    // Ruby không có đường nạp file kèm đáng tin trên Piston nên nhúng runtime lên đầu.
    const runtimeLines = runtime.split(NEWLINE);
    const source = [
      ...runtimeLines,
      'AvPlain.start',
      'begin',
      ...indent(userCode),
      'ensure',
      '  AvPlain.stop',
      'end',
    ];
    return {
      files: [{ name: 'main.rb', content: source.join(NEWLINE) }],
      lineOffset: runtimeLines.length + 2,
    };
  },
};

function indent(code: string): string[] {
  return code.split(NEWLINE).map((line) => (line === '' ? '' : `  ${line}`));
}
