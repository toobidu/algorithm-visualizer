import { type LanguageConfig } from '@av/config';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');

/**
 * Đọc thư viện tracer từ đĩa, có nhớ tạm theo thời gian sửa file.
 *
 * Nhớ tạm vì mỗi request đều cần nội dung này. Nhưng phải đối chiếu `mtime`: nhớ vĩnh viễn
 * thì sửa thư viện tracer không có tác dụng cho tới khi khởi động lại gateway — một cái
 * bẫy tốn thời gian mà không để lại dấu vết nào.
 */
const cache = new Map<string, { source: string; mtimeMs: number }>();

export class TracerNotFound extends Error {
  constructor(language: LanguageConfig) {
    super(`Chưa có thư viện tracer cho ${language.name} (tracers/${language.id}/)`);
    this.name = 'TracerNotFound';
  }
}

export function readTracerSource(language: LanguageConfig): string {
  const path = join(REPO_ROOT, 'tracers', language.id, language.tracerFileName);

  let mtimeMs: number;
  try {
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    throw new TracerNotFound(language);
  }

  const cached = cache.get(language.id);
  if (cached?.mtimeMs === mtimeMs) return cached.source;

  const source = readFileSync(path, 'utf8');
  cache.set(language.id, { source, mtimeMs });
  return source;
}

/** Ngôn ngữ đã có thư viện tracer, dùng để giao diện biết cái nào bấm Run được. */
export function hasTracer(language: LanguageConfig): boolean {
  try {
    readTracerSource(language);
    return true;
  } catch {
    return false;
  }
}
