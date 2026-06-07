import { PDFDocument, PDFButton, PDFCheckBox, PDFTextField, StandardFonts } from 'pdf-lib';

// Values that mark a checkbox as checked.
const CHECKBOX_TRUTHY = new Set(['true', '1', 'x', '✓', 'si', 'sí', 'yes', 'on', 'checked']);

/** Decode a `data:image/(png|jpeg);base64,…` URL into raw bytes + format. */
function decodeImageDataUrl(value: string): { bytes: Uint8Array; png: boolean } | null {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(value);
  if (!match) return null;
  return { bytes: Buffer.from(match[2], 'base64'), png: /png/i.test(match[1]) };
}

/**
 * Stamp a signature image onto the page region of a push-button (signature zone)
 * field, fitting it inside the widget rect while preserving aspect ratio. Returns
 * true when the image was drawn (so the field can be removed before flattening).
 */
async function stampSignature(
  pdfDoc: PDFDocument,
  field: PDFButton,
  value: string,
): Promise<boolean> {
  const decoded = decodeImageDataUrl(value);
  const widget = field.acroField.getWidgets()[0];
  if (!decoded || !widget) return false;

  const image = decoded.png
    ? await pdfDoc.embedPng(decoded.bytes)
    : await pdfDoc.embedJpg(decoded.bytes);

  const rect = widget.getRectangle();
  const pageRef = widget.P();
  const page =
    (pageRef && pdfDoc.getPages().find((p) => p.ref === pageRef)) || pdfDoc.getPages()[0];

  const scale = Math.min(rect.width / image.width, rect.height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  page.drawImage(image, {
    x: rect.x + (rect.width - drawW) / 2,
    y: rect.y + (rect.height - drawH) / 2,
    width: drawW,
    height: drawH,
  });
  return true;
}

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

  // Write values with per-field metadata. Branch on the ACTUAL PDF field type
  // (not client metadata) so checkboxes and signature/push-button widgets do not
  // crash getTextField.
  const stampedSignatures: PDFButton[] = [];
  for (const [name, value] of Object.entries(fields)) {
    const field = form.getField(name);

    if (field instanceof PDFCheckBox) {
      if (CHECKBOX_TRUTHY.has(value.trim().toLowerCase())) field.check();
      else field.uncheck();
      continue;
    }

    if (field instanceof PDFTextField) {
      const meta = metadata[name];
      if (meta?.multiline) field.enableMultiline();
      field.setText(value);
      // 0 = auto-size (preserve original field sizing)
      field.setFontSize(meta?.fontSize ?? 0);
      field.updateAppearances(helvetica);
      continue;
    }

    // Push button = signature zone: stamp the drawn image onto the page.
    if (field instanceof PDFButton && (await stampSignature(pdfDoc, field, value))) {
      stampedSignatures.push(field);
    }
  }

  // Remove stamped signature buttons before flattening so the empty button border
  // does not paint over the drawn image.
  for (const field of stampedSignatures) {
    form.removeField(field);
  }

  form.flatten();
  return pdfDoc.save();
}
