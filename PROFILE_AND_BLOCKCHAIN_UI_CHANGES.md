# Profile and Blockchain Screen UI Changes

## Overview
This document describes the changes made to the mobile application's Profile Screen and Blockchain Screen to remove unnecessary UI components and display real data from the database.

## Changes Made

### 1. Profile Screen Changes

#### Removed Components
- **Validator Tier Card**: Completely removed the "Validator Tier" section that displayed:
  - Gold tier badge
  - Total Rewards (1,247 ECT)
  - Uncollected rewards (5.00 ECT)
  
  This was mock data and not relevant to the factory profile.

#### Updated Components
- **Energy Balance Display**: Now fetches `availableEnergy` from the PostgreSQL database instead of using random values
  - Added `_availableEnergy` state variable to store the database value
  - Updated `_fetchFactoryData()` to extract `availableEnergy` from API response
  - Modified the Energy Balance card to display `_availableEnergy` instead of `widget.availableEnergy`
  - Shows loading indicator while fetching data
  - Displays "N/A" if no data available

#### Data Flow
```
Database (PostgreSQL) 
  → API GET /api/factory/:factoryId 
    → normalizeFactoryData() converts lowercase to camelCase
      → ProfileScreen._fetchFactoryData() 
        → _availableEnergy state variable
          → Energy Balance Card display
```

### 2. Blockchain Screen Changes

#### Removed Components
1. **Validator Status Card**: Removed the entire validator section that showed:
   - Validator status badge (Active)
   - Rewards Earned (147 TEC)
   - Hedera Account ID display
   - Uptime percentage (99.8%)
   - Blocks Validated count (1,247)

2. **QR Code Components**: Removed two QR code related elements:
   - QR code button in the Wallet Summary card
   - QR Code Scanner button at the bottom of the screen

#### Added Components
- **My Factory Transactions Section**: New card showing factory-specific trade transactions
  - Displays all trades where the factory is either buyer or seller
  - Shows transaction direction (bought from / sold to)
  - Displays energy amount in kWh
  - Shows TEC token amount transferred
  - Includes transaction status (pending/completed)
  - Shows timestamp of transaction
  - Allows copying transaction ID to clipboard

#### Transaction Display
The blockchain screen now shows two distinct transaction feeds:

1. **Live Transactions**: Treasury transactions from Hedera blockchain
   - Shows general blockchain activity
   - Displays token creation, transfers, associations, etc.
   - Limited to last 5 transactions

2. **My Factory Transactions**: Factory-specific trades
   - Shows all trades involving the signed-in factory
   - Indicates transaction direction (bought/sold)
   - Shows counterparty factory name
   - Displays both energy amount (kWh) and TEC cost
   - Color-coded icons (red for selling, green for buying)

### 3. Backend API Changes

#### New Endpoint
Added `GET /api/factory/:factoryId/trades` endpoint:
- Returns all trades where the factory is buyer or seller
- Joins with factories table to include seller and buyer names
- Ordered by timestamp (most recent first)
- Returns normalized data with both camelCase and lowercase support

#### Implementation Details
```javascript
// In energy-trading.js
async function getFactoryTrades(factoryId) {
  return await dbAll(db,
    `SELECT t.*, 
      s.name as sellerName, 
      b.name as buyerName 
     FROM trades t
     LEFT JOIN factories s ON t.sellerId = s.factoryId
     LEFT JOIN factories b ON t.buyerId = b.factoryId
     WHERE t.sellerId = $1 OR t.buyerId = $1 
     ORDER BY t.timestamp DESC`,
    [factoryId]
  );
}
```

#### Flutter API Service
Added `ApiService.getFactoryTrades(factoryId)` method:
- Calls the new backend endpoint
- Returns parsed JSON response
- Handles errors gracefully

### 4. Data Handling

#### PostgreSQL Column Name Handling
The code properly handles PostgreSQL's lowercase column names:

1. **Backend**: `normalizeFactoryData()` and `normalizeTradeData()` functions convert lowercase to camelCase
2. **Flutter**: Code checks for both camelCase and lowercase versions:
   ```dart
   final tradeId = (trade['tradeid'] ?? trade['tradeId']) as String? ?? '';
   ```

This ensures compatibility regardless of how PostgreSQL returns the column names.

## Technical Details

### Files Modified

