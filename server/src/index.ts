import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import { getDb } from './db.js';
import { errorHandler } from './http.js';
import { analyticsRouter } from './routes/analytics.js';
import { campaignsRouter } from './routes/campaigns.js';
import { trackingRouter } from './routes/tracking.js';
import { PLATFORMS, STATUSES } from './schema.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const db = await getDb();
  res.json({ ok: true, database: db.kind });
});
app.get('/api/meta', (_req, res) => res.json({ platforms: PLATFORMS, statuses: STATUSES }));
app.use('/api/campaigns', campaignsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/track', trackingRouter);

// In production, serve the built React app from the same origin.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
getDb()
  .then((db) => {
    app.listen(port, () => console.log(`API listening on http://localhost:${port} (database: ${db.kind})`));
  })
  .catch((err) => {
    console.error('Failed to connect to database', err);
    process.exit(1);
  });
