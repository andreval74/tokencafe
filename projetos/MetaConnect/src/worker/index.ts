import { Hono } from "hono";
import { cors } from 'hono/cors';
import networksRouter from './routes/networks';
import contractsRouter from './routes/contracts';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all routes
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://*.pages.dev', 'https://*.workers.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route modules
app.route('/api/networks', networksRouter);
app.route('/api/contracts', contractsRouter);

// Catch-all for SPA routing
app.get('*', (c) => {
  return c.text('Not Found', 404);
});

export default app;
