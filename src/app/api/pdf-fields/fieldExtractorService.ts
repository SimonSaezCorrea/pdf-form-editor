import { PDFDocument, PDFTextField, PDFName, PDFRef, PDFArray, PDFString, PDFHexString } from 'pdf-lib';
import type { FormField, FontFamily } from '@/types/shared';

// Re-export the TemplateFile shape so route.ts can type the response
export interface TemplateFile {
  schemaVersion: 1;
  name: string;
  createdAt: string;
  fields: FormField[];
}

/** Validate PDF magic bytes — same check used in fillService.ts */
export function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46    // F
  );
}

/**
 * Map a DA font-resource name to a valid FontFamily.
 * Standard PDF short names (Helv, TiRo, Cour) and full names are both handled.
 * Unknown / embedded fonts default to Helvetica.
 */
function resolveFont(daFontName: string): FontFamily {
  const n = daFontName.toLowerCase();
  if (n.includes('times') || n === 'tiro') return 'TimesRoman';
  if (n.includes('courier') || n === 'cour') return 'Courier';
  return 'Helvetica'; // Helv, Helvetica, unknown embedded fonts
}

/**
 * Parse the DA string (e.g. "/Helv 10 Tf 0 g") and return font name + size.
 * Returns { fontName: '', fontSize: 0 } when the DA is absent or unparseable.
 */
function parseDA(da: string): { fontName: string; fontSize: number } {
  // DA syntax: /ResourceName size Tf …
  const match = da.match(/\/(\S+)\s+(\d+(?:\.\d+)?)\s+Tf/);
  if (!match) return { fontName: '', fontSize: 0 };
  return { fontName: match[1], fontSize: parseFloat(match[2]) };
}

/**
 * Extract all AcroForm text fields from a PDF and return them as a TemplateFile.
 *
 * The output is directly importable into the PDF Form Editor via
 * "Importar plantilla" — it uses the same schema as the editor's export.
 *
 * @param bytes   Raw PDF bytes
 * @param name    Template name (e.g. PDF filename without extension)
 */
export async function extractPdfTemplate(
  bytes: Uint8Array,
  name: string,
): Promise<TemplateFile> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  const form   = pdfDoc.getForm();
  const pages  = pdfDoc.getPages();

  // Map widget object-number → 1-indexed page number via page Annots arrays
  const refToPage = new Map<number, number>();
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (!annots) continue;
    for (let j = 0; j < annots.size(); j++) {
      const entry = annots.get(j);
      if (entry instanceof PDFRef) refToPage.set(entry.objectNumber, i + 1);
    }
  }

  // Stable timestamp shared by all IDs in this batch (same pattern as editor)
  const ts = Date.now();
  const seen: Set<string> = new Set();
  const fields: FormField[] = [];

  for (const field of form.getFields()) {
    if (!(field instanceof PDFTextField)) continue;

    const fieldName = field.getName();
    if (seen.has(fieldName)) continue;
    seen.add(fieldName);

    const widgets = field.acroField.getWidgets();
    if (widgets.length === 0) continue;

    const widget = widgets[0];
    const { x, y, width, height } = widget.getRectangle();

    // Page via widget ref
    const widgetRef = (widget as unknown as { ref?: PDFRef }).ref;
    const page = widgetRef ? (refToPage.get(widgetRef.objectNumber) ?? 1) : 1;

    // DA from field dict (pdfjs v4 doesn't expose the raw string, but pdf-lib does)
    const daEntry = field.acroField.dict.lookupMaybe(
      PDFName.of('DA'),
      PDFString,
      PDFHexString,
    );
    const daString = daEntry?.decodeText() ?? '';
    const { fontName, fontSize: rawFontSize } = parseDA(daString);

    const fontFamily = resolveFont(fontName);
    // Clamp to valid editor range (6–72, integer). Auto-size (0) → 12 default.
    const fontSize = rawFontSize > 0
      ? Math.min(72, Math.max(6, Math.round(rawFontSize)))
      : 12;

    const index = fields.length + 1;

    fields.push({
      id:         `field-${ts}-${index}`,
      name:       fieldName,
      page,
      x,
      y,
      width,
      height,
      fontSize,
      fontFamily,
      value:      '',
    });
  }

  return {
    schemaVersion: 1,
    name,
    createdAt: new Date().toISOString(),
    fields,
  };
}
