# PostgreSQL Migration Guide

## Overview

This guide documents the migration from SQLite to PostgreSQL for the EcoGuardians project. The migration affects two main components:
1. `/blockchain/files/` - Energy data recording system
2. `/blockchain/hedera-energy-trading/` - Energy trading platform

## What Changed

### Database System
- **Before**: SQLite (local file-based database)
- **After**: PostgreSQL (production-grade relational database)

### Benefits of PostgreSQL
- Better performance for concurrent connections
- ACID compliance with better transaction handling
- Scalability for production deployments
- Better security features
- Advanced indexing and query optimization
- Support for larger datasets

## Prerequisites

### Install PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

### Install Python PostgreSQL Driver (for ran.py)
```bash
pip install psycopg2-binary
```

## Database Setup

### 1. Create Database

```bash
# Login as postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE ecoguardians;

# Create user (optional, if not using default postgres user)
CREATE USER ecouser WITH PASSWORD 'securepassword';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ecoguardians TO ecouser;

# Exit psql
\q
```

### 2. Initialize Schemas

#### For blockchain/files (Energy Recording)
```bash
cd blockchain/files
psql -d ecoguardians -f schema.sql
```

#### For blockchain/hedera-energy-trading (Energy Trading)
```bash
cd blockchain/hedera-energy-trading
psql -d ecoguardians -f schema.sql
```

## Configuration

### Environment Variables

Both components now require PostgreSQL connection parameters in `.env` files:

#### blockchain/files/.env
```env
# Hedera Configuration
MY_ACCOUNT_ID=0.0.XXXXXXX
MY_PRIVATE_KEY=your_private_key_here

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecoguardians
DB_USER=postgres
DB_PASSWORD=postgres
```

#### blockchain/hedera-energy-trading/.env
```env
# Hedera Configuration
MY_ACCOUNT_ID=0.0.XXXXXXX
MY_PRIVATE_KEY=your_private_key_here
TREASURY_ACCOUNT_ID=0.0.XXXXXXX
TEC_TOKEN_ID=
PORT=3000

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecoguardians
DB_USER=postgres
DB_PASSWORD=postgres
```

## Migrating Existing Data (Optional)

If you have existing SQLite data that needs to be migrated:

### For Energy Data (blockchain/files)

```bash
# Export from SQLite
sqlite3 energy.sqlite .dump > energy_dump.sql

# Convert SQLite syntax to PostgreSQL
# Replace AUTOINCREMENT with SERIAL
# Replace single quotes in NOW() functions
sed -i 's/AUTOINCREMENT/SERIAL/g' energy_dump.sql

# Import to PostgreSQL
psql -d ecoguardians < energy_dump.sql
```

### For Energy Trading Data (blockchain/hedera-energy-trading)

```bash
# Export from SQLite
sqlite3 energy-trading.db .dump > trading_dump.sql

# Convert and import
sed -i 's/AUTOINCREMENT/SERIAL/g' trading_dump.sql
psql -d ecoguardians < trading_dump.sql
```

## Code Changes Summary

### Database Connection
- **SQLite**: File-based connection with `sqlite3.Database()`
- **PostgreSQL**: Network connection with `pg.Pool()`

### Query Placeholders
- **SQLite**: Uses `?` for parameters
- **PostgreSQL**: Uses `$1, $2, $3...` for parameters

### Timestamp Functions
- **SQLite**: `strftime('%s', 'now')`
- **PostgreSQL**: `EXTRACT(EPOCH FROM NOW())`

### Auto-increment IDs
- **SQLite**: `INTEGER PRIMARY KEY AUTOINCREMENT`
- **PostgreSQL**: `SERIAL PRIMARY KEY`

## Testing the Migration

### 1. Test Database Connection

```bash
# Test PostgreSQL connection
psql -d ecoguardians -c "SELECT version();"
```

### 2. Verify Tables

```bash
# List all tables
psql -d ecoguardians -c "\dt"

# Verify energy table
psql -d ecoguardians -c "SELECT * FROM energy LIMIT 5;"

# Verify factories table
psql -d ecoguardians -c "SELECT * FROM factories LIMIT 5;"
```

### 3. Test Applications

#### Test blockchain/files server
```bash
cd blockchain/files
npm install
node server.js
# In another terminal, test the endpoint
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{"mwh": 100, "currentTime": 1609459200}'
```

#### Test hedera-energy-trading server
```bash
cd blockchain/hedera-energy-trading
npm install
npm start
# Test health endpoint
curl http://localhost:3000/api/health
```

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check PostgreSQL is listening: `netstat -an | grep 5432`
- Verify pg_hba.conf allows local connections

### Authentication Failed
- Check username/password in .env file
- Verify user exists: `psql -U postgres -c "\du"`
- Check pg_hba.conf authentication method (md5 or trust)

### Permission Denied
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE ecoguardians TO youruser;`
- Grant table access: `GRANT ALL ON ALL TABLES IN SCHEMA public TO youruser;`

### Python psycopg2 Errors
- Install dependencies: `pip install psycopg2-binary`
- On Ubuntu: `sudo apt-get install libpq-dev python3-dev`

## Rollback (If Needed)

If you need to rollback to SQLite temporarily:

1. Checkout the previous commit before migration
2. The SQLite database files should still exist in your backups
3. Restore the original code and dependencies

## Performance Optimization

### Indexes
Both schemas include indexes for better performance:
```sql
-- Energy table
CREATE INDEX idx_energy_time ON energy(time);

-- Trading tables
CREATE INDEX idx_trades_seller ON trades(sellerId);
CREATE INDEX idx_trades_buyer ON trades(buyerId);
CREATE INDEX idx_transaction_history_factory ON transaction_history(factoryId);
```

### Connection Pooling
The PostgreSQL implementation uses connection pooling for better performance:
- Reuses connections instead of creating new ones
- Configurable pool size
- Automatic connection management

## Production Deployment

### Security Best Practices
1. Use strong passwords for PostgreSQL users
2. Enable SSL/TLS for database connections
3. Use environment variables for credentials
4. Never commit `.env` files to version control
5. Restrict PostgreSQL network access using firewall rules
6. Regular database backups

### Recommended PostgreSQL Configuration
```sql
-- For production, tune these parameters in postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
```

## Support

For issues or questions about the PostgreSQL migration:
1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
2. Review application logs for connection errors
3. Verify all environment variables are set correctly
4. Ensure database schemas are properly initialized

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [psycopg2 Documentation](https://www.psycopg.org/docs/)
