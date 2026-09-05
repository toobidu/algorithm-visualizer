import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderTracerApiMarkdown } from './docs';
import { METHODS, TRACER_CLASSES } from './registry';

const PATH = 'docs/tracer-api.md';

describe('docs/tracer-api.md — Task 0.3.7', () => {
  /**
   * Tài liệu API là thứ SINH RA từ registry, không phải viết tay.
   *
   * Lệch thì test tự ghi lại file rồi báo đỏ: chạy lại là xanh, và bản chạy trên CI
   * vẫn đỏ nếu người sửa registry quên commit tài liệu. Chỉ ghi mà không báo đỏ thì
   * CI sẽ im lặng "sửa hộ" và tài liệu trong repo mãi mãi cũ.
   */
  it('khớp với registry, không được sửa tay', () => {
    const expected = renderTracerApiMarkdown();
    const actual = existsSync(PATH) ? readFileSync(PATH, 'utf8') : '';

    if (actual !== expected) {
      writeFileSync(PATH, expected, 'utf8');
      expect.fail(`${PATH} đã lệch với registry. File vừa được sinh lại — hãy commit nó.`);
    }
  });

  it('có mặt đủ mọi lớp tracer', () => {
    const rendered = renderTracerApiMarkdown();
    for (const name of TRACER_CLASSES) expect(rendered).toContain(`### ${name}`);
  });

  it('có mặt đủ mọi method của một lớp bất kỳ', () => {
    const rendered = renderTracerApiMarkdown();
    for (const name of Object.keys(METHODS.GraphTracer)) {
      expect(rendered).toContain(`\`${name}\``);
    }
  });
});
