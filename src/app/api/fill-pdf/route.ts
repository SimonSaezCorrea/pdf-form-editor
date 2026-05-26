import { FieldNotFoundError, fillPdf, isPdf } from './fillService';

// pdf-lib requires Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'INVALID_PDF' }, { status: 400 });
  }

  // Validate file
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return Response.json({ error: 'INVALID_PDF' }, { status: 400 });
  }
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(fileBytes)) {
    return Response.json({ error: 'INVALID_PDF' }, { status: 400 });
  }

  // Validate fields JSON
  const fieldsRaw = formData.get('fields');
  if (typeof fieldsRaw !== 'string') {
    return Response.json({ error: 'INVALID_FIELDS' }, { status: 400 });
  }
  let fields: Record<string, string>;
  try {
    const parsed = JSON.parse(fieldsRaw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return Response.json({ error: 'INVALID_FIELDS' }, { status: 400 });
    }
    fields = parsed as Record<string, string>;
  } catch {
    return Response.json({ error: 'INVALID_FIELDS' }, { status: 400 });
  }

  try {
    const result = await fillPdf(fileBytes, fields);
    return new Response(Buffer.from(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="filled.pdf"',
      },
    });
  } catch (err) {
    if (err instanceof FieldNotFoundError) {
      return Response.json(
        { error: 'FIELD_NOT_FOUND', field: err.field },
        { status: 400 },
      );
    }
    console.error('[fill-pdf] Unexpected error:', err);
    return Response.json({ error: 'PROCESSING_ERROR' }, { status: 500 });
  }
}
