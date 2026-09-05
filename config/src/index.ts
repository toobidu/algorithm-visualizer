import { type LanguageConfig } from './types';
import { LANGUAGES } from './registry.generated';

export { LANGUAGES };
export { type LanguageConfig, type PlainModeSupport, type TracerPlacement } from './types';

const BY_EXT = new Map(LANGUAGES.map((language) => [language.ext, language]));
const BY_ID = new Map(LANGUAGES.map((language) => [language.id, language]));

/** Duoi file cua mot ten file, khong co dau cham — ban cu goi la `extension()`. */
export function extensionOf(fileName: string): string | undefined {
  const match = /\.([^.]+)$/.exec(fileName);
  return match?.[1];
}

export function languageByExt(ext: string | undefined): LanguageConfig | undefined {
  return ext === undefined ? undefined : BY_EXT.get(ext);
}

export function languageById(id: string): LanguageConfig | undefined {
  return BY_ID.get(id);
}

export function languageOfFile(fileName: string): LanguageConfig | undefined {
  return languageByExt(extensionOf(fileName));
}

/** Duoi file duoc ho tro, dung cho quy tac chon tab mac dinh — ngam #19. */
export const SUPPORTED_EXTENSIONS: readonly string[] = LANGUAGES.map((language) => language.ext);

/**
 * Ngôn ngữ chạy thẳng trong Web Worker, không cần gọi Piston.
 * Xem PLAN.md §4.5 nhóm "Trong trình duyệt".
 */
export function runsInBrowser(language: LanguageConfig): boolean {
  return language.id === 'javascript' || language.id === 'typescript';
}
