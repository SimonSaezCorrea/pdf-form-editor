import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * Render a single PDF page at low resolution and return a JPEG data URL.
 *
 * pdfjs only allows one active render() per page proxy at a time. If the main
 * canvas renderer is active when a thumbnail is requested, pdfjs throws
 * RenderingCancelledException. This function retries with linear backoff so
 * thumbnails eventually render once the main render completes.
 *
 * @param pdfDoc   Loaded pdfjs document
 * @param pageNum  1-indexed page number
 * @param scale    Render scale (default 0.2 ≈ 120×168 px for A4)
 */
export async function generateThumbnail(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  scale = 0.2,
): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Retry up to 5 times: pdfjs cancels a render when another render starts on
  // the same page proxy. Wait longer each attempt to let the main render finish.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'RenderingCancelledException') throw err;
      await new Promise<void>((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  throw new Error(`Unable to render thumbnail for page ${pageNum} after retries`);
}
