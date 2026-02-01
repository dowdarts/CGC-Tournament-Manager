// Scraper Launcher Server
// Lightweight server that can start the control server on demand
// Allows the UI to have a "Start Server" button

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.LAUNCHER_PORT || 3002;

let controlServerProcess = null;

function startControlServer() {
  return new Promise((resolve, reject) => {
    if (controlServerProcess) {
      console.log('⚠️  Control server already running');
      resolve({ success: false, message: 'Control server already running' });
      return;
    }

    console.log('🚀 Starting control server...');

    const backendDir = __dirname;
    
    // Spawn the control server process
    controlServerProcess = spawn('node', ['scraper-control.js'], {
      cwd: backendDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      detached: false
    });

    controlServerProcess.stdout.on('data', (data) => {
      console.log(`[Control Server] ${data.toString().trim()}`);
    });

    controlServerProcess.stderr.on('data', (data) => {
      console.error(`[Control Server Error] ${data.toString().trim()}`);
    });

    controlServerProcess.on('error', (error) => {
      console.error('❌ Failed to start control server:', error);
      controlServerProcess = null;
      reject(error);
    });

    controlServerProcess.on('exit', (code, signal) => {
      console.log(`Control server exited with code ${code}, signal ${signal}`);
      controlServerProcess = null;
    });

    // Give it a moment to start
    setTimeout(() => {
      if (controlServerProcess && !controlServerProcess.killed) {
        console.log('✅ Control server started successfully');
        resolve({ success: true, message: 'Control server started', pid: controlServerProcess.pid });
      } else {
        reject(new Error('Control server failed to start'));
      }
    }, 2000);
  });
}

function stopControlServer() {
  return new Promise((resolve) => {
    if (!controlServerProcess) {
      console.log('⚠️  Control server not running');
      resolve({ success: false, message: 'Control server not running' });
      return;
    }

    console.log('🛑 Stopping control server...');
    controlServerProcess.kill('SIGTERM');

    // Force kill after 5 seconds if not stopped
    const forceKillTimer = setTimeout(() => {
      if (controlServerProcess && !controlServerProcess.killed) {
        console.log('⚠️  Force killing control server...');
        controlServerProcess.kill('SIGKILL');
      }
    }, 5000);

    controlServerProcess.on('exit', () => {
      clearTimeout(forceKillTimer);
      controlServerProcess = null;
      console.log('✅ Control server stopped');
      resolve({ success: true, message: 'Control server stopped' });
    });

    setTimeout(() => {
      resolve({ success: true, message: 'Control server stop initiated' });
    }, 6000);
  });
}

function getStatus() {
  return {
    running: controlServerProcess !== null && !controlServerProcess.killed,
    pid: controlServerProcess?.pid || null
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
        message: 'Launcher server running',
        controlServer: getStatus()
      }));
      return;
    }

    // Get status
    if (url.pathname === '/api/launcher/status' && req.method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify(getStatus()));
      return;
    }

    // Start control server
    if (url.pathname === '/api/launcher/start' && req.method === 'POST') {
      try {
        const result = await startControlServer();
        res.statusCode = result.success ? 200 : 400;
        res.end(JSON.stringify(result));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return;
    }

    // Stop control server
    if (url.pathname === '/api/launcher/stop' && req.method === 'POST') {
      const result = await stopControlServer();
      res.statusCode = 200;
      res.end(JSON.stringify(result));
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
  if (controlServerProcess) {
    await stopControlServer();
  }
  server.close(() => {
    console.log('✅ Launcher closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('📛 Received SIGINT, shutting down...');
  if (controlServerProcess) {
    await stopControlServer();
  }
  server.close(() => {
    console.log('✅ Launcher closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Scraper Launcher running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /health - Server health check`);
  console.log(`  GET  /api/launcher/status - Get control server status`);
  console.log(`  POST /api/launcher/start - Start control server`);
  console.log(`  POST /api/launcher/stop - Stop control server`);
  console.log(``);
  console.log(`💡 The control server can be started from the DartConnect settings page`);
});
