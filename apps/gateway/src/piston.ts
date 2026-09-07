import { type LanguageConfig } from '@av/config';
import { parseStdout, type Command, type ParseIssue } from '@av/protocol';

export interface PistonFile {
  readonly name: string;
  readonly content: string;
}

export interface RunOutcome {
  /** `ok` — chạy xong; các trạng thái còn lại phân biệt bốn loại hỏng ở Task 3.2.7 */
  readonly status: 'ok' | 'compile-error' | 'runtime-error' | 'timeout' | 'truncated';
  readonly commands: readonly Command[];
  readonly userOutput: string;
  readonly issues: readonly ParseIssue[];
  readonly message: string | undefined;
  /** stdout chưa xử lý, dành cho chế độ dán code thuần tự đọc theo định dạng riêng. */
  readonly rawStdout: string | undefined;
}

/** PLAN.md §4.6 — trần cứng, gateway áp thêm trên giới hạn của chính Piston. */
export const MAX_COMMANDS = 2_000_000;
const MAX_STDOUT_BYTES = 32 * 1024 * 1024;

interface PistonStage {
  readonly stdout?: string;
  readonly stderr?: string;
  readonly code?: number | null;
  readonly signal?: string | null;
}

interface PistonResponse {
  readonly compile?: PistonStage;
  readonly run?: PistonStage;
  readonly message?: string;
}

export interface PistonClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  /** Giữ lại stdout thô thay vì chỉ trả command list đã parse. */
  readonly rawStdout?: boolean;
  /** Đồng hồ, chỉ để test đo được nhánh chạy lại mà không phải chờ thật. */
  readonly now?: () => number;
}

/**
 * Phân loại tín hiệu giết tiến trình — quá giờ THẬT hay Piston dọn nhầm.
 *
 * Piston tái dùng UID giữa các job và dọn dẹp bằng cách giết mọi tiến trình của UID đó,
 * nên tiến trình còn sót của job trước kéo theo job sau. JVM thoát chậm nên Java dính
 * nhiều nhất: đo 12 lần chạy liên tiếp thì có 1 lần bị SIGKILL — mà stdout vẫn ĐỦ y hệt
 * những lần thành công, và chỉ hết 0,87 giây trên ngân sách 10 giây.
 *
 * Thước đo là THỜI GIAN, không phải tín hiệu: quá giờ thật thì phải tiêu gần hết ngân sách.
 * Bị giết sớm mà đã in ra thì chương trình đã chạy xong — bộ tuân thủ so từng byte sẽ đỏ
 * ngay nếu chỗ này nhận nhầm một trace cụt.
 */
const EARLY_KILL_RATIO = 0.5;

type KillKind = 'none' | 'timeout' | 'early-empty' | 'early-with-output';

function classifyKill(run: PistonStage, elapsedMs: number, runTimeoutMs: number): KillKind {
  if (run.signal !== 'SIGKILL' && run.signal !== 'SIGTERM') return 'none';
  if (elapsedMs >= runTimeoutMs * EARLY_KILL_RATIO) return 'timeout';
  return (run.stdout ?? '') === '' ? 'early-empty' : 'early-with-output';
}

/**
 * Gọi Piston chạy code người dùng.
 *
 * Thư viện tracer được gửi kèm trong `files` chứ không cài vào image: nhờ vậy sửa thư viện
 * không phải dựng lại container, và mọi ngôn ngữ dùng chung một cơ chế.
 */
