export type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';

export interface FormField {
  /** Client-side UUID — used for React keying; ignored by the server */
  id: string;
  /** AcroForm field name — must be unique within the document */
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
}