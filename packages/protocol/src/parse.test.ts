import { describe, expect, it } from 'vitest';
import { serializeCommand } from './command';
import { frame } from './framing';
import { parseStdout } from './parse';

const line = (key: string | null, method: string, args: unknown[] = []): string =>
  frame(JSON.stringify({ key, method, args }));

describe('parseStdout', () => {
  it('doc duoc mot trace day du', () => {
    const stdout = [
      line('arr', 'Array1DTracer', ['Mang']),
      line('log', 'LogTracer', ['Console']),
      line('lay', 'VerticalLayout', [['arr', 'log']]),
      line(null, 'setRoot', ['lay']),
      line('arr', 'set', [[5, 3, 8]]),
      line('arr', 'select', [0, 1]),
      line(null, 'delay', [42]),
    ].join('\n');

    const result = parseStdout(stdout);

    expect(result.issues).toEqual([]);
    expect(result.commands).toHaveLength(7);
    expect(result.commands[6]).toEqual({ key: null, method: 'delay', args: [42] });
  });

  it('tach output cua nguoi dung ra khoi luong lenh', () => {
    const stdout = [
      line('log', 'LogTracer'),
      'nguoi dung print o day',
      line(null, 'delay', [1]),
    ].join('\n');

    const result = parseStdout(stdout);

    expect(result.commands).toHaveLength(2);
    expect(result.userOutput).toBe('nguoi dung print o day');
  });

  it('dong JSON hong khong lam dung ca trace — §3.6', () => {
    const stdout = [
      line('arr', 'Array1DTracer'),
      frame('{khong phai json'),
      line(null, 'delay', [3]),
    ].join('\n');

    const result = parseStdout(stdout);

    expect(result.commands).toHaveLength(2);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.line).toBe(2);
  });

  it('bao loi kem so dong dung cho', () => {
    const stdout = [line('a', 'set'), line('a', 'khongTonTai'), line('a', 'set')].join('\n');

    const result = parseStdout(stdout);

    expect(result.issues[0]).toMatchObject({ line: 2 });
    expect(result.issues[0]?.message).toContain('khongTonTai');
  });

  it('tu choi lenh toan cuc khong hop le', () => {
    expect(parseStdout(line(null, 'setRoott', ['x'])).issues).toHaveLength(1);
  });

  it('tu choi setRoot sai so tham so', () => {
    expect(parseStdout(line(null, 'setRoot', [])).issues).toHaveLength(1);
  });

  it('tu choi khoi tao layout thieu danh sach con', () => {
    expect(parseStdout(line('lay', 'VerticalLayout', [])).issues).toHaveLength(1);
  });

  it('chap nhan khoi tao tracer khong co title', () => {
    expect(parseStdout(line('g', 'GraphTracer')).issues).toEqual([]);
  });

  it('tu choi method dung so tham so sai o moi lop', () => {
    expect(parseStdout(line('g', 'removeEdge', [1])).issues).toHaveLength(1);
  });

  it('chap nhan printf voi so tham so khong gioi han', () => {
    expect(parseStdout(line('log', 'printf', ['%d %d %d', 1, 2, 3])).issues).toEqual([]);
  });

  it('bo qua dong rong', () => {
    expect(parseStdout([line('a', 'set'), frame(''), line('a', 'set')].join('\n')).issues).toEqual(
      [],
    );
  });

  it('stdout rong cho ket qua rong', () => {
    expect(parseStdout('')).toEqual({ commands: [], issues: [], userOutput: '' });
  });

  it('lenh khu hoi duoc qua serializeCommand', () => {
    const original = { key: 'arr', method: 'patch', args: [0, 1, 1 / 3] } as const;

    const result = parseStdout(frame(serializeCommand(original)));

    expect(result.issues).toEqual([]);
    expect(result.commands[0]).toEqual(original);
  });
});

describe('parseStdout — hinh dang lenh sai', () => {
  it('tu choi dong khong phai object', () => {
    expect(parseStdout(frame('[1,2,3]')).issues).toHaveLength(1);
  });

  it('tu choi thieu truong args', () => {
    expect(parseStdout(frame('{"key":"a","method":"set"}')).issues).toHaveLength(1);
  });

  it('tu choi key la chuoi rong', () => {
    expect(parseStdout(frame('{"key":"","method":"set","args":[]}')).issues).toHaveLength(1);
  });

  it('tu choi khoi tao layout thua tham so', () => {
    expect(parseStdout(line('lay', 'HorizontalLayout', [['a'], 'thua'])).issues).toHaveLength(1);
  });
});