export async function runOnPiston(
  language: LanguageConfig,
  version: string,
  userFile: PistonFile,
  tracerFile: PistonFile,
  options: PistonClientOptions,
): Promise<RunOutcome> {
  const doFetch = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Date.now());

  const payload = JSON.stringify({
    language: language.pistonRuntime,
    version,
    // Phần tử đầu là file chính — quy ước của Piston
    files: tracerFile.content === '' ? [userFile] : [userFile, tracerFile],
    compile_timeout: language.compileTimeoutMs,
    run_timeout: language.runTimeoutMs,
    compile_memory_limit: 512 * 1024 * 1024,
    run_memory_limit: 256 * 1024 * 1024,
  });

  const call = async (): Promise<{ body: PistonResponse; elapsedMs: number } | RunOutcome> => {
    const startedAt = now();
    const response = await doFetch(`${options.baseUrl}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });
    if (!response.ok) {
      return fail('runtime-error', `Piston trả về ${String(response.status)}`);
    }
    return { body: (await response.json()) as PistonResponse, elapsedMs: now() - startedAt };
  };

  let attempt = await call();
  if ('status' in attempt) return attempt;

  const killOf = (candidate: { body: PistonResponse; elapsedMs: number }): KillKind =>
    candidate.body.run === undefined
      ? 'none'
      : classifyKill(candidate.body.run, candidate.elapsedMs, language.runTimeoutMs);

  // Bị giết sớm mà chưa in được gì thì chạy lại ĐÚNG MỘT LẦN. Không chạy lại khi đã có
  // output (sẽ in trùng) và không chạy lại khi quá giờ thật (tiêu gấp đôi ngân sách cho
  // một vòng lặp vô hạn).
  if (killOf(attempt) === 'early-empty') {
    const retry = await call();
    if ('status' in retry) return retry;
    attempt = retry;
  }

  const body = attempt.body;
  const kill = killOf(attempt);

  if (body.compile !== undefined && (body.compile.code ?? 0) !== 0) {
    return fail('compile-error', body.compile.stderr ?? body.compile.stdout ?? 'Lỗi biên dịch');
  }

  const run = body.run;
  if (run === undefined) {
    return fail('runtime-error', body.message ?? 'Piston không trả về kết quả chạy');
  }

  // Piston giết tiến trình quá giờ bằng tín hiệu, không phải bằng mã thoát
  if (kill === 'timeout') {
    return fail(
      'timeout',
      `Code chạy quá ${String(language.runTimeoutMs / 1000)} giây và bị dừng.`,
    );
  }
  if (kill === 'early-empty') {
    // Vẫn trắng sau lần chạy lại: nói đúng nguyên nhân, chứ báo "chạy quá 10 giây" cho
    // một chương trình chạy chưa tới một giây là đánh lạc hướng người dùng.
    return fail(
      'runtime-error',
      'Piston dừng tiến trình trước khi code kịp chạy. Thử bấm Run lại.',
    );
  }
  // `early-with-output`: chương trình đã in xong rồi mới bị dọn nhầm — xử lý như bình thường

  const stdout = run.stdout ?? '';
  const keepRaw = options.rawStdout === true ? stdout : undefined;
  const parsed = parseStdout(stdout);

  if (stdout.length > MAX_STDOUT_BYTES) {
    return {
      status: 'truncated',
      commands: parsed.commands,
      userOutput: parsed.userOutput,
      issues: parsed.issues,
      message: 'Output vượt 32 MB nên đã bị cắt. Hãy giảm kích thước dữ liệu.',
      rawStdout: keepRaw,
    };
  }

  if (parsed.commands.length > MAX_COMMANDS) {
    return {
      status: 'truncated',
      commands: parsed.commands.slice(0, MAX_COMMANDS),
      userOutput: parsed.userOutput,
      issues: parsed.issues,
      message: `Trace vượt ${String(MAX_COMMANDS)} lệnh nên đã bị cắt.`,
      rawStdout: keepRaw,
    };
  }

  // Chương trình chết giữa chừng vẫn trả phần trace thu được — §3.6
  if ((run.code ?? 0) !== 0) {
    return {
      status: 'runtime-error',
      commands: parsed.commands,
      userOutput: parsed.userOutput,
      issues: parsed.issues,
      message:
        run.stderr === undefined || run.stderr === '' ? 'Chương trình dừng bất thường' : run.stderr,
      rawStdout: keepRaw,
    };
  }

  return {
    status: 'ok',
    commands: parsed.commands,
    userOutput: parsed.userOutput,
    issues: parsed.issues,
    message: undefined,
    rawStdout: keepRaw,
  };
}

function fail(status: RunOutcome['status'], message: string): RunOutcome {
  return { status, commands: [], userOutput: '', issues: [], message, rawStdout: undefined };
}
