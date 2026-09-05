import { type Command, commandSchema } from './command';
import { splitStream } from './framing';
import {
  CONSTRUCTOR_SPEC,
  isArityValid,
  isGlobalMethod,
  isLayoutClass,
  isTracerClass,
  GLOBAL_METHODS,
  METHODS,
} from './registry';

export interface ParseIssue {
  /** So dong trong stdout goc, dem tu 1 — de bao loi ve dung cho */
  readonly line: number;
  readonly message: string;
  readonly raw: string;
}

export interface ParseResult {
  readonly commands: readonly Command[];
  readonly issues: readonly ParseIssue[];
  /** Output that cua nguoi dung, tach ra khoi luong lenh */
  readonly userOutput: string;
}

/**
 * Đọc stdout tho từ Piston thành command list.
 *
 * Đóng hỏng không làm dùng cả trace: no bien thành một issue và parser di tiep.
 * Lý do là §3.6 — chương trình có the chet giữa chung, phần trace thu được vẫn có giá trị.
 */
export function parseStdout(stdout: string): ParseResult {
  const { commandLines, userOutput } = splitStream(stdout);
  const commands: Command[] = [];
  const issues: ParseIssue[] = [];

  commandLines.forEach((raw, index) => {
    const line = index + 1;
    if (raw.trim() === '') return;

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch (error) {
      issues.push({
        line,
        raw,
        message:
          error instanceof Error ? `JSON khong hop le: ${error.message}` : 'JSON khong hop le',
      });
      return;
    }

    const parsed = commandSchema.safeParse(decoded);
    if (!parsed.success) {
      issues.push({
        line,
        raw,
        message: `Sai hinh dang lenh: ${parsed.error.issues[0]?.message ?? ''}`,
      });
      return;
    }

    const arityIssue = checkArity(parsed.data);
    if (arityIssue !== null) {
      issues.push({ line, raw, message: arityIssue });
      return;
    }

    commands.push(parsed.data);
  });

  return { commands, issues, userOutput };
}

/**
 * Kiểm trả so tham số theo registry. Bat loi som o đây rẻ hơn nhiều so với để
 * `VizEngine` ném ngoại lệ giữa luc phat animation.
 */
function checkArity(command: Command): string | null {
  const { key, method, args } = command;

  if (key === null) {
    if (!isGlobalMethod(method)) {
      return `"${method}" khong phai lenh toan cuc hop le`;
    }
    return isArityValid(GLOBAL_METHODS[method], args.length)
      ? null
      : `"${method}" nhan sai so tham so: ${String(args.length)}`;
  }

  if (isTracerClass(method)) {
    return isArityValid(CONSTRUCTOR_SPEC.tracer, args.length)
      ? null
      : `khoi tao "${method}" nhan toi da 1 tham so`;
  }

  if (isLayoutClass(method)) {
    return isArityValid(CONSTRUCTOR_SPEC.layout, args.length)
      ? null
      : `khoi tao "${method}" can dung 1 tham so la danh sach khoa con`;
  }

  // Method của instance: không biet object mảng lop nào cho toi lúc chạy, nên chỉ
  // kiểm trả ten method có tồn tại o ít nhat một lop và so tham số hợp lệ với lop đó.
  const owners = Object.values(METHODS).filter((table) => Object.hasOwn(table, method));
  if (owners.length === 0) {
    return `khong lop nao co method "${method}"`;
  }

  const anyValid = owners.some((table) => {
    const spec = table[method];
    return spec !== undefined && isArityValid(spec, args.length);
  });

  return anyValid ? null : `"${method}" nhan sai so tham so: ${String(args.length)}`;
}
