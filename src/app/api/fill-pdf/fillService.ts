import { PDFDocument, StandardFonts } from 'pdf-lib';

export class FieldNotFoundError extends Error {
  constructor(public readonly field: string) {
    super(`Field not found in PDF: ${field}`);
  }
}

export function isPdf(bytes: Uint8Array): boolean {
  // Check for %PDF magic bytes (0x25 0x50 0x44 0x46)
  return bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
}

type FieldMeta = { fontSize: number; multiline: boolean };

export async function fillPdf(
  fileBytes: Uint8Array,
  fields: Record<string, string>,
  metadata: Record<string, FieldMeta> = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const form = pdfDoc.getForm();
  const helvetica = pdfDoc.embedStandardFont(StandardFonts.Helvetica);

  // Build set of available field names for O(1) lookup
  const availableNames = new Set(form.getFields().map((f) => f.getName()));

  // Validate all requested fields exist before writing any
  for (const name of Object.keys(fields)) {
    if (!availableNames.has(name)) {
      throw new FieldNotFoundError(name);
    }
  }

  // Write values with per-field metadata
  for (const [name, value] of Object.entries(fields)) {
    const textField = form.getTextField(name);
    const meta = metadata[name];

    if (meta?.multiline) textField.enableMultiline();

    textField.setText(value);
    // 0 = auto-size (preserve original field sizing)
    textField.setFontSize(meta?.fontSize ?? 0);
    textField.updateAppearances(helvetica);
  }

  form.flatten();
  return pdfDoc.save();
}
