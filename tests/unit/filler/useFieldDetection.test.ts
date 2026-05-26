import { detectAcroFormFields } from '@/features/filler/hooks/useFieldDetection';
import type { PDFDocumentProxy } from 'pdfjs-dist';

function makeAnnotation(fieldName: string, fieldType: string, subtype = 'Widget') {
  return { subtype, fieldType, fieldName };
}

function mockPdfDoc(pageAnnotations: Record<number, ReturnType<typeof makeAnnotation>[]>): PDFDocumentProxy {
  const numPages = Math.max(...Object.keys(pageAnnotations).map(Number));
  return {
    numPages,
    getPage: async (pageNum: number) => ({
      getAnnotations: async () => pageAnnotations[pageNum] ?? [],
    }),
  } as unknown as PDFDocumentProxy;
}

describe('detectAcroFormFields', () => {
  test('detects 3 text fields from a single page', async () => {
    const doc = mockPdfDoc({
      1: [
        makeAnnotation('fullname', 'Tx'),
        makeAnnotation('petname', 'Tx'),
        makeAnnotation('startDate', 'Tx'),
      ],
    });
    const fields = await detectAcroFormFields(doc);
    expect(fields).toHaveLength(3);
    expect(fields.map((f) => f.name)).toEqual(['fullname', 'petname', 'startDate']);
    expect(fields.every((f) => f.type === 'text')).toBe(true);
    expect(fields.every((f) => f.page === 1)).toBe(true);
  });

  test('returns empty array for PDF with no AcroForm text fields', async () => {
    const doc = mockPdfDoc({ 1: [] });
    const fields = await detectAcroFormFields(doc);
    expect(fields).toHaveLength(0);
  });

  test('deduplicates field appearing on multiple pages — keeps first page', async () => {
    const doc = mockPdfDoc({
      1: [makeAnnotation('signature', 'Tx')],
      2: [makeAnnotation('signature', 'Tx'), makeAnnotation('date', 'Tx')],
    });
    const fields = await detectAcroFormFields(doc);
    expect(fields).toHaveLength(2);
    const sig = fields.find((f) => f.name === 'signature');
    expect(sig?.page).toBe(1);
    const date = fields.find((f) => f.name === 'date');
    expect(date?.page).toBe(2);
  });

  test('ignores non-Widget annotations', async () => {
    const doc = mockPdfDoc({
      1: [
        { subtype: 'Link', fieldType: 'Tx', fieldName: 'link' },
        makeAnnotation('realField', 'Tx'),
      ],
    });
    const fields = await detectAcroFormFields(doc);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('realField');
  });

  test('ignores non-Tx field types (checkboxes, etc.)', async () => {
    const doc = mockPdfDoc({
      1: [
        makeAnnotation('checkbox', 'Btn'),
        makeAnnotation('textField', 'Tx'),
      ],
    });
    const fields = await detectAcroFormFields(doc);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('textField');
  });
});
