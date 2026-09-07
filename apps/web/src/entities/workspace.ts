import { type SourceFile } from './file';

/**
 * Lưu code người dùng vào localStorage — đóng tab rồi mở lại là còn nguyên.
 *
 * Khóa có đánh số phiên bản: đổi hình dạng dữ liệu sau này thì tăng số, bản cũ tự bị
 * bỏ qua thay vì làm app vỡ khi đọc phải cấu trúc lạ.
 */
const KEY = 'av:workspace:v1';

interface Workspace {
  readonly files: readonly SourceFile[];
  readonly editingFileName: string | undefined;
}

function isFile(value: unknown): value is SourceFile {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record['name'] === 'string' && typeof record['content'] === 'string';
}

/**
 * Không tin dữ liệu đọc từ localStorage: người dùng sửa được nó bằng devtools, và bản
 * cũ của app có thể đã ghi hình dạng khác. Sai hình dạng thì coi như chưa có gì.
 */
export function loadWorkspace(): Workspace | undefined {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Chế độ riêng tư hoặc trình duyệt chặn lưu trữ
    return undefined;
  }
  if (raw === null) return undefined;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const files = parsed['files'];
    if (!Array.isArray(files) || !files.every(isFile)) return undefined;

    const editing = parsed['editingFileName'];
    return {
      files: files.map((file) => ({ ...file, contributors: undefined })),
      editingFileName: typeof editing === 'string' ? editing : undefined,
    };
  } catch {
    return undefined;
  }
}

export function saveWorkspace(workspace: Workspace): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        files: workspace.files.map(({ name, content }) => ({ name, content })),
        editingFileName: workspace.editingFileName,
      }),
    );
  } catch {
    // Hết dung lượng hoặc bị chặn: mất phần lưu chứ không được làm hỏng phiên đang dùng
  }
}
