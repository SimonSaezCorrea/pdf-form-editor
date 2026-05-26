import { NextResponse } from 'next/server';
import { isPdf, extractPdfTemplate } from './fieldExtractorService';

/**
 * POST /api/pdf-fields
 *
 * Inspects a PDF and returns all AcroForm text fields as a TemplateFile,
 * which is directly importable into the PDF Form Editor via "Importar plantilla".
 *
 * Request (multipart/form-data):
 *   file  — PDF to inspect
 *   name  — (optional) template name; defaults to the PDF filename without extension
 *
 * See README.md for examples.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'MISSING_FILE' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!isPdf(bytes)) {
    return NextResponse.json({ error: 'INVALID_PDF' }, { status: 400 });
  }

  // Template name: explicit form field → PDF filename without extension → 'template'
  const rawName = formData.get('name');
  const name =
    typeof rawName === 'string' && rawName.trim()
      ? rawName.trim()
      : (file.name.replace(/\.pdf$/i, '') || 'template');

  try {
    const template = await extractPdfTemplate(bytes, name);
    return NextResponse.json(template, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'PROCESSING_ERROR' }, { status: 500 });
  }
}
