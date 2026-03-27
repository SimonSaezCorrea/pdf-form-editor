import { Router, Request, Response } from 'express';
import multer from 'multer';
import type { FormField, FontFamily } from 'pdf-form-editor-shared';
import { generatePdf } from '../services/pdfService';

const router = Router();

const VALID_FONT_FAMILIES: FontFamily[] = ['Helvetica', 'TimesRoman', 'Courier'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

function isValidField(f: unknown): f is FormField {
  if (typeof f !== 'object' || f === null) return false;
  const field = f as Record<string, unknown>;
  return (
    typeof field.id === 'string' &&
    typeof field.name === 'string' &&
    field.name.length > 0 &&
    field.name.length <= 128 &&
    typeof field.page === 'number' &&
    Number.isInteger(field.page) &&
    field.page >= 1 &&
    typeof field.x === 'number' &&
    field.x >= 0 &&
    typeof field.y === 'number' &&
    field.y >= 0 &&
    typeof field.width === 'number' &&
    field.width > 0 &&
    typeof field.height === 'number' &&
    field.height > 0 &&
    typeof field.fontSize === 'number' &&
    Number.isInteger(field.fontSize) &&
    field.fontSize >= 6 &&
    field.fontSize <= 72 &&
    VALID_FONT_FAMILIES.includes(field.fontFamily as FontFamily) &&
    (field.value === undefined || typeof field.value === 'string')
  );
}

router.post(
  '/',
  upload.single('pdf'),
  async (req: Request, res: Response): Promise<void> => {
    // Validate PDF part
    if (!req.file || !req.file.buffer.length) {
      res.status(400).json({ error: 'Missing required field: pdf (PDF file).' });
      return;
    }

    // Validate fields JSON
    const rawFields = req.body.fields;
    if (typeof rawFields !== 'string') {
      res.status(400).json({ error: 'Missing required field: fields (JSON array).' });
      return;
    }

    let fields: unknown;
    try {
      fields = JSON.parse(rawFields);
    } catch {
      res.status(400).json({ error: 'Invalid JSON in fields parameter.' });
      return;
    }

    if (!Array.isArray(fields)) {
      res.status(400).json({ error: 'fields must be a JSON array.' });
      return;
    }

    // Validate each field object
    for (let i = 0; i < fields.length; i++) {
      if (!isValidField(fields[i])) {
        res.status(400).json({
          error: `Field at index ${i} is invalid. Required: id, name, page≥1, x≥0, y≥0, width>0, height>0, fontSize(6–72), fontFamily(Helvetica|TimesRoman|Courier).`,
        });
        return;
      }
    }

    // Validate duplicate names
    const names = (fields as FormField[]).map((f) => f.name);
    const nameSet = new Set(names);
    if (nameSet.size !== names.length) {
      const dups = names.filter((n, i) => names.indexOf(n) !== i);
      res.status(400).json({
        error: `Duplicate field name(s): ${[...new Set(dups)].map((n) => `'${n}'`).join(', ')}. Field names must be unique.`,
      });
      return;
    }

    try {
      const pdfBytes = await generatePdf(req.file.buffer, fields as FormField[]);
      res
        .status(200)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="form.pdf"')
        .send(Buffer.from(pdfBytes));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      // Distinguish validation errors raised by pdfService from unexpected errors
      if (
        message.includes('Duplicate field') ||
        message.includes('page') ||
        message.includes('encrypted') ||
        message.includes('password')
      ) {
        if (message.toLowerCase().includes('encrypt') || message.toLowerCase().includes('password')) {
          res.status(422).json({
            error: `Cannot load PDF: ${message}`,
          });
        } else {
          res.status(400).json({ error: message });
        }
      } else if (
        message.toLowerCase().includes('failed to parse') ||
        message.toLowerCase().includes('invalid pdf')
      ) {
        res.status(422).json({ error: `Cannot load PDF: file may be corrupted or encrypted.` });
      } else {
        console.error('[generatePdf] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  },
);

export default router;
