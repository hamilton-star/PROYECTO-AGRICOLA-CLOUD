const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'compradores_db',
  user: process.env.DB_USER || 'compradores_user',
  password: process.env.DB_PASSWORD || 'compradores123'
});

module.exports = pool;
