import { expect, test, type Page } from '@playwright/test';
import { JS_TRACER_CODE, openApp, run, setCode, waitForTrace } from './helpers';

/** Bubble sort trong fixture đổi chỗ liên tục, nên chắc chắn có sự kiện swap để xem. */
async function runSort(page: Page): Promise<void> {
  await openApp(page);
  await setCode(page, JS_TRACER_CODE);
  await run(page);
  await waitForTrace(page);
}

async function setMotion(page: Page, value: string): Promise<void> {
  await page.getByLabel('Độ biểu cảm của hoạt cảnh').selectOption(value);
}

/** Đếm số hoạt cảnh đang chạy trên các ô của bảng. */
async function runningAnimations(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('td[data-r]')].filter((cell) => cell.getAnimations().length > 0)
        .length,
  );
}

/** Tua tới khung ngay TRƯỚC một cú đổi chỗ, để bước kế tiếp chắc chắn sinh hoạt cảnh. */
async function stepUntilSwap(page: Page, maxSteps = 12): Promise<boolean> {
  for (let i = 0; i < maxSteps; i += 1) {
    await page.getByRole('button', { name: 'Bước tới' }).click();
    if ((await runningAnimations(page)) > 0) return true;
  }
  return false;
}

test('mặc định có hoạt cảnh khi ô đổi chỗ', async ({ page }) => {
  await runSort(page);

  expect(await stepUntilSwap(page)).toBe(true);
});

test('chọn Gọn thì không chạy hoạt cảnh nào', async ({ page }) => {
  await runSort(page);
  await setMotion(page, 'off');

  for (let i = 0; i < 12; i += 1) {
    await page.getByRole('button', { name: 'Bước tới' }).click();
    expect(await runningAnimations(page)).toBe(0);
  }
});

test('huy hiệu so sánh hiện đúng quan hệ giữa hai ô đang chọn', async ({ page }) => {
  await runSort(page);

  // Bước tới cho tới khi có đúng hai ô được chọn cạnh nhau
  let badge = '';
  for (let i = 0; i < 12 && badge === ''; i += 1) {
    await page.getByRole('button', { name: 'Bước tới' }).click();
    badge = await page.evaluate(
      () => document.querySelector('[class*="compare"]')?.textContent ?? '',
    );
  }

  expect(['<', '>', '=']).toContain(badge);

  // Huy hiệu phải khớp với hai giá trị thật, không phải trang trí bừa
  const check = await page.evaluate(() => {
    const host = document.querySelector('[class*="compare"]')?.closest('td');
    if (host === null || host === undefined) return null;
    const cells = [...(host.closest('tr')?.querySelectorAll('td[data-c]') ?? [])];
    const picked = cells.filter((cell) => cell.className.includes('selected'));
    if (picked.length !== 2) return null;
    const numbers = picked.map((cell) => Number(cell.textContent.replace(/[<>=]/g, '')));
    return {
      a: numbers[0] ?? 0,
      b: numbers[1] ?? 0,
      badge: host.querySelector('[class*="compare"]')?.textContent ?? '',
    };
  });

  expect(check).not.toBeNull();
  if (check === null) return;
  const expected = check.a < check.b ? '<' : check.a > check.b ? '>' : '=';
  expect(check.badge).toBe(expected);
});

test('chọn Gọn thì huy hiệu so sánh cũng tắt', async ({ page }) => {
  await runSort(page);
  await setMotion(page, 'off');
  await page.getByRole('button', { name: 'Bước tới' }).click();

  expect(await page.locator('[class*="compare"]').count()).toBe(0);
});

test('cánh tay gắp hiện ra khi có cú đổi chỗ', async ({ page }) => {
  await runSort(page);
  await setMotion(page, 'claw');

  let seen = false;
  for (let i = 0; i < 14 && !seen; i += 1) {
    await page.getByRole('button', { name: 'Bước tới' }).click();
    seen = (await page.locator('svg[class*="claw"]').count()) > 0;
  }

  expect(seen).toBe(true);
});

test('kéo tua nhảy xa thì không phát hoạt cảnh của bước liền kề', async ({ page }) => {
  await runSort(page);

  const progress = page.getByRole('slider', { name: 'Tiến độ' });
  const max = Number(await progress.getAttribute('max'));
  await progress.fill(String(Math.floor(max / 2)));

  expect(await runningAnimations(page)).toBe(0);
});

test('lựa chọn hiệu ứng còn nguyên sau khi tải lại trang', async ({ page }) => {
  await runSort(page);
  await setMotion(page, 'claw');

  await page.reload();
  await page.waitForFunction(() => window.__avEditor !== undefined);

  await expect(page.getByLabel('Độ biểu cảm của hoạt cảnh')).toHaveValue('claw');
});
