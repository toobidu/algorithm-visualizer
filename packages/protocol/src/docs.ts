import {
  CONSTRUCTOR_SPEC,
  GLOBAL_METHODS,
  LAYOUT_CLASSES,
  METHODS,
  TRACER_CLASSES,
  type MethodSpec,
} from './registry';

/**
 * Sinh `docs/tracer-api.md` từ chính `registry.ts` — Task 0.3.7.
 *
 * Viết tay bảng API là chắc chắn trôi lệch: thêm một method vào registry mà quên sửa tài liệu
 * thì người viết thư viện tracer cho ngôn ngữ thứ tám sẽ làm thiếu, và không có gì báo.
 * Sinh ra từ nguồn chân lý rồi để test đối chiếu thì không thể lệch.
 */
const NEWLINE = String.fromCharCode(10);

function arity(spec: MethodSpec): string {
  if (spec.max === null) return `${String(spec.min)}+`;
  if (spec.min === spec.max) return String(spec.min);
  return `${String(spec.min)}–${String(spec.max)}`;
}

function methodTable(methods: Record<string, MethodSpec>): string[] {
  const lines = ['| Method | Số tham số |', '|---|---|'];
  for (const name of Object.keys(methods).sort()) {
    const spec = methods[name];
    if (spec === undefined) continue;
    lines.push(`| \`${name}\` | ${arity(spec)} |`);
  }
  return lines;
}

export function renderTracerApiMarkdown(): string {
  const out: string[] = [
    '<!-- SINH TỰ ĐỘNG từ packages/protocol/src/registry.ts — đừng sửa tay. -->',
    '<!-- Sinh lại bằng: pnpm test (packages/protocol/src/docs.test.ts). -->',
    '',
    '# API tracer',
    '',
    'Danh mục đầy đủ lớp và method của giao thức lệnh. Thư viện tracer của MỌI ngôn ngữ phải',
    'phơi ra đúng bộ này, và sinh ra command list giống hệt nhau từng byte — bộ tuân thủ ở',
    '`tracers/_conformance/` kiểm chứng điều đó bằng cách chạy thật trên Piston.',
    '',
    '## Giao thức',
    '',
    'Mỗi lời gọi tracer in ra stdout đúng một dòng:',
    '',
    '```',
    'U+001E @AV| {"key":<khóa|null>,"method":<tên>,"args":[...]}',
    '```',
    '',
    'Tiền tố `U+001E @AV|` tách kênh lệnh khỏi `print` của người dùng. Thứ tự khóa trong JSON',
    'là cố định: `key`, `method`, `args`. Xem thêm PLAN.md §3.5 về chuẩn hóa số.',
    '',
    '## Lệnh khởi tạo',
    '',
    `- Tracer: \`method\` là tên lớp, ${arity(CONSTRUCTOR_SPEC.tracer)} tham số (tiêu đề hiển thị).`,
    `- Layout: \`method\` là tên lớp, ${arity(CONSTRUCTOR_SPEC.layout)} tham số (mảng khóa con).`,
    '',
    '## Lệnh toàn cục (`key` là `null`)',
    '',
    '| Method | Số tham số | Ý nghĩa |',
    '|---|---|---|',
    `| \`setRoot\` | ${arity(GLOBAL_METHODS.setRoot)} | Đặt object gốc của khung hình |`,
    `| \`delay\` | ${arity(GLOBAL_METHODS.delay)} | Cắt một khung hình, kèm số dòng đang chạy |`,
    '',
    '## Lớp tracer',
    '',
  ];

  for (const name of TRACER_CLASSES) {
    out.push(`### ${name}`, '', ...methodTable(METHODS[name]), '');
  }

  out.push('## Lớp layout', '');
  for (const name of LAYOUT_CLASSES) {
    out.push(`### ${name}`, '', ...methodTable(METHODS[name]), '');
  }

  out.push(
    '## Viết thư viện cho ngôn ngữ mới',
    '',
    '1. Tạo `tracers/<id>/<tracerFileName>` phơi ra đúng các lớp và method ở trên.',
    '2. Chỉ dùng thư viện chuẩn — sandbox của Piston không có mạng.',
    '3. Tự tuần tự hóa JSON thay vì dùng thư viện có sẵn: cách in số thực phải khớp',
    '   JavaScript từng ký tự, và phải chặn số nguyên vượt 2^53 ngay tại chỗ.',
    '4. Khai báo `tracerPlacement` trong `config/src/languages/<id>.ts`.',
    '5. Thêm một dòng vào bảng `CASES` của `tracers/_conformance/src/conformance.test.ts`',
    '   và một hằng thuật toán trong `bubbleSort.ts`.',
    '',
  );

  return out.join(NEWLINE);
}
