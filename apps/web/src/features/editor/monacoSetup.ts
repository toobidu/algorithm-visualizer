/**
 * Nạp Monaco có chọn lọc — ngân sách PLAN.md §4.1 (chunk Monaco <= 900 KB gzip).
 *
 * `import 'monaco-editor'` kéo theo cả dịch vụ ngôn ngữ TypeScript (nguyên trình biên dịch,
 * vài MB) và khoảng 80 ngôn ngữ có sẵn. Ứng dụng này không cần kiểm lỗi hay gợi ý theo kiểu,
 * nên dùng `edcore.main` rồi tự thêm 17 ngôn ngữ cần thiết.
 *
 * `edcore.main` kéo `editor.all.js`, tức ĐÃ CÓ sẵn toàn bộ contrib biên tập: folding,
 * find, comment, multicursor, linesOperations, format… Nên không cần import riêng cái nào
 * — thứ THIẾU là provider cho chúng, ví dụ lệnh format không làm gì cho tới khi có
 * `registerDocumentFormattingEditProvider` bên dưới.
 */
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import { FORMATTABLE_LANGUAGES, displayName, formatSource } from './format';

/**
 * Monaco cần một web worker cho các phép tính trên model — gợi ý theo từ, so khớp dải,
 * sửa kèm thẻ đóng mở.
 *
 * Không khai báo thì nó không báo lỗi mà ÂM THẦM chạy phần đó trên luồng chính, kèm
 * cảnh báo "Could not create web worker(s)" — file lớn là giao diện đứng hình.
 * `?worker` là cú pháp của Vite: nó đóng gói thành chunk worker riêng.
 */
self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution';
import 'monaco-editor/esm/vs/basic-languages/dart/dart.contribution';
import 'monaco-editor/esm/vs/basic-languages/elixir/elixir.contribution';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution';
import 'monaco-editor/esm/vs/basic-languages/scala/scala.contribution';
import 'monaco-editor/esm/vs/basic-languages/scheme/scheme.contribution';
import 'monaco-editor/esm/vs/basic-languages/swift/swift.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';

/**
 * Erlang không có trong bỏ ngôn ngữ có ban của Monaco. Định nghĩa tối thiểu du để
 * tô màu và để tính năng tự gấp nhận ra comment `%`.
 */
monaco.languages.register({ id: 'erlang' });
monaco.languages.setMonarchTokensProvider('erlang', {
  tokenizer: {
    root: [
      [/%.*$/, 'comment'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/\b(case|of|end|fun|if|receive|after|try|catch|when|begin)\b/, 'keyword'],
      [/[A-Z][\w@]*/, 'variable'],
      [/\d+/, 'number'],
    ],
  },
});
monaco.languages.setLanguageConfiguration('erlang', {
  comments: { lineComment: '%' },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
});

/**
 * Cho phép gấp khối `// trực quan hóa {` … `// }` — hành vi ngầm #17.
 *
 * Monaco chỉ gấp theo ngoặc thật và theo thụt lề; dấu `{` nằm trong comment không được
 * tính là ngoặc, nên nếu không có provider này thì lệnh gấp không tìm ra vùng nào.
 * Đăng ký provider là cách BỔ SUNG, không ghi đè cấu hình sẵn có của ngôn ngữ.
 */
export function registerCommentFolding(languageId: string, commentPrefix: string): void {
  monaco.languages.registerFoldingRangeProvider(languageId, {
    provideFoldingRanges(model) {
      const ranges: monaco.languages.FoldingRange[] = [];
      const open: number[] = [];

      for (let line = 1; line <= model.getLineCount(); line += 1) {
        const trimmed = model.getLineContent(line).trim();
        if (!trimmed.startsWith(commentPrefix)) continue;

        const body = trimmed.slice(commentPrefix.length).trim();
        if (body.endsWith('{') && body.length > 1) {
          open.push(line);
        } else if (body === '}') {
          const start = open.pop();
          // Khối một dòng không đáng gấp
          if (start !== undefined && line > start + 1) {
            // Không đặt `kind`: nó là tuỳ chọn, và bản Monaco rút gọn có thể
            // không xuất `FoldingRangeKind`, khiến provider ném lỗi im lặng
            ranges.push({ start, end: line });
          }
        }
      }
      return ranges;
    },
  });
}

/**
 * Nối bộ định dạng ở `format.ts` vào Monaco.
 *
 * Monaco không kèm formatter nào: các bản `basic-languages/*` chỉ có tokenizer tô màu, nên
 * lệnh format không làm gì cho tới khi có `registerDocumentFormattingEditProvider` dưới đây.
 */
let formattersRegistered = false;

/**
 * Lỗi cú pháp của người dùng phải nói ra được.
 *
 * Provider của Monaco không có đường nào chạm tới giao diện: nó ném lỗi thì Monaco nuốt
 * gọn vào console, người dùng bấm phím tắt và thấy KHÔNG có gì xảy ra.
 */
let formatErrorSink: (message: string) => void = () => undefined;

export function setFormatErrorSink(sink: (message: string) => void): void {
  formatErrorSink = sink;
}

export function registerFormatters(): void {
  if (formattersRegistered) return;
  formattersRegistered = true;

  for (const languageId of FORMATTABLE_LANGUAGES) {
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      async provideDocumentFormattingEdits(model, options) {
        try {
          const text = await formatSource(languageId, model.getValue(), {
            tabSize: options.tabSize,
            insertSpaces: options.insertSpaces,
          });
          return [{ range: model.getFullModelRange(), text }];
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const firstLine = message.split(/\r?\n/)[0] ?? '';
          formatErrorSink(`Không định dạng được ${displayName(languageId)}: ${firstLine}`);
          return [];
        }
      },
    });
  }
}

export { monaco };
