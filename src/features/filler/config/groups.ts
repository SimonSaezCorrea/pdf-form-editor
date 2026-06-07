/**
 * Orden lógico explícito de categorías de campos en la UI del filler.
 *
 * Reglas de ordenamiento (`orderGroups`):
 *  1. Grupos listados aquí (excepto 'General') van primero, en este orden.
 *  2. Grupos NO listados van después, alfabéticamente.
 *  3. 'General' siempre va al final.
 *
 * Esta es la ÚNICA fuente del orden — ningún componente debe hardcodear grupos.
 */
export const GROUP_ORDER: readonly string[] = [
  'Datos Personales',
  'Contacto',
  'Finanzas',
  'General',
];

const FALLBACK_GROUP = 'General';

/**
 * Ordena los nombres de grupo presentes según `GROUP_ORDER`.
 * Grupos desconocidos se intercalan alfabéticamente antes de 'General'.
 */
export function orderGroups(present: readonly string[]): string[] {
  const known = GROUP_ORDER.filter((g) => g !== FALLBACK_GROUP);
  const presentSet = new Set(present);

  const listed = known.filter((g) => presentSet.has(g));
  const unlisted = present
    .filter((g) => !known.includes(g) && g !== FALLBACK_GROUP)
    .sort((a, b) => a.localeCompare(b));
  const general = presentSet.has(FALLBACK_GROUP) ? [FALLBACK_GROUP] : [];

  return [...listed, ...unlisted, ...general];
}
