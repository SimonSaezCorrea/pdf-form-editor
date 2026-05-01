import { PDFDocument } from 'pdf-lib';
import { POST } from '@/app/api/fill-pdf/route';

/** Create a PDF with named AcroForm text fields */
async function createTestPdfWithFields(fieldNames: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  fieldNames.forEach((name, i) => {
    const field = form.createTextField(name);
    field.addToPage(page, { x: 72, y: 700 - i * 40, width: 200, height: 24 });
  });
  return Buffer.from(await doc.save());
}

/** Create a PDF without any AcroForm fields */
async function createEmptyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return Buffer.from(await doc.save());
}

function makeRequest(file: Buffer | string | null, fields: unknown): Promise<Response> {
  const form = new FormData();
  if (file !== null) {
    if (typeof file === 'string') {
      form.append('file', new Blob([file], { type: 'text/plain' }), 'file.txt');
    } else {
      form.append('file', new Blob([new Uint8Array(file)], { type: 'application/pdf' }), 'test.pdf');
    }
  }
  if (fields !== undefined) {
    form.append('fields', typeof fields === 'string' ? fields : JSON.stringify(fields));
  }
  return POST(new Request('http://localhost/api/fill-pdf', { method: 'POST', body: form }));
}

describe('POST /api/fill-pdf', () => {
  test('200: PDF válido + campos existentes → application/pdf + filled.pdf', async () => {
    const pdf = await createTestPdfWithFields(['fullname', 'petname']);
    const res = await makeRequest(pdf, { fullname: 'Juan Pérez', petname: 'Firulais' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/pdf/);
    expect(res.headers.get('content-disposition')).toMatch(/filled\.pdf/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x44); // D
    expect(bytes[3]).toBe(0x46); // F
  });

  test('400 INVALID_PDF: archivo no-PDF', async () => {
    const res = await makeRequest('not a pdf', {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_PDF');
  });

  test('400 INVALID_FIELDS: JSON inválido en fields', async () => {
    const pdf = await createTestPdfWithFields(['name']);
    const res = await makeRequest(pdf, 'notjson');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_FIELDS');
  });

  test('400 FIELD_NOT_FOUND: campo inexistente en el PDF', async () => {
    const pdf = await createTestPdfWithFields(['fullname']);
    const res = await makeRequest(pdf, { nonexistent: 'value' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('FIELD_NOT_FOUND');
    expect(body.field).toBe('nonexistent');
  });

  test('200: fields={} → PDF original aplanado (sin valores)', async () => {
    const pdf = await createEmptyPdf();
    const res = await makeRequest(pdf, {});
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/pdf/);
  });
});
