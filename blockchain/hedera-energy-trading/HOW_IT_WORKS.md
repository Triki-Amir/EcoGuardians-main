# How the Hedera Energy Trading System Works

## Overview

This document explains how the Hedera-based energy trading system works and how it differs from the original Hyperledger Fabric implementation.

## System Architecture

### High-Level Components

```
┌──────────────────────────────────────────────────────────────┐
│                     FACTORY LAYER                            │
│  Multiple factories generating and consuming energy          │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                     API LAYER                                │
│  REST API Server (Express.js)                                │
│  - Handles HTTP requests                                     │
│  - Validates input                                           │
│  - Routes to business logic                                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                        │
│  Energy Trading Module (energy-trading.js)                   │
│  - Factory registration                                      │
│  - Energy minting                                            │
│  - Energy transfers                                          │
│  - Trade creation and execution                              │
└───────────┬──────────────────────────┬───────────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────┐    ┌──────────────────────────┐
│   DATA LAYER        │    │   BLOCKCHAIN LAYER       │
│   (SQLite)          │    │   (Hedera Hashgraph)     │
│                     │    │                          │
│ - Factory records   │    │ - TEC token              │
│ - Trade records     │    │ - Token transfers        │
│ - History log       │    │ - Consensus timestamps   │
└─────────────────────┘    └──────────────────────────┘
```

## Core Concepts

### 1. Factory Entity

A factory represents an energy producer/consumer in the industrial zone.

**Properties:**
- `factoryId`: Unique identifier (e.g., "Factory01")
- `name`: Human-readable name
- `energyType`: Source of energy (solar, wind, footstep)
- `energyBalance`: Amount of energy tokens (kWh)
- `currencyBalance`: Amount of TEC tokens for payments
- `dailyConsumption`: Daily energy needs (kWh)
- `availableEnergy`: Currently available energy (kWh)

**Lifecycle:**
1. Registration → Creates factory record in database
2. Energy Generation → Mints energy tokens
3. Trading → Exchanges energy for TEC
4. Consumption → Uses energy tokens

### 2. Energy Tokens

Energy is represented as tradable units measured in kWh (kilowatt-hours).

**How it works:**
- When a factory generates surplus energy (e.g., solar panels produce excess), they "mint" energy tokens
- These tokens represent the right to consume that energy
- Tokens can be transferred or sold to other factories
- The balance is tracked in the SQLite database

**Example:**
```javascript
// Factory generates 500 kWh of surplus solar energy
POST /api/energy/mint
{
  "factoryId": "Factory01",
  "amount": 500
}

// Result: Factory01.energyBalance increases by 500
```

### 3. TEC Token (Tunisian Energy Coin)

TEC is the cryptocurrency used for paying for energy trades.

**Token Specifications:**
- **Name**: Tunisian Energy Coin
- **Symbol**: TEC
- **Type**: Fungible Token (HTS)
- **Decimals**: 2 (allows cents)
- **Supply**: Infinite (mintable)
- **Network**: Hedera Hashgraph

**Creation Process:**
1. Run `npm run init`
2. Hedera SDK creates token on network
3. Token ID is generated (e.g., 0.0.12345)
4. Add Token ID to `.env` file

**Usage in Trades:**
- Buyer pays seller in TEC tokens
- Price is set per kWh (e.g., 0.5 TEC/kWh)
- Tokens are transferred when trade executes

### 4. Energy Trading Flow

#### Step 1: Create Trade
Seller proposes a trade with amount and price.

```javascript
POST /api/trade/create
{
  "tradeId": "TRADE001",
  "sellerId": "Factory01",
  "buyerId": "Factory02",
  "amount": 200,         // 200 kWh
  "pricePerUnit": 0.5    // 0.5 TEC per kWh
}
```

**System checks:**
- ✓ Both factories exist
- ✓ Seller has enough energy (200 kWh)
- ✓ Calculate total price (200 × 0.5 = 100 TEC)

**Result:**
- Trade record created with status "pending"
- No balances changed yet

#### Step 2: Execute Trade
Buyer accepts and executes the trade.

```javascript
POST /api/trade/execute
{
  "tradeId": "TRADE001"
}
```

**System performs:**
1. Verify buyer has enough TEC (100 TEC)
2. Transfer energy: Factory01 → Factory02 (200 kWh)
3. Transfer TEC: Factory02 → Factory01 (100 TEC)
4. Update trade status to "completed"
5. Record transaction history
6. (Optional) Submit to Hedera network

**Final State:**
```
Factory01 (Seller):
  energyBalance: 1000 - 200 = 800 kWh
  currencyBalance: 500 + 100 = 600 TEC

Factory02 (Buyer):
  energyBalance: 500 + 200 = 700 kWh
  currencyBalance: 800 - 100 = 700 TEC
```

