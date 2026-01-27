const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://pfujbgwgsxuhgvmeatjh.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

class DartConnectScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.watchCode = null;
    this.channel = null;
    this.lastData = {};
  }

  async init(watchCode) {
    this.watchCode = watchCode;
    console.log(`🎯 Initializing DartConnect scraper for watch code: ${watchCode}`);
    
    try {
      // Launch browser
      this.browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to DartConnect live match
      const url = `https://tv.dartconnect.com/live/${watchCode}`;
      console.log(`🌐 Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for match data to load
      await this.page.waitForTimeout(3000);
      
      // Setup Supabase realtime channel
      this.channel = supabase.channel(`match-${watchCode}`);
      
      // Store session in Supabase
      await this.storeScrapeSession(watchCode, 'active');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize scraper:', error.message);
      await this.cleanup();
      return false;
    }
  }

  async startScraping() {
    if (!this.page || this.isRunning) {
      console.log('⚠️ Scraper not initialized or already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting live scraping...');

    const scrapeInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(scrapeInterval);
        return;
      }

      try {
        const matchData = await this.scrapeMatchData();
        
        // Only broadcast if data has changed
        if (this.hasDataChanged(matchData)) {
          await this.broadcastUpdate(matchData);
          await this.updateSession(matchData);
          this.lastData = { ...matchData };
          console.log('📡 Broadcasted update:', JSON.stringify(matchData, null, 2));
        }
      } catch (error) {
        console.error('❌ Scraping error:', error.message);
      }
    }, 1000); // Check every second

    // Cleanup on exit
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }

  async scrapeMatchData() {
    return await this.page.evaluate(() => {
      // DartConnect TV selectors (these may need updating based on current HTML structure)
      const getTextContent = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : null;
      };

      const getPlayerScore = (playerNum) => {
        // Try multiple possible selectors for scores
        const selectors = [
          `#p${playerNum}_score`,
          `.player-${playerNum}-score`,
          `.score-${playerNum}`,
          `[data-player="${playerNum}"] .score`,
          `.player${playerNum} .score`
        ];
        
        for (const selector of selectors) {
          const score = getTextContent(selector);
          if (score && score !== '') return score;
        }
        return '501'; // Default
      };

      const getPlayerLegs = (playerNum) => {
        const selectors = [
          `#p${playerNum}_legs`,
          `.player-${playerNum}-legs`,
          `.legs-${playerNum}`,
          `[data-player="${playerNum}"] .legs`,
          `.player${playerNum} .legs`
        ];
        
        for (const selector of selectors) {
          const legs = getTextContent(selector);
          if (legs && legs !== '') return legs;
        }
        return '0';
      };

      const getPlayerName = (playerNum) => {
        const selectors = [
          `#p${playerNum}_name`,
          `.player-${playerNum}-name`,
          `.name-${playerNum}`,
          `[data-player="${playerNum}"] .name`,
          `.player${playerNum} .name`
        ];
        
        for (const selector of selectors) {
          const name = getTextContent(selector);
          if (name && name !== '') return name;
        }
        return `Player ${playerNum}`;
      };

      // Check for active player indicators
      const isPlayer1Active = !!document.querySelector('.player1.active, [data-player="1"].active, .p1.active');
      const isPlayer2Active = !!document.querySelector('.player2.active, [data-player="2"].active, .p2.active');
      
      // Get last throw/dart info
      const lastThrow = getTextContent('.last-throw, .current-throw, .dart-score, .throw-score') || '';
      
      // Get match info
      const matchFormat = getTextContent('.match-format, .game-format, .format') || '';
      const currentLeg = getTextContent('.current-leg, .leg-number') || '1';
      
      return {
        player1: {
          name: getPlayerName(1),
          score: getPlayerScore(1),
          legs: getPlayerLegs(1),
          isActive: isPlayer1Active
        },
        player2: {
          name: getPlayerName(2),
          score: getPlayerScore(2),
          legs: getPlayerLegs(2),
          isActive: isPlayer2Active
        },
        match: {
          format: matchFormat,
          currentLeg: currentLeg,
          lastThrow: lastThrow
        },
        timestamp: Date.now()
      };
    });
  }

  hasDataChanged(newData) {
    if (!this.lastData || Object.keys(this.lastData).length === 0) {
      return true;
    }

    return JSON.stringify(newData) !== JSON.stringify(this.lastData);
  }

  async broadcastUpdate(matchData) {
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'live-score-update',
        payload: matchData
      });
    } catch (error) {
      console.error('❌ Failed to broadcast update:', error.message);
    }
  }

  async storeScrapeSession(watchCode, status) {
    try {
      const { error } = await supabase
        .from('scraper_sessions')
        .upsert({
          watch_code: watchCode,
          status: status,
          started_at: new Date().toISOString(),
          last_update: new Date().toISOString()
        }, { onConflict: 'watch_code' });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to store session:', error.message);
    }
  }

  async updateSession(matchData) {
    try {
      await supabase
        .from('scraper_sessions')
        .update({
          last_data: matchData,
          last_update: new Date().toISOString()
        })
        .eq('watch_code', this.watchCode);
    } catch (error) {
      console.error('❌ Failed to update session:', error.message);
    }
  }

  async stop() {
    console.log('🛑 Stopping scraper...');
    this.isRunning = false;
    
    if (this.watchCode) {
      await this.storeScrapeSession(this.watchCode, 'stopped');
    }
    
    await this.cleanup();
  }

  async cleanup() {
    if (this.channel) {
      await this.channel.unsubscribe();
    }
    
    if (this.page) {
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI usage
if (require.main === module) {
  const watchCode = process.argv[2];
  
  if (!watchCode) {
    console.log('❌ Usage: node scraper.js <watch-code>');
    console.log('📖 Example: node scraper.js ABC123');
    process.exit(1);
  }

  const scraper = new DartConnectScraper();
  
  (async () => {
    const initialized = await scraper.init(watchCode);
    if (initialized) {
      await scraper.startScraping();
    }
  })();
}

module.exports = DartConnectScraper;