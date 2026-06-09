import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument, PDFFont, PDFName, PDFHexString, PDFString, PDFDict, PDFArray, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { FormField, FontFamily } from '@/types/shared';
import { FONT_CATALOG } from '@/features/pdf/config/fonts';

type StandardFontName = (typeof StandardFonts)[keyof typeof StandardFonts];

// [regular, bold, italic, boldItalic] standard-font variant per family.
const STANDARD_FONT_VARIANTS: Record<FontFamily, [StandardFontName, StandardFontName, StandardFontName, StandardFontName]> = {
  Helvetica: [
    StandardFonts.Helvetica,
    StandardFonts.HelveticaBold,
    StandardFonts.HelveticaOblique,
    StandardFonts.HelveticaBoldOblique,
  ],
  TimesRoman: [
    StandardFonts.TimesRoman,
    StandardFonts.TimesRomanBold,
    StandardFonts.TimesRomanItalic,
    StandardFonts.TimesRomanBoldItalic,
  ],
  Courier: [
    StandardFonts.Courier,
    StandardFonts.CourierBold,
    StandardFonts.CourierOblique,
    StandardFonts.CourierBoldOblique,
  ],
};

/** Pick the standard-font variant matching the field's bold/italic flags. */
function pickStandardFont(family: FontFamily, bold?: boolean, italic?: boolean): StandardFontName {
  const [reg, b, i, bi] = STANDARD_FONT_VARIANTS[family];
  if (bold && italic) return bi;
  if (bold) return b;
  if (italic) return i;
  return reg;
}

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

// Standard fonts keyed by their StandardFonts enum value (e.g. 'Helvetica-Bold').
type EmbeddedFonts = Record<string, PDFFont>;
type EmbeddedTTFFonts = Record<string, PDFFont>;

/**
 * Resolve the embedded font for a field: a custom TTF (displayFont) wins when
 * present; otherwise the standard-font variant matching its bold/italic flags.
 */
function resolveFont(
  fieldDef: FormField,
  embeddedFonts: EmbeddedFonts,
  ttfFonts: EmbeddedTTFFonts,
): PDFFont {
  if (fieldDef.displayFont && ttfFonts[fieldDef.displayFont]) {
    return ttfFonts[fieldDef.displayFont];
  }
  return embeddedFonts[pickStandardFont(fieldDef.fontFamily, fieldDef.bold, fieldDef.italic)];
}

function addTextField(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  fieldDef: FormField,
  embeddedFonts: EmbeddedFonts,
  ttfFonts: EmbeddedTTFFonts,
): void {
  const page = pdfDoc.getPages()[fieldDef.page - 1];
  const font = resolveFont(fieldDef, embeddedFonts, ttfFonts);
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
  if (fieldDef.required) {
    textField.enableRequired();
  }
  if (fieldDef.locked) {
    textField.enableReadOnly();
  }
  // Embed group/category in /TU (alternate name). pdfjs reads it back as `alternativeText`
  // from the WIDGET annotation dict, NOT the field dict — and does NOT inherit via /Parent.
  // pdf-lib keeps field and widget as separate dicts, so we MUST set /TU on every widget
  // (field dict too, for spec-compliant readers).
  if (fieldDef.group?.trim()) {
    const tu = PDFHexString.fromText(fieldDef.group.trim());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acro = (textField as any).acroField;
    acro.dict.set(PDFName.of('TU'), tu);
    for (const widget of acro.getWidgets()) {
      widget.dict.set(PDFName.of('TU'), tu);
    }
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

  // Persist the "auto-fit" intent. pdf-lib bakes a concrete size into the appearance
  // stream (good for fidelity), so we mark the /DA font size as 0 — the AcroForm
  // auto-size sentinel — AFTER baking. pdfjs reads it back as fontSize 0, which both
  // the editor (autoFitFont) and the filler interpret as auto-size. Visual stream is
  // untouched; only the DA metadata signals the intent.
  if (fieldDef.autoFitFont) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acro = (textField as any).acroField;
    const currentDA: string = acro.getDefaultAppearance() ?? '';
    const autoDA = currentDA
      ? currentDA.replace(/(\d+(?:\.\d+)?)\s+Tf/, '0 Tf')
      : '0 0 0 rg\n/Helvetica 0 Tf';
    acro.setDefaultAppearance(autoDA);
    for (const widget of acro.getWidgets()) {
      widget.dict.set(PDFName.of('DA'), PDFString.of(autoDA));
    }
  }
}

/**
 * Draw a field's default value as STATIC page content (no AcroForm widget) so it
 * renders as fixed, non-editable text. Used for text/number/date fields that carry
 * a default `value` — the exported PDF shows the value baked in, with no input.
 *
 * Font size, auto-fit, multiline wrapping and border mirror the interactive path
 * (addTextField) so the baked output matches what the editor previews.
 */
