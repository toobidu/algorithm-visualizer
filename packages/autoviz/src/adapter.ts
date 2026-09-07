/**
 * Hợp đồng cho chế độ tự trực quan hóa của một ngôn ngữ.
 *
 * Thêm ngôn ngữ mới = thêm ĐÚNG MỘT file trong `adapters/` rồi khai báo vào `registry.ts`.
 * Không phải sửa gateway, không phải sửa giao diện, không phải sửa phần suy luận cách vẽ.
 *
 * Có hai cách lấy bước, và adapter tự chọn cách nào hợp với ngôn ngữ của mình:
 *
 * - **Hook lúc chạy** (Python, Ruby, PHP): bọc code người dùng, không sửa nội dung.
 *   Số dòng gần như không lệch, và mọi biến cục bộ đều lấy được.
 * - **Chèn mã nguồn** (Java, Go, JavaScript): ngôn ngữ không có hook nên phải chèn lời gọi
 *   sau mỗi câu lệnh. Chỉ thấy được biến mà bộ chèn nhận ra, nên kém chính xác hơn.
 */

export interface PlainFile {
  readonly name: string;
  readonly content: string;
}

export interface PlainProgram {
  readonly files: readonly PlainFile[];
  /**
   * Số dòng chèn thêm phía TRÊN code người dùng.
   * Trừ lại khỏi số dòng của bước, nếu không vạch sáng trong editor lệch xuống.
   */
  readonly lineOffset: number;
}

export interface PlainAdapter {
  /** Khớp `LanguageConfig.id`. */
  readonly languageId: string;

  /** Đường lấy bước, dùng để giải thích cho người dùng vì sao độ chính xác khác nhau. */
  readonly strategy: 'runtime-hook' | 'source-instrumentation';

  /**
   * Tên file runtime trong `tracers/<languageId>/`, hoặc `undefined` nếu adapter tự sinh
   * toàn bộ mã và không cần file kèm.
   */
  readonly runtimeFile: string | undefined;

  /** Dựng chương trình gửi cho Piston (hoặc cho Web Worker). */
  build(userCode: string, runtime: string): PlainProgram;
}
