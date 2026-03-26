import React from 'react';
import ReactDOM from 'react-dom/client';
import * as pdfjs from 'pdfjs-dist';
import App from './App';
import './index.css';

// Configure pdfjs worker using Vite's URL resolution
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
