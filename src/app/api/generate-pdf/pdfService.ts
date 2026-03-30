import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import type { FormField, FontFamily } from '@/types/shared';

const STANDARD_FONT_MAP: Record<FontFamily, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

/**
 * Compute the largest font size that makes `text` fit inside the field.
 * Uses exact font metrics from pdf-lib for single-line fields.
 * Returns `baseFontSize` unchanged when there is no text.
 */
function computeFitFontSize(
  text: string,
  fieldWidth: number,
  fieldHeight: number,
  baseFontSize: number,
  font: PDFFont,
  multiline: boolean,
): number {
  if (!text || text.length === 0) return baseFontSize;

  const PADDING = 4; // pts of horizontal padding
  const available = fieldWidth - PADDING;

  if (!multiline) {
    // Exact width at baseFontSize using AFM metrics
    const textWidth = font.widthOfTextAtSize(text, baseFontSize);
    if (textWidth <= available) return baseFontSize;
    // Scale down proportionally
    return Math.max(6, (available / textWidth) * baseFontSize);
  }

  // Multiline: estimate chars per line using exact avg char width, then fit to height.
  // sampleWidth gives a realistic average width per character for this font.
  const sampleWidth = font.widthOfTextAtSize('abcdefghijklmnopqrstuvwxyz0123456789', baseFontSize);
  const avgCharWidth = sampleWidth / 36;
  const charsPerLine = Math.max(1, Math.floor(available / avgCharWidth));
  const numLines = Math.ceil(text.length / charsPerLine);
  const heightNeeded = numLines * baseFontSize * 1.4;
  if (heightNeeded <= fieldHeight) return baseFontSize;
  return Math.max(6, (fieldHeight / heightNeeded) * baseFontSize);
}

function validateFields(fields: FormField[], totalPages: number): void {
  const names = fields.map((f) => f.name);
  const nameSet = new Set(names);
  if (nameSet.size !== names.length) {
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    const quoted = [...new Set(duplicates)].map((n) => `'${n}'`).join(', ');
    throw new Error(`Duplicate field name(s): ${quoted}. Field names must be unique.`);
  }
  for (const field of fields) {
    if (field.page < 1 || field.page > totalPages) {
      throw new Error(
        `Field '${field.name}' references page ${field.page}, but the PDF has ${totalPages} page(s).`,
      );
    }
  }
}

type EmbeddedFonts = Partial<Record<FontFamily, Awaited<ReturnType<PDFDocument['embedFont']>>>>;

function addTextField(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  fieldDef: FormField,
  embeddedFonts: EmbeddedFonts,
): void {
  const page = pdfDoc.getPages()[fieldDef.page - 1];
  const font = embeddedFonts[fieldDef.fontFamily]!;
  const textField = form.createTextField(fieldDef.name);

  textField.addToPage(page, {
    x: fieldDef.x,
    y: fieldDef.y,
    width: fieldDef.width,
    height: fieldDef.height,
    borderWidth: fieldDef.showBorder ? 1 : 0,
    ...(fieldDef.showBorder && { borderColor: rgb(0.5, 0.5, 0.5) }),
    backgroundColor: rgb(1, 1, 1),
  });

  if (fieldDef.multiline) {
    textField.enableMultiline();
  }

  const effectiveFontSize = fieldDef.autoFitFont && fieldDef.value
    ? computeFitFontSize(
        fieldDef.value,
        fieldDef.width,
        fieldDef.height,
        fieldDef.fontSize,
        font,
        fieldDef.multiline ?? false,
      )
    : fieldDef.fontSize;

  textField.setFontSize(effectiveFontSize);

  if (fieldDef.value) {
    textField.setText(fieldDef.value);
  }

  // updateAppearances is mandatory — omitting it leaves fields invisible in most readers
  textField.updateAppearances(font);
}

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
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });

  validateFields(fields, pdfDoc.getPageCount());

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
  const embeddedFonts: EmbeddedFonts = {};
  for (const family of usedFamilies) {
    embeddedFonts[family] = await pdfDoc.embedFont(STANDARD_FONT_MAP[family]);
  }

  for (const fieldDef of fields) {
    addTextField(pdfDoc, form, fieldDef, embeddedFonts);
  }

  return pdfDoc.save();
}
