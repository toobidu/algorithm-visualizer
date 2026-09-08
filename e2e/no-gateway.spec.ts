import { expect, test } from '@playwright/test';
import { chooseLanguage, openApp, run, setCode } from './helpers';

const JAVA = 'public class Main { public static void main(String[] a){} }';

/**
 * Người dùng mới cài chỉ bật `pnpm dev` rồi chạy Java: proxy của Vite không nối được tới
 * 127.0.0.1:3001 nên trả 500 với thân RỖNG.
 *
 * Giả lập phản hồi đó thay vì phụ thuộc gateway có đang chạy hay không — test này phải
 * cho cùng kết quả dù máy đang bật gateway hay không.
 */
test('gateway chưa chạy thì báo rõ là thiếu dịch vụ', async ({ page }) => {
  await page.route('**/api/run', (route) => route.fulfill({ status: 500, body: '' }));

  await openApp(page);
  await chooseLanguage(page, 'java');
  await setCode(page, JAVA);
  await run(page);

  // Hiện ở cả panel lỗi lẫn toast nên phải lấy cái đầu
  await expect(page.getByText(/pnpm dev:gateway/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Unexpected end of JSON input/)).toHaveCount(0);
});

test('phản hồi không phải JSON cũng báo được thành câu', async ({ page }) => {
  await page.route('**/api/run', (route) =>
    route.fulfill({ status: 502, body: '<html>Bad Gateway</html>' }),
  );

  await openApp(page);
  await chooseLanguage(page, 'java');
  await setCode(page, JAVA);
  await run(page);

  await expect(page.getByText(/không đọc được/).first()).toBeVisible({ timeout: 30_000 });
});

test('không còn cảnh báo thiếu web worker của Monaco', async ({ page }) => {
  const noise: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/web worker|MonacoEnvironment/i.test(text)) noise.push(text);
  });

  await openApp(page);
  await setCode(page, 'const alpha = 1;\nconst al');
  // Gợi ý theo từ là thứ gọi tới worker
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(1500);

  expect(noise).toEqual([]);
});
