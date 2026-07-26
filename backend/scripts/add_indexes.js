const db = require('../config/db');

async function indexExists(schema, table, indexName) {
  const sql = `
    SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
  `;
  const [rows] = await db.execute(sql, [schema, table, indexName]);
  return rows[0].cnt > 0;
}

async function ensureIndex(schema, table, indexName, columns) {
  try {
    const exists = await indexExists(schema, table, indexName);
    if (exists) {
      console.log(`Index ${indexName} on ${table} already exists`);
      return;
    }

    const sql = `ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns});`;
    await db.execute(sql);
    console.log(`Created index ${indexName} on ${table} (${columns})`);
  } catch (err) {
    console.error(`Failed to create index ${indexName} on ${table}:`, err.message);
  }
}

async function run() {
  const schema = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'smart_expense_tracker';

  await ensureIndex(schema, 'transactions', 'idx_transactions_customer_created', 'customer_id, created_at');
  await ensureIndex(schema, 'transactions', 'idx_transactions_user_created', 'user_id, created_at');
  await ensureIndex(schema, 'customers', 'idx_customers_user_balance', 'user_id, current_balance');
  await ensureIndex(schema, 'reminders', 'idx_reminders_user_sent', 'user_id, sent_at');
  await ensureIndex(schema, 'backup_logs', 'idx_backup_user_created', 'user_id, created_at');
  await ensureIndex(schema, 'transactions', 'idx_txn_created_running', 'created_at, running_balance');

  console.log('Indexing script completed');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
