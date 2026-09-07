import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { cx } from '../../shared/lib/cx';
import styles from './ResizableSplit.module.scss';

interface Props {
  readonly direction: 'horizontal' | 'vertical';
  readonly weights: readonly number[];
  readonly visible?: readonly boolean[];
  readonly onChangeWeights?: (weights: number[]) => void;
  readonly children: React.ReactNode[];
}

/**
 * Chia panel theo TRỌNG SỐ, không theo pixel — ngầm #32. Panel đang ẩn bị loại khỏi tổng.
 *
 * Dùng đệ quy: layout bên trong khung visualization cũng là chính component này (ngầm #31),
 * nên khung con cũng kéo giãn được.
 *
 * Thanh chia là phần tử ANH EM của các pane chứ không nằm bên trong chúng. Đặt bên trong thì
 * `overflow: hidden` của pane cắt mất nó và không ai bấm trúng được.
 */
export function ResizableSplit({
  direction,
  weights,
  visible,
  onChangeWeights,
  children,
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState<number[]>(() => [...weights]);
  const dragging = useRef<{ before: number; after: number } | null>(null);

  // Chỉ đồng bộ lại khi SỐ LƯỢNG panel đổi. Đồng bộ theo giá trị sẽ xoá mất
  // kích thước người dùng vừa kéo, vì `weights` là mảng mới sau mỗi lần render.
  useEffect(() => {
    setLocal((previous) => (previous.length === weights.length ? previous : [...weights]));
  }, [weights]);

  const horizontal = direction === 'horizontal';

  const applyDrag = useCallback(
    (clientX: number, clientY: number) => {
      const pair = dragging.current;
      const container = containerRef.current;
      if (pair === null || container === null) return;

      const rect = container.getBoundingClientRect();
      const size = horizontal ? rect.width : rect.height;
      if (size === 0) return;
      const position = horizontal ? clientX - rect.left : clientY - rect.top;

      setLocal((previous) => {
        const next = [...previous];
        let total = 0;
        let before = 0;
        next.forEach((weight, index) => {
          if (visible?.[index] === false) return;
          total += weight;
          if (index < pair.after) before += weight;
        });
        if (total === 0) return previous;

        const wanted = (position / size) * total;
        let delta = wanted - before;
        delta = Math.max(delta, -(next[pair.before] ?? 0));
        delta = Math.min(delta, next[pair.after] ?? 0);
        next[pair.before] = (next[pair.before] ?? 0) + delta;
        next[pair.after] = (next[pair.after] ?? 0) - delta;
        onChangeWeights?.(next);
        return next;
      });
    },
    [horizontal, onChangeWeights, visible],
  );

  useEffect(() => {
    const move = (event: PointerEvent): void => {
      if (dragging.current === null) return;
      event.preventDefault();
      applyDrag(event.clientX, event.clientY);
    };
    const stop = (): void => {
      dragging.current = null;
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [applyDrag]);

  const nudge = (before: number, after: number, amount: number): void => {
    setLocal((previous) => {
      const next = [...previous];
      const delta = Math.max(-(next[before] ?? 0), Math.min(next[after] ?? 0, amount));
      next[before] = (next[before] ?? 0) + delta;
      next[after] = (next[after] ?? 0) - delta;
      onChangeWeights?.(next);
      return next;
    });
  };

  const shown = children
    .map((child, index) => ({ child, index }))
    .filter(({ index }) => visible?.[index] !== false);
  const total = shown.reduce((sum, { index }) => sum + (local[index] ?? 1), 0) || 1;

  return (
    <div
      ref={containerRef}
      className={cx(styles['split'], horizontal ? styles['horizontal'] : styles['vertical'])}
    >
      {shown.map(({ child, index }, position) => (
        <Fragment key={index}>
          <div style={{ flexGrow: (local[index] ?? 1) / total }} className={styles['pane']}>
            {child}
          </div>
          {position < shown.length - 1 ? (
            <div
              role="separator"
              aria-orientation={horizontal ? 'vertical' : 'horizontal'}
              aria-label="Kéo để đổi kích thước"
              tabIndex={0}
              className={styles['divider']}
              onPointerDown={() => {
                dragging.current = { before: index, after: shown[position + 1]?.index ?? index };
                // Khoá con trỏ và chặn bôi đen trong lúc kéo, nếu không trình duyệt
                // sẽ chọn text và thao tác kéo bị giật
                document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize';
                document.body.style.userSelect = 'none';
              }}
              onKeyDown={(event) => {
                const next = shown[position + 1]?.index ?? index;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  nudge(index, next, -0.1);
                } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  nudge(index, next, 0.1);
                }
              }}
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
