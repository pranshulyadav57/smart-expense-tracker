const mysql = require("mysql2");
require("dotenv").config();

// Attempt to ensure iconv-lite recognizes 'cesu8' (some MySQL servers report this)
try {
  const iconv = require('iconv-lite');
  if (!iconv.encodingExists || !iconv.encodingExists('cesu8')) {
    // try loading legacy encodings module (may register additional encodings)
    try {
      // some versions export encodings when requiring this path
      require('iconv-lite/encodings');
    } catch (e) {
      // ignore; we'll fallback to mapping to utf8
    }

    try {
      if (!iconv.encodingExists('cesu8')) {
        iconv.encodings = iconv.encodings || {};
        iconv.encodings.cesu8 = iconv.encodings.utf8 || iconv.encodings['utf-8'] || iconv;
      }
    } catch (e) {
      // swallow any errors; this is best-effort for test environments
    }
  }
} catch (e) {
  // iconv-lite not installed or other error; continue without failing startup
}

// =========================
// MYSQL POOL (PRODUCTION READY)
// =========================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // ensure a unicode charset to avoid driver encoding fallbacks like 'cesu8'
  charset: process.env.DB_CHARSET || 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// =========================
// TEST CONNECTION (skip in test runs to avoid open handles)
// =========================
if (process.env.NODE_ENV !== 'test') {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("❌ DB Connection Failed:", err.message);
      return;
    }

    if (connection) connection.release();

    console.log("✅ MySQL Connected (Pool Ready)");
  });
} else {
  // In Jest/test environment, avoid creating a persistent connection here.
  console.log("ℹ️ Skipping DB connection test in test environment");
}

// =========================
// EXPORT (PROMISE-BASED FOR ASYNC/AWAIT)
// =========================
module.exports = db.promise();