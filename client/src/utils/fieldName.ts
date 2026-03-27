/** Minimum field dimensions in canvas pixels (enforced during visual resize) */
export const MIN_FIELD_WIDTH_PX = 20;
export const MIN_FIELD_HEIGHT_PX = 10;

/**
 * Compute a unique name for a duplicated field.
 *
 * Algorithm:
 *   1. Strip any trailing `_N` suffix from `sourceName` to get the base.
 *   2. Use `"campo"` as the base when `sourceName` is empty or whitespace.
 *   3. Return `${base}_${n}` for the lowest integer n ≥ 2 not in `existingNames`.
 *
 * Examples:
 *   duplicatedName('fullname', {})           → 'fullname_2'
 *   duplicatedName('fullname_2', {'fullname_2'}) → 'fullname_3'  (strips _2 → base 'fullname')
 *   duplicatedName('', {})                   → 'campo_2'
 */
export function duplicatedName(
  sourceName: string,
  existingNames: Set<string>,
): string {
  const base =
    sourceName.trim() === ''
      ? 'campo'
      : sourceName.replace(/_\d+$/, '');

  let n = 2;
  while (existingNames.has(`${base}_${n}`)) {
    n++;
  }
  return `${base}_${n}`;
}
