import { Tracer } from './tracer';
import { toDisplayString } from '../format';

/**
 * Nhat ky dang văn bản.
 *
 * Bản cũ đó nội dùng này vào DOM bang `dangerouslySetInnerHTML`, nghĩa là code của người
 * dùng in được HTML tuy y — một lỗ hổng XSS trên trang chia sẻ gist công khai.
 * Bản mới giữ log là VAN BAN THUAN; renderer không được dùng innerHTML.
 */
export class LogTracer extends Tracer {
  readonly kind = 'LogTracer';

  log = '';

  override reset(): void {
    this.log = '';
  }

  set(log = ''): void {
    this.log = log;
  }

  override clone(): LogTracer {
    const copy = new LogTracer(this.key, this.title);
    copy.log = this.log;
    return copy;
  }

  print(message: unknown): void {
    this.log += toDisplayString(message);
  }

  println(message: unknown): void {
    this.print(message);
    this.log += '\n';
  }

  /**
   * Chỉ hỗ trợ tap chỉ định dạng thường dùng. Cài đặt tai cho thay vì dùng thư viện
   * sprintf: thư viện tracer của 18 ngôn ngữ cũng phải cho ra kết quả giong hết, nên
   * phạm vi phải nhỏ và được định nghĩa ro.
   */
  printf(format: string, ...args: unknown[]): void {
    let index = 0;
    const result = format.replace(/%(%|[sdif]|\.\d+f)/g, (match) => {
      if (match === '%%') return '%';
      const arg = args[index];
      index += 1;
      if (match === '%d' || match === '%i') {
        const n = Number(arg);
        // Giá trị không doi được sang so thì in nguyên văn thay vì "NaN" hay ném lỗi:
        // trực quan hóa không được dùng lai chỉ vi một định dạng sai
        return Number.isFinite(n) ? String(Math.trunc(n)) : toDisplayString(arg);
      }
      if (match === '%f') return Number(arg).toString();
      if (match.endsWith('f')) {
        // '%.2f' -> lấy '2', không phải '.2': slice(1) vẫn con đầu chậm
        const digits = Number(match.slice(2, -1));
        return Number(arg).toFixed(digits);
      }
      return toDisplayString(arg);
    });
    this.print(result);
  }
}

export class MarkdownTracer extends Tracer {
  readonly kind = 'MarkdownTracer';

  markdown = '';

  override reset(): void {
    this.markdown = '';
  }

  set(markdown = ''): void {
    this.markdown = markdown;
  }

  override clone(): MarkdownTracer {
    const copy = new MarkdownTracer(this.key, this.title);
    copy.markdown = this.markdown;
    return copy;
  }
}
