import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { FormField, FontFamily } from 'pdf-form-editor-shared';

const STANDARD_FONT_MAP: Record<FontFamily, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

/**
 * Embed AcroForm text fields into an existing PDF and return the modified bytes.
 *
 * @throws {Error} if field names are not unique, page numbers are out of range,
 *                 or the PDF cannot be loaded (encrypted / corrupted).
 */
export async function generatePdf(
  pdfBuffer: Buffer,
  fields: FormField[],
): Promise<Uint8Array> {
  // Validate unique field names
  const names = fields.map((f) => f.name);
  const nameSet = new Set(names);
  if (nameSet.size !== names.length) {
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    throw new Error(
      `Duplicate field name(s): ${[...new Set(duplicates)].map((n) => `'${n}'`).join(', ')}. Field names must be unique.`,
    );
  }

  // Load the PDF — may throw for encrypted / corrupted files
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: false,
  });

  const totalPages = pdfDoc.getPageCount();

  // Validate page numbers
  for (const field of fields) {
    if (field.page < 1 || field.page > totalPages) {
      throw new Error(
        `Field '${field.name}' references page ${field.page}, but the PDF has ${totalPages} page(s).`,
      );
    }
  }

  if (fields.length === 0) {
    return pdfDoc.save();
  }

  const form = pdfDoc.getForm();

  // Remove all existing AcroForm fields before adding ours so that
  // re-exporting a previously-exported PDF does not duplicate fields
  for (const existingField of form.getFields()) {
    form.removeField(existingField);
  }

  // Embed all required fonts up-front (deduplicated by fontFamily)
  const usedFamilies = [...new Set(fields.map((f) => f.fontFamily))];
  const embeddedFonts: Partial<Record<FontFamily, Awaited<ReturnType<PDFDocument['embedFont']>>>> = {};
  for (const family of usedFamilies) {
    embeddedFonts[family] = await pdfDoc.embedFont(STANDARD_FONT_MAP[family]);
  }

  for (const fieldDef of fields) {
    const page = pdfDoc.getPages()[fieldDef.page - 1]; // pages() is 0-indexed
    const font = embeddedFonts[fieldDef.fontFamily]!;

    const textField = form.createTextField(fieldDef.name);

    textField.addToPage(page, {
      x: fieldDef.x,
      y: fieldDef.y,
      width: fieldDef.width,
      height: fieldDef.height,
      borderWidth: 1,
      borderColor: rgb(0.5, 0.5, 0.5),
      backgroundColor: rgb(1, 1, 1),
    });

    textField.setFontSize(fieldDef.fontSize);

    if (fieldDef.value) {
      textField.setText(fieldDef.value);
    }

    // updateAppearances is mandatory — omitting it leaves fields invisible in most readers
    textField.updateAppearances(font);
  }

  return pdfDoc.save();
}
