const db = require('../config/db');

async function tableExists(schema, table) {
  const sql = `
    SELECT COUNT(*) as cnt FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
  `;
  const [rows] = await db.execute(sql, [schema, table]);
  return rows[0].cnt > 0;
}

async function run() {
  const schema = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'smart_expense_tracker';

  try {
    const exists = await tableExists(schema, 'alerts');
    if (!exists) {
      const createSql = `
        CREATE TABLE IF NOT EXISTS alerts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          meta JSON NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `;
      await db.execute(createSql);
      console.log('Created alerts table');
    } else {
      console.log('alerts table already exists');
    }

    // ensure composite index for faster monthly aggregations
    const idxCheckSql = `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'expenses' AND INDEX_NAME = 'idx_expenses_user_created'`;
    const [idxRows] = await db.execute(idxCheckSql, [schema]);
    if (!idxRows[0].cnt) {
      await db.execute("ALTER TABLE expenses ADD INDEX idx_expenses_user_created (user_id, created_at)");
      console.log('Added index idx_expenses_user_created on expenses(user_id, created_at)');
    } else {
      console.log('Index idx_expenses_user_created already exists');
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err.message || err);
    process.exit(1);
  }
}

run();
