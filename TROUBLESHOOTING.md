# Troubleshooting Guide

## Profile Screen Issues

### Problem: Profile screen shows 0 TEC balance and no Hedera Account ID

**Symptoms:**
- TEC balance always shows 0.00
- Hedera Account ID not displayed
- Token ID missing from wallet details

**Root Causes:**
1. Database connection pooling issue - PostgreSQL connections were being closed improperly
2. Token ID not exposed to Flutter app
3. Profile screen not refreshing data properly

**Solution:**
✅ **Fixed in latest version**
- Database connection pooling now properly handled (removed improper `db.close()` calls)
- Added `/api/config` endpoint to expose TEC token ID
- Profile screen now fetches both factory data and system config

**Verification Steps:**
1. Start the backend server:
   ```bash
   cd blockchain/hedera-energy-trading
   npm start
   ```

2. Test the config endpoint:
   ```bash
   curl http://localhost:3000/api/config
   ```
   Should return:
   ```json
   {
     "success": true,
     "data": {
       "tecTokenId": "0.0.XXXXX",
       "blockchain": "Hedera Hashgraph Testnet",
       "tokenName": "TEC (Tunisian Energy Coin)"
     }
   }
   ```

3. Test factory data endpoint:
   ```bash
   curl http://localhost:3000/api/factory/YOUR_FACTORY_ID
   ```
   Should show `hederaAccountId` and `currencyBalance` fields

## Login Issues After Sign Out

### Problem: Cannot login after registering and signing out

**Symptoms:**
- User can register successfully
- Hedera account created and visible on testnet
- After sign out, login fails with authentication error

**Possible Causes:**
1. Database connection issues
2. Password hashing/comparison problems
3. Factory data not properly stored

**Solution:**
✅ **Fixed in latest version** - Database connection pooling issue resolved

**Additional Checks:**

1. **Verify factory exists in database:**
   ```bash
   psql -d ecoguardians -c "SELECT factoryId, name, hederaAccountId FROM factories;"
   ```

2. **Check password hash is stored:**
   ```bash
   psql -d ecoguardians -c "SELECT factoryId, passwordHash FROM factories WHERE factoryId='YOUR_FACTORY_ID';"
   ```
   Should show a bcrypt hash (starts with `$2b$`)

3. **Test login API directly:**
   ```bash
   curl -X POST http://localhost:3000/api/factory/login \
     -H "Content-Type: application/json" \
     -d '{"factoryId": "YOUR_FACTORY_ID", "password": "your_password"}'
   ```

**If login still fails:**

1. Check backend logs for errors:
   ```bash
   # Backend should show connection attempts
   # Look for password comparison errors
   ```

2. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql  # Linux
   brew services list | grep postgresql  # macOS
   ```

3. Test database connection:
   ```bash
   psql -d ecoguardians -c "SELECT version();"
   ```

## Database Issues

### Problem: Database not storing/retrieving Hedera account data

**Symptoms:**
- `hederaAccountId` is null
- `currencyBalance` always 0
- Factory exists but missing blockchain data

**Root Cause:**
PostgreSQL connection pool was being closed after each query, preventing subsequent database operations.

**Solution:**
✅ **Fixed in latest version** - All database functions now use connection pooling correctly

**Verification:**

1. **Check if TEC_TOKEN_ID is set:**
   ```bash
   cd blockchain/hedera-energy-trading
   cat .env | grep TEC_TOKEN_ID
   ```

2. **If TEC_TOKEN_ID is empty, initialize the token:**
   ```bash
   npm run init
   ```
   Copy the token ID from the output and add it to `.env`:
   ```
   TEC_TOKEN_ID=0.0.XXXXX
   ```

3. **Restart the server:**
   ```bash
   npm start
   ```

4. **Register a new factory to test:**
   ```bash
   curl -X POST http://localhost:3000/api/factory/register \
     -H "Content-Type: application/json" \
     -d '{
       "factoryId": "TEST-001",
       "name": "Test Factory",
       "password": "test123",
       "initialBalance": 1000,
       "energyType": "Solar",
       "currencyBalance": 500
     }'
   ```

5. **Verify Hedera account was created:**
   - Check response for `hederaAccountId` field
   - Visit `https://hashscan.io/testnet/account/HEDERA_ACCOUNT_ID`

## Token ID Not Displayed

### Problem: Token ID not showing in wallet details

