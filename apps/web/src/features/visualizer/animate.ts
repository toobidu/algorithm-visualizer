import type { SceneEvent } from '@av/viz-core';

/**
 * Vẽ hoạt cảnh cho các sự kiện mà `viz-core` suy ra — xem docs/y-tuong-hoat-canh.md.
 *
 * Chạy bằng Web Animations API trên chính phần tử DOM, KHÔNG qua React: ngân sách §4.2 đòi
 * bước tới một khung hình dưới 16ms p95, mà re-render React 60 lần một giây cho một cú đổi
 * chỗ thì không cách nào đạt.
 */
export type MotionLevel = 'off' | 'motion' | 'claw';

/** Thời lượng cơ bản. Mức cánh tay chậm hơn hẳn vì phải đủ thời gian hạ – kẹp – nhấc – thả. */
const DURATION: Record<Exclude<MotionLevel, 'off'>, number> = { motion: 220, claw: 700 };

/**
 * Độ cao cung bay, theo phần trăm chiều cao ô.
 *
 * Ở mức `motion` hai ô đi ngược chiều nhau nên mỗi bên chỉ cần lệch một chút. Ở mức `claw`
 * cả hai cùng được "nhấc lên" nên đều đi lên, lệch nhau về độ cao để không chồng hình.
 */
const ARC: Record<Exclude<MotionLevel, 'off'>, readonly [number, number]> = {
  motion: [-0.35, 0.35],
  claw: [-0.95, -0.5],
};

/**
 * Phần đầu của hoạt cảnh dành cho cánh tay hạ xuống và kẹp; ô phải ĐỨNG YÊN trong
 * khoảng đó, không thì giá trị bay đi trước khi càng chạm tới.
 */
const CLAW_GRAB_PHASE = 0.32;

const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

function cellAt(container: HTMLElement, row: number, col: number): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-r="${String(row)}"][data-c="${String(col)}"]`);
}

/** jsdom không cài `animate`; test DOM vẫn phải chạy được nên phải hỏi trước khi gọi. */
function canAnimate(element: HTMLElement): boolean {
  return typeof element.animate === 'function';
}

function run(element: HTMLElement, frames: Keyframe[], duration: number): Animation | undefined {
  if (!canAnimate(element)) return undefined;
  return element.animate(frames, { duration, easing: EASING, composite: 'replace' });
}

/**
 * Đổi chỗ: ô đích ĐANG hiển thị giá trị mới rồi, nên hoạt cảnh chạy ngược — bắt đầu ở vị trí
 * cũ của giá trị đó rồi trượt về chỗ của mình. Mắt đọc thành "giá trị bay từ kia sang đây".
 *
 * Một ô bay vòng lên, ô kia vòng xuống, để hai đường không chồng lên nhau ở giữa.
 */
function swapFrames(dx: number, lift: number, hold: number): Keyframe[] {
  const start = { transform: `translate(${String(dx)}px, 0)` };
  const peak = { transform: `translate(${String(dx / 2)}px, ${String(lift)}px)` };
  const end = { transform: 'translate(0, 0)' };

  // Giữ nguyên vị trí đầu suốt pha `hold` rồi mới đi — hai khung trùng nhau làm việc đó
  return hold <= 0
    ? [start, peak, end]
    : [
        { ...start, offset: 0 },
        { ...start, offset: hold },
        { ...peak, offset: hold + (1 - hold) / 2 },
        { ...end, offset: 1 },
      ];
}

function playSwap(
  container: HTMLElement,
  row: number,
  a: number,
  b: number,
  duration: number,
  level: Exclude<MotionLevel, 'off'>,
): void {
  const first = cellAt(container, row, a);
  const second = cellAt(container, row, b);
  if (first === null || second === null) return;

  const left = first.getBoundingClientRect();
  const right = second.getBoundingClientRect();
  const dx = right.left - left.left;
  const height = Math.max(left.height, right.height);
  const [ratioA, ratioB] = ARC[level];
  const hold = level === 'claw' ? CLAW_GRAB_PHASE : 0;

  // Ô bay lên phải nằm TRÊN ô kia, không thì hai số chồng nhau lúc giao cắt
  first.style.zIndex = '2';
  const clear = (): void => {
    first.style.zIndex = '';
  };

  const animation = run(first, swapFrames(dx, height * ratioA, hold), duration);
  run(second, swapFrames(-dx, height * ratioB, hold), duration);

  if (animation === undefined) clear();
  else animation.addEventListener('finish', clear, { once: true });
}

/** Trượt: cả dải nhận giá trị của ô kề bên, nên cả dải trôi ngang đúng một ô. */
function playShift(
  container: HTMLElement,
  row: number,
  from: number,
  to: number,
  duration: number,
): void {
  const step = from < to ? 1 : -1;
  for (let col = from + step; col !== to + step; col += step) {
    const cell = cellAt(container, row, col);
    const source = cellAt(container, row, col - step);
    if (cell === null || source === null) continue;

    const dx = source.getBoundingClientRect().left - cell.getBoundingClientRect().left;
    run(
      cell,
      [{ transform: `translateX(${String(dx)}px)` }, { transform: 'translateX(0)' }],
      duration,
    );
  }
}

/** Gán: giá trị mới trồi lên tại chỗ, không đi đâu cả. */
function playAssign(container: HTMLElement, row: number, index: number, duration: number): void {
  const cell = cellAt(container, row, index);
  if (cell === null) return;

  run(
    cell,
    [
      { transform: 'translateY(-40%) scale(1.18)', opacity: '0.35' },
      { transform: 'translateY(0) scale(1)', opacity: '1' },
    ],
    duration,
  );
}

export function playEvents(
  container: HTMLElement,
  events: readonly SceneEvent[],
  level: MotionLevel,
  /** Trần thời lượng: lúc phát nhanh, hoạt cảnh không được dài hơn khoảng cách giữa hai khung. */
  budgetMs: number,
): void {
  if (level === 'off' || events.length === 0) return;
  const duration = Math.min(DURATION[level], Math.max(80, budgetMs));

  for (const event of events) {
    switch (event.kind) {
      case 'swap':
        playSwap(container, event.row, event.a, event.b, duration, level);
        break;
      case 'shift':
        playShift(container, event.row, event.from, event.to, duration);
        break;
      case 'assign':
        playAssign(container, event.row, event.index, duration);
        break;
    }
  }
}
