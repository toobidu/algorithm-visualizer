import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from './index';

/**
 * Task 0.4.4 — đối chiếu khai báo ngôn ngữ với Piston thật.
 *
 * Bỏ qua khi không có Piston: CI offline không dựng Docker. Bật bằng:
 *   PISTON_URL=http://localhost:2000/api/v2 pnpm test
 *
 * CHỈ kiểm những ngôn ngữ đang bật trong `deploy/piston/packages.json`. Bản triển khai
 * cố ý chỉ cài ngôn ngữ đã có thư viện tracer — cài cả 17 tốn hàng GB cho những runtime
 * chưa ai dùng được. Phần còn lại được canh bằng phép kiểm `planned` bên dưới.
 */
const PISTON_URL = process.env['PISTON_URL'];

interface PackagesFile {
  readonly enabled: readonly string[];
  readonly planned: readonly string[];
}

const packages = JSON.parse(
  readFileSync('deploy/piston/packages.json', 'utf8'),
) as unknown as PackagesFile;

describe('danh sách gói triển khai khớp danh mục ngôn ngữ', () => {
  it('mọi gói khai báo trong config đều nằm ở enabled hoặc planned', () => {
    const declared = new Set([...packages.enabled, ...packages.planned]);
    const missing = LANGUAGES.filter((language) => !declared.has(language.pistonPackage)).map(
      (language) => `${language.id} -> ${language.pistonPackage}`,
    );
    expect(missing).toEqual([]);
  });

  it('không gói nào bị bật ở cả hai danh sách', () => {
    const planned = new Set(packages.planned);
    expect(packages.enabled.filter((name) => planned.has(name))).toEqual([]);
  });
});

describe.skipIf(PISTON_URL === undefined)('gói Piston tồn tại thật', () => {
  it('mọi ngôn ngữ đang bật đều có runtime tương ứng trên Piston', async () => {
    const response = await fetch(`${PISTON_URL ?? ''}/runtimes`);
    const runtimes: unknown = await response.json();
    expect(Array.isArray(runtimes)).toBe(true);

    const available = new Set(
      (runtimes as { language?: unknown }[])
        .map((runtime) => runtime.language)
        .filter((language): language is string => typeof language === 'string'),
    );

    const enabled = new Set(packages.enabled);
    const missing = LANGUAGES.filter(
      (language) => enabled.has(language.pistonPackage) && !available.has(language.pistonRuntime),
    ).map((language) => `${language.id} -> ${language.pistonRuntime}`);

    expect(missing).toEqual([]);
  }, 30_000);
});
