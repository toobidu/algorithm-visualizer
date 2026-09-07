import { languageById } from '@av/config';
import { COMMAND_PREFIX } from '@av/protocol';
import { describe, expect, it } from 'vitest';
import { runOnPiston, type PistonFile } from './piston';

const java = languageById('java');
const python = languageById('python');
const FILE: PistonFile = { name: 'Main.java', content: 'x' };
const NO_TRACER: PistonFile = { name: 'unused', content: '' };

interface Stage {
  stdout?: string;
  stderr?: string;
  code?: number | null;
  signal?: string | null;
}

/**
 * Piston giả: trả lần lượt các kết quả đã dựng sẵn, và ghi lại số lần bị gọi.
 * Nhờ vậy nhánh chạy lại kiểm chứng được mà không cần Docker và không phải chờ thật.
 */
function fakePiston(stages: Stage[]): { fetchImpl: typeof fetch; calls: () => number } {
  let index = 0;
  const fetchImpl = (): Promise<Response> => {
    const run = stages[Math.min(index, stages.length - 1)];
    index += 1;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ run }),
    } as Response);
  };
  return { fetchImpl, calls: () => index };
}

/** Đồng hồ giả: mỗi lần đọc nhảy thêm `stepMs`, nên đo được "chạy nhanh" hay "chạy hết giờ". */
function clock(stepMs: number): () => number {
  let value = 0;
  return () => {
    const current = value;
    value += stepMs;
    return current;
  };
}

describe('Piston giết job sớm — chạy lại đúng một lần', () => {
  it('SIGKILL tức thì mà không có output thì chạy lại, lần hai thành công', async () => {
    expect(java).toBeDefined();
    if (java === undefined) return;

    const piston = fakePiston([
      { signal: 'SIGKILL', stdout: '', code: null },
      { signal: null, code: 0, stdout: '' },
    ]);

    const outcome = await runOnPiston(java, '15.0.2', FILE, NO_TRACER, {
      baseUrl: '',
      fetchImpl: piston.fetchImpl,
      now: clock(500),
    });

    expect(piston.calls()).toBe(2);
    expect(outcome.status).toBe('ok');
  });

  it('vẫn bị giết sớm sau lần hai thì báo đúng nguyên nhân, không đổ cho quá giờ', async () => {
    if (java === undefined) return;

    const piston = fakePiston([{ signal: 'SIGKILL', stdout: '', code: null }]);
    const outcome = await runOnPiston(java, '15.0.2', FILE, NO_TRACER, {
      baseUrl: '',
      fetchImpl: piston.fetchImpl,
      now: clock(500),
    });

    expect(piston.calls()).toBe(2);
    expect(outcome.status).toBe('runtime-error');
    expect(outcome.message).toContain('trước khi code kịp chạy');
  });

  it('quá giờ THẬT thì không chạy lại — vòng lặp vô hạn không được chạy hai lần', async () => {
    expect(python).toBeDefined();
    if (python === undefined) return;

    const piston = fakePiston([{ signal: 'SIGKILL', stdout: '', code: null }]);
    const outcome = await runOnPiston(python, '3.12.0', FILE, NO_TRACER, {
      baseUrl: '',
      fetchImpl: piston.fetchImpl,
      // Trôi hết ngân sách 10s: đây là quá giờ thật
      now: clock(python.runTimeoutMs),
    });

    expect(piston.calls()).toBe(1);
    expect(outcome.status).toBe('timeout');
  });

  it('bị giết sớm nhưng ĐÃ in xong thì nhận kết quả, không chạy lại', async () => {
    if (python === undefined) return;

    // Đúng ca của Java: main chạy xong, in đủ, JVM bị dọn nhầm lúc thoát.
    // Chạy lại là in trùng; báo timeout là nói sai nguyên nhân.
    const piston = fakePiston([
      {
        signal: 'SIGKILL',
        stdout: `${COMMAND_PREFIX}{"key":null,"method":"delay","args":[1]}`,
        code: null,
      },
    ]);
    const outcome = await runOnPiston(python, '3.12.0', FILE, NO_TRACER, {
      baseUrl: '',
      fetchImpl: piston.fetchImpl,
      now: clock(100),
    });

    expect(piston.calls()).toBe(1);
    expect(outcome.status).toBe('ok');
    expect(outcome.commands).toHaveLength(1);
  });

  it('bị giết khi ĐÃ tiêu hết ngân sách thì vẫn là quá giờ, dù có output', async () => {
    if (python === undefined) return;

    const piston = fakePiston([{ signal: 'SIGKILL', stdout: 'da in mot it', code: null }]);
    const outcome = await runOnPiston(python, '3.12.0', FILE, NO_TRACER, {
      baseUrl: '',
      fetchImpl: piston.fetchImpl,
      now: clock(python.runTimeoutMs),
    });

    expect(piston.calls()).toBe(1);
    expect(outcome.status).toBe('timeout');
  });

  it('chạy bình thường thì chỉ gọi Piston một lần', async () => {
    if (python === undefined) return;

    const piston = fakePiston([{ signal: null, code: 0, stdout: '' }]);
    await runOnPiston(python, '3.12.0', FILE, NO_TRACER, {
      baseUrl: '',
      fetchImpl: piston.fetchImpl,
      now: clock(100),
    });

    expect(piston.calls()).toBe(1);
  });
});
