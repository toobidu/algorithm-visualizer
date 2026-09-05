// Sinh barrel cho config/src/languages — §5.6 có che 2: barrel là san pham sinh, không sửa tay.
import { readdirSync, writeFileSync } from 'node:fs';

const DIR = 'config/src/languages';
const ids = readdirSync(DIR)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();

const body = `// SINH TU DONG boi scripts/gen-barrels.mjs — khong sua tay.
// Chạy lại: pnpm gen:barrels
import { type LanguageConfig } from './types';
${ids.map((id) => `import { ${id} } from './languages/${id}';`).join('\n')}

export const LANGUAGES: readonly LanguageConfig[] = [
${ids.map((id) => `  ${id},`).join('\n')}
];
`;

writeFileSync('config/src/registry.generated.ts', body);
console.log(`da sinh barrel cho ${String(ids.length)} ngon ngu`);
