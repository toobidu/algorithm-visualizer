import { findAdapter, stepsToCommands, type PlainProgram, type Step } from '@av/autoviz';
import { type LanguageConfig } from '@av/config';
import { splitStream, type Command } from '@av/protocol';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export class PlainModeUnsupported extends Error {
  constructor(language: LanguageConfig) {
    super(`Chế độ tự trực quan hóa chưa hỗ trợ ${language.name}.`);
    this.name = 'PlainModeUnsupported';
  }
}

/**
 * Dựng job cho chế độ tự trực quan hóa.
 *
 * Toàn bộ phần riêng của từng ngôn ngữ nằm trong adapter; ở đây chỉ đọc file runtime
 * rồi giao lại. Thêm ngôn ngữ mới không phải sửa file này.
 */
export function preparePlainJob(language: LanguageConfig, userCode: string): PlainProgram {
  const adapter = findAdapter(language.id);
  if (adapter === undefined) throw new PlainModeUnsupported(language);

  const runtime =
    adapter.runtimeFile === undefined
      ? ''
      : readFileSync(join(REPO_ROOT, 'tracers', language.id, adapter.runtimeFile), 'utf8');

  return adapter.build(userCode, runtime);
}

export { supportsPlainMode } from '@av/autoviz';

interface RawStep {
  readonly line?: unknown;
  readonly vars?: unknown;
}

/**
 * Đọc chuỗi bước từ stdout rồi dựng thành command list.
 *
 * Bước hỏng bị bỏ qua thay vì làm đứt cả trace — cùng tinh thần §3.6: chương trình chết
 * giữa chừng thì phần thu được vẫn đáng xem.
 */
export function plainStdoutToCommands(
  stdout: string,
  userCode: string,
  lineOffset: number,
): { commands: readonly Command[]; userOutput: string } {
  const { commandLines, userOutput } = splitStream(stdout);
  const steps: Step[] = [];

  for (const raw of commandLines) {
    let parsed: RawStep;
    try {
      parsed = JSON.parse(raw) as RawStep;
    } catch {
      continue;
    }
    if (typeof parsed.line !== 'number') continue;
    if (typeof parsed.vars !== 'object' || parsed.vars === null) continue;

    steps.push({
      line: Math.max(0, parsed.line - lineOffset),
      vars: parsed.vars as Step['vars'],
    });
  }

  return { commands: stepsToCommands(steps, userCode), userOutput };
}
