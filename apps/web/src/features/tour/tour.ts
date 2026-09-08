/**
 * Tour hướng dẫn cho người mở app lần đầu.
 *
 * `driver.js` nạp muộn: nó chỉ chạy đúng một lần trong đời một trình duyệt, kéo vào lần
 * tải đầu là bắt mọi người trả giá cho thứ hầu hết không dùng tới.
 *
 * Neo bằng `data-tour` chứ không bằng tên class: CSS Modules băm tên class lúc build nên
 * `.language` trong mã nguồn không phải tên có thật trong DOM.
 */
const SEEN_KEY = 'av:tour-seen:v1';

interface Step {
  readonly selector: string;
  readonly title: string;
  readonly body: string;
}

const STEPS: readonly Step[] = [
  {
    selector: '[data-tour="editor"]',
    title: 'Viết code ở đây',
    body: 'Mỗi ngôn ngữ một tab riêng. Bấm + để thêm file, Ctrl+Alt+K xem toàn bộ phím tắt.',
  },
  {
    selector: '[data-tour="language"]',
    title: 'Chọn ngôn ngữ',
    body:
      'Đuôi file quyết định code chạy bằng ngôn ngữ nào. Đổi ở đây là chuyển sang tab của ' +
      'ngôn ngữ đó — code cũ nằm nguyên ở tab của nó, ứng dụng không tự dịch giúp.',
  },
  {
    selector: '[data-tour="plain"]',
    title: 'Tự trực quan hóa',
    body:
      'Bật lên thì dán thuật toán bình thường là chạy được, không cần gọi tracer. ' +
      'Tắt đi thì bạn tự gọi tracer để chọn vẽ gì.',
  },
  {
    selector: '[data-tour="run"]',
    title: 'Chạy code',
    body: 'Hoặc Ctrl+Enter ngay trong editor. JavaScript và TypeScript chạy thẳng trong trình duyệt; các ngôn ngữ khác cần gateway.',
  },
  {
    selector: '[data-tour="progress"]',
    title: 'Tua từng bước',
    body: 'Kéo để nhảy tới bất kỳ khung hình nào. Mũi tên ←/→ đi từng bước, Space phát và dừng.',
  },
];

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Bị chặn lưu trữ thì tour hiện lại lần sau — phiền chút chứ không hỏng gì
  }
}

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

/** Mở tour. Gọi được cả lúc vào lần đầu lẫn khi người dùng tự bấm nút Hướng dẫn. */
export async function startTour(): Promise<void> {
  const [{ driver }] = await Promise.all([
    import('driver.js'),
    import('driver.js/dist/driver.css'),
  ]);

  // Neo nào không có trên trang thì bỏ qua, chứ không để driver.js dừng giữa chừng
  const steps = STEPS.filter((step) => document.querySelector(step.selector) !== null).map(
    (step) => ({
      element: step.selector,
      popover: { title: step.title, description: step.body },
    }),
  );
  if (steps.length === 0) return;

  // Ghi đã xem NGAY KHI MỞ, không đợi đóng.
  //
  // Đợi sự kiện đóng thì người tắt tab giữa chừng, bấm ra ngoài, hay thoát bằng Escape
  // đều bị hỏi lại ở lần sau. Đã hiện ra một lần là đủ — muốn xem lại thì có nút Hướng dẫn.
  markSeen();

  driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: 'Tiếp',
    prevBtnText: 'Quay lại',
    doneBtnText: 'Xong',
    progressText: '{{current}}/{{total}}',
    steps,
  }).drive();
}
