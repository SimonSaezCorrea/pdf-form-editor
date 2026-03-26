# pdf-form-editor Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-26

## Active Technologies

- TypeScript 5.x + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core (001-pdf-form-editor)
- No new dependencies (002-multipage-pdf-navigation)

## Project Structure

```text
client/
  src/
    components/
      PageNavigator/   # NEW (002): prev/next buttons + page indicator
      ThumbnailStrip/  # NEW (002, P3): clickable thumbnail panel
    hooks/
      usePdfRenderer.ts  # MODIFIED (002): pageDimensionsMap added
server/                  # UNCHANGED (002)
shared/                  # UNCHANGED (002)
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript: Follow standard conventions

## Key Notes (002-multipage-pdf-navigation)

- Server and FormField.page are already multi-page capable — no server changes needed
- usePdfRenderer exposes pageDimensionsMap: Record<number, PageDimensions> (all pages)
- Field name uniqueness is global across all pages (AcroForm constraint)
- Thumbnails: render at scale 0.2 via pdfjs-dist → JPEG dataURL; lazy (IntersectionObserver) for >20 pages

## Recent Changes

- 001-pdf-form-editor: Added TypeScript + React 18, Vite 5, Express 4, pdf-lib, pdfjs-dist, @dnd-kit/core
- 002-multipage-pdf-navigation: PageNavigator + ThumbnailStrip UI; pageDimensionsMap in usePdfRenderer

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
