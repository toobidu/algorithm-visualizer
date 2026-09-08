import { expect, type Page } from '@playwright/test';

export const COUNTER = /^\d+ \/ \d+$/;
/** Trace that di: mau so lon hon 1 khung hinh. */
export const MANY_FRAMES = /^\d+ \/ [1-9]\d+$/;

declare global {
  interface Window {
    __avEditor?: { setValue: (value: string) => void; getValue: () => string };
  }
}

/**
 * Mục đích chung: mở app ĐÃ QUA tour hướng dẫn.
 *
 * Tour là lớp phủ toàn màn hình ở lần vào đầu tiên; để nó hiện thì mọi test khác đều
 * bị chặn chuột. Test nào muốn kiểm chính tour thì truyền `{ tour: true }`.
 */
export async function openApp(page: Page, options?: { tour?: boolean }): Promise<void> {
  if (options?.tour !== true) {
    await page.addInitScript(() => {
      localStorage.setItem('av:tour-seen:v1', '1');
    });
  }
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Chạy' })).toBeVisible();
  await page.waitForFunction(() => window.__avEditor !== undefined);
}

/** Dat noi dung file dang mo. Di qua dung duong onChange nhu nguoi dung go. */
export async function setCode(page: Page, code: string): Promise<void> {
  await page.waitForFunction(() => window.__avEditor !== undefined);
  await page.evaluate((value) => {
    window.__avEditor?.setValue(value);
  }, code);
}

export async function chooseLanguage(page: Page, ext: string): Promise<void> {
  await page.getByLabel('Ngôn ngữ').selectOption(ext);
}

export async function run(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Chạy' }).click();
}

export async function waitForTrace(page: Page, timeout = 30_000): Promise<void> {
  await expect(page.getByRole('button', { name: 'Chạy' })).toBeEnabled({ timeout });
  await expect(page.getByText(MANY_FRAMES).first()).toBeVisible({ timeout });
}

/** Thuat toan JavaScript CO goi tracer, dung cho phan lon test. */
export const JS_TRACER_CODE = `const tracer = new Array1DTracer('Mang');
const logger = new LogTracer('Nhat ky');
Layout.setRoot(new VerticalLayout([tracer, logger]));

const array = [5, 2, 9, 1, 7, 3, 8, 4];
tracer.set(array);
Tracer.delay();

for (let i = 0; i < array.length - 1; i++) {
  for (let j = 0; j < array.length - 1 - i; j++) {
    tracer.select(j, j + 1);
    Tracer.delay();
    if (array[j] > array[j + 1]) {
      const tmp = array[j];
      array[j] = array[j + 1];
      array[j + 1] = tmp;
      tracer.patch(j, array[j]);
      tracer.patch(j + 1, array[j + 1]);
      logger.println('doi cho ' + j);
      Tracer.delay();
      tracer.depatch(j);
      tracer.depatch(j + 1);
    }
    tracer.deselect(j, j + 1);
  }
}
`;

/** Code Java thuan, khong goi tracer — danh cho che do tu truc quan hoa. */
export const JAVA_PLAIN_CODE = `class Solution {
    public int maxProfit(int[] prices) {
        int left = 0;
        int right = 1;
        int best = 0;
        while (right < prices.length) {
            if (prices[right] > prices[left]) {
                int profit = prices[right] - prices[left];
                if (profit > best) best = profit;
            } else {
                left = right;
            }
            right++;
        }
        return best;
    }

    public static void main(String[] args) {
        int[] prices = {7, 1, 5, 3, 6, 4};
        System.out.println(new Solution().maxProfit(prices));
    }
}
`;

export const JS_PLAIN_CODE = `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        const tmp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = tmp;
      }
    }
  }
  return arr;
}

const data = [5, 2, 9, 1, 7, 3];
console.log(bubbleSort(data));
`;
