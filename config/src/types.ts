/**
 * Mô tả một ngôn ngữ được hỗ trợ. Đây là nguồn chân lý thứ hai của hệ thống
 * (nguon thứ nhất là `@av/protocol`) — PLAN.md Task 0.4.
 *
 * Thêm ngôn ngữ thu 19 chỉ cần thêm một file trong `config/src/languages/`.
 * Mỗi ngôn ngữ một file là có che chong xung dot ở §5.6: 15 agent làm 15 ngôn ngữ
 * ở Phase 4 không bao giờ chạm cùng một file.
 */
export interface LanguageConfig {
  /** Dinh danh noi bo, trung ten file */
  readonly id: string;
  /** Ten hien thi trong giao dien */
  readonly name: string;
  /** Duoi file, khong co dau cham. Phai la duy nhat */
  readonly ext: string;
  /** Dinh danh ngon ngu cua Monaco */
  readonly monacoId: string;
  /**
   * Tên GÓI để cài vào Piston (`POST /packages`).
   *
   * Khác tên runtime: gói `gcc` cung cấp runtime `c++`, gói `node` cung cấp `javascript`,
   * gói `dotnet` cung cấp `csharp`. Nhầm hai tên này là cài trượt mà không hiểu vì sao.
   */
  readonly pistonPackage: string;

  /** Tên NGÔN NGỮ khi gọi chạy (`POST /execute`), khớp `GET /runtimes`. */
  readonly pistonRuntime: string;

  /**
   * Ký hiệu mở comment một dòng. Đây là thứ sửa lỗi ngầm #17: bản cũ hardcode `//`
   * nên tính năng tự gấp khối `// visualize {` hỏng với Python, Ruby, Erlang, Racket, Elixir.
   */
  readonly commentPrefix: string;

  /** PLAN.md §4.6. Kotlin va Scala can 45s vi vuot mac dinh 10s cua Piston */
  readonly compileTimeoutMs: number;
  readonly runTimeoutMs: number;

  /** Ngon ngu co ho tro che do dan code thuan o Phase 5 hay khong */
  readonly plainMode: PlainModeSupport;

  /** Ten file thu vien tracer gui kem trong files[] cua Piston */
  readonly tracerFileName: string;

  /**
   * Ghép thư viện tracer với code người dùng bằng cách nào — xem `prepareJob`.
   *
   * Ba giá trị vì ba ràng buộc THẬT của Piston, không phải để cho đẹp:
   * - `separate-file`: gửi kèm file riêng. Sạch nhất, không lệch số dòng.
   * - `inline`: nhúng vào chỗ `tracerIncludeLine`. C++ bắt buộc — Piston nối đuôi `.cpp`
   *   vào MỌI file gửi lên nên header gửi kèm biến thành `.h.cpp` và `#include` không thấy.
   * - `append`: nối vào CUỐI file chính. Java bắt buộc — Piston chạy class đầu tiên,
   *   đặt thư viện lên trước là nó chạy nhầm thư viện thay vì code người dùng.
   */
  readonly tracerPlacement: TracerPlacement;

  /** Dòng khai báo thư viện cần thay thế. Chỉ có ý nghĩa khi `tracerPlacement` là `inline`. */
  readonly tracerIncludeLine: string | undefined;

  /** Ten file code mac dinh khi tao tab moi — ngam #21 */
  readonly mainFileName: string;
}

/**
 * `partial` danh cho Erlang và Elixir: BIF trace của BEAM bắt được loi gọi hàm
 * nhưng không xuống được mức từng dòng.
 */
export type PlainModeSupport = 'full' | 'partial' | 'none';

export type TracerPlacement = 'separate-file' | 'inline' | 'append';
