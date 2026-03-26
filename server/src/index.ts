import express, { Request, Response, NextFunction } from 'express';
import generatePdfRouter from './routes/generatePdf';

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(express.json());

// Routes
app.use('/api/generate-pdf', generatePdfRouter);

// Global error handler — returns JSON for all unhandled errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // multer PayloadTooLargeError
  if (err.name === 'MulterError' && (err as NodeJS.ErrnoException).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'PDF file exceeds 50 MB limit.' });
    return;
  }
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start the HTTP server when the file is run directly (not imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PDF Form Editor server listening on http://localhost:${PORT}`);
  });
}

export default app;
