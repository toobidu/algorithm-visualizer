// So kết quả benchmark với moc đã ghi — PLAN.md Task 0.2.4.
// Dùng: node scripts/check-bench.mjs <ket-qua.json> <baseline.json>
//
// Hai muc kiểm trả khác nhau ve muc đó nghiem:
//
// 1. NGAN SACH CUNG ở §4 luôn fail khi vượt. Đây mỗi là hợp đồng that.
// 2. TROI so với moc chỉ fail khi vượt xa nguong nhiều. Đó wall-clock một lan trên may
//    dùng chung dao đóng 20-30% là binh thường; lấy 10% làm nguong fail sẽ làm CI đó
//    lien tuc vi nhiều chu không vi hoi quy that.
//
// Moc phải được ghi lại TREN CHINH MOI TRUONG chạy CI. Moc đó trên may phat trien
// không đúng để so với runner Linux.
import { readFileSync } from 'node:fs';

const WARN_TOLERANCE = 0.1;
const FAIL_TOLERANCE = 0.3;

// Vitest doi ten benchmark theo phien ban; anh xa ve khóa trong baseline.
const KEY_BY_BENCH_NAME = {
  'parseStdout voi 100.000 lenh': 'protocol.parseStdout.100k',
  'toChunks voi 100.000 lenh': 'protocol.toChunks.100k',
  'ap dung 200.000 lenh tu dau den cuoi': 'vizCore.applyCommands.200k',
  'tua nguoc toi chunk bat ky': 'vizCore.seekBackward',
  'layoutTree voi 10.000 node': 'vizCore.layoutTree.10k',
  'layoutRandom voi 500 node': 'vizCore.layoutRandom.500',
};

const [resultPath, baselinePath] = process.argv.slice(2);
if (!resultPath || !baselinePath) {
  console.error('Thieu tham so: <ket-qua.json> <baseline.json>');
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')).benchmarks;
const result = JSON.parse(readFileSync(resultPath, 'utf8'));

// Vitest long kết quả theo file rồi theo group; duyet đệ quy cho khỏi phụ thuộc hinh dang.
const measured = new Map();
function collect(node) {
  if (Array.isArray(node)) {
    node.forEach(collect);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  if (typeof node.name === 'string' && typeof node.mean === 'number') {
    measured.set(node.name, node.mean);
  }
  Object.values(node).forEach(collect);
}
collect(result);

const failures = [];
const warnings = [];
const missing = [];

for (const [benchName, key] of Object.entries(KEY_BY_BENCH_NAME)) {
  const expected = baseline[key];
  if (!expected) continue;

  const mean = measured.get(benchName);
  if (mean === undefined) {
    missing.push(`${benchName} (khoa ${key})`);
    continue;
  }

  const warnLimit = expected.meanMs * (1 + WARN_TOLERANCE);
  const failLimit = expected.meanMs * (1 + FAIL_TOLERANCE);
  const overBudget = mean > expected.budgetMs;
  const status = overBudget || mean > failLimit ? 'FAIL' : mean > warnLimit ? 'WARN' : 'OK';

  console.log(
    `${status.padEnd(4)} ${key}: ${mean.toFixed(2)}ms (moc ${expected.meanMs}ms, ngan sach ${expected.budgetMs}ms)`,
  );

  if (overBudget) {
    failures.push(`${key}: ${mean.toFixed(2)}ms vuot NGAN SACH CUNG ${expected.budgetMs}ms`);
  } else if (mean > failLimit) {
    failures.push(
      `${key}: ${mean.toFixed(2)}ms cham hon moc ${expected.meanMs}ms qua ${String(FAIL_TOLERANCE * 100)}%`,
    );
  } else if (mean > warnLimit) {
    warnings.push(`${key}: ${mean.toFixed(2)}ms cham hon moc ${expected.meanMs}ms, theo doi them`);
  }
}

if (missing.length > 0) {
  console.error(`\nKhong tim thay ket qua cho: ${missing.join(', ')}`);
  console.error('Doi ten benchmark thi phai cap nhat KEY_BY_BENCH_NAME trong file nay.');
  process.exit(1);
}

if (failures.length > 0) {
  console.error(`\nHoi quy hieu nang:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}

console.log('\nKhong co hoi quy hieu nang.');