1. **flutter_application_1/lib/screens/profile_screen.dart**
   - Removed validator tier card (lines 502-606)
   - Added `_availableEnergy` state variable
   - Updated `_fetchFactoryData()` to fetch availableEnergy from database
   - Modified Energy Balance display to use database value

2. **flutter_application_1/lib/screens/blockchain_screen.dart**
   - Removed validator status card (lines 445-611)
   - Removed QR code buttons
   - Added `_factoryTrades` state variable and loading flag
   - Added `_fetchFactoryTrades()` method
   - Added "My Factory Transactions" section
   - Implemented `_buildFactoryTradeItem()` widget builder

3. **flutter_application_1/lib/services/api_service.dart**
   - Added `getFactoryTrades(factoryId)` static method

4. **blockchain/hedera-energy-trading/energy-trading.js**
   - Added `getFactoryTrades(factoryId)` function
   - Exported new function in module.exports

5. **blockchain/hedera-energy-trading/server.js**
   - Imported `getFactoryTrades` function
   - Added `GET /api/factory/:factoryId/trades` endpoint

## Testing

### Manual Testing Steps

1. **Profile Screen Testing**:
   ```bash
   # Start the backend server
   cd blockchain/hedera-energy-trading
   npm start
   
   # Test API endpoint
   curl http://localhost:3000/api/factory/FACTORY001
   # Verify response includes availableEnergy field
   ```

2. **Blockchain Screen Testing**:
   ```bash
   # Test factory trades endpoint
   curl http://localhost:3000/api/factory/FACTORY001/trades
   # Verify response includes trades with seller/buyer names
   ```

3. **Mobile App Testing**:
   - Run the Flutter app
   - Navigate to Profile Screen
   - Verify:
     - Validator Tier card is not displayed
     - Energy Balance shows value from database
     - Loading indicator appears while fetching
   - Navigate to Blockchain Screen
   - Verify:
     - Validator Status card is not displayed
     - QR code buttons are not displayed
     - "My Factory Transactions" section appears
     - Trades show correct amounts in kWh and TEC
     - Transaction direction is indicated correctly

## Database Schema Reference

The changes rely on these database tables:

### factories table
```sql
CREATE TABLE factories (
    factoryId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    availableEnergy REAL DEFAULT 0,
    currencyBalance REAL DEFAULT 0,
    ...
);
```

### trades table
```sql
CREATE TABLE trades (
    tradeId TEXT PRIMARY KEY,
    sellerId TEXT NOT NULL,
    buyerId TEXT NOT NULL,
    amount REAL NOT NULL,
    pricePerUnit REAL NOT NULL,
    totalPrice REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    ...
);
```

## Known Limitations

1. **No Unit Tests**: Changes were made without unit tests due to lack of existing test infrastructure
2. **Flutter Not Verified**: Could not run Flutter app to visually verify changes (Flutter SDK not installed in environment)
3. **Mock Data Remaining**: Some sections still show mock data (e.g., Account Statistics in Profile Screen)

## Future Improvements

1. Add unit tests for API endpoints
2. Add widget tests for UI components
3. Replace remaining mock data with real database values
4. Add pagination for transaction lists
5. Add filtering/sorting options for transactions
6. Add pull-to-refresh functionality

## API Documentation

### GET /api/factory/:factoryId/trades

**Description**: Get all trades involving a specific factory

**Parameters**:
- `factoryId` (path parameter): The ID of the factory

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "tradeid": "TRADE-123...",
      "sellerid": "FACTORY001",
      "buyerid": "FACTORY002",
      "sellername": "Solar Factory",
      "buyername": "Wind Factory",
      "amount": 100.0,
      "priceperunit": 0.15,
      "totalprice": 15.0,
      "status": "completed",
      "timestamp": 1704652800
    }
  ]
}
```

**Error Response**:
```json
{
  "error": "Error message"
}
```

## Conclusion

All requested changes have been successfully implemented:
- ✅ Removed Validator Tier box from Profile Screen
- ✅ Display energy balance from database (not random values)
- ✅ Removed Validator Status from Blockchain Screen
- ✅ Removed QR code components
- ✅ Added factory-specific transactions display
- ✅ Show TEC amounts transferred in transactions
- ✅ Separated Live Transactions and My Factory Transactions
- ✅ Proper handling of PostgreSQL lowercase column names

The code is ready for testing and deployment.
