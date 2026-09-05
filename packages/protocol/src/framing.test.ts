import { describe, expect, it } from 'vitest';
import { classifyLine, COMMAND_PREFIX, frame, splitStream } from './framing';

describe('framing', () => {
  it('tien to bat dau bang U+001E', () => {
    expect(COMMAND_PREFIX.charCodeAt(0)).toBe(0x1e);
  });

  it('classifyLine nhan ra dong lenh va tra ve phan payload', () => {
    expect(classifyLine(frame('{"key":null}'))).toEqual({
      kind: 'command',
      text: '{"key":null}',
    });
  });

  it('classifyLine giu nguyen dong stdout thuong', () => {
    expect(classifyLine('hello')).toEqual({ kind: 'stdout', text: 'hello' });
  });

  it('dong trong giong JSON nhung khong co tien to van la stdout', () => {
    expect(classifyLine('{"key":null}').kind).toBe('stdout');
  });

  it('splitStream tach hai luong khi nguoi dung co print xen giua', () => {
    const stdout = [frame('a'), 'debug 1', frame('b'), 'debug 2'].join('\n');

    expect(splitStream(stdout)).toEqual({
      commandLines: ['a', 'b'],
      userOutput: 'debug 1\ndebug 2',
    });
  });

  it('splitStream giu dong rong o giua output nguoi dung', () => {
    expect(splitStream('mot\n\nhai\n').userOutput).toBe('mot\n\nhai');
  });

  it('splitStream tra ve rong khi khong co gi', () => {
    expect(splitStream('')).toEqual({ commandLines: [], userOutput: '' });
  });

  it('payload chua ky tu giong tien to khong lam vo viec tach', () => {
    const payload = `{"text":"${COMMAND_PREFIX}gia mao"}`;

    expect(splitStream(frame(payload)).commandLines).toEqual([payload]);
  });
});
