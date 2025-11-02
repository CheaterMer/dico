// config/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function initTables() {
  console.log('📦 Initializing Database...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id VARCHAR(32) PRIMARY KEY,
      bloxlink_api VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      guild_id VARCHAR(32),
      user_id VARCHAR(32),
      \`rank\` VARCHAR(64) DEFAULT 'UnRanked',
      clan VARCHAR(128) DEFAULT NULL,
      status VARCHAR(32) DEFAULT 'Active',
      leaveTimestamp BIGINT DEFAULT NULL,
      lastPromotedAt BIGINT DEFAULT NULL,
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_sessions (
      session_id INT AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32),
      channel_id VARCHAR(32),
      message_id VARCHAR(32),
      region VARCHAR(32),
      link TEXT,
      current_index INT DEFAULT 0,
      hoster_tag VARCHAR(128),
      is_recruiting TINYINT(1) DEFAULT 1,
      status ENUM('OPEN','STOPPED','CLOSED') DEFAULT 'OPEN',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_testers (
      session_id INT,
      user_id VARCHAR(32),
      PRIMARY KEY (session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES test_sessions(session_id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_participants (
      session_id INT,
      user_id VARCHAR(32),
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES test_sessions(session_id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_history (
      session_id INT,
      user_id VARCHAR(32),
      PRIMARY KEY (session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES test_sessions(session_id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_call_channels (
      session_id INT,
      channel_id VARCHAR(32),
      PRIMARY KEY (session_id, channel_id),
      FOREIGN KEY (session_id) REFERENCES test_sessions(session_id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS interaction_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32),
      user_id VARCHAR(32),
      command VARCHAR(128),
      details JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Database Ready!');
}
