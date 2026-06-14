import type { FieldTypeId } from '@/types/shared';

export interface AcroFormField {
  name: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'signature';
  page: number;
  /** Field bounding box in PDF user-space coords [x1, y1, x2, y2], bottom-left origin */
  rect: [number, number, number, number];
  /**
   * Font size in PDF points from the field's Default Appearance (DA) string.
   * 0 means auto-size (fill field height). Match what pdf-lib uses when filling.
   */
  fontSize: number;
  /** Readable label derived from fieldName, e.g. "Contacto · contacto_email" */
  label?: string;
  /** Group prefix derived from the first segment of fieldName split on '_' */
  group?: string;
  /** Whether the field has the Required bit set (fieldFlags & 4) */
  required?: boolean;
  /** Whether the field has the Multiline bit set (fieldFlags & 4096) */
  multiline?: boolean;
  /** Field type derived from pdfjs annotation fieldType ('Tx' → 'text') */
  fieldType?: FieldTypeId;
}

export type FillerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no-fields'
  | 'generating'
  | 'error';
