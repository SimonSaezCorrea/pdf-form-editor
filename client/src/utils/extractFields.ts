import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { FormField, FontFamily } from 'pdf-form-editor-shared';

const FONT_NAME_MAP: Array<[string, FontFamily]> = [
  ['Helv', 'Helvetica'],
  ['Helvetica', 'Helvetica'],
  ['TiRo', 'TimesRoman'],
  ['Times', 'TimesRoman'],
  ['Cour', 'Courier'],
  ['Courier', 'Courier'],
];

function mapFontFamily(fontName: unknown): FontFamily {
  if (typeof fontName !== 'string') return 'Helvetica';
  for (const [key, family] of FONT_NAME_MAP) {
    if (fontName.includes(key)) return family;
  }
  return 'Helvetica';
}

let extractCounter = 0;

/**
 * Extract existing AcroForm text fields from a loaded PDF document.
 * Returns a FormField[] ready to be loaded into useFieldStore.
 * Only Widget annotations with fieldType 'Tx' (text) are extracted.
 */
export async function extractFieldsFromPdf(pdfDoc: PDFDocumentProxy): Promise<FormField[]> {
  const fields: FormField[] = [];
  const usedNames = new Set<string>();

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();

    for (const ann of annotations as Record<string, unknown>[]) {
      if (ann['subtype'] !== 'Widget' || ann['fieldType'] !== 'Tx') continue;

      const rect = ann['rect'] as [number, number, number, number] | undefined;
      if (!Array.isArray(rect) || rect.length < 4) continue;

      const [x1, y1, x2, y2] = rect;
      const width = x2 - x1;
      const height = y2 - y1;
      if (width <= 0 || height <= 0) continue;

      // Build a unique field name
      const rawName =
        typeof ann['fieldName'] === 'string' && ann['fieldName'].trim()
          ? ann['fieldName'].trim()
          : `field_${++extractCounter}`;

      let name = rawName;
      if (usedNames.has(name)) {
        let suffix = 2;
        while (usedNames.has(`${rawName}_${suffix}`)) suffix++;
        name = `${rawName}_${suffix}`;
      }
      usedNames.add(name);
      extractCounter++;

      const fontSize =
        typeof ann['fontSize'] === 'number' && ann['fontSize'] > 0
          ? ann['fontSize']
          : 12;

      const value =
        typeof ann['fieldValue'] === 'string' ? ann['fieldValue'] : '';

      fields.push({
        id: `field-${Date.now()}-${extractCounter}`,
        name,
        page: pageNum,
        x: Math.max(0, x1),
        y: Math.max(0, y1),
        width,
        height,
        fontSize,
        fontFamily: mapFontFamily(ann['fontName']),
        value,
      });
    }
  }

  return fields;
}
