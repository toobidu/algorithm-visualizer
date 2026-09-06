import { describe, expect, it } from 'vitest';
import { LogTracer, MarkdownTracer } from './log';

const log = (): LogTracer => new LogTracer('log', 'Console');

describe('LogTracer', () => {
  it('print noi tiep, println them xuong dong', () => {
    const t = log();
    t.print('a');
    t.println('b');

    expect(t.log).toBe('ab\n');
  });

  it('set thay toan bo noi dung', () => {
    const t = log();
    t.print('cu');
    t.set('moi');

    expect(t.log).toBe('moi');
  });

  it('reset xoa sach', () => {
    const t = log();
    t.print('x');
    t.reset();

    expect(t.log).toBe('');
  });

  it('gia tri khong phai chuoi di qua toDisplayString', () => {
    const t = log();
    t.println(true);
    t.println(1 / 3);

    expect(t.log).toBe('T\n0.333\n');
  });

  it('log la VAN BAN THUAN, khong dien giai HTML', () => {
    const t = log();
    t.print('<script>alert(1)</script>');

    expect(t.log).toBe('<script>alert(1)</script>');
  });
});

describe('LogTracer.printf', () => {
  it.each([
    ['%s xin chao', ['ban'], 'ban xin chao'],
    ['%d con vit', [3.9], '3 con vit'],
    ['%i so nguyen', [-2.7], '-2 so nguyen'],
    ['%f so thuc', [1.5], '1.5 so thuc'],
    ['%.2f lam tron', [1 / 3], '0.33 lam tron'],
    ['100%% xong', [], '100% xong'],
    ['%s va %s', ['a', 'b'], 'a va b'],
  ])('%s', (format, args, expected) => {
    const t = log();
    t.printf(format, ...args);

    expect(t.log).toBe(expected);
  });

  it('thieu tham so khong lam vo dinh dang', () => {
    const t = log();
    t.printf('%s %s', 'chi-mot');

    expect(t.log).toBe('chi-mot ');
  });

  // Python và Java ném lỗi o trường hợp này; ta chon in nguyên văn để một định dạng sai
  // không làm dùng cả trực quan hóa. Thư viện tracer 18 ngôn ngữ phải theo cũng quy uoc.
  it('%d voi gia tri khong doi duoc sang so thi in nguyen van', () => {
    const t = log();
    t.printf('%d', 'abc');

    expect(t.log).toBe('abc');
  });
});

describe('MarkdownTracer', () => {
  it('set va reset hoat dong', () => {
    const t = new MarkdownTracer('md', 'Markdown');
    t.set('# Tieu de');
    expect(t.markdown).toBe('# Tieu de');

    t.reset();
    expect(t.markdown).toBe('');
  });

  it('clone doc lap', () => {
    const t = new MarkdownTracer('md', 'Markdown');
    t.set('a');
    const copy = t.clone();
    t.set('b');

    expect(copy.markdown).toBe('a');
  });
});
