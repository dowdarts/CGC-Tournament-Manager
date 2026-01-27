const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://pfujbgwgsxuhgvmeatjh.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Enhanced DartConnect Scraper with Tournament Manager Integration
 * - Monitors live matches on DartConnect
 * - Detects match completion
 * - Automatically creates pending match results
 * - Links scraped data to scheduled tournament matches
 * - Supports auto-accept feature
 */
class EnhancedDartConnectScraper {
  constructor(watchCode, tournamentId = null) {
    this.watchCode = watchCode;
    this.tournamentId = tournamentId;
    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.lastData = {};
    this.matchCompleted = false;
    this.linkedMatchId = null;
    this.scraperSessionId = null;
    
    // Match completion detection
    this.matchCompletionThreshold = 3; // Number of consecutive checks with same final score
    this.consecutiveCompletionChecks = 0;
    this.lastFinalScore = null;
  }

  /**
   * Initialize the scraper
   */
  async init() {
    console.log(`🎯 Initializing Enhanced DartConnect scraper`);
    console.log(`   Watch Code: ${this.watchCode}`);
    console.log(`   Tournament ID: ${this.tournamentId || 'Not linked'}`);
    
    try {
      // Launch browser
      this.browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Navigate to DartConnect
      const url = `https://tv.dartconnect.com/live/${this.watchCode}`;
      console.log(`🌐 Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(3000);
      
      // Create scraper session in database
      await this.createScraperSession();
      
      // If tournament ID provided, try to link with a match
      if (this.tournamentId) {
        await this.attemptMatchLinking();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize scraper:', error.message);
      await this.cleanup();
      return false;
    }
  }

  /**
   * Create a scraper session record in the database
   */
  async createScraperSession() {
    try {
      const { data, error } = await supabase
        .from('scraper_sessions')
        .insert({
          watch_code: this.watchCode,
          tournament_id: this.tournamentId,
          status: 'active',
          started_at: new Date().toISOString(),
          last_update: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      this.scraperSessionId = data.id;
      console.log(`✅ Scraper session created: ${this.scraperSessionId}`);
    } catch (error) {
      console.error('❌ Failed to create scraper session:', error.message);
    }
  }

  /**
   * Attempt to automatically link this scraper to a scheduled match
   */
  async attemptMatchLinking() {
    if (!this.tournamentId) return;

    try {
      // Check if watch code is already linked to a match
      const { data: watchCodeData, error: watchCodeError } = await supabase
        .from('match_watch_codes')
        .select('match_id')
        .eq('watch_code', this.watchCode)
        .eq('tournament_id', this.tournamentId)
        .single();

      if (watchCodeData && !watchCodeError) {
        this.linkedMatchId = watchCodeData.match_id;
        console.log(`🔗 Watch code already linked to match: ${this.linkedMatchId}`);
        
        // Update scraper session with linked match
        await supabase
          .from('scraper_sessions')
          .update({ linked_match_id: this.linkedMatchId })
          .eq('id', this.scraperSessionId);
      }
    } catch (error) {
      console.error('⚠️ Could not link watch code to match:', error.message);
    }
  }

  /**
   * Start scraping loop
   */
  async startScraping() {
    if (!this.page || this.isRunning) {
      console.log('⚠️ Scraper not initialized or already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting live scraping with match completion detection...');

    const scrapeInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(scrapeInterval);
        return;
      }

      try {
        const matchData = await this.scrapeMatchData();
        
        // Check for match completion
        const completed = this.checkMatchCompletion(matchData);
        
        if (completed && !this.matchCompleted) {
          console.log('🏁 Match completion detected!');
          await this.handleMatchCompletion(matchData);
          this.matchCompleted = true;
        }
        
        // Update session with latest data
        await this.updateSession(matchData);
        
        // Log if data changed
        if (this.hasDataChanged(matchData)) {
          console.log('📊 Score update:', {
            player1: `${matchData.player1.name} - Legs: ${matchData.player1.legs}`,
            player2: `${matchData.player2.name} - Legs: ${matchData.player2.legs}`
          });
          this.lastData = { ...matchData };
        }
      } catch (error) {
        console.error('❌ Scraping error:', error.message);
      }
    }, 2000); // Check every 2 seconds

    // Cleanup on exit
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Scrape current match data from DartConnect
   */
  async scrapeMatchData() {
    return await this.page.evaluate(() => {
      const getTextContent = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : null;
      };

      const getPlayerData = (playerNum) => {
        const selectors = {
          name: [
            `#p${playerNum}_name`,
            `.player-${playerNum}-name`,
            `.player${playerNum} .name`,
            `[data-player="${playerNum}"] .name`
          ],
          score: [
            `#p${playerNum}_score`,
            `.player-${playerNum}-score`,
            `.player${playerNum} .score`,
            `[data-player="${playerNum}"] .score`
          ],
          legs: [
            `#p${playerNum}_legs`,
            `.player-${playerNum}-legs`,
            `.player${playerNum} .legs`,
            `[data-player="${playerNum}"] .legs`
          ],
          sets: [
            `#p${playerNum}_sets`,
            `.player-${playerNum}-sets`,
            `.player${playerNum} .sets`,
            `[data-player="${playerNum}"] .sets`
          ],
          average: [
            `#p${playerNum}_avg`,
            `.player-${playerNum}-average`,
            `.player${playerNum} .average`,
            `[data-player="${playerNum}"] .avg`
          ]
        };

        const getData = (selectorArray) => {
          for (const selector of selectorArray) {
            const value = getTextContent(selector);
            if (value && value !== '') return value;
          }
          return null;
        };

        return {
          name: getData(selectors.name) || `Player ${playerNum}`,
          score: getData(selectors.score) || '501',
          legs: parseInt(getData(selectors.legs) || '0'),
          sets: parseInt(getData(selectors.sets) || '0'),
          average: parseFloat(getData(selectors.average) || '0'),
          isActive: !!document.querySelector(`.player${playerNum}.active, [data-player="${playerNum}"].active`)
        };
      };

