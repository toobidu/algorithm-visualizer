import { describe, expect, it } from 'vitest';
import { diffBars, diffGrid, findComparison } from './events';
import { type BarScene, type GridScene, type SceneTone } from './scene';

function grid(rows: (readonly (string | [string, SceneTone])[])[]): GridScene {
  return {
    kind: 'grid',
    title: 'T',
    showRowIndex: false,
    columnHeader: [],
    rows: rows.map((cells) => ({
      header: undefined,
      cells: cells.map((cell) =>
        typeof cell === 'string'
          ? { text: cell, tone: 'default' as const }
          : { text: cell[0], tone: cell[1] },
      ),
    })),
  };
}

function bars(labels: readonly string[]): BarScene {
  return {
    kind: 'bars',
    title: 'T',
    bars: labels.map((label) => ({ value: Number(label), label, tone: 'default' as const })),
  };
}

describe('diffGrid', () => {
  it('nhan ra doi cho khi hai o hoan gia tri cho nhau', () => {
    const before = grid([['5', '2', '9', '1']]);
    const after = grid([['2', '5', '9', '1']]);

    expect(diffGrid(before, after)).toEqual([{ kind: 'swap', row: 0, a: 0, b: 1 }]);
  });

  it('doi cho khong lien ke van nhan ra', () => {
    const before = grid([['5', '2', '9', '1']]);
    const after = grid([['1', '2', '9', '5']]);

    expect(diffGrid(before, after)).toEqual([{ kind: 'swap', row: 0, a: 0, b: 3 }]);
  });

  it('hai o doi nhung KHONG hoan cho nhau thi la hai lan gan', () => {
    const before = grid([['5', '2', '9']]);
    const after = grid([['7', '8', '9']]);

    expect(diffGrid(before, after)).toEqual([
      { kind: 'assign', row: 0, index: 0 },
      { kind: 'assign', row: 0, index: 1 },
    ]);
  });

  it('nhan ra truot sang phai', () => {
    const before = grid([['1', '3', '5', '7', '9']]);
    // 3,5,7 day sang phai mot o
    const after = grid([['1', '3', '3', '5', '7']]);

    expect(diffGrid(before, after)).toEqual([{ kind: 'shift', row: 0, from: 1, to: 4 }]);
  });

  it('nhan ra truot sang trai', () => {
    const before = grid([['1', '3', '5', '7', '9']]);
    const after = grid([['3', '5', '7', '9', '9']]);

    expect(diffGrid(before, after)).toEqual([{ kind: 'shift', row: 0, from: 4, to: 0 }]);
  });

  it('mot o doi gia tri la mot lan gan', () => {
    expect(diffGrid(grid([['1', '2']]), grid([['1', '9']]))).toEqual([
      { kind: 'assign', row: 0, index: 1 },
    ]);
  });

  it('khong co gi doi thi khong co su kien nao', () => {
    expect(diffGrid(grid([['1', '2']]), grid([['1', '2']]))).toEqual([]);
  });

  it('thay ca mang thi im lang, khong coi la mot hanh dong', () => {
    const before = grid([['1', '2', '3', '4', '5']]);
    const after = grid([['9', '8', '7', '6', '5']]);

    expect(diffGrid(before, after)).toEqual([]);
  });

  it('doi so o thi khong suy dien gi — nap du lieu moi chu khong phai mot buoc', () => {
    expect(diffGrid(grid([['1', '2']]), grid([['1', '2', '3']]))).toEqual([]);
  });

  it('chua co khung truoc thi khong co su kien', () => {
    expect(diffGrid(undefined, grid([['1']]))).toEqual([]);
  });

  it('bat su kien tren dung hang cua bang hai chieu', () => {
    const before = grid([
      ['1', '2'],
      ['3', '4'],
    ]);
    const after = grid([
      ['1', '2'],
      ['4', '3'],
    ]);

    expect(diffGrid(before, after)).toEqual([{ kind: 'swap', row: 1, a: 0, b: 1 }]);
  });
});

describe('diffBars', () => {
  it('doi cho tren bieu do cot cung nhan ra', () => {
    expect(diffBars(bars(['5', '2']), bars(['2', '5']))).toEqual([
      { kind: 'swap', row: 0, a: 0, b: 1 },
    ]);
  });
});

describe('findComparison', () => {
  it('hai o duoc chon trong cung hang cho ra mot phep so sanh', () => {
    const scene = grid([['5', 'x'].map((t, i) => (i === 0 ? ([t, 'selected'] as const) : t))]);
    expect(findComparison(scene)).toBeUndefined();
  });

  it('doc dung quan he lon hon', () => {
    const scene = grid([[['5', 'selected'], ['2', 'selected'], '9']]);
    expect(findComparison(scene)).toEqual({ row: 0, left: 0, right: 1, relation: '>' });
  });

  it('doc dung quan he nho hon', () => {
    const scene = grid([[['2', 'selected'], '9', ['5', 'selected']]]);
    expect(findComparison(scene)).toEqual({ row: 0, left: 0, right: 2, relation: '<' });
  });

  it('bang nhau cung nhan ra', () => {
    const scene = grid([
      [
        ['4', 'selected'],
        ['4', 'selected'],
      ],
    ]);
    expect(findComparison(scene)).toEqual({ row: 0, left: 0, right: 1, relation: '=' });
  });

  it('so sanh CHUOI thi bo qua, vi "10" < "9" la sai su that', () => {
    const scene = grid([
      [
        ['ab', 'selected'],
        ['cd', 'selected'],
      ],
    ]);
    expect(findComparison(scene)).toBeUndefined();
  });

  it('mot o hoac ba o duoc chon deu khong phai phep so sanh', () => {
    expect(findComparison(grid([[['1', 'selected'], '2']]))).toBeUndefined();
    expect(
      findComparison(
        grid([
          [
            ['1', 'selected'],
            ['2', 'selected'],
            ['3', 'selected'],
          ],
        ]),
      ),
    ).toBeUndefined();
  });
});
