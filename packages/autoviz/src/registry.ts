import { type PlainAdapter } from './adapter';
import { goAdapter } from './adapters/go';
import { javaAdapter } from './adapters/java';
import { javascriptAdapter, typescriptAdapter } from './adapters/javascript';
import { phpAdapter } from './adapters/php';
import { pythonAdapter } from './adapters/python';
import { rubyAdapter } from './adapters/ruby';

/**
 * Danh mục adapter. Thêm ngôn ngữ mới chỉ cần thêm một dòng ở đây.
 *
 * Không sinh tự động: danh sách ngắn, và viết tay thì đọc code là biết ngay ngôn ngữ nào
 * được hỗ trợ mà không phải chạy gì.
 */
export const PLAIN_ADAPTERS: readonly PlainAdapter[] = [
  pythonAdapter,
  rubyAdapter,
  phpAdapter,
  javaAdapter,
  goAdapter,
  javascriptAdapter,
  typescriptAdapter,
];

export function findAdapter(languageId: string): PlainAdapter | undefined {
  return PLAIN_ADAPTERS.find((adapter) => adapter.languageId === languageId);
}

export function supportsPlainMode(languageId: string): boolean {
  return findAdapter(languageId) !== undefined;
}