## Hedera Integration

### Token Service (HTS)

The TEC token is created using Hedera Token Service:

```javascript
const tokenCreateTx = await new TokenCreateTransaction()
  .setTokenName("Tunisian Energy Coin")
  .setTokenSymbol("TEC")
  .setTokenType(TokenType.FungibleCommon)
  .setDecimals(2)
  .setInitialSupply(1000000)  // 10,000.00 TEC
  .setTreasuryAccountId(treasuryId)
  .setSupplyType(TokenSupplyType.Infinite)
  .execute(client);
```

**Benefits:**
- Native blockchain token
- Fast transfers (3-5 seconds)
- Low cost (~$0.0001 per transaction)
- Secure and auditable

### Consensus Service (HCS) - Optional

For immutable logging, the system can use Hedera Consensus Service:

```javascript
// Create topic for transaction logs
const topicCreateTx = await new TopicCreateTransaction()
  .setTopicMemo("Energy Trading Transaction Log")
  .execute(client);

// Submit transaction message
const submitTx = await new TopicMessageSubmitTransaction()
  .setTopicId(topicId)
  .setMessage(JSON.stringify(transactionData))
  .execute(client);
```

**Benefits:**
- Immutable audit trail
- Timestamped messages
- Publicly verifiable
- Cannot be altered or deleted

## Database Structure

### Why SQLite?

The system uses SQLite for local data storage because:
1. **Speed**: Fast queries for API responses
2. **Simplicity**: No separate database server needed
3. **Portability**: Single file database
4. **Suitable for demo**: Perfect for development and testing

### Tables

#### factories
Stores factory profiles and current state.

```sql
CREATE TABLE factories (
  factoryId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hederaAccountId TEXT,
  energyType TEXT NOT NULL,
  energyBalance REAL DEFAULT 0,
  currencyBalance REAL DEFAULT 0,
  dailyConsumption REAL DEFAULT 0,
  availableEnergy REAL DEFAULT 0,
  createdAt INTEGER,
  updatedAt INTEGER
);
```

#### trades
Records all energy trades.

```sql
CREATE TABLE trades (
  tradeId TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL,
  buyerId TEXT NOT NULL,
  amount REAL NOT NULL,
  pricePerUnit REAL NOT NULL,
  totalPrice REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  hederaTransactionId TEXT,
  timestamp INTEGER
);
```

#### transaction_history
Maintains complete audit trail.

```sql
CREATE TABLE transaction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factoryId TEXT NOT NULL,
  transactionType TEXT NOT NULL,
  amount REAL NOT NULL,
  relatedFactoryId TEXT,
  hederaTransactionId TEXT,
  timestamp INTEGER
);
```

**Transaction Types:**
- `REGISTER`: Factory registration
- `MINT`: Energy token creation
- `TRANSFER_IN`: Received energy
- `TRANSFER_OUT`: Sent energy
- `TRADE_BUY`: Purchased energy
- `TRADE_SELL`: Sold energy

## API Design

### RESTful Endpoints

The API follows REST principles:

**Resource-based URLs:**
- `/api/factory/:id` - Single factory
- `/api/factories` - All factories
- `/api/trade/:id` - Single trade

**HTTP Methods:**
- `GET`: Retrieve data (read-only)
- `POST`: Create new records
- `PUT`: Update existing records

**Response Format:**
All responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { /* actual data */ }
}
```

Error responses:
```json
{
  "error": "Error message describing what went wrong"
}
```

### Key API Operations

#### 1. Factory Registration
```http
POST /api/factory/register
```
Creates a new factory in the system with initial balances.

#### 2. Energy Minting
```http
POST /api/energy/mint
```
Increases a factory's energy balance when they generate surplus.

#### 3. Direct Transfer
```http
POST /api/energy/transfer
```
Immediately transfers energy from one factory to another (no trade record).

#### 4. Trade Creation
```http
POST /api/trade/create
```
Creates a pending trade with specified terms.

#### 5. Trade Execution
```http
POST /api/trade/execute
```
Completes a pending trade, transferring energy and TEC.

## Comparison: Hyperledger vs Hedera

### Hyperledger Fabric Implementation

**Architecture:**
```
Client → Gateway → Peer → Chaincode → Ledger
                   ↓
                CouchDB
```

**Components:**
- Docker containers (orderer, peer, CouchDB)
- Go chaincode (smart contract)
- Fabric SDK (fabric-network)
- Certificate management
- Channel configuration

**Pros:**
- Private/permissioned network
- No transaction costs
- Full control over network

**Cons:**
- Complex setup (Docker, certificates, channels)
- Requires infrastructure maintenance
- Slower transaction speed
- Limited to private network

### Hedera Hashgraph Implementation

**Architecture:**
```
Client → Hedera SDK → Hedera Network → TEC Token
                           ↓
                    Consensus Service
