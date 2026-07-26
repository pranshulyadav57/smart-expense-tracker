const db = require('../config/db');

const createTable = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(128) NOT NULL,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_token_hash (token_hash)
  );
  `;

  try {
    await db.execute(sql);
    console.log('refresh_tokens table ensured');
    process.exit(0);
  } catch (err) {
    console.error('failed to create refresh_tokens table', err);
    process.exit(1);
  }
};

createTable();
