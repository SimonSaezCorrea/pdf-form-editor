import type { FormField, FontFamily } from '@/types/shared';
import { generatePdf } from './pdfService';

// pdf-lib requires Node.js runtime (crypto, Buffer) — not compatible with Edge runtime
export const runtime = 'nodejs';

const VALID_FONT_FAMILIES: FontFamily[] = ['Helvetica', 'TimesRoman', 'Courier'];

function isValidField(f: unknown): f is FormField {
  if (typeof f !== 'object' || f === null) return false;
  const field = f as Record<string, unknown>;
  return (
    typeof field.id === 'string' &&
    typeof field.name === 'string' &&
    field.name.length > 0 &&
    field.name.length <= 128 &&
    typeof field.page === 'number' &&
    Number.isInteger(field.page) &&
    field.page >= 1 &&
    typeof field.x === 'number' &&
    field.x >= 0 &&
    typeof field.y === 'number' &&
    field.y >= 0 &&
    typeof field.width === 'number' &&
    field.width > 0 &&
    typeof field.height === 'number' &&
    field.height > 0 &&
    typeof field.fontSize === 'number' &&
    Number.isInteger(field.fontSize) &&
    field.fontSize >= 6 &&
    field.fontSize <= 72 &&
    VALID_FONT_FAMILIES.includes(field.fontFamily as FontFamily) &&
    (field.value === undefined || typeof field.value === 'string') &&
    (field.displayFont === undefined || typeof field.displayFont === 'string')
  );
}

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

  let fields: unknown;
  try {
    fields = JSON.parse(rawFields);
  } catch {
    return Response.json(
      { error: 'Invalid JSON in fields parameter.' },
      { status: 400 },
    );
  }

  if (!Array.isArray(fields)) {
    return Response.json(
      { error: 'fields must be a JSON array.' },
      { status: 400 },
    );
  }

  // Validate each field object
  for (let i = 0; i < fields.length; i++) {
    if (!isValidField(fields[i])) {
      return Response.json(
        {
          error: `Field at index ${i} is invalid. Required: id, name, page≥1, x≥0, y≥0, width>0, height>0, fontSize(6–72), fontFamily(Helvetica|TimesRoman|Courier).`,
        },
        { status: 400 },
      );
    }
  }

  // Validate duplicate names
  const names = (fields as FormField[]).map((f) => f.name);
  const nameSet = new Set(names);
  if (nameSet.size !== names.length) {
    const dups = names.filter((n, i) => names.indexOf(n) !== i);
    return Response.json(
      {
        error: `Duplicate field name(s): ${[...new Set(dups)].map((n) => `'${n}'`).join(', ')}. Field names must be unique.`,
      },
      { status: 400 },
    );
  }

  try {
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const pdfBytes = await generatePdf(pdfBuffer, fields as FormField[]);

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
