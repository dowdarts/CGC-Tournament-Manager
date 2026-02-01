const puppeteer = require('puppeteer');

class DartConnectScraper {
  constructor(options) {
    this.watchCode = options.watchCode;
    this.tournamentId = options.tournamentId;
    this.autoAccept = options.autoAccept;
    this.requireManualApproval = options.requireManualApproval;
    this.supabase = options.supabase;
    this.logger = options.logger;
    this.checkInterval = options.checkInterval || 5000;

    this.browser = null;
    this.page = null;
    this.checkIntervalId = null;
    this.lastMatchState = null;
    this.sessionId = null;
    this.pendingResultId = null; // Track the live match result ID
  }

  async start() {
    this.logger.info(`[${this.watchCode}] Launching browser...`);

    // Launch Puppeteer
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    // Create scraper session
    await this.createSession();

    // Navigate to DartConnect
    const url = `https://tv.dartconnect.com/history/match/${this.watchCode}`;
    this.logger.info(`[${this.watchCode}] Navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Set up real-time monitoring with MutationObserver
    await this.setupRealtimeMonitoring();

    // Start polling-based monitoring as backup
    this.checkIntervalId = setInterval(() => {
      this.checkMatchStatus();
    }, this.checkInterval);

    this.logger.info(`[${this.watchCode}] Scraper started. Checking every ${this.checkInterval}ms`);
  }

  async setupRealtimeMonitoring() {
    try {
      // Inject a MutationObserver to detect DOM changes in real-time
      await this.page.evaluate(() => {
        // Store match state for change detection
        window.dartConnectMatchState = {
          isComplete: false,
          lastUpdate: Date.now()
        };

        // Function to check if match is complete
        const checkMatchCompletion = () => {
          const statusElement = document.querySelector('.match-status, [class*="status"], [class*="complete"]');
          const isComplete = statusElement && 
            (statusElement.textContent.toLowerCase().includes('complete') ||
             statusElement.textContent.toLowerCase().includes('finished') ||
             statusElement.classList.contains('completed') ||
             statusElement.classList.contains('match-complete'));

          if (isComplete && !window.dartConnectMatchState.isComplete) {
            window.dartConnectMatchState.isComplete = true;
            window.dartConnectMatchState.lastUpdate = Date.now();
            console.log('[DartConnect Monitor] Match completion detected!');
            
            // Add a marker to the page that scraper can detect
            const marker = document.createElement('div');
            marker.id = 'match-complete-marker';
            marker.setAttribute('data-timestamp', Date.now());
            document.body.appendChild(marker);
          }
        };

        // Set up MutationObserver to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
          window.dartConnectMatchState.lastUpdate = Date.now();
          checkMatchCompletion();
        });

        // Observe the document body for changes
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });

        // Initial check
        checkMatchCompletion();

        console.log('[DartConnect Monitor] Real-time monitoring initialized');
      });

      this.logger.info(`[${this.watchCode}] Real-time monitoring set up successfully`);
    } catch (error) {
      this.logger.error(`[${this.watchCode}] Error setting up real-time monitoring: ${error.message}`);
    }
  }

  async createSession() {
    try {
      const { data, error } = await this.supabase
        .from('scraper_sessions')
        .insert({
          watch_code: this.watchCode,
          tournament_id: this.tournamentId,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`[${this.watchCode}] Error creating session: ${error.message}`);
      } else {
        this.sessionId = data.id;
        this.logger.info(`[${this.watchCode}] Session created: ${this.sessionId}`);
      }
    } catch (error) {
      this.logger.error(`[${this.watchCode}] Exception creating session: ${error.message}`);
    }
  }

  async checkMatchStatus() {
    try {
      // Check for real-time completion marker
      const hasCompletionMarker = await this.page.evaluate(() => {
        return document.getElementById('match-complete-marker') !== null;
      });

      // Check if match is complete
      const matchData = await this.extractMatchData();

      if (!matchData) {
        return; // No match data yet
      }

      // Log current match state
      if (this.lastMatchState) {
        const statusChanged = matchData.isComplete !== this.lastMatchState.isComplete;
        const scoreChanged = matchData.player1Legs !== this.lastMatchState.player1Legs ||
                            matchData.player2Legs !== this.lastMatchState.player2Legs ||
                            matchData.player1Sets !== this.lastMatchState.player1Sets ||
                            matchData.player2Sets !== this.lastMatchState.player2Sets;

        if (statusChanged || scoreChanged) {
          this.logger.info(`[${this.watchCode}] Match update detected:`, {
            complete: matchData.isComplete,
            score: `${matchData.player1Legs}-${matchData.player2Legs}`,
            sets: matchData.player1Sets > 0 ? `${matchData.player1Sets}-${matchData.player2Sets}` : 'N/A',
            winner: matchData.winnerName || 'TBD'
          });
          
          // Update live scores in database
          await this.updateLiveScores(matchData);
        }
      } else {
        // First data received - create live match entry
        this.logger.info(`[${this.watchCode}] 🔴 MATCH IS LIVE!`);
        await this.createLiveMatch(matchData);
      }

      // Check if match just completed
      if (matchData.isComplete && !this.lastMatchState?.isComplete) {
        this.logger.info(`[${this.watchCode}] ⚡ MATCH COMPLETED! ⚡`);
        this.logger.info(`[${this.watchCode}] Winner: ${matchData.winnerName}`);
        this.logger.info(`[${this.watchCode}] Final Score: ${matchData.player1Name} ${matchData.player1Legs}-${matchData.player2Legs} ${matchData.player2Name}`);
        if (matchData.player1Sets > 0 || matchData.player2Sets > 0) {
          this.logger.info(`[${this.watchCode}] Sets: ${matchData.player1Sets}-${matchData.player2Sets}`);
        }
        await this.submitFinalResult(matchData);
        
        // Stop monitoring after submission
        await this.stop();
      }

      this.lastMatchState = matchData;

    } catch (error) {
      this.logger.error(`[${this.watchCode}] Error checking match status: ${error.message}`);
    }
  }

  async extractMatchData() {
    try {
      // Wait for match data to load
      await this.page.waitForSelector('.match-history', { timeout: 5000 });

      const data = await this.page.evaluate(() => {
        // Extract player names
        const player1Element = document.querySelector('.player1-name, .player-1-name, [class*="player1"] [class*="name"]');
        const player2Element = document.querySelector('.player2-name, .player-2-name, [class*="player2"] [class*="name"]');

        const player1Name = player1Element ? player1Element.textContent.trim() : null;
        const player2Name = player2Element ? player2Element.textContent.trim() : null;

        if (!player1Name || !player2Name) {
          return null;
        }

        // Extract scores (legs)
        const player1LegsElement = document.querySelector('.player1-legs, .player-1-score, [class*="player1"] [class*="legs"]');
        const player2LegsElement = document.querySelector('.player2-legs, .player-2-score, [class*="player2"] [class*="legs"]');

        const player1Legs = player1LegsElement ? parseInt(player1LegsElement.textContent) || 0 : 0;
        const player2Legs = player2LegsElement ? parseInt(player2LegsElement.textContent) || 0 : 0;

        // Extract sets (if applicable)
        const player1SetsElement = document.querySelector('.player1-sets, [class*="player1"] [class*="sets"]');
        const player2SetsElement = document.querySelector('.player2-sets, [class*="player2"] [class*="sets"]');

        const player1Sets = player1SetsElement ? parseInt(player1SetsElement.textContent) || 0 : 0;
        const player2Sets = player2SetsElement ? parseInt(player2SetsElement.textContent) || 0 : 0;

        // Extract averages
        const player1AvgElement = document.querySelector('.player1-average, [class*="player1"] [class*="average"]');
        const player2AvgElement = document.querySelector('.player2-average, [class*="player2"] [class*="average"]');

        const player1Average = player1AvgElement ? parseFloat(player1AvgElement.textContent) || null : null;
        const player2Average = player2AvgElement ? parseFloat(player2AvgElement.textContent) || null : null;

        // Extract first 9 dart averages
        const player1First9Element = document.querySelector('.player1-first9, [class*="player1"] [class*="first-9"], [class*="player1"] [class*="first9"]');
        const player2First9Element = document.querySelector('.player2-first9, [class*="player2"] [class*="first-9"], [class*="player2"] [class*="first9"]');

        const player1First9Average = player1First9Element ? parseFloat(player1First9Element.textContent) || null : null;
        const player2First9Average = player2First9Element ? parseFloat(player2First9Element.textContent) || null : null;

        // Extract checkout statistics
        const player1CheckoutElement = document.querySelector('.player1-checkout, [class*="player1"] [class*="checkout"]');
        const player2CheckoutElement = document.querySelector('.player2-checkout, [class*="player2"] [class*="checkout"]');

        // Parse checkout format like "5/12" (5 completed out of 12 attempts)
        let player1CheckoutAttempts = 0, player1CheckoutsCompleted = 0, player1CheckoutPercentage = null;
        let player2CheckoutAttempts = 0, player2CheckoutsCompleted = 0, player2CheckoutPercentage = null;

        if (player1CheckoutElement) {
          const checkoutText = player1CheckoutElement.textContent.trim();
          const match = checkoutText.match(/(\d+)\/(\d+)/);
          if (match) {
            player1CheckoutsCompleted = parseInt(match[1]);
            player1CheckoutAttempts = parseInt(match[2]);
            player1CheckoutPercentage = player1CheckoutAttempts > 0 
              ? ((player1CheckoutsCompleted / player1CheckoutAttempts) * 100).toFixed(2) 
              : 0;
          }
        }

        if (player2CheckoutElement) {
          const checkoutText = player2CheckoutElement.textContent.trim();
          const match = checkoutText.match(/(\d+)\/(\d+)/);
          if (match) {
            player2CheckoutsCompleted = parseInt(match[1]);
            player2CheckoutAttempts = parseInt(match[2]);
            player2CheckoutPercentage = player2CheckoutAttempts > 0 
              ? ((player2CheckoutsCompleted / player2CheckoutAttempts) * 100).toFixed(2) 
              : 0;
          }
        }

        // Extract highest checkout
        const player1HighestCheckoutElement = document.querySelector('.player1-highest-checkout, [class*="player1"] [class*="high-checkout"]');
        const player2HighestCheckoutElement = document.querySelector('.player2-highest-checkout, [class*="player2"] [class*="high-checkout"]');

        const player1HighestCheckout = player1HighestCheckoutElement ? parseInt(player1HighestCheckoutElement.textContent) || null : null;
        const player2HighestCheckout = player2HighestCheckoutElement ? parseInt(player2HighestCheckoutElement.textContent) || null : null;

        // Extract 180s
        const player1_180sElement = document.querySelector('.player1-180s, [class*="player1"] [class*="180"]');
        const player2_180sElement = document.querySelector('.player2-180s, [class*="player2"] [class*="180"]');

        const player1_180s = player1_180sElement ? parseInt(player1_180sElement.textContent) || 0 : 0;
        const player2_180s = player2_180sElement ? parseInt(player2_180sElement.textContent) || 0 : 0;

        // Extract detailed score counts (100+, 120+, 140+, 160+)
        // These may be in a statistics table or individual elements
        const player1_100plus = parseInt(document.querySelector('.player1-100plus, [class*="player1"] [data-stat="100plus"]')?.textContent) || 0;
        const player1_120plus = parseInt(document.querySelector('.player1-120plus, [class*="player1"] [data-stat="120plus"]')?.textContent) || 0;
        const player1_140plus = parseInt(document.querySelector('.player1-140plus, [class*="player1"] [data-stat="140plus"]')?.textContent) || 0;
        const player1_160plus = parseInt(document.querySelector('.player1-160plus, [class*="player1"] [data-stat="160plus"]')?.textContent) || 0;

        const player2_100plus = parseInt(document.querySelector('.player2-100plus, [class*="player2"] [data-stat="100plus"]')?.textContent) || 0;
        const player2_120plus = parseInt(document.querySelector('.player2-120plus, [class*="player2"] [data-stat="120plus"]')?.textContent) || 0;
        const player2_140plus = parseInt(document.querySelector('.player2-140plus, [class*="player2"] [data-stat="140plus"]')?.textContent) || 0;
        const player2_160plus = parseInt(document.querySelector('.player2-160plus, [class*="player2"] [data-stat="160plus"]')?.textContent) || 0;

        // Extract ton plus finishes (finishes 100+)
        const player1TonPlusElement = document.querySelector('.player1-ton-plus-finish, [class*="player1"] [data-stat="ton-plus"]');
        const player2TonPlusElement = document.querySelector('.player2-ton-plus-finish, [class*="player2"] [data-stat="ton-plus"]');

        const player1TonPlusFinishes = player1TonPlusElement ? parseInt(player1TonPlusElement.textContent) || 0 : 0;
        const player2TonPlusFinishes = player2TonPlusElement ? parseInt(player2TonPlusElement.textContent) || 0 : 0;

        // Calculate darts thrown (if available, otherwise estimate from legs and average)
        const player1DartsElement = document.querySelector('.player1-darts-thrown, [class*="player1"] [data-stat="darts"]');
        const player2DartsElement = document.querySelector('.player2-darts-thrown, [class*="player2"] [data-stat="darts"]');

        let player1DartsThrown = player1DartsElement ? parseInt(player1DartsElement.textContent) || null : null;
        let player2DartsThrown = player2DartsElement ? parseInt(player2DartsElement.textContent) || null : null;

        // If darts thrown not available, estimate from average (rough approximation)
        if (!player1DartsThrown && player1Average && player1Legs > 0) {
          // Rough estimate: 501 points per leg, average per 3 darts
          player1DartsThrown = Math.round((501 * player1Legs / player1Average) * 3);
        }
        if (!player2DartsThrown && player2Average && player2Legs > 0) {
          player2DartsThrown = Math.round((501 * player2Legs / player2Average) * 3);
        }

        // Check if match is complete
        const statusElement = document.querySelector('.match-status, [class*="status"], [class*="complete"]');
        const isComplete = statusElement && 
          (statusElement.textContent.toLowerCase().includes('complete') ||
           statusElement.textContent.toLowerCase().includes('finished') ||
           statusElement.classList.contains('completed'));

        // Determine winner
        let winnerName = null;
        if (isComplete) {
          if (player1Sets > 0 || player2Sets > 0) {
            // Sets-based match
            winnerName = player1Sets > player2Sets ? player1Name : player2Name;
          } else {
            // Legs-based match
            winnerName = player1Legs > player2Legs ? player1Name : player2Name;
          }
        }

        return {
          player1Name,
          player2Name,
          player1Legs,
          player2Legs,
          player1Sets,
          player2Sets,
          player1Average,
          player2Average,
          player1First9Average,
          player2First9Average,
          player1HighestCheckout,
          player2HighestCheckout,
          player1CheckoutAttempts,
          player1CheckoutsCompleted,
          player1CheckoutPercentage,
          player2CheckoutAttempts,
          player2CheckoutsCompleted,
          player2CheckoutPercentage,
          player1_180s,
          player2_180s,
          player1_100plus,
          player1_120plus,
          player1_140plus,
          player1_160plus,
          player2_100plus,
          player2_120plus,
          player2_140plus,
          player2_160plus,
          player1TonPlusFinishes,
          player2TonPlusFinishes,
          player1DartsThrown,
          player2DartsThrown,
          isComplete,
          winnerName
        };
      });

      return data;

    } catch (error) {
      // No match data yet or page not loaded
      return null;
    }
  }

  async createLiveMatch(matchData) {
    try {
      this.logger.info(`[${this.watchCode}] Creating live match entry for ${matchData.player1Name} vs ${matchData.player2Name}`);

      // Call database function to match players
      const { data: matchResult, error: matchError } = await this.supabase
        .rpc('match_dartconnect_players', {
          p_tournament_id: this.tournamentId,
          p_player1_name: matchData.player1Name,
          p_player2_name: matchData.player2Name
        });

      if (matchError) {
        this.logger.error(`[${this.watchCode}] Error matching players: ${matchError.message}`);
        return;
      }

      const matchInfo = matchResult[0];
      this.logger.info(`[${this.watchCode}] Match found: ${matchInfo.match_id}, Confidence: ${matchInfo.confidence}`);

      // Create live match entry with initial data
      const { data: liveMatch, error: liveError } = await this.supabase
        .from('pending_match_results')
        .insert({
          tournament_id: this.tournamentId,
          match_id: matchInfo.match_id,
          watch_code: this.watchCode,
          scraper_session_id: this.sessionId,
          player1_name: matchData.player1Name,
          player2_name: matchData.player2Name,
          player1_legs: matchData.player1Legs,
          player2_legs: matchData.player2Legs,
          player1_sets: matchData.player1Sets || 0,
          player2_sets: matchData.player2Sets || 0,
          player1_average: matchData.player1Average,
          player2_average: matchData.player2Average,
          player1_180s: matchData.player1_180s || 0,
          player2_180s: matchData.player2_180s || 0,
          confidence_score: matchInfo.confidence,
          match_found: matchInfo.match_id !== null,
          matching_notes: matchInfo.notes,
          status: 'live',
          is_live: true,
          match_started_at: new Date().toISOString(),
          live_updated_at: new Date().toISOString(),
          raw_scraper_data: matchData
        })
        .select()
        .single();

      if (liveError) {
        this.logger.error(`[${this.watchCode}] Error creating live match: ${liveError.message}`);
        return;
      }

      this.pendingResultId = liveMatch.id;
      this.logger.info(`[${this.watchCode}] Live match created: ${liveMatch.id}`);

    } catch (error) {
      this.logger.error(`[${this.watchCode}] Exception creating live match: ${error.message}`);
    }
  }

  async updateLiveScores(matchData) {
    if (!this.pendingResultId) {
      // If no pending result exists, create it
      await this.createLiveMatch(matchData);
      return;
    }

    try {
      // Update the live match with current scores and stats
      const { error: updateError } = await this.supabase
        .from('pending_match_results')
        .update({
          player1_legs: matchData.player1Legs,
          player2_legs: matchData.player2Legs,
          player1_sets: matchData.player1Sets || 0,
          player2_sets: matchData.player2Sets || 0,
          player1_average: matchData.player1Average,
          player2_average: matchData.player2Average,
          player1_first_9_average: matchData.player1First9Average,
          player2_first_9_average: matchData.player2First9Average,
          player1_highest_checkout: matchData.player1HighestCheckout,
          player2_highest_checkout: matchData.player2HighestCheckout,
          player1_180s: matchData.player1_180s || 0,
          player2_180s: matchData.player2_180s || 0,
          player1_100_plus: matchData.player1_100plus || 0,
          player1_120_plus: matchData.player1_120plus || 0,
          player1_140_plus: matchData.player1_140plus || 0,
          player1_160_plus: matchData.player1_160plus || 0,
          player2_100_plus: matchData.player2_100plus || 0,
          player2_120_plus: matchData.player2_120plus || 0,
          player2_140_plus: matchData.player2_140plus || 0,
          player2_160_plus: matchData.player2_160plus || 0,
          player1_checkout_attempts: matchData.player1CheckoutAttempts || 0,
          player1_checkouts_completed: matchData.player1CheckoutsCompleted || 0,
          player1_checkout_percentage: matchData.player1CheckoutPercentage,
          player2_checkout_attempts: matchData.player2CheckoutAttempts || 0,
          player2_checkouts_completed: matchData.player2CheckoutsCompleted || 0,
          player2_checkout_percentage: matchData.player2CheckoutPercentage,
          player1_darts_thrown: matchData.player1DartsThrown,
          player2_darts_thrown: matchData.player2DartsThrown,
          live_updated_at: new Date().toISOString(),
          raw_scraper_data: matchData
        })
        .eq('id', this.pendingResultId);

      if (updateError) {
        this.logger.error(`[${this.watchCode}] Error updating live scores: ${updateError.message}`);
      }
    } catch (error) {
      this.logger.error(`[${this.watchCode}] Exception updating live scores: ${error.message}`);
    }
  }

  async submitFinalResult(matchData) {
    try {
      this.logger.info(`[${this.watchCode}] Submitting final result for ${matchData.player1Name} vs ${matchData.player2Name}`);

      if (this.pendingResultId) {
        // Update existing live match to pending status with final data
        const { error: updateError } = await this.supabase
          .from('pending_match_results')
          .update({
            status: 'pending',
            is_live: false,
            winner_name: matchData.winnerName,
            player1_legs: matchData.player1Legs,
            player2_legs: matchData.player2Legs,
            player1_sets: matchData.player1Sets || 0,
            player2_sets: matchData.player2Sets || 0,
            player1_average: matchData.player1Average,
            player2_average: matchData.player2Average,
            player1_highest_checkout: matchData.player1HighestCheckout,
            player2_highest_checkout: matchData.player2HighestCheckout,
            player1_180s: matchData.player1_180s || 0,
            player2_180s: matchData.player2_180s || 0,
            player1_darts_thrown: matchData.player1DartsThrown,
            player2_darts_thrown: matchData.player2DartsThrown,
            player1_first_9_average: matchData.player1First9Average,
            player2_first_9_average: matchData.player2First9Average,
            player1_checkout_attempts: matchData.player1CheckoutAttempts || 0,
            player1_checkouts_completed: matchData.player1CheckoutsCompleted || 0,
            player1_checkout_percentage: matchData.player1CheckoutPercentage,
            player2_checkout_attempts: matchData.player2CheckoutAttempts || 0,
            player2_checkouts_completed: matchData.player2CheckoutsCompleted || 0,
            player2_checkout_percentage: matchData.player2CheckoutPercentage,
            player1_100_plus: matchData.player1_100plus || 0,
            player1_120_plus: matchData.player1_120plus || 0,
            player1_140_plus: matchData.player1_140plus || 0,
            player1_160_plus: matchData.player1_160plus || 0,
            player2_100_plus: matchData.player2_100plus || 0,
            player2_120_plus: matchData.player2_120plus || 0,
            player2_140_plus: matchData.player2_140plus || 0,
            player2_160_plus: matchData.player2_160plus || 0,
            player1_ton_plus_finishes: matchData.player1TonPlusFinishes || 0,
            player2_ton_plus_finishes: matchData.player2TonPlusFinishes || 0,
            total_legs_played: matchData.player1Legs + matchData.player2Legs,
            match_completed_at: new Date().toISOString(),
            raw_scraper_data: matchData
          })
          .eq('id', this.pendingResultId);

        if (updateError) {
          this.logger.error(`[${this.watchCode}] Error updating to final result: ${updateError.message}`);
          return;
        }

        this.logger.info(`[${this.watchCode}] Live match transitioned to pending: ${this.pendingResultId}`);
      } else {
        // Fallback: Create new pending result if live match wasn't tracked
        const { data: matchResult, error: matchError } = await this.supabase
          .rpc('match_dartconnect_players', {
            p_tournament_id: this.tournamentId,
            p_player1_name: matchData.player1Name,
            p_player2_name: matchData.player2Name
          });

        if (matchError) {
          this.logger.error(`[${this.watchCode}] Error matching players: ${matchError.message}`);
          return;
        }

        const matchInfo = matchResult[0];

        // Create pending result with all statistics
      const { data: pendingResult, error: pendingError } = await this.supabase
        .from('pending_match_results')
        .insert({
          tournament_id: this.tournamentId,
          match_id: matchInfo.match_id,
          watch_code: this.watchCode,
          scraper_session_id: this.sessionId,
          player1_name: matchData.player1Name,
          player2_name: matchData.player2Name,
          player1_legs: matchData.player1Legs,
          player2_legs: matchData.player2Legs,
          player1_sets: matchData.player1Sets || 0,
          player2_sets: matchData.player2Sets || 0,
          winner_name: matchData.winnerName,
          player1_average: matchData.player1Average,
          player2_average: matchData.player2Average,
          player1_highest_checkout: matchData.player1HighestCheckout,
          player2_highest_checkout: matchData.player2HighestCheckout,
          player1_180s: matchData.player1_180s || 0,
          player2_180s: matchData.player2_180s || 0,
          // New detailed statistics
          player1_darts_thrown: matchData.player1DartsThrown,
          player2_darts_thrown: matchData.player2DartsThrown,
          player1_first_9_average: matchData.player1First9Average,
          player2_first_9_average: matchData.player2First9Average,
          player1_checkout_attempts: matchData.player1CheckoutAttempts || 0,
          player1_checkouts_completed: matchData.player1CheckoutsCompleted || 0,
          player1_checkout_percentage: matchData.player1CheckoutPercentage,
          player2_checkout_attempts: matchData.player2CheckoutAttempts || 0,
          player2_checkouts_completed: matchData.player2CheckoutsCompleted || 0,
          player2_checkout_percentage: matchData.player2CheckoutPercentage,
          player1_100_plus: matchData.player1_100plus || 0,
          player1_120_plus: matchData.player1_120plus || 0,
          player1_140_plus: matchData.player1_140plus || 0,
          player1_160_plus: matchData.player1_160plus || 0,
          player2_100_plus: matchData.player2_100plus || 0,
          player2_120_plus: matchData.player2_120plus || 0,
          player2_140_plus: matchData.player2_140plus || 0,
          player2_160_plus: matchData.player2_160plus || 0,
          player1_ton_plus_finishes: matchData.player1TonPlusFinishes || 0,
          player2_ton_plus_finishes: matchData.player2TonPlusFinishes || 0,
          total_legs_played: matchData.player1Legs + matchData.player2Legs,
          confidence_score: matchInfo.confidence,
          match_found: matchInfo.match_id !== null,
          matching_notes: matchInfo.notes,
          status: 'pending',
          match_completed_at: new Date().toISOString(),
          raw_scraper_data: matchData
        })
        .select()
        .single();

      if (pendingError) {
        this.logger.error(`[${this.watchCode}] Error creating pending result: ${pendingError.message}`);
        return;
      }

      this.logger.info(`[${this.watchCode}] Pending result created: ${pendingResult.id}`);

      // Try auto-accept if enabled
      if (this.autoAccept && !this.requireManualApproval) {
        const { data: autoAccepted, error: autoError } = await this.supabase
          .rpc('auto_accept_pending_result', {
            p_pending_result_id: pendingResult.id
          });

        if (autoError) {
          this.logger.error(`[${this.watchCode}] Error auto-accepting: ${autoError.message}`);
        } else if (autoAccepted) {
          this.logger.info(`[${this.watchCode}] Result auto-accepted!`);
        } else {
          this.logger.info(`[${this.watchCode}] Result requires manual approval.`);
        }
      }

      // Update session
      await this.updateSession('completed');

    } catch (error) {
      this.logger.error(`[${this.watchCode}] Exception submitting result: ${error.message}`);
    }
  }

  async updateSession(status) {
    if (!this.sessionId) return;

    try {
      await this.supabase
        .from('scraper_sessions')
        .update({
          status,
          ended_at: new Date().toISOString(),
          match_completed: status === 'completed',
          result_submitted: status === 'completed'
        })
        .eq('id', this.sessionId);
    } catch (error) {
      this.logger.error(`[${this.watchCode}] Error updating session: ${error.message}`);
    }
  }

  async stop() {
    this.logger.info(`[${this.watchCode}] Stopping scraper...`);

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    if (this.page) {
      await this.page.close();
    }

    if (this.browser) {
      await this.browser.close();
    }

    await this.updateSession('stopped');

    this.logger.info(`[${this.watchCode}] Scraper stopped.`);
  }
}

module.exports = DartConnectScraper;
