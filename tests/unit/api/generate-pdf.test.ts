import { PDFDocument } from 'pdf-lib';
import { POST } from '@/app/api/generate-pdf/route';

async function createTestPdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return Buffer.from(await doc.save());
}

const validField = {
  id: '1',
  name: 'test_field',
  page: 1,
  x: 72,
  y: 680,
  width: 200,
  height: 24,
  fontSize: 12,
  fontFamily: 'Helvetica',
};

async function makeRequest(pdf: Buffer | null, fields: unknown): Promise<Response> {
  const form = new FormData();
  if (pdf !== null) {
    form.append('pdf', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), 'test.pdf');
  }
  if (fields !== undefined) {
    form.append('fields', typeof fields === 'string' ? fields : JSON.stringify(fields));
  }
  return POST(new Request('http://localhost/api/generate-pdf', { method: 'POST', body: form }));
}

describe('POST /api/generate-pdf', () => {
  test('returns 400 when pdf part is missing', async () => {
    const res = await makeRequest(null, []);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test('returns 400 when fields part is missing', async () => {
    const pdf = await createTestPdfBuffer();
    const form = new FormData();
    form.append('pdf', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), 'test.pdf');
    const res = await POST(new Request('http://localhost/api/generate-pdf', { method: 'POST', body: form }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test('returns 400 when fields is invalid JSON', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await makeRequest(pdf, 'not-json');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  test('returns 400 when fields is not an array', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await makeRequest(pdf, '{"key":"value"}');
    expect(res.status).toBe(400);
  });

  test('returns 400 when a field has invalid fontFamily', async () => {
    const pdf = await createTestPdfBuffer();
    const badField = { ...validField, fontFamily: 'Comic Sans' };
    const res = await makeRequest(pdf, [badField]);
    expect(res.status).toBe(400);
  });

  test('returns 200 and shares one field across duplicated names', async () => {
    const pdf = await createTestPdfBuffer();
    const fields = [
      { ...validField, id: '1', name: 'dup' },
      { ...validField, id: '2', name: 'dup', y: 640 },
    ];
    const res = await makeRequest(pdf, fields);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');

    // The output has a single 'dup' field exposing both widgets (shared value).
    const out = await PDFDocument.load(await res.arrayBuffer());
    const named = out.getForm().getFields().filter((f) => f.getName() === 'dup');
    expect(named).toHaveLength(1);
    expect(named[0].acroField.getWidgets()).toHaveLength(2);
  });

  test('returns 200 with application/pdf for empty fields array', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await makeRequest(pdf, []);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/pdf/);
  });

  test('returns 200 with application/pdf for valid single field', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await makeRequest(pdf, [validField]);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/pdf/);
    expect(res.headers.get('content-disposition')).toMatch(/form\.pdf/);
  });

  test('returned PDF contains the embedded AcroForm field', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await makeRequest(pdf, [validField]);
    expect(res.status).toBe(200);
    const resultBuffer = Buffer.from(await res.arrayBuffer());
    const resultDoc = await PDFDocument.load(resultBuffer);
    const field = resultDoc.getForm().getTextField('test_field');
    expect(field).toBeDefined();
  });

  test('accepts a v4 TemplateFile and flattens its nested groups', async () => {
    const pdf = await createTestPdfBuffer();
    const v4Template = {
      schemaVersion: 4,
      name: 'tpl',
      createdAt: '2026-01-01',
      fields: [{
        id: 'f1',
        name: 'aligned',
        type: 'text',
        value: '',
        group: 'General',
        validation: { required: true },
        behavior: { bakeValue: true, locked: false, multiline: false },
        geometry: { page: 1, x: 72, y: 680, width: 200, height: 24 },
        style: { fontFamily: 'Helvetica', fontSize: 12, align: 'right', autoFitFont: false, bold: false, italic: false, showBorder: false, strikethrough: false, underline: false },
      }],
    };
    const res = await makeRequest(pdf, v4Template);
    expect(res.status).toBe(200);
    const out = await PDFDocument.load(await res.arrayBuffer());
    const field = out.getForm().getTextField('aligned');
    expect(field).toBeDefined();
    expect(field.getAlignment()).toBe(2); // align:'right' survived the v4 → FormField flatten
  });
});
