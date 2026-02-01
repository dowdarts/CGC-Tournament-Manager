const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');
const config = require('./config');
const DartConnectScraper = require('./dartconnect-scraper');

// =====================================================================
// Logger Setup
// =====================================================================
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: config.logFile })
  ]
});

// =====================================================================
// Supabase Client
// =====================================================================
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// =====================================================================
// Scraper Manager
// =====================================================================
class ScraperManager {
  constructor() {
    this.activeScrapers = new Map(); // watchCode -> DartConnectScraper instance
    this.pollInterval = null;
  }

  async start() {
    logger.info('=== DartConnect Scraper Service Starting ===');
    logger.info(`Tournament ID: ${config.tournamentId}`);
    logger.info(`Poll Interval: ${config.pollIntervalMs}ms`);
    logger.info(`Max Concurrent Scrapers: ${config.maxConcurrentScrapers}`);

    // Initial poll
    await this.pollDatabaseForWatchCodes();

    // Set up recurring poll
    this.pollInterval = setInterval(() => {
      this.pollDatabaseForWatchCodes();
    }, config.pollIntervalMs);

    logger.info('=== Scraper Service Started Successfully ===');
  }

  async pollDatabaseForWatchCodes() {
    try {
      logger.info('Polling database for active watch codes...');

      // Get tournament settings
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id, dartconnect_integration_enabled, dartconnect_watch_codes, dartconnect_auto_accept_scores, dartconnect_require_manual_approval')
        .eq('id', config.tournamentId)
        .single();

      if (tournamentError) {
        logger.error(`Error fetching tournament: ${tournamentError.message}`);
        return;
      }

      if (!tournament) {
        logger.error(`Tournament not found: ${config.tournamentId}`);
        return;
      }

      // Check if integration is enabled
      if (!tournament.dartconnect_integration_enabled) {
        logger.info('DartConnect integration is disabled. Stopping all scrapers.');
        this.stopAllScrapers();
        return;
      }

      const watchCodes = tournament.dartconnect_watch_codes || [];
      logger.info(`Found ${watchCodes.length} active watch codes: ${watchCodes.join(', ')}`);

      // Start scrapers for new watch codes
      for (const watchCode of watchCodes) {
        if (!this.activeScrapers.has(watchCode)) {
          await this.startScraper(watchCode, tournament);
        }
      }

      // Stop scrapers for removed watch codes
      for (const [watchCode, scraper] of this.activeScrapers.entries()) {
        if (!watchCodes.includes(watchCode)) {
          logger.info(`Watch code ${watchCode} removed from tournament. Stopping scraper.`);
          await scraper.stop();
          this.activeScrapers.delete(watchCode);
        }
      }

    } catch (error) {
      logger.error(`Error polling database: ${error.message}`);
    }
  }

  async startScraper(watchCode, tournament) {
    try {
      logger.info(`Starting scraper for watch code: ${watchCode}`);

      const scraper = new DartConnectScraper({
        watchCode,
        tournamentId: tournament.id,
        autoAccept: tournament.dartconnect_auto_accept_scores,
        requireManualApproval: tournament.dartconnect_require_manual_approval,
        supabase,
        logger,
        checkInterval: config.scraperCheckIntervalMs
      });

      await scraper.start();
      this.activeScrapers.set(watchCode, scraper);

      logger.info(`Scraper started successfully for watch code: ${watchCode}`);
    } catch (error) {
      logger.error(`Error starting scraper for ${watchCode}: ${error.message}`);
    }
  }

  stopAllScrapers() {
    logger.info('Stopping all active scrapers...');
    for (const [watchCode, scraper] of this.activeScrapers.entries()) {
      scraper.stop();
      logger.info(`Stopped scraper for watch code: ${watchCode}`);
    }
    this.activeScrapers.clear();
  }

  async stop() {
    logger.info('=== Stopping Scraper Service ===');
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.stopAllScrapers();

    logger.info('=== Scraper Service Stopped ===');
  }
}

// =====================================================================
// Main
// =====================================================================
const manager = new ScraperManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Shutting down gracefully...');
  await manager.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  await manager.stop();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Start the service
manager.start().catch((error) => {
  logger.error(`Failed to start scraper service: ${error.message}`);
  process.exit(1);
});
