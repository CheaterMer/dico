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
      ht_request_expiry_days INT DEFAULT 14,
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
    CREATE TABLE IF NOT EXISTS ht_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      player_id VARCHAR(32) NOT NULL,
      target_tier VARCHAR(32) NULL,
      status ENUM('OPEN','TESTING','REVIEW','PASSED','FAILED') DEFAULT 'OPEN',
      panel_message_id VARCHAR(32) DEFAULT NULL,
      panel_channel_id VARCHAR(32) DEFAULT NULL,
      created_by VARCHAR(32) NOT NULL,
      expiry_at BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

await pool.query(`ALTER TABLE ht_requests ADD COLUMN IF NOT EXISTS required_opponents INT DEFAULT 1;`).catch(()=>{});
await pool.query(`ALTER TABLE ht_requests ADD COLUMN IF NOT EXISTS opponents JSON DEFAULT '[]';`).catch(()=>{});
await pool.query(`ALTER TABLE ht_requests ADD COLUMN IF NOT EXISTS phase INT DEFAULT 0;`).catch(()=>{});
await pool.query(`ALTER TABLE ht_requests ADD COLUMN IF NOT EXISTS allowed_roles JSON DEFAULT '[]';`).catch(()=>{});
await pool.query(`ALTER TABLE ht_requests ADD COLUMN IF NOT EXISTS request_channel_id VARCHAR(32) DEFAULT NULL;`).catch(()=>{});




  await pool.query(`
    ALTER TABLE ht_requests
    ADD COLUMN IF NOT EXISTS required_opponents INT DEFAULT 1;
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE ht_requests
    ADD COLUMN IF NOT EXISTS opponents JSON DEFAULT '[]';
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE ht_requests
    ADD COLUMN IF NOT EXISTS phase INT DEFAULT 0;
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE ht_requests
    ADD COLUMN IF NOT EXISTS allowed_roles JSON DEFAULT '[]';
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ht_phase_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      phase INT NOT NULL,
      opponent_id VARCHAR(32) NOT NULL,
      result ENUM('PASS','FAIL') NOT NULL,
      recorded_by VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES ht_requests(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ht_losses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      player_id VARCHAR(32) NOT NULL,
      recorded_by VARCHAR(32) NOT NULL,
      reason TEXT,
      terrible TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Database synced with full High Test + Phase System.');
}

