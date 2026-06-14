import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { FormField, FontFamily, FieldTypeId } from '@/types/shared';

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

/**
 * Read the /DA font size. pdfjs v4 does NOT expose `fontSize` directly — it parses
 * /DA into `defaultAppearanceData.fontSize`. Falls back to a regex on the raw DA
 * string for older PDFs. Returns `null` when no DA size is present.
 *
 * NOTE: a size of 0 is meaningful — it is the AcroForm "auto-size" sentinel
 * (our autoFitFont marker), so it is returned as 0, not coerced away.
 */
function readDaFontSize(ann: Record<string, unknown>): number | null {
  const dad = ann['defaultAppearanceData'] as { fontSize?: number } | undefined;
  if (typeof dad?.fontSize === 'number') return dad.fontSize;

  const da = ann['defaultAppearance'] as string | undefined;
  const m = da?.match(/(\d+(?:\.\d+)?)\s+Tf/);
  return m ? Number.parseFloat(m[1]) : null;
}

/**
 * Infer a typed text field from its AcroForm JS actions. pdf-lib/Acrobat write
 * `AFNumber_*` / `AFDate_*` helpers into the field actions, which pdfjs exposes
 * as `actions: Record<string, string[]>`. Returns 'text' when no marker matches.
 */
function textFieldKind(ann: Record<string, unknown>): 'text' | 'number' | 'date' {
  const actions = ann['actions'] as Record<string, string[]> | undefined;
  if (!actions) return 'text';
  const all = Object.values(actions).flat();
  if (all.some((js) => typeof js === 'string' && js.includes('AFNumber'))) return 'number';
  if (all.some((js) => typeof js === 'string' && js.includes('AFDate'))) return 'date';
  return 'text';
}

let extractCounter = 0;

/**
 * Extract existing AcroForm text fields from a loaded PDF document.
 * Returns a FormField[] ready to be loaded into useFieldStore.
 * Only Widget annotations with fieldType 'Tx' (text) are extracted.
 */
export async function extractFieldsFromPdf(pdfDoc: PDFDocumentProxy): Promise<FormField[]> {
  const fields: FormField[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();

    for (const ann of annotations as Record<string, unknown>[]) {
      if (ann['subtype'] !== 'Widget') continue;

      // Map the AcroForm widget to a UI field type. Only text (Tx) and button
      // (Btn → checkbox / signature push-button) widgets are editable here.
      let fieldType: FieldTypeId;
      if (ann['fieldType'] === 'Tx') {
        fieldType = textFieldKind(ann);
      } else if (ann['fieldType'] === 'Btn') {
        fieldType = ann['pushButton'] === true ? 'signature' : 'checkbox';
      } else {
        continue;
      }

      const rect = ann['rect'] as [number, number, number, number] | undefined;
      if (!Array.isArray(rect) || rect.length < 4) continue;

      const [x1, y1, x2, y2] = rect;
      const width = x2 - x1;
      const height = y2 - y1;
      if (width <= 0 || height <= 0) continue;

      const name =
        typeof ann['fieldName'] === 'string' && ann['fieldName'].trim()
          ? ann['fieldName'].trim()
          : `field_${++extractCounter}`;

      extractCounter++;

      // DA size 0 = AcroForm auto-size sentinel → restore the autoFitFont checkbox.
      // For display we fall back to 12 (the baked fit-size is not recoverable from DA).
      const daSize = readDaFontSize(ann);
      const autoFitFont = daSize === 0;
      const fontSize = daSize && daSize > 0 ? daSize : 12;

      let value = typeof ann['fieldValue'] === 'string' ? ann['fieldValue'] : '';
      if (fieldType === 'checkbox') {
        // pdfjs reports the on-state name (e.g. 'Yes') or 'Off' for checkboxes.
        value = value && value !== 'Off' ? '✓' : '';
      } else if (fieldType === 'signature') {
        value = '';
      }

      // Category lives in /TU, which pdfjs exposes as `alternativeText`.
      // Undefined when absent — editor treats empty group as "no category".
      const group =
        typeof ann['alternativeText'] === 'string' && ann['alternativeText'].trim()
          ? ann['alternativeText'].trim()
          : undefined;

      // Behavior flags — pdfjs exposes booleans directly (no bit math needed).
      // borderStyle.width > 0 ⇒ the field was exported with a visible border.
      const borderWidth = (ann['borderStyle'] as { width?: number } | undefined)?.width ?? 0;

      fields.push({
        id: `field-${Date.now()}-${extractCounter}`,
        name,
        page: pageNum,
        x: Math.max(0, x1),
        y: Math.max(0, y1),
        width,
        height,
        fontSize,
        fontFamily: mapFontFamily(
          (ann['defaultAppearanceData'] as { fontName?: unknown } | undefined)?.fontName,
        ),
        value,
        group,
        autoFitFont,
        required: ann['required'] === true,
        multiline: ann['multiLine'] === true,
        locked: ann['readOnly'] === true,
        showBorder: borderWidth > 0,
        fieldType,
      });
    }
  }

  return fields;
}
