/**
 * Ghep class name, bỏ qua giá trị rong.
 *
 * `styles[key]` có kieu `string | undefined` vi `noUncheckedIndexedAccess` dang bat,
 * nên không nhet thang vào template literal được.
 */
export function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' ');
}
