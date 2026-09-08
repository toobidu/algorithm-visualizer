import { expect, test, type Page } from '@playwright/test';
import { chooseLanguage, openApp, setCode } from './helpers';

const readEditor = async (page: Page): Promise<string> =>
  (await page.evaluate(() => window.__avEditor?.getValue())) ?? '';

/**
 * Monaco giu EOL cua model theo he dieu hanh khi noi dung chua co dong nao, nen tren Windows
 * cung mot doan code format ra CRLF con tren CI Linux ra LF. Chuan hoa truoc khi so.
 */
const readEditorLf = async (page: Page): Promise<string> =>
  (await readEditor(page)).replaceAll('\r\n', '\n');

async function focusEditor(page: Page): Promise<void> {
  await page.locator('.monaco-editor textarea').first().focus();
}

test('Ctrl+Alt+L định dạng lại code JavaScript', async ({ page }) => {
  await openApp(page);
  await setCode(page, 'const   a=[1,2,3];\nif(a){console.log(  "x" )}');
  await focusEditor(page);

  await page.keyboard.press('Control+Alt+KeyL');

  await expect.poll(async () => readEditor(page)).toContain('const a = [1, 2, 3];');
  expect(await readEditor(page)).toContain("console.log('x');");
});

test('Ctrl+Alt+L báo rõ khi ngôn ngữ chưa có trình định dạng', async ({ page }) => {
  await openApp(page);
  await chooseLanguage(page, 'py');
  await setCode(page, 'x   =    1');
  await focusEditor(page);

  await page.keyboard.press('Control+Alt+KeyL');

  await expect(page.getByText(/Chưa có trình định dạng cho Python/)).toBeVisible();
  // Không có formatter thì code phải giữ nguyên, không bị đụng vào
  expect(await readEditor(page)).toBe('x   =    1');
});

test('Ctrl+/ bật tắt comment dòng theo đúng ký hiệu của ngôn ngữ', async ({ page }) => {
  await openApp(page);
  await setCode(page, 'const a = 1;');
  await focusEditor(page);

  await page.keyboard.press('Control+Slash');
  await expect.poll(async () => readEditor(page)).toBe('// const a = 1;');

  await page.keyboard.press('Control+Slash');
  await expect.poll(async () => readEditor(page)).toBe('const a = 1;');
});

test('Ctrl+/ dùng dấu # trong Python, không phải //', async ({ page }) => {
  await openApp(page);
  await chooseLanguage(page, 'py');
  await setCode(page, 'x = 1');
  await focusEditor(page);

  await page.keyboard.press('Control+Slash');
  await expect.poll(async () => readEditor(page)).toBe('# x = 1');
});

test('Ctrl+Enter chạy code mà không cần rời bàn phím', async ({ page }) => {
  await openApp(page);
  await setCode(
    page,
    [
      "const t = new Array1DTracer('Mang');",
      'Layout.setRoot(t);',
      't.set([3, 1, 2]);',
      'Tracer.delay();',
    ].join('\n'),
  );
  await focusEditor(page);

  await page.keyboard.press('Control+Enter');

  await expect(page.getByRole('heading', { name: 'Mang' })).toBeVisible({ timeout: 20_000 });
});

test('Alt+Mũi tên lên di chuyển cả dòng', async ({ page }) => {
  await openApp(page);
  await setCode(page, 'const a = 1;\nconst b = 2;');
  await focusEditor(page);

  await page.keyboard.press('Control+End');
  await page.keyboard.press('Alt+ArrowUp');

  await expect.poll(async () => readEditor(page)).toBe('const b = 2;\nconst a = 1;');
});

test('file trống thì đổi ngôn ngữ chỉ đổi tên file đang mở', async ({ page }) => {
  await openApp(page);

  await chooseLanguage(page, 'java');

  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab')).toHaveText('Main.java');
});

test('bấm Chạy khi file trống thì báo rõ, không trả lỗi nội bộ của runtime', async ({ page }) => {
  await openApp(page);
  await chooseLanguage(page, 'java');

  await page.getByRole('button', { name: 'Chạy' }).click();

  await expect(page.getByText(/đang trống — chưa có gì để chạy/)).toBeVisible();
  await expect(page.getByText(/main\(String\[\]\)/)).toHaveCount(0);
});

test('Ctrl+Alt+L định dạng code Java', async ({ page }) => {
  await openApp(page);
  await chooseLanguage(page, 'java');
  await setCode(
    page,
    'class Main{public static void main(String[] a){int x=1;System.out.println(x);}}',
  );
  await focusEditor(page);

  await page.keyboard.press('Control+Alt+KeyL');

  // Prettier ngắt dòng theo AST chứ không chỉ thụt lề, nên thân hàm phải tách ra dòng riêng
  await expect
    .poll(async () => readEditorLf(page), { timeout: 30_000 })
    .toContain(['    int x = 1;', '    System.out.println(x);'].join('\n'));
});

test('Ctrl+Alt+L chuẩn hoá thụt lề cho ngôn ngữ ngoặc nhọn không có Prettier', async ({ page }) => {
  await openApp(page);
  await chooseLanguage(page, 'go');
  await setCode(
    page,
    ['func main() {', 'x := 1', 'if x > 0 {', 'println("}")', '}', '}'].join('\n'),
  );
  await focusEditor(page);

  await page.keyboard.press('Control+Alt+KeyL');

  await expect
    .poll(async () => readEditorLf(page))
    .toBe(
      ['func main() {', '  x := 1', '  if x > 0 {', '    println("}")', '  }', '}', ''].join('\n'),
    );
});

test('Ctrl+Alt+K mở bảng phím tắt, Escape đóng lại', async ({ page }) => {
  await openApp(page);
  await focusEditor(page);

  await page.keyboard.press('Control+Alt+KeyK');
  const dialog = page.getByRole('dialog', { name: 'Phím tắt' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Định dạng code')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('nút Phím tắt trên thanh trên cùng mở đúng bảng đó', async ({ page }) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Phím tắt' }).click();

  await expect(page.getByRole('dialog', { name: 'Phím tắt' })).toBeVisible();
});
