// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ResizableSplit } from './ResizableSplit';

/** jsdom trả 0 cho mọi kích thước; giả lập khung 1000px để phép tính trọng số có nghĩa. */
function stubWidth(width: number): void {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width,
      height: width,
      right: width,
      bottom: width,
      x: 0,
      y: 0,
    }),
  });
}

function firePointer(target: EventTarget, type: string, x: number): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: x });
  target.dispatchEvent(event);
}

function Harness({ visible }: { visible?: boolean[] }): React.JSX.Element {
  const [weights, setWeights] = useState<number[]>([1, 2, 2]);
  // exactOptionalPropertyTypes: khong truyen prop thay vi truyen undefined
  const visibleProp = visible === undefined ? {} : { visible };
  return (
    <ResizableSplit
      direction="horizontal"
      weights={weights}
      {...visibleProp}
      onChangeWeights={setWeights}
    >
      <div data-testid="a">A</div>
      <div data-testid="b">B</div>
      <div data-testid="c">C</div>
    </ResizableSplit>
  );
}

const growOf = (testId: string): number =>
  Number(screen.getByTestId(testId).parentElement!.style.flexGrow);

afterEach(cleanup);

describe('ResizableSplit — kéo thả', () => {
  it('có đúng một thanh chia giữa mỗi cặp panel', () => {
    stubWidth(1000);
    render(<Harness />);

    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('kéo thanh chia làm đổi trọng số hai panel kề nó', () => {
    stubWidth(1000);
    render(<Harness />);

    const before = growOf('a');
    const divider = screen.getAllByRole('separator')[0]!;

    act(() => {
      firePointer(divider, 'pointerdown', 200);
      firePointer(window, 'pointermove', 400);
      firePointer(window, 'pointerup', 400);
    });

    expect(growOf('a')).toBeGreaterThan(before);
  });

  it('kéo ngược lại làm panel nhỏ đi', () => {
    stubWidth(1000);
    render(<Harness />);

    const divider = screen.getAllByRole('separator')[0]!;
    act(() => {
      firePointer(divider, 'pointerdown', 200);
      firePointer(window, 'pointermove', 400);
      firePointer(window, 'pointerup', 400);
    });
    const wide = growOf('a');

    act(() => {
      firePointer(divider, 'pointerdown', 400);
      firePointer(window, 'pointermove', 100);
      firePointer(window, 'pointerup', 100);
    });

    expect(growOf('a')).toBeLessThan(wide);
  });

  it('không kéo khi chưa bấm xuống thanh chia', () => {
    stubWidth(1000);
    render(<Harness />);

    const before = growOf('a');
    act(() => {
      firePointer(window, 'pointermove', 800);
    });

    expect(growOf('a')).toBe(before);
  });

  it('bàn phím cũng đổi được kích thước', () => {
    stubWidth(1000);
    render(<Harness />);

    const before = growOf('a');
    const divider = screen.getAllByRole('separator')[0]!;

    act(() => {
      divider.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });

    expect(growOf('a')).toBeGreaterThan(before);
  });

  it('panel bị ẩn không sinh thanh chia thừa', () => {
    stubWidth(1000);
    render(<Harness visible={[false, true, true]} />);

    expect(screen.getAllByRole('separator')).toHaveLength(1);
    expect(screen.queryByTestId('a')).toBeNull();
  });
});
