'use client';

import dynamic from 'next/dynamic';

// Load App without SSR: canvas, pdfjs, and dnd-kit require browser APIs
const App = dynamic(() => import('@/App'), { ssr: false });

export default function Page() {
  return <App />;
}
