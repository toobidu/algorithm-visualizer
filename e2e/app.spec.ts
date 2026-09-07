import { expect, test } from '@playwright/test';
import { JAVA, PHP, RUBY } from '../tracers/_conformance/src/bubbleSort';
import {
  chooseLanguage,
  COUNTER,
  JAVA_PLAIN_CODE,
  JS_PLAIN_CODE,
  JS_TRACER_CODE,
  MANY_FRAMES,
  openApp,
  run,
  setCode,
  waitForTrace,
} from './helpers';

test('mở app là thấy editor với một file trống, không phải màn hình trắng', async ({ page }) => {
  await openApp(page);

  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab')).toHaveText('code.js');
  expect(await page.evaluate(() => window.__avEditor?.getValue())).toBe('');
});

test('gõ code rồi bấm Chạy thì ra animation', async ({ page }) => {
  await openApp(page);
  await setCode(page, JS_TRACER_CODE);
  await run(page);
  await waitForTrace(page);

  const cells = page.locator('table td');
  await expect(cells.first()).toBeVisible();
  expect(await cells.count()).toBeGreaterThan(5);
});

test('kéo thanh chia làm panel đổi kích thước thật', async ({ page }) => {
  await openApp(page);

  const divider = page.getByRole('separator').first();
  await expect(divider).toBeVisible();

  const editorPane = page.locator('.monaco-editor').first();
  const before = (await editorPane.boundingBox())?.width ?? 0;
  expect(before).toBeGreaterThan(0);

  const box = await divider.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 200, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  const after = (await editorPane.boundingBox())?.width ?? 0;
  expect(after).toBeGreaterThan(before + 80);
});

test('bấm Chạy nhiều lần lần nào cũng chạy lại được', async ({ page }) => {
  await openApp(page);
  await setCode(page, JS_TRACER_CODE);

  for (let i = 0; i < 3; i += 1) {
    await run(page);
    await waitForTrace(page);
  }

  await expect(page.getByRole('button', { name: 'Chạy' })).toBeEnabled();
});

test('Play chạy hết thì dừng, không lặp vô hạn', async ({ page }) => {
  await openApp(page);
  await setCode(page, JS_TRACER_CODE);
  await run(page);
  await waitForTrace(page);

  await page.getByRole('button', { name: 'Phát' }).click();
  await expect(page.getByRole('button', { name: 'Tạm dừng' })).toBeVisible();

  const progress = page.getByRole('slider', { name: 'Tiến độ' });
  const max = await progress.getAttribute('max');
  await progress.fill(String(Number(max) - 1));

  await page.getByRole('button', { name: 'Phát' }).click();
  await expect(page.getByRole('button', { name: 'Phát' })).toBeVisible({ timeout: 20_000 });
});

test('bước tới và bước lùi đổi khung hình', async ({ page }) => {
  await openApp(page);
  await setCode(page, JS_TRACER_CODE);
  await run(page);
  await waitForTrace(page);

  const counter = page.getByText(COUNTER).first();
  const start = await counter.textContent();

  await page.getByRole('button', { name: 'Bước tới' }).click();
  await expect(counter).not.toHaveText(start ?? '');

  await page.getByRole('button', { name: 'Bước lùi' }).click();
  await expect(counter).toHaveText(start ?? '');
});

test('phim tat cua trinh phat chay o moi cho tren trang', async ({ page }) => {
  await openApp(page);
  await setCode(page, JS_TRACER_CODE);
  await run(page);
  await waitForTrace(page);

  const counter = page.getByText(COUNTER).first();
  // Bo focus khoi nut Chay: Space tren mot nut la "bam nut" cua trinh duyet, khong phai
  // phim tat cua trinh phat
  await counter.click();

  await page.keyboard.press('End');
  await expect
    .poll(async () => {
      const [cursor, total] = ((await counter.textContent()) ?? '').split('/');
      return cursor?.trim() === total?.trim();
    })
    .toBe(true);

  await page.keyboard.press('Home');
  await expect(counter).toHaveText(/^1 \//);

  await page.keyboard.press('ArrowRight');
  await expect(counter).toHaveText(/^2 \//);

  await page.keyboard.press('ArrowLeft');
  await expect(counter).toHaveText(/^1 \//);

  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: 'Tạm dừng' })).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: 'Phát' })).toBeVisible();
});

