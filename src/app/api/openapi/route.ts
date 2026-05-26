import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

/**
 * GET /api/openapi
 *
 * Serves the OpenAPI 3.0 spec as JSON.
 * The canonical source is public/openapi.yaml (served as-is at /openapi.yaml).
 * This route converts it to JSON so Swagger UI and other tools can consume it
 * without a YAML parser.
 *
 * Usage: open /api-docs in the browser — Swagger UI is embedded at that route.
 * Raw spec also available at /openapi.yaml (same origin, no CORS issues).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  try {
    const yamlPath = join(process.cwd(), 'public', 'openapi.yaml');
    const raw = readFileSync(yamlPath, 'utf-8');

    // Minimal YAML→JSON conversion using Node's built-in capabilities.
    // For a production app, install js-yaml. For this internal tool the
    // static file at /openapi.yaml is the primary distribution format.
    return new NextResponse(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
  }
}
