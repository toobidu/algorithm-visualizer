// Cai va doi chieu goi ngon ngu cua Piston — PLAN.md Task 3.1.2 va 3.1.3.
// Dung: node scripts/piston.mjs install|check
import { readFileSync } from 'node:fs';

const BASE = process.env.PISTON_URL ?? 'http://localhost:2000/api/v2';
const config = JSON.parse(readFileSync('deploy/piston/packages.json', 'utf8'));

async function api(path, init) {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} -> ${response.status} ${text}`);
  return text === '' ? null : JSON.parse(text);
}

// `/packages` bao trang thai cai dat theo TEN GOI; `/runtimes` liet ke TEN NGON NGU.
// Hai khong gian ten khac nhau: goi `gcc` cho ra runtime `c++`.
async function installedPackages() {
  const packages = await api('/packages');
  const map = new Map();
  for (const item of packages) {
    if (item.installed === true) map.set(item.language, item.language_version);
  }
  return map;
}

async function install() {
  const available = await api('/packages');
  const have = await installedPackages();

  for (const language of config.enabled) {
    if (have.has(language)) {
      console.log(`OK   ${language} ${have.get(language)} (da co)`);
      continue;
    }
    // Chon phien ban moi nhat trong so cac ban Piston cung cap
    const versions = available
      .filter((p) => p.language === language)
      .map((p) => p.language_version)
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    const version = versions[versions.length - 1];
    if (version === undefined) {
      console.error(`LOI  ${language}: Piston khong co goi nay`);
      process.exitCode = 1;
      continue;
    }
    console.log(`...  dang cai ${language} ${version}`);
    await api('/packages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language, version }),
    });
    console.log(`OK   ${language} ${version}`);
  }
}

async function check() {
  const have = await installedPackages();
  const missing = config.enabled.filter((language) => !have.has(language));
  for (const language of config.enabled) {
    console.log(`${have.has(language) ? 'OK  ' : 'THIEU'} ${language} ${have.get(language) ?? ''}`);
  }
  if (missing.length > 0) {
    console.error(`\nThieu goi: ${missing.join(', ')}. Chay: pnpm piston:install`);
    process.exitCode = 1;
  }
}

const command = process.argv[2];
if (command === 'install') await install();
else if (command === 'check') await check();
else {
  console.error('Dung: node scripts/piston.mjs install|check');
  process.exitCode = 2;
}
