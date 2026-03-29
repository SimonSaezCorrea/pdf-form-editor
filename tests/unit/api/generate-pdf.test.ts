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

  test('returns 400 when field names are duplicated', async () => {
    const pdf = await createTestPdfBuffer();
    const fields = [
      { ...validField, id: '1', name: 'dup' },
      { ...validField, id: '2', name: 'dup', y: 640 },
    ];
    const res = await makeRequest(pdf, fields);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/duplicate/i);
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
});
