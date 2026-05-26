import type { FontFamily } from '@/types/shared';

export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';

export interface FontEntry {
  name: string;
  ttfFilename: string;
  category: FontCategory;
  pdfFallback: FontFamily;
}

export const FONT_CATEGORIES: FontCategory[] = [
  'sans-serif',
  'serif',
  'monospace',
  'display',
  'handwriting',
];

export const FONT_CATALOG: FontEntry[] = [
  // ── Sans-serif ──────────────────────────────────────────────────────────────
  { name: 'Barlow',            ttfFilename: 'barlow-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Be Vietnam Pro',    ttfFilename: 'bevietnampro-regular.ttf',      category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Cabin',             ttfFilename: 'cabin-regular.ttf',             category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'DM Sans',           ttfFilename: 'dmsans-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Exo 2',             ttfFilename: 'exo2-regular.ttf',              category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Fira Sans',         ttfFilename: 'firasans-regular.ttf',          category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Heebo',             ttfFilename: 'heebo-regular.ttf',             category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Hind',              ttfFilename: 'hind-regular.ttf',              category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'IBM Plex Sans',     ttfFilename: 'ibmplexsans-regular.ttf',       category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Inter',             ttfFilename: 'inter-regular.ttf',             category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Josefin Sans',      ttfFilename: 'josefinsans-regular.ttf',       category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Jost',              ttfFilename: 'jost-regular.ttf',              category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Kanit',             ttfFilename: 'kanit-regular.ttf',             category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Karla',             ttfFilename: 'karla-regular.ttf',             category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Lato',              ttfFilename: 'lato-regular.ttf',              category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Lexend',            ttfFilename: 'lexend-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Manrope',           ttfFilename: 'manrope-regular.ttf',           category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Montserrat',        ttfFilename: 'montserrat-regular.ttf',        category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Mulish',            ttfFilename: 'mulish-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Noto Sans',         ttfFilename: 'notosans-regular.ttf',          category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Nunito',            ttfFilename: 'nunito-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Nunito Sans',       ttfFilename: 'nunitosans-regular.ttf',        category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Open Sans',         ttfFilename: 'opensans-regular.ttf',          category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Outfit',            ttfFilename: 'outfit-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Plus Jakarta Sans', ttfFilename: 'plusjakartasans-regular.ttf',   category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Poppins',           ttfFilename: 'poppins-regular.ttf',           category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'PT Sans',           ttfFilename: 'ptsans-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Quicksand',         ttfFilename: 'quicksand-regular.ttf',         category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Raleway',           ttfFilename: 'raleway-regular.ttf',           category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Roboto',            ttfFilename: 'roboto-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Rubik',             ttfFilename: 'rubik-regular.ttf',             category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Source Sans 3',     ttfFilename: 'sourcesans3-regular.ttf',       category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Space Grotesk',     ttfFilename: 'spacegrotesk-regular.ttf',      category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Syne',              ttfFilename: 'syne-regular.ttf',              category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Titillium Web',     ttfFilename: 'titilliumweb-regular.ttf',      category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Ubuntu',            ttfFilename: 'ubuntu-regular.ttf',            category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Urbanist',          ttfFilename: 'urbanist-regular.ttf',          category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Varela Round',      ttfFilename: 'varelaround-regular.ttf',       category: 'sans-serif', pdfFallback: 'Helvetica' },
  { name: 'Work Sans',         ttfFilename: 'worksans-regular.ttf',          category: 'sans-serif', pdfFallback: 'Helvetica' },

  // ── Serif ────────────────────────────────────────────────────────────────────
  { name: 'Arvo',               ttfFilename: 'arvo-regular.ttf',              category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Bitter',             ttfFilename: 'bitter-regular.ttf',            category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Cardo',              ttfFilename: 'cardo-regular.ttf',             category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Cormorant Garamond', ttfFilename: 'cormorantgaramond-regular.ttf', category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Crimson Text',       ttfFilename: 'crimsontext-regular.ttf',       category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Domine',             ttfFilename: 'domine-regular.ttf',            category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'EB Garamond',        ttfFilename: 'ebgaramond-regular.ttf',        category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Gelasio',            ttfFilename: 'gelasio-regular.ttf',           category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'IBM Plex Serif',     ttfFilename: 'ibmplexserif-regular.ttf',      category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Libre Baskerville',  ttfFilename: 'librebaskerville-regular.ttf',  category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Lora',               ttfFilename: 'lora-regular.ttf',              category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Merriweather',       ttfFilename: 'merriweather-regular.ttf',      category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Noto Serif',         ttfFilename: 'notoserif-regular.ttf',         category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Playfair Display',   ttfFilename: 'playfairdisplay-regular.ttf',   category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'PT Serif',           ttfFilename: 'ptserif-regular.ttf',           category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Rokkitt',            ttfFilename: 'rokkitt-regular.ttf',           category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Source Serif 4',     ttfFilename: 'sourceserif4-regular.ttf',      category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Spectral',           ttfFilename: 'spectral-regular.ttf',          category: 'serif', pdfFallback: 'TimesRoman' },
  { name: 'Vollkorn',           ttfFilename: 'vollkorn-regular.ttf',          category: 'serif', pdfFallback: 'TimesRoman' },

  // ── Monospace ────────────────────────────────────────────────────────────────
  { name: 'Anonymous Pro',   ttfFilename: 'anonymouspro-regular.ttf',   category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Courier Prime',   ttfFilename: 'courierprime-regular.ttf',   category: 'monospace', pdfFallback: 'Courier' },
  { name: 'DM Mono',         ttfFilename: 'dmmono-regular.ttf',         category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Fira Code',       ttfFilename: 'firacode-regular.ttf',       category: 'monospace', pdfFallback: 'Courier' },
  { name: 'IBM Plex Mono',   ttfFilename: 'ibmplexmono-regular.ttf',    category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Inconsolata',     ttfFilename: 'inconsolata-regular.ttf',    category: 'monospace', pdfFallback: 'Courier' },
  { name: 'JetBrains Mono',  ttfFilename: 'jetbrainsmono-regular.ttf',  category: 'monospace', pdfFallback: 'Courier' },
  { name: 'PT Mono',         ttfFilename: 'ptmono-regular.ttf',         category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Roboto Mono',     ttfFilename: 'robotomono-regular.ttf',     category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Share Tech Mono', ttfFilename: 'sharetechmono-regular.ttf',  category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Source Code Pro', ttfFilename: 'sourcecodepro-regular.ttf',  category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Space Mono',      ttfFilename: 'spacemono-regular.ttf',      category: 'monospace', pdfFallback: 'Courier' },
  { name: 'Ubuntu Mono',     ttfFilename: 'ubuntumono-regular.ttf',     category: 'monospace', pdfFallback: 'Courier' },

  // ── Display ──────────────────────────────────────────────────────────────────
  { name: 'Barlow Condensed', ttfFilename: 'barlowcondensed-regular.ttf', category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Bebas Neue',       ttfFilename: 'bebasneue-regular.ttf',       category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Chakra Petch',     ttfFilename: 'chakrapetch-regular.ttf',     category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Changa',           ttfFilename: 'changa-regular.ttf',          category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Exo',              ttfFilename: 'exo-regular.ttf',             category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Fredoka',          ttfFilename: 'fredoka-regular.ttf',         category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Oswald',           ttfFilename: 'oswald-regular.ttf',          category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Passion One',      ttfFilename: 'passionone-regular.ttf',      category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Righteous',        ttfFilename: 'righteous-regular.ttf',       category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Russo One',        ttfFilename: 'russoone-regular.ttf',        category: 'display', pdfFallback: 'Helvetica' },
  { name: 'Teko',             ttfFilename: 'teko-regular.ttf',            category: 'display', pdfFallback: 'Helvetica' },

  // ── Handwriting ──────────────────────────────────────────────────────────────
  { name: 'Amatic SC',          ttfFilename: 'amaticsc-regular.ttf',          category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Caveat',             ttfFilename: 'caveat-regular.ttf',             category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Cookie',             ttfFilename: 'cookie-regular.ttf',             category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Courgette',          ttfFilename: 'courgette-regular.ttf',          category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Dancing Script',     ttfFilename: 'dancingscript-regular.ttf',      category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Gloria Hallelujah',  ttfFilename: 'gloriahallelujah-regular.ttf',   category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Great Vibes',        ttfFilename: 'greatvibes-regular.ttf',         category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Indie Flower',       ttfFilename: 'indieflower-regular.ttf',        category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Kaushan Script',     ttfFilename: 'kaushanscript-regular.ttf',      category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Lobster',            ttfFilename: 'lobster-regular.ttf',            category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Pacifico',           ttfFilename: 'pacifico-regular.ttf',           category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Patrick Hand',       ttfFilename: 'patrickhand-regular.ttf',        category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Permanent Marker',   ttfFilename: 'permanentmarker-regular.ttf',    category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Sacramento',         ttfFilename: 'sacramento-regular.ttf',         category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Satisfy',            ttfFilename: 'satisfy-regular.ttf',            category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Shadows Into Light', ttfFilename: 'shadowsintolight-regular.ttf',   category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Tangerine',          ttfFilename: 'tangerine-regular.ttf',          category: 'handwriting', pdfFallback: 'TimesRoman' },
  { name: 'Yellowtail',         ttfFilename: 'yellowtail-regular.ttf',         category: 'handwriting', pdfFallback: 'TimesRoman' },
];

export function getFontsByCategory(category: FontCategory): FontEntry[] {
  return FONT_CATALOG.filter((f) => f.category === category);
}

export function getFontByName(name: string): FontEntry | undefined {
  return FONT_CATALOG.find((f) => f.name === name);
}

/**
 * Lazily injects a @font-face rule pointing to the local TTF asset in /fonts/.
 * Idempotent — calling multiple times for the same font is safe.
 * Works offline; no external CDN dependency.
 */
export function loadFont(name: string, ttfFilename: string): void {
  if (typeof document === 'undefined') return;
  const id = `pawer-font-${ttfFilename}`;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = [
    `@font-face {`,
    `  font-family: '${name}';`,
    `  src: url('/fonts/${ttfFilename}') format('truetype');`,
    `  font-weight: normal;`,
    `  font-style: normal;`,
    `  font-display: swap;`,
    `}`,
  ].join('\n');
  document.head.appendChild(style);
}
