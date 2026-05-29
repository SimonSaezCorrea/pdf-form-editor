export type FontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';

export type FieldTypeId = 'text' | 'number' | 'date' | 'checkbox' | 'signature';

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
  /** Whether the field border is visible in the exported PDF. Defaults to false (no border). */
  showBorder?: boolean;
  /** Auto-shrink font to fit content (sets fontSize=0 in PDF). Overrides fontSize on export. */
  autoFitFont?: boolean;
  /** Allow text to wrap across multiple lines within the field. */
  multiline?: boolean;
  /** Field must be filled before generating the PDF. Shown as required in filler view. */
  required?: boolean;
  /** Google Font name for canvas preview only (e.g. "Montserrat"). Not used in PDF export. */
  displayFont?: string;
  /** UI-only field type for color-coding and future typed field support. Defaults to 'text'. */
  fieldType?: FieldTypeId;
  /** When true, field cannot be dragged, resized, or deleted via keyboard. */
  locked?: boolean;
  /** Optional grouping label (e.g. "Arrendador"). UI-only, not exported to PDF. */
  group?: string;
}
