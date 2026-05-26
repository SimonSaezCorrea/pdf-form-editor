/**
 * GET /api-docs
 *
 * Returns a self-contained Swagger UI HTML page that loads the OpenAPI spec
 * from /openapi.yaml (same origin — no CORS or mixed-content issues).
 *
 * Colors match the app's design tokens (tokens.css).
 * Light/dark toggle persisted in localStorage, respects OS preference.
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
    /* ── Design tokens (mirrors tokens.css) ──────────────── */
    :root {
      --color-primary:      #07575B;
      --color-primary-hover:#004d52;
      --color-accent:       #E76F51;
      --color-surface:      #F4F7F8;
      --color-panel-bg:     #C4DFE6;
      --color-input-bg:     #fff;
      --color-text:         #151E20;
      --color-text-muted:   #003B46;
      --color-navbar-bg:    #07575B;
      --color-navbar-text:  #F4F7F8;
      --border-color:       #8ec4cc;
      --radius-md:          5px;
      --shadow-md:          0 2px 8px rgba(0,0,0,.10);
    }
    [data-theme="dark"] {
      --color-primary:      #66A5AD;
      --color-primary-hover:#7bbdc5;
      --color-accent:       #F4A261;
      --color-surface:      #091214;
      --color-panel-bg:     #0d2028;
      --color-input-bg:     #132c38;
      --color-text:         #E8EDEF;
      --color-text-muted:   #7ab5bd;
      --color-navbar-bg:    #051519;
      --color-navbar-text:  #E8EDEF;
      --border-color:       #1a3a45;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --color-primary:      #66A5AD;
        --color-primary-hover:#7bbdc5;
        --color-accent:       #F4A261;
        --color-surface:      #091214;
        --color-panel-bg:     #0d2028;
        --color-input-bg:     #132c38;
        --color-text:         #E8EDEF;
        --color-text-muted:   #7ab5bd;
        --color-navbar-bg:    #051519;
        --color-navbar-text:  #E8EDEF;
        --border-color:       #1a3a45;
      }
    }

    /* ── Base ─────────────────────────────────────────────── */
    html, body {
      margin: 0; padding: 0;
      background: var(--color-surface);
      color: var(--color-text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: background .2s, color .2s;
    }
    #swagger-ui .topbar { display: none; }

    /* ── Theme toggle button ──────────────────────────────── */
    #theme-toggle {
      position: fixed;
      top: 14px;
      right: 18px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      background: var(--color-panel-bg);
      color: var(--color-text);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      box-shadow: var(--shadow-md);
      transition: background .2s, border-color .2s, color .2s;
    }
    #theme-toggle:hover { background: var(--color-primary); color: var(--color-navbar-text); }
    #theme-toggle .icon { font-size: 15px; line-height: 1; }

    /* ── Swagger UI: info section ─────────────────────────── */
    .swagger-ui { background: var(--color-surface) !important; }
    .swagger-ui .info .title  { color: var(--color-text) !important; }
    .swagger-ui .info p,
    .swagger-ui .info li,
    .swagger-ui .info a       { color: var(--color-text-muted) !important; }
    .swagger-ui .info .base-url { color: var(--color-text-muted) !important; }
    .swagger-ui .info a:hover { color: var(--color-primary) !important; }

    /* ── Tag headers ──────────────────────────────────────── */
    .swagger-ui .opblock-tag {
      border-color: var(--border-color) !important;
      color: var(--color-text) !important;
    }
    .swagger-ui .opblock-tag:hover { background: var(--color-panel-bg) !important; }
    .swagger-ui .opblock-tag small { color: var(--color-text-muted) !important; }

    /* ── Operation blocks ─────────────────────────────────── */
    .swagger-ui .opblock {
      background: var(--color-panel-bg) !important;
      border-color: var(--border-color) !important;
      border-radius: var(--radius-md) !important;
    }
    .swagger-ui .opblock .opblock-summary { border-color: var(--border-color) !important; }
    .swagger-ui .opblock .opblock-summary-description { color: var(--color-text-muted) !important; }
    .swagger-ui .opblock .opblock-section-header {
      background: var(--color-surface) !important;
      border-color: var(--border-color) !important;
    }
    .swagger-ui .opblock .opblock-section-header h4 { color: var(--color-text) !important; }
    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-external-docs-wrapper p,
    .swagger-ui .opblock-title_normal p { color: var(--color-text-muted) !important; }

    /* Highlight the primary colour on HTTP method badges */
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: var(--color-primary) !important; }

    /* ── Scheme / server selector ─────────────────────────── */
    .swagger-ui .scheme-container {
      background: var(--color-panel-bg) !important;
      border-bottom: 1px solid var(--border-color) !important;
      box-shadow: none !important;
      padding: 12px 20px !important;
    }
    .swagger-ui .scheme-container .schemes > label { color: var(--color-text-muted) !important; }
    .swagger-ui .scheme-container select {
      background: var(--color-input-bg) !important;
      color: var(--color-text) !important;
      border-color: var(--border-color) !important;
      border-radius: var(--radius-md) !important;
    }

    /* ── Parameters & response tables ────────────────────── */
    .swagger-ui table thead tr th { color: var(--color-text-muted) !important; border-color: var(--border-color) !important; }
    .swagger-ui table tbody tr td { border-color: var(--border-color) !important; }
    .swagger-ui .parameters-col_description p,
    .swagger-ui .response-col_description p { color: var(--color-text-muted) !important; }
    .swagger-ui .parameter__name  { color: var(--color-text) !important; }
    .swagger-ui .parameter__type  { color: var(--color-primary) !important; }
    .swagger-ui .response-col_status { color: var(--color-text) !important; }
    .swagger-ui .responses-inner h4,
    .swagger-ui .responses-inner h5 { color: var(--color-text) !important; }

    /* ── Inputs ───────────────────────────────────────────── */
    .swagger-ui input[type=text],
    .swagger-ui input[type=password],
    .swagger-ui input[type=search],
    .swagger-ui input[type=email],
    .swagger-ui input[type=file],
    .swagger-ui textarea,
    .swagger-ui select {
      background: var(--color-input-bg) !important;
      color: var(--color-text) !important;
      border-color: var(--border-color) !important;
      border-radius: var(--radius-md) !important;
    }
    /* File input button (::file-selector-button) */
    .swagger-ui input[type=file]::file-selector-button {
      background: var(--color-panel-bg) !important;
      color: var(--color-text) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: var(--radius-md) !important;
      padding: 4px 10px !important;
      cursor: pointer !important;
    }
    .swagger-ui input[type=file]::file-selector-button:hover {
      background: var(--color-primary) !important;
      color: var(--color-navbar-text) !important;
      border-color: var(--color-primary) !important;
    }

    /* ── Buttons ──────────────────────────────────────────── */
    .swagger-ui .btn {
      border-color: var(--border-color) !important;
      color: var(--color-text) !important;
      border-radius: var(--radius-md) !important;
    }
    .swagger-ui .btn:hover { background: var(--color-panel-bg) !important; }
    .swagger-ui .btn.execute {
      background: var(--color-primary) !important;
      border-color: var(--color-primary) !important;
      color: #fff !important;
    }
    .swagger-ui .btn.execute:hover { background: var(--color-primary-hover) !important; }
    .swagger-ui .try-out__btn { border-color: var(--color-primary) !important; color: var(--color-primary) !important; }

    /* ── Models / schemas ─────────────────────────────────── */
    .swagger-ui section.models {
      border-color: var(--border-color) !important;
      background: var(--color-surface) !important;
    }
    .swagger-ui section.models h4 { color: var(--color-text) !important; }
    .swagger-ui section.models h4 span { color: var(--color-text) !important; }
    .swagger-ui section.models .model-container {
      background: var(--color-panel-bg) !important;
      border-color: var(--border-color) !important;
      margin: 0 0 8px !important;
      border-radius: var(--radius-md) !important;
    }
    .swagger-ui .model-box {
      background: var(--color-input-bg) !important;
      border-radius: var(--radius-md) !important;
    }
    .swagger-ui .model-title     { color: var(--color-text) !important; }
    .swagger-ui .model-title__text { color: var(--color-text) !important; }
    /* Property names and types inside expanded models */
    .swagger-ui .model span,
    .swagger-ui .model .property,
    .swagger-ui .model .property-row,
    .swagger-ui table.model tr td { color: var(--color-text-muted) !important; }
    .swagger-ui .model span.prop-name { color: var(--color-text) !important; }
    .swagger-ui .prop-type  { color: var(--color-primary) !important; }
    .swagger-ui .prop-format { color: var(--color-text-muted) !important; }
    /* Required asterisk */
    .swagger-ui .model .star { color: var(--color-accent) !important; }
    /* Expand/collapse [...] button */
    .swagger-ui .model-toggle {
      color: var(--color-primary) !important;
      background: transparent !important;
    }
    .swagger-ui span.model-toggle::after { color: var(--color-primary) !important; }
    /* Inner model box (nested objects) */
    .swagger-ui .inner-object .model-box { background: var(--color-surface) !important; }
    /* Description text inside schemas */
    .swagger-ui .renderedMarkdown p,
    .swagger-ui .renderedMarkdown li { color: var(--color-text-muted) !important; }

    /* ── Code blocks ──────────────────────────────────────── */
    .swagger-ui .highlight-code,
    .swagger-ui .example { background: var(--color-input-bg) !important; border-radius: var(--radius-md) !important; }
    .swagger-ui .microlight { background: var(--color-input-bg) !important; color: var(--color-text) !important; }

    /* ── Scrollbar ────────────────────────────────────────── */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--color-surface); }
    ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
  </style>

  <!-- Read theme before first paint to avoid flash -->
  <script>
    (function() {
      var stored = localStorage.getItem('api-docs-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>
</head>
<body>
  <button id="theme-toggle" aria-label="Toggle theme" onclick="toggleTheme()">
    <span class="icon" id="theme-icon"></span>
    <span id="theme-label"></span>
  </button>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script>
    function getTheme() {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }
    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('api-docs-theme', theme);
      document.getElementById('theme-icon').textContent  = theme === 'dark' ? '☀️' : '🌙';
      document.getElementById('theme-label').textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    }
    function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

    applyTheme(getTheme());

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
        syntaxHighlight: { theme: 'arta' },
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
