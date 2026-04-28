import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { ZodError } from 'zod';

// Routes
import authRouter from './routes/auth';
import ticketsRouter from './routes/tickets';
import commentsRouter, { commentDeleteRouter } from './routes/comments';
import usersRouter from './routes/users';
import labelsRouter from './routes/labels';
import metricsRouter from './routes/metrics';

const app = express();
const PORT = process.env.PORT ?? 3000;
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);

// Nested: ticket comments
app.use('/api/tickets/:ticketId/comments', commentsRouter);

// Top-level comment delete
app.use('/api/comments', commentDeleteRouter);

app.use('/api/users', usersRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/metrics', metricsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${uploadDir}`);
});

export default app;
