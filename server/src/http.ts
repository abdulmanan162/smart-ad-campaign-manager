import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Express 4 doesn't forward rejected promises to the error handler on its own.
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const DAY_MS = 864e5;
const fmt = (d: Date) => d.toISOString().slice(0, 10);

/** Parses ?from=&to= (inclusive), defaulting to the last 30 days. */
export function parseRange(query: Request['query']): { from: string; to: string } {
  const parsed = z.object({ from: isoDate.optional(), to: isoDate.optional() }).parse(query);
  const to = parsed.to ?? fmt(new Date());
  const from = parsed.from ?? fmt(new Date(new Date(to).getTime() - 29 * DAY_MS));
  if (from > to) throw new HttpError(400, '`from` must be on or before `to`');
  return { from, to };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
