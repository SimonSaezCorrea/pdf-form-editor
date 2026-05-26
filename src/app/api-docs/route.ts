/**
 * GET /api-docs
 *
 * Returns a self-contained Swagger UI HTML page that loads the OpenAPI spec
 * from /openapi.yaml (same origin — no CORS or mixed-content issues).
 *
 * Swagger UI is served from unpkg CDN; no npm package required.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>PDF Form Editor — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html, body { margin: 0; padding: 0; }
    #swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script>
    window.addEventListener('load', function () {
      SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
        layout: 'BaseLayout',
        deepLinking: true,
        tryItOutEnabled: true,
      });
    });
  </script>
</body>
</html>`;

export function GET() {
  return new Response(HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
