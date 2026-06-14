import type { NextConfig } from 'next';

const config: NextConfig = {
  // pdf-lib uses Node.js crypto and Buffer APIs; exclude it from the client bundle
  serverExternalPackages: ['pdf-lib', '@pdf-lib/fontkit'],
  // Hide the Next.js dev overlay indicator in development
  devIndicators: false,
  // /editor and /filler are client-side views of the single-page app. Rewrite
  // them to / so a direct URL or refresh still serves the app (the browser URL
  // is preserved; App reads window.location.pathname to pick the view).
  async rewrites() {
    return [
      { source: '/editor', destination: '/' },
      { source: '/filler', destination: '/' },
    ];
  },
};

export default config;
