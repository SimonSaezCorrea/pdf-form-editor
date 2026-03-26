import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import app from '../../src/index';

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

describe('POST /api/generate-pdf', () => {
  test('returns 400 when pdf part is missing', async () => {
    const res = await request(app)
      .post('/api/generate-pdf')
      .field('fields', '[]');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when fields part is missing', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when fields is invalid JSON', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('fields', 'not-json');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid json/i);
  });

  test('returns 400 when fields is not an array', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('fields', '{"key":"value"}');
    expect(res.status).toBe(400);
  });

  test('returns 400 when a field has invalid fontFamily', async () => {
    const pdf = await createTestPdfBuffer();
    const badField = { ...validField, fontFamily: 'Comic Sans' };
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('fields', JSON.stringify([badField]));
    expect(res.status).toBe(400);
  });

  test('returns 400 when field names are duplicated', async () => {
    const pdf = await createTestPdfBuffer();
    const fields = [
      { ...validField, id: '1', name: 'dup' },
      { ...validField, id: '2', name: 'dup', y: 640 },
    ];
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('fields', JSON.stringify(fields));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/duplicate/i);
  });

  test('returns 200 with application/pdf for empty fields array', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('fields', '[]');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  test('returns 200 with application/pdf for valid single field', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('fields', JSON.stringify([validField]));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/form\.pdf/);
  });

  test('returned PDF contains the embedded AcroForm field', async () => {
    const pdf = await createTestPdfBuffer();
    const res = await request(app)
      .post('/api/generate-pdf')
      .attach('pdf', pdf, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('fields', JSON.stringify([validField]));

    expect(res.status).toBe(200);
    const resultDoc = await PDFDocument.load(res.body as Buffer);
    const field = resultDoc.getForm().getTextField('test_field');
    expect(field).toBeDefined();
  });
});
