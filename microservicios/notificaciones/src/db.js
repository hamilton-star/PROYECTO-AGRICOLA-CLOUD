const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'notificaciones_db',
  user: process.env.DB_USER || 'notificaciones_user',
  password: process.env.DB_PASSWORD || 'notificaciones123'
});

module.exports = pool;
