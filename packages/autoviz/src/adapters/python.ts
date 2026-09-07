import { type PlainAdapter, type PlainProgram } from '../adapter';
import { NEWLINE } from '../instrumentBraces';

export const pythonAdapter: PlainAdapter = {
  languageId: 'python',
  strategy: 'runtime-hook',
  runtimeFile: 'av_plain.py',

  build(userCode, runtime): PlainProgram {
    // `sys.settrace` thấy mọi dòng và mọi biến cục bộ nên KHÔNG sửa code người dùng.
    // Chỉ bọc bằng try/finally để chắc chắn tắt hook kể cả khi có ngoại lệ.
    const body = userCode.split(NEWLINE).map((line) => (line === '' ? '' : `    ${line}`));
    const wrapped = [
      'import av_plain',
      'av_plain.start()',
      'try:',
      ...body,
      'finally:',
      '    av_plain.stop()',
    ];
    return {
      files: [
        { name: 'main.py', content: wrapped.join(NEWLINE) },
        { name: 'av_plain.py', content: runtime },
      ],
      // Ba dòng đứng trước code người dùng
      lineOffset: 3,
    };
  },
};
