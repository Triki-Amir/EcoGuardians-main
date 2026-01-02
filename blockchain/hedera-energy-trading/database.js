/**
 * Database Manager for Energy Trading
 * Manages factory records in SQLite database
 * 
 * SECURITY WARNING: Private keys are stored in plain text in the database.
 * For production use, implement encryption using:
 * - AWS KMS, Azure Key Vault, or HashiCorp Vault for key management
 * - Database-level encryption at rest
 * - Application-level encryption before storing keys
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'energy-trading.db');

/**
 * Initialize database with required tables
 * @returns {Promise<void>} Resolves when database is initialized
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create factories table
      db.run(`
        CREATE TABLE IF NOT EXISTS factories (
          factoryId TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          hederaAccountId TEXT,
          hederaPrivateKey TEXT,
          energyType TEXT NOT NULL,
          energyBalance REAL DEFAULT 0,
          currencyBalance REAL DEFAULT 0,
          dailyConsumption REAL DEFAULT 0,
          availableEnergy REAL DEFAULT 0,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')),
          updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `, (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        // Create trades table
        db.run(`
          CREATE TABLE IF NOT EXISTS trades (
            tradeId TEXT PRIMARY KEY,
            sellerId TEXT NOT NULL,
            buyerId TEXT NOT NULL,
            amount REAL NOT NULL,
            pricePerUnit REAL NOT NULL,
            totalPrice REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            hederaTransactionId TEXT,
            timestamp INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (sellerId) REFERENCES factories(factoryId),
            FOREIGN KEY (buyerId) REFERENCES factories(factoryId)
          )
        `, (err) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          // Create transaction history table
          db.run(`
            CREATE TABLE IF NOT EXISTS transaction_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              factoryId TEXT NOT NULL,
              transactionType TEXT NOT NULL,
              amount REAL NOT NULL,
              relatedFactoryId TEXT,
              hederaTransactionId TEXT,
              timestamp INTEGER DEFAULT (strftime('%s', 'now')),
              FOREIGN KEY (factoryId) REFERENCES factories(factoryId)
            )
          `, (err) => {
            // Always close the initialization connection
            db.close((closeErr) => {
              if (err) {
                reject(err);
              } else if (closeErr) {
                reject(closeErr);
              } else {
                console.log('✓ Database initialized');
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

/**
 * Get database connection
 */
function getDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * Execute a database query
 */
function dbRun(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Get a single row from database
 */
function dbGet(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Get all rows from database
 */
function dbAll(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Close database connection
 */
function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  initDatabase,
  getDatabase,
  dbRun,
  dbGet,
  dbAll,
  closeDatabase
};
