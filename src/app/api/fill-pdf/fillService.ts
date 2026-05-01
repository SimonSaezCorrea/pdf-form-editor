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

export async function fillPdf(
  fileBytes: Uint8Array,
  fields: Record<string, string>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const form = pdfDoc.getForm();

  // Build set of available field names for O(1) lookup
  const availableNames = new Set(form.getFields().map((f) => f.getName()));

  // Validate all requested fields exist before writing any
  for (const name of Object.keys(fields)) {
    if (!availableNames.has(name)) {
      throw new FieldNotFoundError(name);
    }
  }

  // Write values
  for (const [name, value] of Object.entries(fields)) {
    form.getTextField(name).setText(value);
  }

  // Principle XXXI: updateFieldAppearances → flatten → save
  const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(helvetica);
  form.flatten();

  return pdfDoc.save();
}
