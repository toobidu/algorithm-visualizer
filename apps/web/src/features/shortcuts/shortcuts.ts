import { FORMATTABLE_LANGUAGES, displayName, formatterQuality } from '../editor/format';

interface Shortcut {
  /** Mỗi phần tử là một tổ hợp; nhiều phần tử nghĩa là "hoặc". */
  readonly keys: readonly string[];
  readonly what: string;
  readonly hint?: string;
}

interface ShortcutGroup {
  readonly title: string;
  readonly items: readonly Shortcut[];
}

const namesFor = (quality: 'full' | 'indent'): string =>
  FORMATTABLE_LANGUAGES.filter((id) => formatterQuality(id) === quality)
    .map(displayName)
    .join(', ');

/**
 * Chốt sự thật DUY NHẤT về phím tắt của app, cho cả bảng trong giao diện lẫn README.
 *
 * Phím do app tự đăng ký nằm ở `CodeEditor.tsx` và `useGlobalShortcuts.ts`; phần còn lại là
 * mặc định của Monaco — đã đối chiếu với `monaco-editor` 0.52 chứ không chép theo trí nhớ.
 */
export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Chạy và trình phát',
    items: [
      { keys: ['Ctrl+Enter'], what: 'Chạy code', hint: 'Dùng được cả khi con trỏ đang ở editor' },
      { keys: ['Space'], what: 'Phát hoặc tạm dừng' },
      { keys: ['←', '→'], what: 'Lùi / tới một bước' },
      { keys: ['Home', 'End'], what: 'Về khung đầu / tới khung cuối' },
    ],
  },
  {
    title: 'Định dạng và comment',
    items: [
      {
        keys: ['Ctrl+Alt+L', 'Shift+Alt+F'],
        what: 'Định dạng code',
        hint: `Ngắt dòng đầy đủ: ${namesFor('full')}. Chỉ chuẩn hoá thụt lề: ${namesFor('indent')}.`,
      },
      { keys: ['Ctrl+/'], what: 'Bật tắt comment dòng, đúng ký hiệu của từng ngôn ngữ' },
      { keys: ['Ctrl+Shift+['], what: 'Gấp khối tại con trỏ' },
      { keys: ['Ctrl+K Ctrl+J'], what: 'Mở lại toàn bộ khối đã gấp' },
    ],
  },
  {
    title: 'Soạn thảo',
    items: [
      { keys: ['Alt+↑', 'Alt+↓'], what: 'Di chuyển cả dòng' },
      { keys: ['Shift+Alt+↑', 'Shift+Alt+↓'], what: 'Nhân đôi dòng' },
      { keys: ['Ctrl+D'], what: 'Chọn thêm chỗ giống từ đang bôi đen' },
      { keys: ['Alt+Click', 'Ctrl+Alt+↑', 'Ctrl+Alt+↓'], what: 'Thêm con trỏ' },
      { keys: ['Ctrl+Space'], what: 'Gợi ý từ đã có trong file' },
    ],
  },
  {
    title: 'Tìm và di chuyển',
    items: [
      { keys: ['Ctrl+F', 'Ctrl+H'], what: 'Tìm kiếm / thay thế trong file' },
      { keys: ['Ctrl+G'], what: 'Nhảy tới dòng' },
      { keys: ['F1'], what: 'Bảng lệnh đầy đủ của Monaco' },
      { keys: ['Ctrl+Alt+K'], what: 'Mở đúng bảng phím tắt này' },
      { keys: ['Tab', '←', '→'], what: 'Chọn thanh chia rồi đổi kích thước hai panel' },
    ],
  },
];

const isMac = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Monaco ánh xạ `CtrlCmd` sang phím Cmd trên macOS, nên nhãn hiển thị phải đổi theo. */
export function keyLabel(keys: string): string {
  if (!isMac()) return keys;
  return keys.replace(/Ctrl/g, '⌘').replace(/Alt/g, '⌥').replace(/Shift/g, '⇧');
}
