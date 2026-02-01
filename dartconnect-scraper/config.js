require('dotenv').config();

module.exports = {
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || ''
  },

  // Tournament
  tournamentId: process.env.TOURNAMENT_ID || '',

  // Scraper Settings
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS) || 10000, // Check DB every 10 seconds
  scraperCheckIntervalMs: parseInt(process.env.SCRAPER_CHECK_INTERVAL_MS) || 5000, // Check DartConnect every 5 seconds
  maxConcurrentScrapers: parseInt(process.env.MAX_CONCURRENT_SCRAPERS) || 4,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'logs/scraper.log',

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development'
};
