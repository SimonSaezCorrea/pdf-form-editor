import type { FormField } from '@/types/shared';
import { parseTemplateData } from '@/features/pdf/utils/templateSchema';
import { generatePdf } from './pdfService';

// pdf-lib requires Node.js runtime (crypto, Buffer) — not compatible with Edge runtime
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: 'Invalid multipart/form-data request.' },
      { status: 400 },
    );
  }

  // Validate PDF part
  const pdfFile = form.get('pdf') as File | null;
  if (!pdfFile || pdfFile.size === 0) {
    return Response.json(
      { error: 'Missing required field: pdf (PDF file).' },
      { status: 400 },
    );
  }

  // Validate fields JSON
  const rawFields = form.get('fields') as string | null;
  if (typeof rawFields !== 'string') {
    return Response.json(
      { error: 'Missing required field: fields (JSON array).' },
      { status: 400 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawFields);
  } catch {
    return Response.json(
      { error: 'Invalid JSON in fields parameter.' },
      { status: 400 },
    );
  }

  // Accept a TemplateFile of ANY schema version (v4/v3/v2/v1) OR a bare
  // FormField[] array, flattening to FormField[] via the shared schema logic —
  // one source of truth shared with the editor and /api/pdf-fields.
  let fields: FormField[];
  try {
    fields = parseTemplateData(parsed).fields;
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid fields payload.' },
      { status: 400 },
    );
  }

  try {
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const pdfBytes = await generatePdf(pdfBuffer, fields);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="form.pdf"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (
      message.toLowerCase().includes('encrypt') ||
      message.toLowerCase().includes('password')
    ) {
      return Response.json(
        { error: `Cannot load PDF: ${message}` },
        { status: 422 },
      );
    }

    if (
      message.toLowerCase().includes('failed to parse') ||
      message.toLowerCase().includes('invalid pdf')
    ) {
      return Response.json(
        { error: 'Cannot load PDF: file may be corrupted or encrypted.' },
        { status: 422 },
      );
    }

    if (
      message.includes('Duplicate field') ||
      message.includes('page') ||
      message.includes('encrypted')
    ) {
      return Response.json({ error: message }, { status: 400 });
    }

    console.error('[generate-pdf] Unexpected error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