function drawStaticText(
  pdfDoc: PDFDocument,
  fieldDef: FormField,
  font: PDFFont,
): void {
  const page = pdfDoc.getPages()[fieldDef.page - 1];
  const value = fieldDef.value ?? '';
  const multiline = fieldDef.multiline ?? false;

  // White fill masks any underlying page text/graphics so the baked value
  // replaces what was there (mirrors the interactive field's white background).
  page.drawRectangle({
    x: fieldDef.x,
    y: fieldDef.y,
    width: fieldDef.width,
    height: fieldDef.height,
    color: rgb(1, 1, 1),
    ...(fieldDef.showBorder && { borderWidth: 1, borderColor: rgb(0.5, 0.5, 0.5) }),
  });

  const size = fieldDef.autoFitFont
    ? computeFitFontSize(value, fieldDef.width, fieldDef.height, fieldDef.fontSize, font, multiline)
    : fieldDef.fontSize;

  const PADDING = 2;
  if (multiline) {
    // Top-anchored: first baseline sits one line-height below the field top.
    page.drawText(value, {
      x: fieldDef.x + PADDING,
      y: fieldDef.y + fieldDef.height - size,
      font,
      size,
      maxWidth: fieldDef.width - PADDING * 2,
      lineHeight: size * 1.4,
      color: rgb(0, 0, 0),
    });
  } else {
    // Single line: vertically centered baseline within the field box.
    const maxWidth = fieldDef.width - PADDING * 2;
    const baselineY = fieldDef.y + (fieldDef.height - size) / 2 + size * 0.22;
    const startX = fieldDef.x + PADDING;
    page.drawText(value, {
      x: startX,
      y: baselineY,
      font,
      size,
      maxWidth,
      color: rgb(0, 0, 0),
    });

    // Underline / strikethrough drawn as rules under the actual glyph run
    // (clamped to the field width). Multiline is intentionally not decorated —
    // the wrap points aren't known here.
    if (fieldDef.underline || fieldDef.strikethrough) {
      const textWidth = Math.min(font.widthOfTextAtSize(value, size), maxWidth);
      const thickness = Math.max(0.5, size * 0.06);
      if (fieldDef.underline) {
        const uy = baselineY - size * 0.12;
        page.drawLine({
          start: { x: startX, y: uy },
          end: { x: startX + textWidth, y: uy },
          thickness,
          color: rgb(0, 0, 0),
        });
      }
      if (fieldDef.strikethrough) {
        const sy = baselineY + size * 0.28;
        page.drawLine({
          start: { x: startX, y: sy },
          end: { x: startX + textWidth, y: sy },
          thickness,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
}

/**
 * A field with a default value is exported as fixed, non-editable content
 * (drawn on the page) instead of a fillable AcroForm widget. Only the text-like
 * types bake: checkbox `value` is a toggle state (kept interactive — use `locked`
 * for read-only) and signature has no default-value concept.
 */
function hasBakedValue(f: FormField): boolean {
  const type = f.fieldType ?? 'text';
  if (type !== 'text' && type !== 'number' && type !== 'date') return false;
  if (!(typeof f.value === 'string' && f.value.length > 0)) return false;
  // bakeValue defaults to true; false keeps the field as a fillable input.
  return f.bakeValue !== false;
}

/**
 * Bake AcroForm JavaScript field actions (/AA) into a text field. Readers that
 * run AcroForm JS (Acrobat) enforce them; in any reader the action strings also
 * survive as a persistent marker that pdfjs reads back (`annotation.actions`),
 * so the editor and filler can re-detect the field type on round-trip.
 *
 * - K (keystroke) validates input as it is typed.
 * - F (format) normalizes the displayed value on commit. Omit it to avoid
 *   reformatting (e.g. numbers must NOT be rounded), include it for dates.
 */
function setFieldJsActions(
  pdfDoc: PDFDocument,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textField: any,
  actions: { K?: string; F?: string },
): void {
  const ctx = pdfDoc.context;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aa: Record<string, any> = {};
  if (actions.K) aa.K = ctx.obj({ S: PDFName.of('JavaScript'), JS: PDFString.of(actions.K) });
  if (actions.F) aa.F = ctx.obj({ S: PDFName.of('JavaScript'), JS: PDFString.of(actions.F) });
  textField.acroField.dict.set(PDFName.of('AA'), ctx.obj(aa));
}

// Values that mark a checkbox as checked when present in `value`.
const CHECKBOX_TRUTHY = new Set(['true', '1', 'x', 'X', '✓', 'si', 'sí', 'yes', 'on', 'checked']);

function isCheckboxChecked(value: string | undefined): boolean {
  if (!value) return false;
  return CHECKBOX_TRUTHY.has(value.trim().toLowerCase());
}

function addCheckBox(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  fieldDef: FormField,
): void {
  const page = pdfDoc.getPages()[fieldDef.page - 1];
  const checkBox = form.createCheckBox(fieldDef.name);
  // Checkboxes render as a square. Use the smaller dimension so the box is never
  // a stretched rectangle, centered within the field's bounding box.
  const size = Math.min(fieldDef.width, fieldDef.height);
  const offsetX = fieldDef.x + (fieldDef.width - size) / 2;
  const offsetY = fieldDef.y + (fieldDef.height - size) / 2;

  checkBox.addToPage(page, {
    x: offsetX,
    y: offsetY,
    width: size,
    height: size,
    borderWidth: 1,
    borderColor: rgb(0.4, 0.4, 0.4),
    backgroundColor: rgb(1, 1, 1),
  });

  if (isCheckboxChecked(fieldDef.value)) {
    checkBox.check();
  }
  if (fieldDef.required) checkBox.enableRequired();
  if (fieldDef.locked) checkBox.enableReadOnly();
}

function addSignatureField(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  fieldDef: FormField,
  font: PDFFont,
): void {
  const page = pdfDoc.getPages()[fieldDef.page - 1];
  // Signature zone: an interactive push button that acts as a click-to-place
  // image/drawing target. The button's own border marks the area and moves with
  // the field — we do NOT draw a baseline into the page content (it would be
  // permanent, decoupled from the field, and survive re-edits as an artifact).
  const button = form.createButton(fieldDef.name);
  button.addToPage('', page, {
    x: fieldDef.x,
    y: fieldDef.y,
    width: fieldDef.width,
    height: fieldDef.height,
    borderWidth: 1,
    borderColor: rgb(0.4, 0.4, 0.4),
    backgroundColor: rgb(1, 1, 1),
    font,
  });

  if (fieldDef.required) button.enableRequired();
  if (fieldDef.locked) button.enableReadOnly();
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
  pdfDoc.registerFontkit(fontkit);

  validateFields(fields, pdfDoc.getPageCount());

  if (fields.length === 0) {
    return pdfDoc.save();
  }

  const form = pdfDoc.getForm();

  // Clear all existing AcroForm fields and widget annotations directly via the PDF
  // dictionary — form.removeField() throws on PDFs with malformed annotation structures
  const acroForm = pdfDoc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  if (acroForm) {
    acroForm.set(PDFName.of('Fields'), pdfDoc.context.obj([]));
  }
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (annots) {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([]));
    }
  }

  // Embed standard fonts up-front, one per (family + bold/italic) variant used.
  const usedVariants = new Set<StandardFontName>(
    fields.map((f) => pickStandardFont(f.fontFamily, f.bold, f.italic)),
  );
  const embeddedFonts: EmbeddedFonts = {};
  for (const variant of usedVariants) {
    embeddedFonts[variant] = await pdfDoc.embedFont(variant);
  }

  // Embed TTF fonts for fields with displayFont (deduplicated by displayFont name)
  const ttfFonts: EmbeddedTTFFonts = {};
  const usedDisplayFonts = [
    ...new Set(fields.map((f) => f.displayFont).filter((df): df is string => !!df)),
  ];
  for (const displayFontName of usedDisplayFonts) {
    const entry = FONT_CATALOG.find((e) => e.name === displayFontName);
    if (!entry) continue;
    const ttfPath = join(process.cwd(), 'public', 'fonts', entry.ttfFilename);
    if (!existsSync(ttfPath)) {
      throw new Error(`Font asset not found: ${entry.ttfFilename}`);
    }
    ttfFonts[displayFontName] = await pdfDoc.embedFont(readFileSync(ttfPath));
  }

  for (const fieldDef of fields) {
    // Fields carrying a default value are baked as static, non-editable page
    // content — no AcroForm widget, so the value can't be edited in the output.
    if (hasBakedValue(fieldDef)) {
      drawStaticText(pdfDoc, fieldDef, resolveFont(fieldDef, embeddedFonts, ttfFonts));
      continue;
    }
    switch (fieldDef.fieldType) {
      case 'checkbox':
        addCheckBox(pdfDoc, form, fieldDef);
        break;
      case 'signature':
        addSignatureField(
          pdfDoc,
          form,
          fieldDef,
          embeddedFonts[pickStandardFont(fieldDef.fontFamily)],
        );
        break;
      case 'number': {
        // Text field + numeric keystroke action: restricts input to numbers in
        // readers that run AcroForm JS, and marks the field for round-trip detection.
        addTextField(pdfDoc, form, fieldDef, embeddedFonts, ttfFonts);
        setFieldJsActions(pdfDoc, form.getField(fieldDef.name), {
          K: 'AFNumber_Keystroke(0, 0, 0, 0, "", true);',
        });
        break;
      }
      case 'date': {
        // Text field + ISO date keystroke/format actions. Matches the HTML
        // <input type="date"> value (yyyy-mm-dd) used in the editor and filler.
        addTextField(pdfDoc, form, fieldDef, embeddedFonts, ttfFonts);
        setFieldJsActions(pdfDoc, form.getField(fieldDef.name), {
          K: 'AFDate_KeystrokeEx("yyyy-mm-dd");',
          F: 'AFDate_FormatEx("yyyy-mm-dd");',
        });
        break;
      }
      case 'text':
      default:
        addTextField(pdfDoc, form, fieldDef, embeddedFonts, ttfFonts);
        break;
    }
  }

  return pdfDoc.save();
}
