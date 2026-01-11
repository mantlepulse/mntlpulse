/**
 * MantlePulse API Server
 * Backend API for MantlePulse dApp
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/error-handler';
import sideshiftRoutes from './routes/sideshift.routes';
import pollsRoutes from './routes/polls.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import preferencesRoutes from './routes/preferences.routes';
import analyticsRoutes from './routes/analytics.routes';
import announcementsRoutes from './routes/announcements.routes';
import gasRoutes from './routes/gas.routes';
import questsRoutes from './routes/quests.routes';
import badgesRoutes from './routes/badges.routes';
import levelsRoutes from './routes/levels.routes';
// Creator quest system routes
import membershipRoutes from './routes/membership.routes';
import seasonsRoutes from './routes/seasons.routes';
import pointsRoutes from './routes/points.routes';
import creatorQuestsRoutes from './routes/creator-quests.routes';
import aiRoutes from './routes/ai.routes';
// Projects system routes
import projectsRoutes from './routes/projects.routes';
// Questionnaires system routes
import questionnairesRoutes from './routes/questionnaires.routes';
// Premium and staking routes
import stakingRoutes from './routes/staking.routes';
import premiumRoutes from './routes/premium.routes';
// ZK verification routes
import zkVerificationRoutes from './routes/zk-verification.routes';
// OAuth social connection routes
import oauthRoutes from './routes/oauth.routes';
// Feedback collection routes
import feedbackRoutes from './routes/feedback.routes';
import { logger } from './utils/logger';
// Subgraph sync disabled until Mantle indexer is available
// import { subgraphSyncService } from './services/subgraph-sync.service';

// Create Express app
const app = express();

// Trust proxy - required when behind reverse proxies (Render, Cloudflare, etc.)
// This allows Express to trust X-Forwarded-* headers for correct IP detection
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.env,
  });
});

// API routes
app.use('/api/sideshift', sideshiftRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/gas', gasRoutes);
app.use('/api/quests', questsRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/levels', levelsRoutes);
// Creator quest system routes
app.use('/api/membership', membershipRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/creator-quests', creatorQuestsRoutes);
app.use('/api/ai', aiRoutes);
// Premium and staking routes
app.use('/api/staking', stakingRoutes);
app.use('/api/premium', premiumRoutes);
// Projects routes
app.use('/api/projects', projectsRoutes);
// Questionnaires routes
app.use('/api/questionnaires', questionnairesRoutes);
// ZK verification routes
app.use('/api/zk-verification', zkVerificationRoutes);
// OAuth social connection routes
app.use('/api/oauth', oauthRoutes);
// Feedback collection routes
app.use('/api/feedback', feedbackRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`🚀 MantlePulse API running on port ${PORT}`);
  logger.info(`Environment: ${config.server.env}`);
  logger.info(`Allowed CORS origins: ${Array.isArray(config.cors.origin) ? config.cors.origin.join(', ') : config.cors.origin}`);
  logger.info(`Sideshift API: ${config.sideshift.apiUrl}`);

  // Subgraph sync disabled until Mantle indexer is available
  // subgraphSyncService.syncOnStartup().catch((err) => {
  //   logger.error('Failed to sync from subgraph on startup', { error: err });
  // });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
