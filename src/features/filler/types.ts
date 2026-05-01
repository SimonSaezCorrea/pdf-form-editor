export interface AcroFormField {
  name: string;
  type: 'text';
  page: number;
}

export type FillerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no-fields'
  | 'generating'
  | 'error';
