export type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';

export interface FormField {
  /** Client-side UUID — used for React keying; ignored by the server */
  id: string;
  /** Display label shown in the UI and canvas overlay. Does not need to be unique. */
  name: string;
  /** 1-indexed page number */
  page: number;
  /** PDF points from bottom-left of page (horizontal) */
  x: number;
  /** PDF points from bottom-left of page (vertical) */
  y: number;
  /** PDF points */
  width: number;
  /** PDF points */
  height: number;
  /** Font size in points (6–72) */
  fontSize: number;
  fontFamily: FontFamily;
  /** Default text value pre-filled in the exported PDF field. Empty string = no pre-fill. */
  value?: string;
  /** Whether the field border is visible in the exported PDF. Defaults to false (no border). */
  showBorder?: boolean;
  /** Auto-shrink font to fit content (sets fontSize=0 in PDF). Overrides fontSize on export. */
  autoFitFont?: boolean;
  /** Allow text to wrap across multiple lines within the field. */
  multiline?: boolean;
  /** Google Font name for canvas preview only (e.g. "Montserrat"). Not used in PDF export. */
  displayFont?: string;
}
