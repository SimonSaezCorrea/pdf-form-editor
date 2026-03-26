import { PDFDocument } from 'pdf-lib';
import { generatePdf } from '../../src/services/pdfService';
import type { FormField } from 'pdf-form-editor-shared';

/** Create a minimal single-page PDF buffer for testing */
async function createTestPdf(pages = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage([612, 792]); // US Letter
  }
  return Buffer.from(await doc.save());
}

const baseField: FormField = {
  id: 'test-1',
  name: 'full_name',
  page: 1,
  x: 72,
  y: 680,
  width: 200,
  height: 24,
  fontSize: 12,
  fontFamily: 'Helvetica',
};

describe('generatePdf', () => {
  test('returns valid PDF bytes when fields array is empty', async () => {
    const buf = await createTestPdf();
    const result = await generatePdf(buf, []);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // Verify the result is still a valid PDF
    const reloaded = await PDFDocument.load(result);
    expect(reloaded.getPageCount()).toBe(1);
  });

  test('embeds a text field into the PDF', async () => {
    const buf = await createTestPdf();
    const result = await generatePdf(buf, [baseField]);
    const doc = await PDFDocument.load(result);
    const form = doc.getForm();
    const field = form.getTextField('full_name');
    expect(field).toBeDefined();
  });

  test('embeds multiple fields with different fonts', async () => {
    const buf = await createTestPdf();
    const fields: FormField[] = [
      { ...baseField, name: 'f1', fontFamily: 'Helvetica' },
      { ...baseField, name: 'f2', fontFamily: 'TimesRoman', y: 640 },
      { ...baseField, name: 'f3', fontFamily: 'Courier', y: 600 },
    ];
    const result = await generatePdf(buf, fields);
    const doc = await PDFDocument.load(result);
    const form = doc.getForm();
    expect(form.getTextField('f1')).toBeDefined();
    expect(form.getTextField('f2')).toBeDefined();
    expect(form.getTextField('f3')).toBeDefined();
  });

  test('throws on duplicate field names', async () => {
    const buf = await createTestPdf();
    const fields: FormField[] = [
      { ...baseField, id: '1', name: 'dup' },
      { ...baseField, id: '2', name: 'dup', y: 600 },
    ];
    await expect(generatePdf(buf, fields)).rejects.toThrow(/duplicate/i);
  });

  test('throws when page number exceeds total pages', async () => {
    const buf = await createTestPdf(1); // 1 page only
    const fields: FormField[] = [{ ...baseField, page: 2 }];
    await expect(generatePdf(buf, fields)).rejects.toThrow(/page/i);
  });

  test('throws on page number 0 (invalid, must be ≥ 1)', async () => {
    const buf = await createTestPdf();
    const fields: FormField[] = [{ ...baseField, page: 0 }];
    await expect(generatePdf(buf, fields)).rejects.toThrow(/page/i);
  });

  test('works with multi-page PDF and fields on different pages', async () => {
    const buf = await createTestPdf(3);
    const fields: FormField[] = [
      { ...baseField, name: 'p1field', page: 1 },
      { ...baseField, name: 'p3field', page: 3, y: 700 },
    ];
    const result = await generatePdf(buf, fields);
    const doc = await PDFDocument.load(result);
    expect(doc.getForm().getTextField('p1field')).toBeDefined();
    expect(doc.getForm().getTextField('p3field')).toBeDefined();
  });
});
