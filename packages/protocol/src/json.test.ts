import { describe, expect, it } from 'vitest';
import {
  decodeNumber,
  encodeNumber,
  isNonFiniteNumber,
  isSafeForProtocol,
  type JsonValue,
  SAFE_INTEGER_LIMIT,
  serializeJson,
  serializeNumber,
} from './json';

describe('serializeNumber — cac gia tri bay o §3.5 quy tac 2', () => {
  it.each([
    [0.1, '0.1'],
    [1 / 3, '0.3333333333333333'],
    [1e21, '1e+21'],
    [1e-7, '1e-7'],
    [0, '0'],
    [-1.5, '-1.5'],
    [SAFE_INTEGER_LIMIT, '9007199254740991'],
  ])('%p -> %s', (input, expected) => {
    expect(serializeNumber(input)).toBe(expected);
  });

  it('phan biet -0 voi 0', () => {
    expect(serializeNumber(-0)).toBe('-0');
    expect(serializeNumber(0)).toBe('0');
  });

  it('moi so huu han deu khu hoi duoc', () => {
    for (const value of [0.1, 1 / 3, 1e21, 1e-7, 123.456, -98765.4321]) {
      expect(Number(serializeNumber(value))).toBe(value);
    }
  });
});

describe('gioi han so nguyen an toan — cam bay tuan thu da ngon ngu', () => {
  it('nhan so nguyen trong khoang +-2^53', () => {
    expect(isSafeForProtocol(SAFE_INTEGER_LIMIT)).toBe(true);
    expect(isSafeForProtocol(-SAFE_INTEGER_LIMIT)).toBe(true);
  });

  it('tu choi so nguyen vuot 2^53', () => {
    expect(isSafeForProtocol(SAFE_INTEGER_LIMIT + 2)).toBe(false);
  });

  it('so nho co phan le khong bi chan', () => {
    expect(isSafeForProtocol(0.1)).toBe(true);
    expect(isSafeForProtocol(-123.456)).toBe(true);
  });

  it('so khong huu han di theo quy tac 3, khong phai quy tac nay', () => {
    expect(isSafeForProtocol(Number.POSITIVE_INFINITY)).toBe(true);
    expect(isSafeForProtocol(Number.NaN)).toBe(true);
  });

  // 1e300 là so NGUYEN theo Number.isInteger nhưng không chính xác; Python int 10^300 thì chính xác.
  it('so nguyen rat lon bi chan du duoc viet duoi dang mu', () => {
    expect(isSafeForProtocol(1e300)).toBe(false);
  });

  // Lý do giới hạn tồn tại: hai số nguyên toán học khác nhau thu về cùng một giá trị JS,
  // trong khi Python int và Java long giữ được cả hai. Không chan thì bỏ tuân thủ sẽ đó.
  it('chung minh JS mat chinh xac ngoai khoang an toan', () => {
    // Viết dưới dang chuỗi vi literal này bi eslint no-loss-of-precision chan — dùng chuc nang
    expect(Number('9007199254740993')).toBe(9007199254740992);
    expect(serializeNumber(SAFE_INTEGER_LIMIT + 2)).toBe('9007199254740992');
  });
});

describe('so khong huu han — §3.5 quy tac 3', () => {
  it.each([
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
    [Number.NEGATIVE_INFINITY, '-Infinity'],
  ])('%p ma hoa thanh nhan %s', (input, tag) => {
    expect(encodeNumber(input)).toEqual({ $num: tag });
  });

  it('so huu han khong bi boc', () => {
    expect(encodeNumber(42)).toBe(42);
  });

  it('giai ma tra ve dung gia tri goc', () => {
    expect(decodeNumber({ $num: 'NaN' })).toBeNaN();
    expect(decodeNumber({ $num: 'Infinity' })).toBe(Number.POSITIVE_INFINITY);
    expect(decodeNumber({ $num: '-Infinity' })).toBe(Number.NEGATIVE_INFINITY);
    expect(decodeNumber(7)).toBe(7);
  });

  it('chuoi "NaN" cua nguoi dung khong bi nham la so', () => {
    expect(isNonFiniteNumber('NaN')).toBe(false);
    expect(isNonFiniteNumber({ $num: 'khong phai nhan' })).toBe(false);
    expect(isNonFiniteNumber(null)).toBe(false);
    expect(isNonFiniteNumber([1, 2])).toBe(false);
  });
});

describe('serializeJson', () => {
  it('ghi ra thu tu khoa dung nhu thu tu chen', () => {
    const value: JsonValue = { b: 1, a: 2 };

    expect(serializeJson(value)).toBe('{"b":1,"a":2}');
  });

  it('xu ly cau truc long nhau', () => {
    expect(serializeJson([1, 'hai', true, null, [3]])).toBe('[1,"hai",true,null,[3]]');
  });

  it('escape chuoi theo dung chuan JSON', () => {
    expect(serializeJson('co "nhay" va \\ va \n')).toBe('"co \\"nhay\\" va \\\\ va \\n"');
  });

  it('so trong cau truc dung bieu dien ngan nhat', () => {
    expect(serializeJson([1 / 3])).toBe('[0.3333333333333333]');
  });
});

describe('serializeNumber voi so khong huu han', () => {
  it.each([
    [Number.NaN, '{"$num":"NaN"}'],
    [Number.POSITIVE_INFINITY, '{"$num":"Infinity"}'],
    [Number.NEGATIVE_INFINITY, '{"$num":"-Infinity"}'],
  ])('%p -> %s', (input, expected) => {
    expect(serializeNumber(input)).toBe(expected);
  });
});
