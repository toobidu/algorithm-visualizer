import { type PlainAdapter, type PlainProgram } from '../adapter';
import { NEWLINE } from '../instrumentBraces';

export const phpAdapter: PlainAdapter = {
  languageId: 'php',
  strategy: 'runtime-hook',
  runtimeFile: 'av_plain.php',

  build(userCode, runtime): PlainProgram {
    // `declare(ticks=1)` phải là câu lệnh ĐẦU TIÊN của file và chỉ có tác dụng với code
    // nằm sau nó trong CÙNG file — nên runtime buộc phải nhúng lên đầu, không gửi kèm được.
    const body = userCode.replace(/^\s*<\?php\s*/i, '').replace(/\?>\s*$/i, '');
    const runtimeLines = runtime.split(NEWLINE);
    return {
      files: [
        { name: 'main.php', content: [...runtimeLines, ...body.split(NEWLINE)].join(NEWLINE) },
      ],
      lineOffset: runtimeLines.length,
    };
  },
};
