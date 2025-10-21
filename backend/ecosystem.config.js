/**
 * PM2 Ecosystem Configuration
 *
 * Production process manager configuration for CostPlusDB backend
 *
 * Usage:
 *   Start: pm2 start ecosystem.config.js
 *   Stop: pm2 stop costplusdb-backend
 *   Restart: pm2 restart costplusdb-backend
 *   Logs: pm2 logs costplusdb-backend
 *   Monitor: pm2 monit
 */

module.exports = {
  apps: [{
    // Application name
    name: 'costplusdb-backend',

    // Application entry point
    script: './dist/index.js',

    // Instances (use 'max' for cluster mode with all CPU cores)
    instances: 1,

    // Execution mode (cluster or fork)
    exec_mode: 'fork',

    // Watch for file changes and restart (disable in production)
    watch: false,

    // Max memory restart (restart if memory exceeds this)
    max_memory_restart: '500M',

    // Environment variables for production
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },

    // Environment variables for development
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
    },

    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Advanced options
    autorestart: true,           // Auto restart if process crashes
    max_restarts: 10,            // Max number of restarts within restart_delay
    min_uptime: '10s',           // Min uptime before considered stable
    restart_delay: 4000,         // Delay between restarts (ms)

    // Graceful shutdown
    kill_timeout: 5000,          // Time to wait for graceful shutdown (ms)
    wait_ready: true,            // Wait for app to be ready before considering started
    listen_timeout: 10000,       // Time to wait for listen event (ms)

    // Source map support for better error traces
    source_map_support: true,

    // Merge logs from all instances
    merge_logs: true,

    // Interpreter
    interpreter: 'node',
    interpreter_args: '',
  }],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/jeremylongshore/cost-plus-db.git',
      path: '/var/www/costplusdb',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      'post-setup': ''
    }
  }
};
