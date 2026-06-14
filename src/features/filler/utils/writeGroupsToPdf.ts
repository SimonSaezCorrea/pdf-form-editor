import { PDFDocument, PDFName, PDFHexString, PDFDict } from 'pdf-lib';

/**
 * Escribe categorías en el atributo Alternate Name (/TU) de los campos AcroForm
 * del PDF, en el navegador, vía pdf-lib. Espeja exactamente la escritura del
 * backend (pdfService.ts) para que la lectura por pdfjs (`a.tooltip`) sea simétrica.
 *
 * NO aplana ni rellena valores — solo persiste la metadata de agrupación.
 * Campos del `groupMap` que no existan en el PDF se ignoran silenciosamente.
 *
 * @param pdfBytes  binario del PDF actual (ArrayBuffer en memoria)
 * @param groupMap  { fieldName: grupo }
 * @returns         nuevo binario con los /TU actualizados
 */
export async function writeGroupsToPdf(
  pdfBytes: ArrayBuffer,
  groupMap: Record<string, string>,
): Promise<Uint8Array> {
  // Copia: load puede detachar el buffer subyacente
  const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
  const form = pdfDoc.getForm();

  for (const [name, group] of Object.entries(groupMap)) {
    const trimmed = group?.trim();
    if (!trimmed) continue;

    let field;
    try {
      field = form.getField(name);
    } catch {
      continue; // campo no presente en este PDF
    }

    // /TU debe ir en el/los WIDGET dict(s) — pdfjs lo lee del widget, no del field,
    // y no hereda por /Parent. Mismo criterio que pdfService (backend).
    const tu = PDFHexString.fromText(trimmed);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acro = (field as any).acroField;
    (acro.dict as PDFDict).set(PDFName.of('TU'), tu);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const widget of acro.getWidgets()) {
      (widget.dict as PDFDict).set(PDFName.of('TU'), tu);
    }
  }

  return pdfDoc.save();
}