```

**Components:**
- Hedera SDK (@hashgraph/sdk)
- TEC token (HTS)
- SQLite database
- Simple API key authentication

**Pros:**
- Simple setup (just API keys)
- Fast (10,000+ TPS)
- Public network (transparency)
- Low cost ($0.0001/tx)
- No infrastructure to maintain

**Cons:**
- Small transaction costs
- Public network (less privacy)
- Requires mainnet for production

## Transaction Flow Example

Let's walk through a complete trade:

### Initial State
```
Factory01 (Solar Plant):
  energyBalance: 1000 kWh
  currencyBalance: 500 TEC

Factory02 (Wind Farm):
  energyBalance: 300 kWh
  currencyBalance: 800 TEC
```

### Step 1: Factory01 Generates Surplus
```bash
POST /api/energy/mint
{
  "factoryId": "Factory01",
  "amount": 500
}
```

**State After Mint:**
```
Factory01:
  energyBalance: 1500 kWh ← +500
  currencyBalance: 500 TEC
```

### Step 2: Factory02 Needs Energy

Factory02 checks Factory01's available energy and creates a trade.

```bash
POST /api/trade/create
{
  "tradeId": "TRADE_20250101_001",
  "sellerId": "Factory01",
  "buyerId": "Factory02",
  "amount": 400,
  "pricePerUnit": 0.5
}
```

**Database Record:**
```
Trade TRADE_20250101_001:
  seller: Factory01
  buyer: Factory02
  amount: 400 kWh
  pricePerUnit: 0.5 TEC
  totalPrice: 200 TEC
  status: pending
```

### Step 3: Execute Trade

```bash
POST /api/trade/execute
{
  "tradeId": "TRADE_20250101_001"
}
```

**System Operations:**
1. Check: Factory01 has 1500 kWh ✓
2. Check: Factory02 has 800 TEC ✓ (needs 200)
3. Transfer 400 kWh: Factory01 → Factory02
4. Transfer 200 TEC: Factory02 → Factory01
5. Update trade status to "completed"
6. Log transaction history

**Final State:**
```
Factory01 (Seller):
  energyBalance: 1100 kWh ← -400
  currencyBalance: 700 TEC ← +200

Factory02 (Buyer):
  energyBalance: 700 kWh ← +400
  currencyBalance: 600 TEC ← -200

Trade TRADE_20250101_001:
  status: completed
```

### Step 4: Verify Transaction

```bash
GET /api/factory/Factory01/history
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transactionType": "MINT",
      "amount": 500,
      "timestamp": 1704067200
    },
    {
      "transactionType": "TRADE_SELL",
      "amount": 400,
      "relatedFactoryId": "Factory02",
      "timestamp": 1704067500
    }
  ]
}
```

## Security Considerations

### 1. Private Key Management
- Never commit `.env` file
- Use environment variables in production
- Consider key rotation policies

### 2. Balance Validation
- Always check balances before transfers
- Prevent negative balances
- Validate all numeric inputs

### 3. Trade Atomicity
- Either all operations succeed or none
- Use database transactions
- Rollback on any failure

### 4. Input Validation
- Validate all API inputs
- Check for SQL injection
- Sanitize user data

### 5. Rate Limiting
- Prevent API abuse
- Limit requests per IP
- Implement throttling

## Scalability

### Current Limitations
- SQLite: Single file, limited concurrent writes
- In-memory: All data in one database
- No clustering support

### Production Improvements
1. **Database**: Migrate to PostgreSQL or MongoDB
2. **Caching**: Add Redis for frequently accessed data
3. **Load Balancing**: Multiple API servers
4. **Message Queue**: RabbitMQ for async operations
5. **Monitoring**: Prometheus + Grafana

### Hedera Network Scaling
- Hedera handles 10,000+ TPS
- No changes needed for high throughput
- Pay-per-use model scales automatically

## Future Enhancements

### 1. Smart Contract Integration
Use Hedera Smart Contract Service for:
- Automated trade execution
- Complex business logic
- Conditional transfers

### 2. Real-time Updates
- WebSocket connections
- Live energy monitoring
- Push notifications

### 3. Advanced Features
- Energy forecasting
- Dynamic pricing
- Automated market making
- Renewable energy certificates

### 4. Mobile Integration
- Flutter app connection
- QR code payments
- Push notifications

## Conclusion

The Hedera-based energy trading system provides:

✓ **Simplicity**: Easy setup and deployment
✓ **Speed**: Fast transactions (3-5 seconds)
✓ **Cost**: Low transaction fees
✓ **Scalability**: Handles high throughput
✓ **Transparency**: Public audit trail
✓ **Security**: Cryptographic guarantees

The transformation from Hyperledger to Hedera maintains all core functionality while simplifying the architecture and improving performance.
