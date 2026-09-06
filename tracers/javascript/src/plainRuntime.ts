/**
 * Runtime chế độ tự trực quan hóa cho JavaScript và TypeScript, chạy trong Web Worker.
 *
 * Bộ chèn mã (`@av/autoviz`) gọi `__avStep(dòng, {biến})` sau mỗi câu lệnh.
 * Nhiệm vụ ở đây chỉ là gom bước lại; phần suy ra vẽ gì nằm ở `@av/autoviz`,
 * dùng chung cho mọi ngôn ngữ.
 */
export const PLAIN_RUNTIME_SOURCE = String.raw`
const __avSteps = [];

// Trần số bước: thuật toán nặng có thể sinh hàng triệu bước và làm treo trình duyệt
const __AV_MAX_STEPS = 20000;

function __avRender(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { $num: Number.isNaN(value) ? 'NaN' : value > 0 ? 'Infinity' : '-Infinity' };
    }
    return Math.abs(value) > Number.MAX_SAFE_INTEGER ? String(value) : value;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(__avRender);
  return undefined;
}

function __avStep(line, vars) {
  if (__avSteps.length >= __AV_MAX_STEPS) return;
  const out = {};
  for (const name of Object.keys(vars)) {
    const rendered = __avRender(vars[name]);
    if (rendered !== undefined) out[name] = rendered;
  }
  __avSteps.push({ line: line, vars: out });
}
`;
