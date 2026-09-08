import { expect, test, type Page } from '@playwright/test';
import { chooseLanguage, openApp, setCode } from './helpers';

const readEditor = async (page: Page): Promise<string> =>
  (await page.evaluate(() => window.__avEditor?.getValue())) ?? '';

const themeOf = async (page: Page): Promise<string | null> =>
  page.evaluate(() => document.documentElement.dataset['theme'] ?? null);

test.use({ colorScheme: 'dark' });

test('lần đầu vào thì theo cài đặt của hệ điều hành', async ({ page }) => {
  await openApp(page);

  expect(await themeOf(page)).toBe('dark');
});

test('công tắc đổi giữa giao diện tối và sáng', async ({ page }) => {
  await openApp(page);

  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const editorDark = await page.evaluate(
    () => getComputedStyle(document.querySelector('.monaco-editor')!).backgroundColor,
  );

  await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click();

  expect(await themeOf(page)).toBe('light');
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).not.toBe(darkBg);

  // Monaco phải đổi theo, không được kẹt ở nền tối giữa giao diện sáng
  await expect
    .poll(async () =>
      page.evaluate(
        () => getComputedStyle(document.querySelector('.monaco-editor')!).backgroundColor,
      ),
    )
    .not.toBe(editorDark);

  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click();
  expect(await themeOf(page)).toBe('dark');
});

test('lựa chọn giao diện còn nguyên sau khi tải lại trang', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click();
  expect(await themeOf(page)).toBe('light');

  await page.reload();
  await page.waitForFunction(() => window.__avEditor !== undefined);

  expect(await themeOf(page)).toBe('light');
});

test('đổi ngôn ngữ mở tab riêng, code cũ nằm nguyên tab của nó', async ({ page }) => {
  await openApp(page);
  await chooseLanguage(page, 'java');
  await setCode(page, 'class Solution { }');

  await chooseLanguage(page, 'py');

  // Hai tab: Main.java giữ code Java, code.py trống
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', { name: 'code.py' })).toHaveAttribute('aria-selected', 'true');
  expect(await readEditor(page)).toBe('');

  await page.getByRole('tab', { name: 'Main.java' }).click();
  await expect.poll(async () => readEditor(page)).toBe('class Solution { }');
});

test('file đang trống thì đổi ngôn ngữ chỉ đổi tên, không đẻ thêm tab', async ({ page }) => {
  await openApp(page);

  await chooseLanguage(page, 'java');

  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab')).toHaveText('Main.java');
});

test('tour hiện ra ở lần vào đầu tiên rồi thôi', async ({ page }) => {
  await openApp(page, { tour: true });

  const popover = page.locator('.driver-popover');
  await expect(popover).toBeVisible({ timeout: 15_000 });
  await expect(popover).toContainText('Viết code ở đây');

  // 5 bước: bước đầu là nút "Tiếp", đóng bằng Escape cho gọn
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);

  await page.reload();
  await page.waitForFunction(() => window.__avEditor !== undefined);
  await page.waitForTimeout(2000);
  await expect(popover).toHaveCount(0);
});

test('nút Hướng dẫn mở lại tour bất cứ lúc nào', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Hướng dẫn' }).click();

  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 15_000 });
});
