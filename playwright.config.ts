import { defineConfig, devices } from '@playwright/test';

/**
 * E2E chạy trên trình duyệt thật — PLAN.md Task 2.4.8.
 *
 * Đây là thứ duy nhất bắt được lỗi CSS và lỗi tương tác chuột: test jsdom vẫn xanh
 * trong khi thanh chia bị `overflow: hidden` cắt mất và không ai kéo được.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Không có `--` trước cờ: pnpm chuyển thẳng `--` thành tham số của vite, vite bỏ qua
    // cả hai cờ sau đó rồi mở cổng 5173 — webServer chờ 5199 mãi không thấy ai
    command: 'pnpm --filter @av/web dev --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
