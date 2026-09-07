import { expect, test } from '@playwright/test';
import { JS_TRACER_CODE, openApp, run, setCode, waitForTrace } from './helpers';

/**
 * Đo ngân sách hiệu năng §4.2 trên trình duyệt thật — PLAN.md Task 2.4.8.
 *
 * Tách khỏi `app.spec.ts` vì đây là phép ĐO, không phải phép kiểm hành vi: nó chậm hơn
 * và ngưỡng có thể phải điều chỉnh theo máy chạy.
 */

/** Ung dung mo len voi file trong, nen phep do phai tu nap code truoc. */
async function openWithTrace(page: Parameters<typeof openApp>[0]): Promise<void> {
  await openApp(page);
  await setCode(page, JS_TRACER_CODE);
  await run(page);
  await waitForTrace(page);
}

test('bước tới một khung hình dưới 16ms p95', async ({ page }) => {
  await openWithTrace(page);

  const samples = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Bước tới',
    );
    if (button === undefined) return [];
    const times: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      const started = performance.now();
      button.click();
      times.push(performance.now() - started);
    }
    return times;
  });

  expect(samples.length).toBeGreaterThan(20);
  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  // eslint-disable-next-line no-console -- Đây là phép đo; số liệu phải hiện ra để đối chiếu
  console.log(`bước tới: p95 = ${p95.toFixed(2)}ms (ngân sách 16ms)`);
  expect(p95).toBeLessThan(16);
});

test('kéo tua tới vị trí bất kỳ dưới 120ms p95', async ({ page }) => {
  await openWithTrace(page);

  const samples = await page.evaluate(() => {
    const slider = document.querySelector<HTMLInputElement>('input[aria-label="Tiến độ"]');
    if (slider === null) return [];
    const max = Number(slider.max);
    const times: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const target = 1 + Math.floor((i * 7919) % max);
      const started = performance.now();
      slider.value = String(target);
      slider.dispatchEvent(new Event('change', { bubbles: true }));
      times.push(performance.now() - started);
    }
    return times;
  });

  expect(samples.length).toBeGreaterThan(10);
  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  // eslint-disable-next-line no-console -- Đây là phép đo; số liệu phải hiện ra để đối chiếu
  console.log(`kéo tua: p95 = ${p95.toFixed(2)}ms (ngân sách 120ms)`);
  expect(p95).toBeLessThan(120);
});

test('heap không phình sau khi phát hết trace', async ({ page }) => {
  await openWithTrace(page);

  const heap = await page.evaluate(() => {
    interface WithMemory {
      memory?: { usedJSHeapSize: number };
    }
    const before = (performance as unknown as WithMemory).memory?.usedJSHeapSize ?? 0;
    const slider = document.querySelector<HTMLInputElement>('input[aria-label="Tiến độ"]');
    if (slider !== null) {
      for (let i = 0; i < 200; i += 1) {
        slider.value = String((i % Number(slider.max)) + 1);
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const after = (performance as unknown as WithMemory).memory?.usedJSHeapSize ?? 0;
    return { before, after };
  });

  // Chrome mới trả về memory; nếu không có thì bỏ qua chứ không báo sai
  test.skip(heap.after === 0, 'Trình duyệt không cung cấp performance.memory');
  const mb = heap.after / (1024 * 1024);
  // eslint-disable-next-line no-console -- Đây là phép đo; số liệu phải hiện ra để đối chiếu
  console.log(`heap sau 200 lần tua: ${mb.toFixed(1)} MB (ngân sách 350 MB)`);
  expect(mb).toBeLessThan(350);
});
