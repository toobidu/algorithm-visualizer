import { describe, expect, it } from 'vitest';
import { indentBraces } from './braceIndent';

const format = (source: string, indent = '  '): string => indentBraces(source, { indent });

describe('indentBraces', () => {
  it('cang lai code Java bi lech het thut le', () => {
    const source = [
      'class Main {',
      'public static void main(String[] a) {',
      'int x = 1;',
      '}',
      '}',
    ];

    expect(format(source.join('\n'))).toBe(
      [
        'class Main {',
        '  public static void main(String[] a) {',
        '    int x = 1;',
        '  }',
        '}\n',
      ].join('\n'),
    );
  });

  it('bo qua ngoac nam trong chuoi', () => {
    const source = ['void f() {', 'print("}");', 'print("{");', '}'].join('\n');

    expect(format(source)).toBe(['void f() {', '  print("}");', '  print("{");', '}\n'].join('\n'));
  });

  it('bo qua ngoac nam trong comment', () => {
    const source = ['void f() {', '// mo khoi {', '/* dong khoi } */', 'int x = 1;', '}'].join(
      '\n',
    );

    expect(format(source)).toBe(
      ['void f() {', '  // mo khoi {', '  /* dong khoi } */', '  int x = 1;', '}\n'].join('\n'),
    );
  });

  it('dat nhan case nong hon than mot cap', () => {
    const source = [
      'void f() {',
      'switch (x) {',
      'case 1:',
      'a();',
      'break;',
      'default:',
      'b();',
      '}',
      'c();',
      '}',
    ].join('\n');

    expect(format(source)).toBe(
      [
        'void f() {',
        '  switch (x) {',
        '    case 1:',
        '      a();',
        '      break;',
        '    default:',
        '      b();',
        '  }',
        '  c();',
        '}\n',
      ].join('\n'),
    );
  });

  it('cang dong tiep cua block comment theo dau sao', () => {
    const source = ['class A {', '/**', '* mo ta', '*/', 'void f() {}', '}'].join('\n');

    expect(format(source)).toBe(
      ['class A {', '  /**', '   * mo ta', '   */', '  void f() {}', '}\n'].join('\n'),
    );
  });

  it('khong coi lifetime cua Rust la chuoi', () => {
    const source = ["impl<'a> Foo<'a> {", 'fn f(&self) {', 'g();', '}', '}'].join('\n');

    expect(format(source)).toBe(
      ["impl<'a> Foo<'a> {", '  fn f(&self) {', '    g();', '  }', '}\n'].join('\n'),
    );
  });

  it('giu nguyen than chuoi nhieu dong cua Go', () => {
    const source = ['func f() {', 'const s = `giu', '   nguyen`', 'x()', '}'].join('\n');

    expect(format(source)).toBe(
      ['func f() {', '  const s = `giu', '   nguyen`', '  x()', '}\n'].join('\n'),
    );
  });

  it('gop dong trong, cat khoang trang thua, ket thuc bang mot xuong dong', () => {
    const source = 'void f() {   \n\n\n  x();  \n}\n\n\n';

    expect(format(source)).toBe('void f() {\n\n  x();\n}\n');
  });

  it('theo tab khi editor dung tab', () => {
    expect(format('void f() {\nx();\n}', '\t')).toBe('void f() {\n\tx();\n}\n');
  });

  it('tra ve chuoi rong khi khong co gi', () => {
    expect(format('   \n\n')).toBe('');
  });
});
