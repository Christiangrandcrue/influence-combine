// Influence Combine - Main Application Entry
// AI-powered platform for Instagram Reels creators

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from 'hono/cloudflare-pages';

import type { Bindings, Variables } from './types';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';

// Routes
import authRoutes from './routes/auth';
import onboardingRoutes from './routes/onboarding';
import ideasRoutes from './routes/ideas';
import assistantRoutes from './routes/assistant';
import videosRoutes from './routes/videos';
import dashboardRoutes from './routes/dashboard';
import libraryRoutes from './routes/library';

// Components
import { renderApp } from './components/App';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Serve static files
app.use('/static/*', serveStatic({ root: './' }));

// API Routes (no auth required)
app.route('/api/auth', authRoutes);
app.route('/api/library', libraryRoutes);

// API Routes (auth required)
app.use('/api/onboarding/*', authMiddleware);
app.route('/api/onboarding', onboardingRoutes);

app.use('/api/ideas/*', authMiddleware);
app.route('/api/ideas', ideasRoutes);

app.use('/api/assistant/*', authMiddleware);
app.route('/api/assistant', assistantRoutes);

app.use('/api/videos/*', authMiddleware);
app.route('/api/videos', videosRoutes);

app.use('/api/dashboard/*', authMiddleware);
app.route('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    app: c.env.APP_NAME,
    version: c.env.APP_VERSION,
    timestamp: new Date().toISOString()
  });
});

// Frontend routes - serve SPA
app.get('*', optionalAuthMiddleware, (c) => {
  const user = c.get('user');
  return c.html(renderApp(user));
});

export default app;
