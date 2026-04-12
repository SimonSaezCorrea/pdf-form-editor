import type { NextConfig } from 'next';

const config: NextConfig = {
  // pdf-lib uses Node.js crypto and Buffer APIs; exclude it from the client bundle
  serverExternalPackages: ['pdf-lib', '@pdf-lib/fontkit'],
  // Hide the Next.js dev overlay indicator in development
  devIndicators: false,
};

export default config;
