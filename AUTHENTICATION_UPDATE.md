# Authentication and Trading Platform Updates

## Overview

This update transforms the EcoGuardians energy trading platform into a professional, secure trading marketplace with proper authentication and blockchain integration.

## What's New

### 🔐 Secure Authentication System

#### Registration
- **Password Protection**: All factory registrations now require a secure password (minimum 6 characters)
- **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
- **Hedera Account Creation**: Each registered factory gets its own Hedera account with associated TEC token
- **Initial Balances**: Set both energy balance (kWh) and TEC currency balance during registration

**Registration Fields:**
- Factory ID (unique identifier)
- Factory Name
- Password (minimum 6 characters)
- Confirm Password
- Initial Energy Balance (kWh)
- Initial TEC Balance (currency)
- Energy Type (Solar/Wind/Hydro/Biomass/Mixed)

#### Login
- **Factory ID + Password**: Login now requires both factory ID and password
- **Secure Validation**: Passwords are verified against hashed values in the database
- **Session Management**: Successful login provides access to factory dashboard with real data

### 💰 Real Blockchain Integration

#### Hedera Account Display
- **Profile Screen**: Shows your real Hedera account ID
- **Blockchain Screen**: Displays Hedera account ID with copy functionality
- **Real-time Balance**: TEC coin balance is fetched from the blockchain API

#### Professional Trading Interface
- **No Forced Trades**: Removed all mock/forced trades
- **User-Initiated Trading**: All trades must be manually created by users
- **Empty States**: Clear messaging when no factories or offers are available
- **Real API Integration**: All trading operations use the Hedera blockchain API

## API Changes

### New Endpoints

#### POST /api/factory/login
Login with factory credentials

**Request:**
```json
{
  "factoryId": "F-001",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Factory F-001 authenticated successfully",
  "data": {
    "factoryId": "F-001",
    "name": "Solar Factory Alpha",
    "hederaAccountId": "0.0.123456",
    "energyType": "Solar",
    "energyBalance": 1000,
    "currencyBalance": 500,
    "dailyConsumption": 0,
    "availableEnergy": 1000,
    "createdAt": 1234567890
  }
}
```

### Updated Endpoints

#### POST /api/factory/register
Now requires password field

**Request:**
```json
{
  "factoryId": "F-001",
  "name": "Solar Factory Alpha",
  "password": "securePassword123",
  "initialBalance": 1000,
  "energyType": "Solar",
  "currencyBalance": 500,
  "dailyConsumption": 0
}
```

## Database Schema Updates

### Factories Table
```sql
CREATE TABLE factories (
  factoryId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,        -- NEW: Stores bcrypt hashed password
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
```

## Security Improvements

1. **Password Hashing**: All passwords are hashed with bcrypt (10 rounds)
2. **No Plain Text Storage**: Passwords are never stored in plain text
3. **Authentication Required**: Login endpoint validates credentials before access
4. **Account Isolation**: Each factory has its own Hedera account and private key

## UI/UX Improvements

### Login Screen
- Separate tabs for Login and Registration
- Password visibility toggle
- Password confirmation field for registration
- Clear validation messages

### Profile Screen
- Real Hedera account ID display
- Real TEC balance from blockchain
- Professional account information layout
- Loading states while fetching data

### Blockchain Screen
- Real TEC balance display
- Hedera account ID with copy functionality
- Professional blockchain explorer interface

### Trading Interface
- Clean slate - no forced/mock trades
- User must create offers manually
- Empty states with helpful messages
- Professional trading marketplace appearance

## Migration Guide

### For Existing Databases

If you have an existing database without the passwordHash column, you need to:

1. Backup your current database
2. The new schema will automatically add the passwordHash column
3. Existing factories without passwords won't be able to login
4. Users must re-register their factories with passwords

### For New Deployments

1. Install dependencies:
```bash
cd blockchain/hedera-energy-trading
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Add your Hedera credentials
```

3. Start the server:
```bash
npm start
```

4. The database will be initialized automatically with the new schema

## Testing

The authentication system has been validated with:
- ✅ Password hashing functionality
- ✅ Database schema with passwordHash column
- ✅ bcrypt password comparison
- ✅ API endpoint syntax validation

## Dependencies Added

### Backend (Node.js)
- `bcrypt@^5.1.1` - Password hashing library

No new Flutter dependencies were required.

## Breaking Changes

⚠️ **Important**: This is a breaking change for authentication

1. **Login**: Factory ID alone is no longer sufficient - password is required
2. **Registration**: Password is now a mandatory field
3. **Existing Data**: Existing factories without passwordHash cannot login
4. **Mock Data**: All mock factories and trades have been removed

## Next Steps

To fully utilize the new system:

1. **Register a new factory** with a secure password
2. **Login** using your factory ID and password
3. **View your Hedera account** in the Profile or Blockchain screen
4. **Create trading offers** manually through the Trading interface
5. **Execute trades** with other registered factories

## Support

For issues or questions:
- Check the Hedera documentation: https://docs.hedera.com
- Review the API endpoints in `server.js`
- Ensure your `.env` file is properly configured
- Verify bcrypt is installed: `npm list bcrypt`
