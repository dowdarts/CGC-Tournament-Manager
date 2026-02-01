module.exports = {
  apps: [
    {
      name: 'dartconnect-scraper',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart on crash
      min_uptime: '10s',
      max_restarts: 10,
      // Exponential backoff restart delay
      restart_delay: 4000,
      // Cron restart (optional - restart every day at 3am)
      cron_restart: '0 3 * * *'
    }
  ]
};
