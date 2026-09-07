import { LANGUAGES, languageById, runsInBrowser } from '@av/config';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { runOnPiston, type RunOutcome } from './piston';
import { prepareJob, rebaseLineNumbers, toAsciiSource } from './prepare';
import {
  plainStdoutToCommands,
  preparePlainJob,
  PlainModeUnsupported,
  supportsPlainMode,
} from './plainMode';
import { hasTracer, readTracerSource, TracerNotFound } from './tracerSources';

const PISTON_URL = process.env['PISTON_URL'] ?? 'http://localhost:2000/api/v2';
const PORT = Number(process.env['PORT'] ?? 3001);

/** Giới hạn đầu vào — Task 3.2.4. Chặn ở đây rẻ hơn nhiều so với để Piston chịu. */
const MAX_CODE_BYTES = 256 * 1024;

/** Giới hạn tần suất thô: đủ chặn vòng lặp gọi liên tục, không nhằm chống tấn công. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (entry === undefined || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

interface RunBody {
  readonly languageId?: unknown;
  readonly code?: unknown;
  /** Chế độ dán code thuần: code không gọi tracer, hệ thống tự suy ra cách vẽ. */
  readonly plain?: unknown;
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  app.get('/api/health', async () => {
    const response = await fetch(`${PISTON_URL}/runtimes`).catch(() => null);
    return { ok: response?.ok === true, piston: PISTON_URL };
  });

  /** Ngôn ngữ nào thật sự chạy được ngay lúc này — giao diện dựa vào đây. */
  app.get('/api/languages', () => ({
    languages: LANGUAGES.map((language) => ({
      id: language.id,
      name: language.name,
      ext: language.ext,
      // Chạy được nếu chạy trong trình duyệt, hoặc đã có thư viện tracer cho Piston
      runnable: runsInBrowser(language) || hasTracer(language),
      inBrowser: runsInBrowser(language),
      plainMode: supportsPlainMode(language.id),
    })),
  }));

  app.post('/api/run', async (request, reply) => {
    const address = request.ip;
    if (rateLimited(address)) {
      return await reply.status(429).send({ message: 'Gọi quá nhanh, thử lại sau một phút.' });
    }

    const body = request.body as RunBody;
    const languageId = typeof body.languageId === 'string' ? body.languageId : '';
    const code = typeof body.code === 'string' ? body.code : '';

    const language = languageById(languageId);
    if (language === undefined) {
      return await reply.status(400).send({ message: `Không nhận ra ngôn ngữ "${languageId}"` });
    }
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      return await reply.status(413).send({ message: 'Code vượt 256 KB.' });
    }
    // Chặn sớm: gửi code rỗng xuống Piston thì runtime báo lỗi nội bộ của nó về thư viện
    // tracer được nối vào, chẳng dính gì tới việc người dùng chưa viết gì cả
    if (code.trim() === '') {
      return await reply.status(400).send({ message: 'Chưa có code nào để chạy.' });
    }

    const plain = body.plain === true;

    let tracerSource = '';
    if (!plain) {
      try {
        tracerSource = readTracerSource(language);
      } catch (error) {
        const message =
          error instanceof TracerNotFound ? error.message : 'Không đọc được thư viện tracer';
        return await reply.status(501).send({ message });
      }
    } else if (!supportsPlainMode(language.id)) {
      return await reply.status(501).send({ message: new PlainModeUnsupported(language).message });
    }

    const version = await resolveVersion(language.pistonRuntime);
    if (version === null) {
      return await reply.status(503).send({
        message: `Piston chưa cài gói "${language.pistonPackage}". Chạy: pnpm piston:install`,
      });
    }

    const job = plain ? preparePlainJob(language, code) : prepareJob(language, code, tracerSource);

    // Java biên dịch theo bảng mã nền tảng nên mã nguồn gửi đi phải thuần ASCII — xem
    // `toAsciiSource`. Đặt ở đây vì cả hai chế độ đều đi qua điểm này.
    const files =
      language.id === 'java'
        ? job.files.map((file) => ({ ...file, content: toAsciiSource(file.content) }))
        : job.files;

    const [mainFile] = files;
    const tracerFile = files[1] ?? { name: 'unused', content: '' };
    if (mainFile === undefined) {
      return await reply.status(500).send({ message: 'Không dựng được job' });
    }

    const outcome: RunOutcome = await runOnPiston(language, version, mainFile, tracerFile, {
      baseUrl: PISTON_URL,
      // Chế độ dán code thuần tự đọc stdout theo định dạng bước, không qua parser lệnh
      rawStdout: plain,
    });

    if (plain) {
      const built = plainStdoutToCommands(outcome.rawStdout ?? '', code, job.lineOffset);
      return await reply.send({
        status: outcome.status,
        commands: built.commands,
        userOutput: built.userOutput,
        message: outcome.message,
        issues: [],
      });
    }

    return await reply.send({
      status: outcome.status,
      commands: rebaseLineNumbers(outcome.commands, job.lineOffset),
      userOutput: outcome.userOutput,
      message: outcome.message,
      issues: outcome.issues,
    });
  });

  return app;
}

/** Phiên bản do Piston báo, không hardcode: bản cài trên mỗi máy có thể khác nhau. */
const versionCache = new Map<string, string | null>();

async function resolveVersion(runtime: string): Promise<string | null> {
  const cached = versionCache.get(runtime);
  if (cached !== undefined) return cached;

  const response = await fetch(`${PISTON_URL}/runtimes`).catch(() => null);
  if (response?.ok !== true) return null;

  const runtimes = (await response.json()) as { language: string; version: string }[];
  for (const item of runtimes) versionCache.set(item.language, item.version);
  return versionCache.get(runtime) ?? null;
}

export const GATEWAY_PORT = PORT;
export const GATEWAY_PISTON_URL = PISTON_URL;
