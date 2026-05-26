export interface AcroFormField {
  name: string;
  type: 'text';
  page: number;
  /** Field bounding box in PDF user-space coords [x1, y1, x2, y2], bottom-left origin */
  rect: [number, number, number, number];
  /**
   * Font size in PDF points from the field's Default Appearance (DA) string.
   * 0 means auto-size (fill field height). Match what pdf-lib uses when filling.
   */
  fontSize: number;
}

export type FillerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no-fields'
  | 'generating'
  | 'error';
