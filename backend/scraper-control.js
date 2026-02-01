// Scraper Control Server
// Manages starting/stopping the DartConnect scraper service
// Responds to frontend toggle requests

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.SCRAPER_CONTROL_PORT || 3001;

let scraperProcess = null;
let scraperStatus = 'stopped'; // 'stopped', 'starting', 'running', 'stopping'

function startScraper() {
  return new Promise((resolve, reject) => {
    if (scraperProcess) {
      console.log('⚠️  Scraper already running');
      resolve({ success: false, message: 'Scraper already running' });
      return;
    }

    console.log('🚀 Starting DartConnect scraper...');
    scraperStatus = 'starting';

    const scraperDir = path.join(__dirname, '../dartconnect-scraper');
    
    // Spawn the scraper process
    scraperProcess = spawn('node', ['index.js'], {
      cwd: scraperDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    scraperProcess.stdout.on('data', (data) => {
      console.log(`[Scraper] ${data.toString().trim()}`);
    });

    scraperProcess.stderr.on('data', (data) => {
      console.error(`[Scraper Error] ${data.toString().trim()}`);
    });

    scraperProcess.on('error', (error) => {
      console.error('❌ Failed to start scraper:', error);
      scraperStatus = 'stopped';
      scraperProcess = null;
      reject(error);
    });

    scraperProcess.on('exit', (code, signal) => {
      console.log(`Scraper exited with code ${code}, signal ${signal}`);
      scraperStatus = 'stopped';
      scraperProcess = null;
    });

    // Give it a moment to start
    setTimeout(() => {
      if (scraperProcess && !scraperProcess.killed) {
        scraperStatus = 'running';
        console.log('✅ Scraper started successfully');
        resolve({ success: true, message: 'Scraper started', pid: scraperProcess.pid });
      } else {
        scraperStatus = 'stopped';
        reject(new Error('Scraper failed to start'));
      }
    }, 2000);
  });
}

function stopScraper() {
  return new Promise((resolve) => {
    if (!scraperProcess) {
      console.log('⚠️  Scraper not running');
      resolve({ success: false, message: 'Scraper not running' });
      return;
    }

    console.log('🛑 Stopping DartConnect scraper...');
    scraperStatus = 'stopping';

    scraperProcess.kill('SIGTERM');

    // Force kill after 5 seconds if not stopped
    const forceKillTimer = setTimeout(() => {
      if (scraperProcess && !scraperProcess.killed) {
        console.log('⚠️  Force killing scraper...');
        scraperProcess.kill('SIGKILL');
      }
    }, 5000);

    scraperProcess.on('exit', () => {
      clearTimeout(forceKillTimer);
      scraperProcess = null;
      scraperStatus = 'stopped';
      console.log('✅ Scraper stopped');
      resolve({ success: true, message: 'Scraper stopped' });
    });

    // Resolve after timeout if process doesn't exit
    setTimeout(() => {
      if (scraperStatus !== 'stopped') {
        scraperStatus = 'stopped';
        resolve({ success: true, message: 'Scraper stop initiated' });
      }
    }, 6000);
  });
}

function getStatus() {
  return {
    status: scraperStatus,
    running: scraperProcess !== null && !scraperProcess.killed,
    pid: scraperProcess?.pid || null
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        status: 'ok', 
        message: 'Scraper control server running',
        scraper: getStatus()
      }));
      return;
    }

    // Get scraper status
    if (url.pathname === '/api/scraper/status' && req.method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify(getStatus()));
      return;
    }

    // Start scraper
    if (url.pathname === '/api/scraper/start' && req.method === 'POST') {
      try {
        const result = await startScraper();
        res.statusCode = result.success ? 200 : 400;
        res.end(JSON.stringify(result));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return;
    }

    // Stop scraper
    if (url.pathname === '/api/scraper/stop' && req.method === 'POST') {
      const result = await stopScraper();
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return;
    }

    // Restart scraper
    if (url.pathname === '/api/scraper/restart' && req.method === 'POST') {
      await stopScraper();
      setTimeout(async () => {
        try {
          const result = await startScraper();
          res.statusCode = result.success ? 200 : 400;
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      }, 1000);
      return;
    }

    // 404
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 Received SIGTERM, shutting down...');
  if (scraperProcess) {
    await stopScraper();
  }
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('📛 Received SIGINT, shutting down...');
  if (scraperProcess) {
    await stopScraper();
  }
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Scraper Control Server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /health - Server health check`);
  console.log(`  GET  /api/scraper/status - Get scraper status`);
  console.log(`  POST /api/scraper/start - Start scraper`);
  console.log(`  POST /api/scraper/stop - Stop scraper`);
  console.log(`  POST /api/scraper/restart - Restart scraper`);
});