test('không có lỗi nào trong console', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await openApp(page);
  await setCode(page, JS_TRACER_CODE);
  await run(page);
  await waitForTrace(page);
  await page.waitForTimeout(1500);

  // `Canceled` của Monaco đã được chặn ở `main.tsx`; console phải sạch hoàn toàn
  expect(errors).toEqual([]);
});

test('thêm file rồi đổi tab thì editor đổi nội dung', async ({ page }) => {
  await openApp(page);
  await setCode(page, '// FILE MOT');

  await page.getByRole('button', { name: 'Thêm file' }).click();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await setCode(page, '// FILE HAI');

  await page.getByRole('tab').first().click();
  await expect
    .poll(async () => page.evaluate(() => window.__avEditor?.getValue()))
    .toBe('// FILE MOT');
});

test('code gõ vào được giữ lại sau khi tải lại trang', async ({ page }) => {
  await openApp(page);
  await setCode(page, '// GIU LAI SAU F5');
  // Ghi xuống localStorage sau khi ngừng gõ 400ms
  await page.waitForTimeout(900);

  await page.reload();
  await page.waitForFunction(() => window.__avEditor !== undefined);

  await expect
    .poll(async () => page.evaluate(() => window.__avEditor?.getValue()))
    .toBe('// GIU LAI SAU F5');
});

test('khối trực quan hóa được gấp lại khi mở file', async ({ page }) => {
  await openApp(page);
  await setCode(
    page,
    ['// trực quan hóa {', 'const a = 1;', 'const b = 2;', '// }', ''].join('\n'),
  );

  // Ngầm #17: gấp khối chạy lúc MỞ file, nên phải rời đi rồi quay lại
  await page.getByRole('button', { name: 'Thêm file' }).click();
  await page.getByRole('tab').first().click();
  await page.waitForTimeout(1200);

  expect(await page.locator('.codicon-folding-collapsed').count()).toBeGreaterThan(0);
});

/**
 * Ba ngôn ngữ chạy qua gateway thật, dùng chung chương trình với bộ tuân thủ.
 *
 * Cần gateway đang chạy (`pnpm dev:gateway`); không có thì test đỏ đúng như mong muốn —
 * đây là đường chạy chính của các ngôn ngữ không chạy được trong trình duyệt.
 */
const GATEWAY_CASES = [
  { ext: 'java', code: JAVA },
  { ext: 'rb', code: RUBY },
  { ext: 'php', code: PHP },
];

for (const entry of GATEWAY_CASES) {
  test(`chế độ tracer: ${entry.ext} chạy qua gateway ra animation`, async ({ page }) => {
    test.setTimeout(120_000);
    await openApp(page);
    await chooseLanguage(page, entry.ext);
    await setCode(page, entry.code);

    // Kiểm trước khi bấm Chạy: build hỏng thì cảnh cũ vẫn nằm đó (ngầm #13)
    // và khẳng định bên dưới sẽ xanh oan.
    await expect(page.getByRole('heading', { name: 'Mang', exact: true })).toHaveCount(0);

    await run(page);
    await expect(page.getByText(MANY_FRAMES).first()).toBeVisible({ timeout: 90_000 });

    await expect(page.getByRole('heading', { name: 'Mang', exact: true })).toBeVisible();
    expect(await page.locator('table td').count()).toBeGreaterThan(7);
  });
}

test('tự trực quan hóa: code Java thuần cũng chạy ra animation', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page);
  await chooseLanguage(page, 'java');
  await setCode(page, JAVA_PLAIN_CODE);
  await page.getByRole('checkbox', { name: /trực quan hóa/i }).check();
  await run(page);

  await expect(page.getByText(MANY_FRAMES).first()).toBeVisible({ timeout: 90_000 });

  // Panel mảng phải được tự tạo từ biến `prices`, không do code khai báo
  await expect(page.getByRole('heading', { name: 'prices' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Biến' })).toBeVisible();
  expect(await page.locator('table td').count()).toBeGreaterThan(6);
});

test('tự trực quan hóa: JavaScript chạy ngay trong trình duyệt', async ({ page }) => {
  await openApp(page);
  await setCode(page, JS_PLAIN_CODE);
  await page.getByRole('checkbox', { name: /trực quan hóa/i }).check();
  await run(page);

  await expect(page.getByText(MANY_FRAMES).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'data' })).toBeVisible();
});

test('tắt công tắc thì quay lại chế độ tracer', async ({ page }) => {
  await openApp(page);

  const toggle = page.getByRole('checkbox', { name: /trực quan hóa/i });
  await toggle.check();
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
});
