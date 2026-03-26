import { useState } from 'react';

interface PdfUploaderProps {
  onPdfLoaded: (bytes: ArrayBuffer, filename: string) => void;
}

export function PdfUploader({ onPdfLoaded }: PdfUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      e.target.value = '';
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      onPdfLoaded(reader.result as ArrayBuffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="uploader">
      <h2>PDF Form Editor</h2>
      <p>Import a PDF and add interactive form fields visually.</p>
      <label htmlFor="pdf-upload">Choose PDF file</label>
      <input
        id="pdf-upload"
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
      />
      {error && <p className="uploader-error">{error}</p>}
    </div>
  );
}