**Solution:**
✅ **Fixed in latest version** - Token ID now displayed in profile screen

The profile screen now shows:
- Hedera Account ID
- TEC Token ID (if configured)
- Current TEC balance

**If Token ID still not showing:**

1. **Check backend has TEC_TOKEN_ID set:**
   ```bash
   cd blockchain/hedera-energy-trading
   grep TEC_TOKEN_ID .env
   ```

2. **If not set, run token initialization:**
   ```bash
   npm run init
   ```

3. **Test config endpoint:**
   ```bash
   curl http://localhost:3000/api/config
   ```

4. **Restart Flutter app** to pick up the new config

## PostgreSQL Connection Issues

### Problem: "Connection refused" or "ECONNREFUSED"

**Solutions:**

1. **Check if PostgreSQL is running:**
   ```bash
   # Linux
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   
   # macOS
   brew services list
   brew services start postgresql@15
   ```

2. **Verify PostgreSQL is listening:**
   ```bash
   netstat -an | grep 5432
   # Should show: tcp        0      0 127.0.0.1:5432          0.0.0.0:*               LISTEN
   ```

3. **Check connection settings in .env:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ecoguardians
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

4. **Test connection manually:**
   ```bash
   psql -h localhost -p 5432 -U postgres -d ecoguardians
   ```

### Problem: "Authentication failed"

**Solutions:**

1. **Check PostgreSQL authentication method:**
   ```bash
   # Linux
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   
   # macOS
   nano /opt/homebrew/var/postgresql@15/pg_hba.conf
   ```
   
   Change to:
   ```
   local   all   postgres   trust
   host    all   all   127.0.0.1/32   md5
   ```

2. **Restart PostgreSQL:**
   ```bash
   # Linux
   sudo systemctl restart postgresql
   
   # macOS
   brew services restart postgresql@15
   ```

## Flutter App Issues

### Problem: "Connection error" when trying to login/register

**Solutions:**

1. **Check API base URL is correct:**
   - For Android emulator: Use `http://10.0.2.2:3000`
   - For iOS simulator: Use `http://localhost:3000`
   - For physical device: Use your computer's IP address

2. **Update api_service.dart:**
   ```dart
   static String baseUrl = const String.fromEnvironment(
     'API_BASE_URL',
     defaultValue: 'http://10.0.2.2:3000',  // For Android emulator
   );
   ```

3. **Verify backend is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```

4. **Check Flutter app can reach backend:**
   - Enable USB debugging (Android) or developer mode (iOS)
   - Check firewall settings
   - Try from browser on device: `http://YOUR_IP:3000/api/health`

## Complete Reset (Last Resort)

If nothing works, try a complete reset:

1. **Drop and recreate database:**
   ```bash
   psql -U postgres -c "DROP DATABASE ecoguardians;"
   psql -U postgres -c "CREATE DATABASE ecoguardians;"
   ```

2. **Remove and reinstall dependencies:**
   ```bash
   cd blockchain/hedera-energy-trading
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Reinitialize token:**
   ```bash
   npm run init
   # Copy token ID to .env
   ```

4. **Start fresh:**
   ```bash
   npm start
   ```

5. **Test with a new factory registration**

## Getting Help

If issues persist:

1. Check backend logs for detailed error messages
2. Check PostgreSQL logs: 
   ```bash
   tail -f /var/log/postgresql/postgresql-*.log  # Linux
   tail -f /opt/homebrew/var/log/postgresql@15.log  # macOS
   ```
3. Enable debug mode in Flutter:
   ```dart
   debugPrint('Factory data: $factoryData');
   ```
4. Check Hedera testnet status: https://status.hedera.com/

## Testing Checklist

After applying fixes, test this complete flow:

- [ ] Start PostgreSQL
- [ ] Start backend server
- [ ] Test `/api/health` endpoint
- [ ] Test `/api/config` endpoint (should return token ID)
- [ ] Register a new factory via API
- [ ] Verify Hedera account created on HashScan
- [ ] Login via API with the same factory
- [ ] Start Flutter app
- [ ] Register a new factory via app
- [ ] Sign out
- [ ] Login with same factory ID and password
- [ ] Navigate to profile screen
- [ ] Verify all data shows:
  - [ ] Factory name and ID
  - [ ] Hedera Account ID
  - [ ] TEC Token ID
  - [ ] TEC balance (should show initial amount)
  - [ ] Energy data
