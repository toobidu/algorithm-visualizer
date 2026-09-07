import { LANGUAGES } from '@av/config';
import { describe, expect, it } from 'vitest';
import { PLAIN_ADAPTERS, supportsPlainMode } from './registry';

/**
 * Giữ hai nguồn khai báo không trôi lệch nhau.
 *
 * `config/src/languages` nói ngôn ngữ nào hỗ trợ tự trực quan hóa (giao diện dựa vào đó),
 * còn `PLAIN_ADAPTERS` là thứ thật sự chạy được. Lệch nhau thì người dùng bấm Run rồi
 * nhận lỗi khó hiểu — nên chốt bằng test thay vì bằng kỷ luật.
 */
describe('khai báo ngôn ngữ khớp với adapter', () => {
  it('mọi adapter đều ứng với một ngôn ngữ đã khai báo', () => {
    const known = new Set(LANGUAGES.map((language) => language.id));
    for (const adapter of PLAIN_ADAPTERS) {
      expect(known.has(adapter.languageId)).toBe(true);
    }
  });

  it('ngôn ngữ khai báo hỗ trợ đầy đủ thì phải có adapter', () => {
    const declared = LANGUAGES.filter((l) => l.plainMode === 'full').map((l) => l.id);
    for (const id of declared) {
      expect(supportsPlainMode(id)).toBe(true);
    }
  });

  it('ngôn ngữ khai báo không hỗ trợ thì không được có adapter', () => {
    const declared = LANGUAGES.filter((l) => l.plainMode === 'none').map((l) => l.id);
    for (const id of declared) {
      expect(supportsPlainMode(id)).toBe(false);
    }
  });
});
