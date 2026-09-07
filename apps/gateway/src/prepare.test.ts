import { languageById } from '@av/config';
import { type Command } from '@av/protocol';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { prepareJob, rebaseLineNumbers, toAsciiSource } from './prepare';

const NEWLINE = String.fromCharCode(10);

const python = languageById('python');
const cpp = languageById('cpp');
const java = languageById('java');

describe('toAsciiSource', () => {
  it('đổi ký tự có dấu thành escape ASCII', () => {
    // javac đọc mã nguồn bằng bảng mã nền tảng; gửi chữ có dấu thẳng là hỏng chuỗi hằng
    expect(toAsciiSource('Mảng')).toBe('M\\u1ea3ng');
    expect(toAsciiSource('Kết quả')).toBe('K\\u1ebft qu\\u1ea3');
  });

  it('không đụng vào ASCII và không đổi số dòng', () => {
    const source = ['class Main {', '  int x = 1;', '}'].join(NEWLINE);

    expect(toAsciiSource(source)).toBe(source);
    expect(toAsciiSource('aéb').split(NEWLINE)).toHaveLength(1);
  });
});

describe('prepareJob — Java nối thư viện xuống cuối', () => {
  it('code người dùng đứng TRƯỚC: Piston chạy class đầu tiên trong file', () => {
    expect(java).toBeDefined();
    if (java === undefined) return;

    const user = 'public class Main { public static void main(String[] a) {} }';
    const job = prepareJob(java, user, 'final class Av {}');

    expect(job.files).toHaveLength(1);
    expect(job.files[0]?.content.startsWith(user)).toBe(true);
    expect(job.files[0]?.content).toContain('final class Av {}');
  });

  it('không lệch số dòng vì không chèn gì lên trên', () => {
    if (java === undefined) return;
    const user = ['a', 'b', 'c'].join(NEWLINE);
    expect(prepareJob(java, user, ['X', 'Y'].join(NEWLINE)).lineOffset).toBe(0);
  });

  it('thư viện Java thật không chứa câu import nào', () => {
    const source = readFileSync('tracers/java/AlgorithmVisualizer.java', 'utf8');
    const importLines = source.split(NEWLINE).filter((line) => /^\s*import\s/.test(line));
    expect(importLines).toEqual([]);
  });

  it('thư viện Java thật không chứa dấu gạch chéo ngược literal nào', () => {
    const source = readFileSync('tracers/java/AlgorithmVisualizer.java', 'utf8');
    expect(source.includes(String.fromCharCode(92))).toBe(false);
  });

  it('không class nào trong thư viện Java là public — suất đó của người dùng', () => {
    const source = readFileSync('tracers/java/AlgorithmVisualizer.java', 'utf8');
    expect(/^\s*public\s+(final\s+|abstract\s+)?class\s/m.test(source)).toBe(false);
  });
});

describe('prepareJob', () => {
  it('ngôn ngữ gửi kèm được thì tách thành hai file, không lệch dòng', () => {
    expect(python).toBeDefined();
    if (python === undefined) return;

    const job = prepareJob(python, 'print(1)', '# tracer');

    expect(job.files).toHaveLength(2);
    expect(job.lineOffset).toBe(0);
    expect(job.files[0]?.content).toBe('print(1)');
  });

  it('C++ nhúng thư viện thay cho dòng include', () => {
    expect(cpp).toBeDefined();
    if (cpp === undefined) return;

    const user = ['#include "algorithm-visualizer.h"', 'int main() { return 0; }'].join('\n');
    const job = prepareJob(cpp, user, 'A\nB\nC');

    expect(job.files).toHaveLength(1);
    expect(job.files[0]?.content).toBe('A\nB\nC\nint main() { return 0; }');
    // Ba dong thu vien thay cho mot dong include
    expect(job.lineOffset).toBe(2);
  });

  it('xoá dòng include thì thư viện vẫn được chèn lên đầu', () => {
    if (cpp === undefined) return;

    const job = prepareJob(cpp, 'int main() { return 0; }', 'A\nB');

    expect(job.files[0]?.content).toBe('A\nB\nint main() { return 0; }');
    expect(job.lineOffset).toBe(2);
  });
});

describe('rebaseLineNumbers', () => {
  const delay = (line: number): Command => ({ key: null, method: 'delay', args: [line] });
  const other: Command = { key: 'a', method: 'select', args: [1] };

  it('offset 0 trả về đúng mảng cũ', () => {
    const commands = [delay(5), other];
    expect(rebaseLineNumbers(commands, 0)).toBe(commands);
  });

  it('trừ offset khỏi số dòng của lệnh delay', () => {
    expect(rebaseLineNumbers([delay(105)], 100)).toEqual([delay(5)]);
  });

  it('không đụng tới lệnh khác delay', () => {
    expect(rebaseLineNumbers([other], 100)).toEqual([other]);
  });

  it('không cho số dòng âm', () => {
    expect(rebaseLineNumbers([delay(3)], 100)).toEqual([delay(0)]);
  });

  it('delay không mang số dòng thì bỏ qua', () => {
    const weird: Command = { key: null, method: 'delay', args: [] };
    expect(rebaseLineNumbers([weird], 100)).toEqual([weird]);
  });
});
