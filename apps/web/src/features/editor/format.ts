import { LANGUAGES } from '@av/config';
import type { Plugin } from 'prettier';
import { indentBraces } from './braceIndent';

/**
 * Định dạng code chạy hoàn toàn trong trình duyệt — không có vòng gọi ra server.
 *
 * Ba mức, chất lượng giảm dần:
 *   1. Prettier thật cho JS/TS/Markdown/JSON.
 *   2. Prettier + `prettier-plugin-java` cho Java: cũng là ngắt dòng theo AST, chỉ khác là
 *      plugin nạp muộn vì nó kéo theo parser tree-sitter dạng wasm.
 *   3. Chuẩn hoá thụt lề cho các ngôn ngữ ngoặc nhọn còn lại. Không đủ gọi là "format" như
 *      Prettier, nhưng đúng thứ người dùng cần nhất sau khi dán code từ chỗ khác vào.
 *
 * Ngôn ngữ theo thụt lề (Python, Ruby, Elixir, Erlang, Racket) không có mức nào cả: sửa
 * thụt lề của chúng là SỬA NGỮ NGHĨA, đoán sai một dòng là đổi luôn ý nghĩa chương trình.
 */

const PRETTIER_PARSERS: Record<string, string> = {
  javascript: 'babel',
  typescript: 'typescript',
  markdown: 'markdown',
  json: 'json',
};

/** Ngôn ngữ dùng ngoặc nhọn, chỉ chuẩn hoá được thụt lề. */
const INDENT_ONLY: ReadonlySet<string> = new Set([
  'cpp',
  'csharp',
  'dart',
  'go',
  'kotlin',
  'php',
  'rust',
  'scala',
  'swift',
]);

const JAVA = 'java';

type FormatterQuality = 'full' | 'indent';

export function formatterQuality(languageId: string): FormatterQuality | undefined {
  if (languageId === JAVA || languageId in PRETTIER_PARSERS) return 'full';
  return INDENT_ONLY.has(languageId) ? 'indent' : undefined;
}

export function hasFormatter(languageId: string): boolean {
  return formatterQuality(languageId) !== undefined;
}

/** Mọi ngôn ngữ định dạng được, dùng cho bảng phím tắt và cho lời báo khi thiếu formatter. */
export const FORMATTABLE_LANGUAGES: readonly string[] = [
  ...Object.keys(PRETTIER_PARSERS),
  JAVA,
  ...INDENT_ONLY,
];

/** Mode Monaco không phải ngôn ngữ lập trình nên không có trong `@av/config`. */
const EXTRA_NAMES: Record<string, string> = { markdown: 'Markdown', json: 'JSON' };

/** Tên hiển thị của một mode Monaco, ví dụ `csharp` -> `C#`. */
export function displayName(languageId: string): string {
  const language = LANGUAGES.find((item) => item.monacoId === languageId);
  return language?.name ?? EXTRA_NAMES[languageId] ?? languageId;
}

async function formatWithPrettier(text: string, parser: string, tabWidth: number): Promise<string> {
  // Nạp muộn, và chỉ nạp plugin của ĐÚNG ngôn ngữ đó: kéo cả bộ là tải thêm hàng trăm KB
  // gzip mà không dùng tới
  const [standalone, plugins] = await Promise.all([
    import('prettier/standalone'),
    loadPrettierPlugins(parser),
  ]);

  return standalone.format(text, {
    parser,
    plugins,
    tabWidth,
    printWidth: 100,
    singleQuote: parser === 'babel' || parser === 'typescript',
  });
}

async function loadPrettierPlugins(parser: string): Promise<Plugin[]> {
  if (parser === 'markdown') return [(await import('prettier/plugins/markdown')).default];
  if (parser === 'java') return [(await import('prettier-plugin-java')).default as Plugin];

  const estree = await import('prettier/plugins/estree');
  const syntax =
    parser === 'typescript'
      ? await import('prettier/plugins/typescript')
      : await import('prettier/plugins/babel');
  return [estree, syntax];
}

interface FormatOptions {
  readonly tabSize: number;
  readonly insertSpaces: boolean;
}

export async function formatSource(
  languageId: string,
  text: string,
  options: FormatOptions,
): Promise<string> {
  if (languageId === JAVA) return formatWithPrettier(text, 'java', options.tabSize);

  const parser = PRETTIER_PARSERS[languageId];
  if (parser !== undefined) return formatWithPrettier(text, parser, options.tabSize);

  if (INDENT_ONLY.has(languageId)) {
    return indentBraces(text, {
      indent: options.insertSpaces ? ' '.repeat(options.tabSize) : '\t',
    });
  }

  throw new Error(`Chưa có trình định dạng cho ${displayName(languageId)}`);
}