      const player1 = getPlayerData(1);
      const player2 = getPlayerData(2);

      // Get match info
      const matchFormat = getTextContent('.match-format, .game-format, .format') || '';
      const currentLeg = getTextContent('.current-leg, .leg-number') || '1';

      return {
        player1,
        player2,
        match: {
          format: matchFormat,
          currentLeg: currentLeg,
          timestamp: Date.now()
        }
      };
    });
  }

  /**
   * Check if match has completed
   * Returns true if match appears to be finished
   */
  checkMatchCompletion(matchData) {
    // Extract legs for both players
    const p1Legs = matchData.player1.legs;
    const p2Legs = matchData.player2.legs;

    // Both players must have at least some legs played
    if (p1Legs === 0 && p2Legs === 0) {
      return false;
    }

    // Check if one player has decisively won
    // Common formats: Best of 3 (first to 2), Best of 5 (first to 3), Best of 7 (first to 4)
    const hasWinner = p1Legs >= 2 || p2Legs >= 2; // Adjust based on your format

    if (!hasWinner) {
      this.consecutiveCompletionChecks = 0;
      return false;
    }

    // Check if scores have remained stable (not changing)
    const currentFinalScore = `${p1Legs}-${p2Legs}`;
    
    if (this.lastFinalScore === currentFinalScore) {
      this.consecutiveCompletionChecks++;
    } else {
      this.consecutiveCompletionChecks = 1;
      this.lastFinalScore = currentFinalScore;
    }

    // Match is completed if scores haven't changed for several checks
    return this.consecutiveCompletionChecks >= this.matchCompletionThreshold;
  }

  /**
   * Handle match completion - create pending result
   */
  async handleMatchCompletion(matchData) {
    console.log('🎯 Creating pending match result...');

    try {
      // Determine winner
      const p1Legs = matchData.player1.legs;
      const p2Legs = matchData.player2.legs;
      const winnerName = p1Legs > p2Legs ? matchData.player1.name : matchData.player2.name;

      // Try to match players if tournament ID is available
      let matchId = this.linkedMatchId;
      let confidenceScore = 0;
      let matchingNotes = 'No tournament linked';
      let matchFound = false;

      if (this.tournamentId) {
        const matchResult = await this.findMatchingScheduledMatch(
          matchData.player1.name,
          matchData.player2.name
        );
        
        if (matchResult) {
          matchId = matchResult.match_id;
          confidenceScore = matchResult.confidence;
          matchingNotes = matchResult.notes;
          matchFound = matchResult.match_id !== null;
        }
      }

      // Create pending match result
      const { data: pendingResult, error } = await supabase
        .from('pending_match_results')
        .insert({
          tournament_id: this.tournamentId,
          match_id: matchId,
          watch_code: this.watchCode,
          scraper_session_id: this.scraperSessionId,
          player1_name: matchData.player1.name,
          player2_name: matchData.player2.name,
          player1_legs: p1Legs,
          player2_legs: p2Legs,
          player1_sets: matchData.player1.sets || 0,
          player2_sets: matchData.player2.sets || 0,
          winner_name: winnerName,
          match_format: matchData.match.format,
          player1_average: matchData.player1.average || null,
          player2_average: matchData.player2.average || null,
          total_legs_played: p1Legs + p2Legs,
          status: 'pending',
          confidence_score: confidenceScore,
          match_found: matchFound,
          matching_notes: matchingNotes,
          raw_scraper_data: matchData,
          match_completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Pending result created: ${pendingResult.id}`);
      console.log(`   Match Found: ${matchFound}`);
      console.log(`   Confidence: ${confidenceScore}`);
      console.log(`   Winner: ${winnerName} (${p1Legs}-${p2Legs})`);

      // Update scraper session
      await supabase
        .from('scraper_sessions')
        .update({
          match_completed: true,
          result_submitted: true,
          status: 'completed'
        })
        .eq('id', this.scraperSessionId);

      // Check if auto-accept should be triggered
      if (matchFound && confidenceScore >= 0.90) {
        console.log('🤖 Attempting auto-accept...');
        await this.tryAutoAccept(pendingResult.id);
      }

      // Stop scraping after match completion
      setTimeout(() => this.stop(), 5000);

    } catch (error) {
      console.error('❌ Failed to handle match completion:', error.message);
    }
  }

  /**
   * Find matching scheduled match in the database
   */
  async findMatchingScheduledMatch(player1Name, player2Name) {
    if (!this.tournamentId) return null;

    try {
      const { data, error } = await supabase
        .rpc('match_dartconnect_players', {
          p_tournament_id: this.tournamentId,
          p_player1_name: player1Name,
          p_player2_name: player2Name
        });

      if (error) {
        console.error('❌ Error finding match:', error.message);
        return null;
      }

      if (data && data.length > 0) {
        return data[0];
      }

      return {
        match_id: null,
        confidence: 0,
        notes: 'No matching scheduled match found'
      };
    } catch (error) {
      console.error('❌ Error in match finding:', error.message);
      return null;
    }
  }

  /**
   * Attempt to auto-accept the pending result
   */
  async tryAutoAccept(pendingResultId) {
    try {
      const { data, error } = await supabase
        .rpc('auto_accept_pending_result', {
          p_pending_result_id: pendingResultId
        });

      if (error) throw error;

      if (data) {
        console.log('✅ Result auto-accepted and applied to match!');
      } else {
        console.log('ℹ️ Auto-accept not enabled or conditions not met');
      }
    } catch (error) {
      console.error('❌ Auto-accept failed:', error.message);
    }
  }

  /**
   * Check if data has changed since last update
   */
  hasDataChanged(newData) {
    if (!this.lastData || Object.keys(this.lastData).length === 0) {
      return true;
    }
    return JSON.stringify(newData) !== JSON.stringify(this.lastData);
  }

  /**
   * Update scraper session in database
   */
  async updateSession(matchData) {
    try {
      await supabase
        .from('scraper_sessions')
        .update({
          last_data: matchData,
          last_update: new Date().toISOString()
        })
        .eq('id', this.scraperSessionId);
    } catch (error) {
      console.error('❌ Failed to update session:', error.message);
    }
  }

  /**
   * Stop the scraper
   */
  async stop() {
    console.log('🛑 Stopping scraper...');
    this.isRunning = false;
    
    if (this.scraperSessionId) {
      await supabase
        .from('scraper_sessions')
        .update({ status: 'stopped' })
        .eq('id', this.scraperSessionId);
    }
    
    await this.cleanup();
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// =====================================================================
// CLI Usage
// =====================================================================
if (require.main === module) {
  const watchCode = process.argv[2];
  const tournamentId = process.argv[3]; // Optional
  
  if (!watchCode) {
    console.log('❌ Usage: node enhanced-scraper.js <watch-code> [tournament-id]');
    console.log('📖 Example: node enhanced-scraper.js ABC123');
    console.log('📖 Example: node enhanced-scraper.js ABC123 550e8400-e29b-41d4-a716-446655440000');
    console.log('');
    console.log('Features:');
    console.log('  - Monitors live DartConnect matches');
    console.log('  - Detects match completion automatically');
    console.log('  - Creates pending results for approval');
    console.log('  - Links to tournament matches when tournament ID provided');
    console.log('  - Supports auto-accept for high-confidence matches');
    process.exit(1);
  }

  const scraper = new EnhancedDartConnectScraper(watchCode, tournamentId);
  
  (async () => {
    const initialized = await scraper.init();
    if (initialized) {
      await scraper.startScraping();
    }
  })();
}

module.exports = EnhancedDartConnectScraper;
