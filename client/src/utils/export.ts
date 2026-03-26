import type { FormField } from 'pdf-form-editor-shared';

/**
 * Upload the PDF + fields to the server, receive the modified PDF,
 * and trigger a browser download.
 */
export async function exportPdf(
  pdfBytes: ArrayBuffer,
  fields: FormField[],
): Promise<void> {
  const formData = new FormData();
  formData.append(
    'pdf',
    new Blob([pdfBytes], { type: 'application/pdf' }),
    'document.pdf',
  );
  formData.append('fields', JSON.stringify(fields));

  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error((data as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'form.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
