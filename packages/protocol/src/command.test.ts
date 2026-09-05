import { describe, expect, it } from 'vitest';
import { isDelay, isSetRoot, serializeCommand } from './command';

describe('nhan dien lenh toan cuc', () => {
  it('isSetRoot chi dung voi key null va method setRoot', () => {
    expect(isSetRoot({ key: null, method: 'setRoot', args: ['lay'] })).toBe(true);
    expect(isSetRoot({ key: 'a', method: 'setRoot', args: ['lay'] })).toBe(false);
    expect(isSetRoot({ key: null, method: 'delay', args: [1] })).toBe(false);
  });

  it('isDelay chi dung voi key null va method delay', () => {
    expect(isDelay({ key: null, method: 'delay', args: [1] })).toBe(true);
    expect(isDelay({ key: 'a', method: 'delay', args: [1] })).toBe(false);
  });
});

describe('serializeCommand', () => {
  it('ghi thu tu khoa co dinh key, method, args', () => {
    expect(serializeCommand({ key: 'arr', method: 'select', args: [0, 1] })).toBe(
      '{"key":"arr","method":"select","args":[0,1]}',
    );
  });

  it('key null ghi ra null khong phai chuoi', () => {
    expect(serializeCommand({ key: null, method: 'delay', args: [7] })).toBe(
      '{"key":null,"method":"delay","args":[7]}',
    );
  });

  it('so khong huu han trong args duoc boc theo quy tac 3', () => {
    expect(serializeCommand({ key: 'a', method: 'set', args: [[Number.NaN]] })).toBe(
      '{"key":"a","method":"set","args":[[{"$num":"NaN"}]]}',
    );
  });
});
