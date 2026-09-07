import { type LanguageConfig } from '@av/config';
import { type Command } from '@av/protocol';
import { type PistonFile } from './piston';

const NEWLINE = String.fromCharCode(10);

export interface PreparedJob {
  readonly files: readonly PistonFile[];
  /**
   * Số dòng thư viện chèn thêm phía trên code người dùng.
   * Phải trừ lại khỏi số dòng trong lệnh `delay`, nếu không vạch sáng trong editor lệch xuống.
   */
  readonly lineOffset: number;
}

/**
 * Ghép thư viện tracer với code người dùng.
 *
 * Ba cách, quyết định bằng `language.tracerPlacement`. Mỗi cách sinh ra từ một ràng buộc
 * THẬT của Piston, đã kiểm chứng bằng cách chạy thử:
 *
 * 1. `separate-file` (Python, Ruby, PHP, Go, JS…). Sạch sẽ, không lệch số dòng.
 * 2. `inline` (C++). Bắt buộc với gcc: Piston nối đuôi `.cpp` vào MỌI file được gửi,
 *    nên `algorithm-visualizer.h` biến thành `algorithm-visualizer.h.cpp` và `#include`
 *    không tìm thấy. Nhúng thẳng thì tránh được, đổi lại phải bù số dòng.
 * 3. `append` (Java). Piston chạy class ĐẦU TIÊN trong file; đặt thư viện lên trước là nó
 *    chạy nhầm thư viện. Nối xuống cuối thì số dòng không lệch — đổi lại thư viện không
 *    được chứa câu `import` nào, vì Java bắt `import` phải đứng trước mọi khai báo class.
 */
export function prepareJob(
  language: LanguageConfig,
  userCode: string,
  tracerSource: string,
): PreparedJob {
  const main = language.mainFileName;

  if (language.tracerPlacement === 'separate-file') {
    return {
      files: [
        { name: main, content: userCode },
        { name: language.tracerFileName, content: tracerSource },
      ],
      lineOffset: 0,
    };
  }

  if (language.tracerPlacement === 'append') {
    return {
      files: [{ name: main, content: [userCode, tracerSource].join(NEWLINE) }],
      lineOffset: 0,
    };
  }

  const lines = userCode.split(NEWLINE);
  const marker = language.tracerIncludeLine;
  const markerIndex = marker === undefined ? -1 : lines.findIndex((line) => line.trim() === marker);

  // Không tìm thấy dòng khai báo thì vẫn chèn lên đầu: người dùng xoá dòng đó
  // không nên làm chương trình không chạy được
  const insertAt = markerIndex >= 0 ? markerIndex : 0;
  const removeCount = markerIndex >= 0 ? 1 : 0;

  const tracerLines = tracerSource.split(NEWLINE);
  const merged = [...lines];
  merged.splice(insertAt, removeCount, ...tracerLines);

  return {
    files: [{ name: main, content: merged.join(NEWLINE) }],
    lineOffset: tracerLines.length - removeCount,
  };
}

/**
 * Đổi mọi ký tự ngoài ASCII thành escape `\uXXXX`.
 *
 * `javac` đọc mã nguồn bằng bảng mã của NỀN TẢNG, mà container Piston chạy với locale
 * POSIX nên bảng mã đó là ASCII: chuỗi hằng có dấu hỏng NGAY LÚC BIÊN DỊCH, trước khi
 * runtime kịp làm gì. Piston không cho truyền cờ `-encoding` nên cách duy nhất là gửi mã
 * nguồn thuần ASCII — Java xử lý escape này ở bước tiền xử lý, trước cả khi tách token.
 *
 * Không đổi số dòng nên `lineOffset` giữ nguyên.
 */
export function toAsciiSource(content: string): string {
  return content.replace(
    /[\u0080-\uffff]/g,
    (character) => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'),
  );
}

/**
 * Trả số dòng trong lệnh `delay` về hệ quy chiếu của code người dùng.
 * Lệnh khác không đụng tới.
 */
export function rebaseLineNumbers(
  commands: readonly Command[],
  lineOffset: number,
): readonly Command[] {
  if (lineOffset === 0) return commands;

  return commands.map((command) => {
    if (command.key !== null || command.method !== 'delay') return command;
    const [first] = command.args;
    if (typeof first !== 'number') return command;
    return { ...command, args: [Math.max(0, first - lineOffset), ...command.args.slice(1)] };
  });
}
