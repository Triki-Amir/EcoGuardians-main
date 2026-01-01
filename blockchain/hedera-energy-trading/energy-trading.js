/**
 * Energy Trading Operations on Hedera
 * Core business logic for energy token operations using TEC
 */

const {
  TransferTransaction,
  AccountBalanceQuery,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenId,
  AccountId
} = require("@hashgraph/sdk");
const { initializeHederaClient, createFactoryAccount, associateTokenWithAccount, transferTokensBetweenAccounts } = require("./hedera-client");
const { getDatabase, dbRun, dbGet, dbAll } = require("./database");

// Get TEC token ID from environment
const TEC_TOKEN_ID = process.env.TEC_TOKEN_ID;

/**
 * Initialize Hedera Topic for immutable transaction records
 */
async function createEnergyTradingTopic() {
  const { client } = initializeHederaClient();
  
  try {
    const topicCreateTx = await new TopicCreateTransaction()
      .setTopicMemo("Energy Trading Transaction Log")
      .execute(client);
    
    const receipt = await topicCreateTx.getReceipt(client);
    const topicId = receipt.topicId;
    
    console.log(`✓ Energy Trading Topic created: ${topicId}`);
    return topicId;
  } finally {
    client.close();
  }
}

/**
 * Log transaction to Hedera Consensus Service
 */
async function logToHederaTopic(topicId, message) {
  const { client } = initializeHederaClient();
  
  try {
    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(message))
      .execute(client);
    
    const receipt = await submitTx.getReceipt(client);
    return receipt.status.toString();
  } finally {
    client.close();
  }
}

/**
 * Register a new factory
 */
async function registerFactory(factoryData) {
  const { factoryId, name, initialBalance, energyType, currencyBalance, dailyConsumption, availableEnergy } = factoryData;
  
  const db = await getDatabase();
  
  try {
    // Check if factory already exists
    const existing = await dbGet(db, 'SELECT factoryId FROM factories WHERE factoryId = ?', [factoryId]);
    if (existing) {
      throw new Error(`Factory ${factoryId} already exists`);
    }

    // Create Hedera account for the factory
    let hederaAccountId = null;
    let hederaPrivateKey = null;
    
    if (TEC_TOKEN_ID) {
      try {
        console.log(`Creating Hedera account for factory ${factoryId}...`);
        const accountInfo = await createFactoryAccount(10); // 10 HBAR initial balance
        hederaAccountId = accountInfo.accountId;
        hederaPrivateKey = accountInfo.privateKey;

        // Associate the account with TEC token
        console.log(`Associating TEC token with account ${hederaAccountId}...`);
        await associateTokenWithAccount(hederaAccountId, hederaPrivateKey, TEC_TOKEN_ID);
      } catch (error) {
        console.error('Failed to create Hedera account or associate token:', error.message);
        throw new Error(`Failed to setup Hedera account: ${error.message}`);
      }
    }

    // Insert factory into database
    await dbRun(db, `
      INSERT INTO factories (factoryId, name, hederaAccountId, hederaPrivateKey, energyType, energyBalance, currencyBalance, dailyConsumption, availableEnergy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [factoryId, name, hederaAccountId, hederaPrivateKey, energyType, initialBalance || 0, currencyBalance || 0, dailyConsumption || 0, availableEnergy || 0]);

    // Record transaction history
    await dbRun(db, `
      INSERT INTO transaction_history (factoryId, transactionType, amount)
      VALUES (?, 'REGISTER', ?)
    `, [factoryId, initialBalance || 0]);

    return {
      factoryId,
      name,
      hederaAccountId,
      energyType,
      energyBalance: initialBalance || 0,
      currencyBalance: currencyBalance || 0,
      dailyConsumption: dailyConsumption || 0,
      availableEnergy: availableEnergy || 0
    };
  } finally {
    db.close();
  }
}

/**
 * Mint energy tokens (add surplus energy)
 */
async function mintEnergyTokens(factoryId, amount) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const db = await getDatabase();
  
  try {
    // Get factory
    const factory = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [factoryId]);
    if (!factory) {
      throw new Error(`Factory ${factoryId} not found`);
    }

    // Update energy balance
    const newBalance = factory.energyBalance + amount;
    await dbRun(db, 'UPDATE factories SET energyBalance = ?, updatedAt = strftime(\'%s\', \'now\') WHERE factoryId = ?', 
      [newBalance, factoryId]);

    // Record transaction history
    await dbRun(db, `
      INSERT INTO transaction_history (factoryId, transactionType, amount)
      VALUES (?, 'MINT', ?)
    `, [factoryId, amount]);

    return {
      factoryId,
      previousBalance: factory.energyBalance,
      newBalance,
      minted: amount
    };
  } finally {
    db.close();
  }
}

/**
 * Transfer energy between factories
 */
async function transferEnergy(fromFactoryId, toFactoryId, amount) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const db = await getDatabase();
  
  try {
    // Get both factories
    const fromFactory = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [fromFactoryId]);
    const toFactory = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [toFactoryId]);

    if (!fromFactory) throw new Error(`Factory ${fromFactoryId} not found`);
    if (!toFactory) throw new Error(`Factory ${toFactoryId} not found`);

    // Check balance
    if (fromFactory.energyBalance < amount) {
      throw new Error(`Insufficient energy balance: has ${fromFactory.energyBalance}, needs ${amount}`);
    }

    // Update balances
    await dbRun(db, 'UPDATE factories SET energyBalance = energyBalance - ?, updatedAt = strftime(\'%s\', \'now\') WHERE factoryId = ?',
      [amount, fromFactoryId]);
    await dbRun(db, 'UPDATE factories SET energyBalance = energyBalance + ?, updatedAt = strftime(\'%s\', \'now\') WHERE factoryId = ?',
      [amount, toFactoryId]);

    // Record transaction history
    await dbRun(db, `
      INSERT INTO transaction_history (factoryId, transactionType, amount, relatedFactoryId)
      VALUES (?, 'TRANSFER_OUT', ?, ?)
    `, [fromFactoryId, amount, toFactoryId]);
    
    await dbRun(db, `
      INSERT INTO transaction_history (factoryId, transactionType, amount, relatedFactoryId)
      VALUES (?, 'TRANSFER_IN', ?, ?)
    `, [toFactoryId, amount, fromFactoryId]);

    return {
      fromFactoryId,
      toFactoryId,
      amount,
      success: true
    };
  } finally {
    db.close();
  }
}

/**
 * Create an energy trade
 */
async function createEnergyTrade(tradeData) {
  const { tradeId, sellerId, buyerId, amount, pricePerUnit } = tradeData;
  
  const db = await getDatabase();
  
  try {
    // Check if trade exists
    const existing = await dbGet(db, 'SELECT tradeId FROM trades WHERE tradeId = ?', [tradeId]);
    if (existing) {
      throw new Error(`Trade ${tradeId} already exists`);
    }

    // Validate seller and buyer exist
    const seller = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [sellerId]);
    const buyer = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [buyerId]);

    if (!seller) throw new Error(`Seller factory ${sellerId} not found`);
    if (!buyer) throw new Error(`Buyer factory ${buyerId} not found`);

    // Check seller has enough energy
    if (seller.energyBalance < amount) {
      throw new Error(`Seller has insufficient energy balance`);
    }

    const totalPrice = amount * pricePerUnit;

    // Insert trade
    await dbRun(db, `
      INSERT INTO trades (tradeId, sellerId, buyerId, amount, pricePerUnit, totalPrice, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [tradeId, sellerId, buyerId, amount, pricePerUnit, totalPrice]);

    return {
      tradeId,
      sellerId,
      buyerId,
      amount,
      pricePerUnit,
      totalPrice,
      status: 'pending'
    };
  } finally {
    db.close();
  }
}

/**
 * Execute a pending trade with TEC token transfer
 */
async function executeTrade(tradeId) {
  const db = await getDatabase();
  
  try {
    // Get trade
    const trade = await dbGet(db, 'SELECT * FROM trades WHERE tradeId = ?', [tradeId]);
    if (!trade) {
      throw new Error(`Trade ${tradeId} not found`);
    }

    if (trade.status === 'completed') {
      throw new Error('Trade already completed');
    }

    // Get buyer and seller
    const buyer = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [trade.buyerId]);
    const seller = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [trade.sellerId]);

    // Validate Hedera accounts exist
    if (TEC_TOKEN_ID) {
      if (!buyer.hederaAccountId || !buyer.hederaPrivateKey) {
        throw new Error(`Buyer factory ${trade.buyerId} does not have a Hedera account`);
      }
      if (!seller.hederaAccountId) {
        throw new Error(`Seller factory ${trade.sellerId} does not have a Hedera account`);
      }
    }

    // Check buyer has enough TEC
    if (buyer.currencyBalance < trade.totalPrice) {
      throw new Error(`Buyer has insufficient TEC balance: has ${buyer.currencyBalance}, needs ${trade.totalPrice}`);
    }

    // Execute real TEC token transfer on Hedera
    let hederaTxId = null;
    if (TEC_TOKEN_ID) {
      try {
        console.log(`\n=== Executing Trade ${trade.tradeId} on Hedera ===`);
        hederaTxId = await transferTECOnHedera(buyer, seller, trade.totalPrice);
        console.log(`=== Trade ${trade.tradeId} completed on Hedera ===\n`);
      } catch (error) {
        // No rollback needed - database hasn't been updated yet
        throw new Error(`Hedera TEC transfer failed: ${error.message}`);
      }
    }

    // Update local balances after successful Hedera transfer
    // Transfer energy
    await dbRun(db, 'UPDATE factories SET energyBalance = energyBalance - ? WHERE factoryId = ?',
      [trade.amount, trade.sellerId]);
    await dbRun(db, 'UPDATE factories SET energyBalance = energyBalance + ? WHERE factoryId = ?',
      [trade.amount, trade.buyerId]);

    // Transfer TEC (currency) - update local tracking
    await dbRun(db, 'UPDATE factories SET currencyBalance = currencyBalance - ? WHERE factoryId = ?',
      [trade.totalPrice, trade.buyerId]);
    await dbRun(db, 'UPDATE factories SET currencyBalance = currencyBalance + ? WHERE factoryId = ?',
      [trade.totalPrice, trade.sellerId]);

    // Update trade status
    await dbRun(db, 'UPDATE trades SET status = ?, hederaTransactionId = ? WHERE tradeId = ?',
      ['completed', hederaTxId, tradeId]);

    // Record transaction history
    await dbRun(db, `
      INSERT INTO transaction_history (factoryId, transactionType, amount, relatedFactoryId, hederaTransactionId)
      VALUES (?, 'TRADE_SELL', ?, ?, ?)
    `, [trade.sellerId, trade.amount, trade.buyerId, hederaTxId]);
    
    await dbRun(db, `
      INSERT INTO transaction_history (factoryId, transactionType, amount, relatedFactoryId, hederaTransactionId)
      VALUES (?, 'TRADE_BUY', ?, ?, ?)
    `, [trade.buyerId, trade.amount, trade.sellerId, hederaTxId]);

    return {
      tradeId,
      status: 'completed',
      hederaTransactionId: hederaTxId
    };
  } finally {
    db.close();
  }
}

/**
 * Transfer TEC tokens on Hedera network
 * 
 * This function executes real TransferTransaction on Hedera network
 * to transfer TEC tokens between factory accounts.
 * 
 * @param {Object} fromAccount - Factory sending TEC
 * @param {Object} toAccount - Factory receiving TEC
 * @param {number} amount - Amount of TEC to transfer (will be converted to token smallest unit)
 * @returns {string} Transaction ID from Hedera
 */
async function transferTECOnHedera(fromAccount, toAccount, amount) {
  if (!TEC_TOKEN_ID) {
    throw new Error('TEC_TOKEN_ID not configured');
  }

  if (!fromAccount.hederaAccountId || !fromAccount.hederaPrivateKey) {
    throw new Error(`Sender factory ${fromAccount.factoryId} does not have a Hedera account`);
  }

  if (!toAccount.hederaAccountId) {
    throw new Error(`Receiver factory ${toAccount.factoryId} does not have a Hedera account`);
  }

  // Convert amount to token smallest unit (TEC has 2 decimals)
  // e.g., 100 TEC = 10000 in smallest unit
  // Math.floor ensures we don't send fractional smallest units which are not allowed
  const amountInSmallestUnit = Math.floor(amount * 100);

  console.log(`Executing real TEC transfer: ${amount} TEC from ${fromAccount.factoryId} to ${toAccount.factoryId}`);
  console.log(`  From Account: ${fromAccount.hederaAccountId}`);
  console.log(`  To Account: ${toAccount.hederaAccountId}`);
  console.log(`  Amount: ${amountInSmallestUnit} (smallest unit)`);

  try {
    const transactionId = await transferTokensBetweenAccounts(
      fromAccount.hederaAccountId,
      fromAccount.hederaPrivateKey,
      toAccount.hederaAccountId,
      TEC_TOKEN_ID,
      amountInSmallestUnit
    );

    console.log(`✓ TEC transfer successful on Hedera`);
    console.log(`  Transaction ID: ${transactionId}`);
    console.log(`  View on HashScan: https://hashscan.io/testnet/transaction/${transactionId}`);

    return transactionId;
  } catch (error) {
    console.error('Hedera TEC transfer failed:', error.message);
    throw new Error(`Hedera transfer failed: ${error.message}`);
  }
}

/**
 * Get factory information
 */
async function getFactory(factoryId) {
  const db = await getDatabase();
  
  try {
    const factory = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [factoryId]);
    if (!factory) {
      throw new Error(`Factory ${factoryId} not found`);
    }
    return factory;
  } finally {
    db.close();
  }
}

/**
 * Get all factories
 */
async function getAllFactories() {
  const db = await getDatabase();
  
  try {
    return await dbAll(db, 'SELECT * FROM factories ORDER BY factoryId');
  } finally {
    db.close();
  }
}

/**
 * Get trade information
 */
async function getTrade(tradeId) {
  const db = await getDatabase();
  
  try {
    const trade = await dbGet(db, 'SELECT * FROM trades WHERE tradeId = ?', [tradeId]);
    if (!trade) {
      throw new Error(`Trade ${tradeId} not found`);
    }
    return trade;
  } finally {
    db.close();
  }
}

/**
 * Get factory transaction history
 */
async function getFactoryHistory(factoryId) {
  const db = await getDatabase();
  
  try {
    return await dbAll(db, 
      'SELECT * FROM transaction_history WHERE factoryId = ? ORDER BY timestamp DESC',
      [factoryId]
    );
  } finally {
    db.close();
  }
}

/**
 * Update available energy
 */
async function updateAvailableEnergy(factoryId, newAvailableEnergy) {
  if (newAvailableEnergy < 0) {
    throw new Error('Available energy cannot be negative');
  }

  const db = await getDatabase();
  
  try {
    const factory = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [factoryId]);
    if (!factory) {
      throw new Error(`Factory ${factoryId} not found`);
    }

    await dbRun(db, 'UPDATE factories SET availableEnergy = ?, updatedAt = strftime(\'%s\', \'now\') WHERE factoryId = ?',
      [newAvailableEnergy, factoryId]);

    return { factoryId, availableEnergy: newAvailableEnergy };
  } finally {
    db.close();
  }
}

/**
 * Update daily consumption
 */
async function updateDailyConsumption(factoryId, newDailyConsumption) {
  if (newDailyConsumption < 0) {
    throw new Error('Daily consumption cannot be negative');
  }

  const db = await getDatabase();
  
  try {
    const factory = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [factoryId]);
    if (!factory) {
      throw new Error(`Factory ${factoryId} not found`);
    }

    await dbRun(db, 'UPDATE factories SET dailyConsumption = ?, updatedAt = strftime(\'%s\', \'now\') WHERE factoryId = ?',
      [newDailyConsumption, factoryId]);

    return { factoryId, dailyConsumption: newDailyConsumption };
  } finally {
    db.close();
  }
}

/**
 * Get energy status (surplus/deficit)
 */
async function getEnergyStatus(factoryId) {
  const db = await getDatabase();
  
  try {
    const factory = await dbGet(db, 'SELECT * FROM factories WHERE factoryId = ?', [factoryId]);
    if (!factory) {
      throw new Error(`Factory ${factoryId} not found`);
    }

    const difference = factory.availableEnergy - factory.dailyConsumption;
    let status;
    
    if (difference > 0) {
      status = 'surplus';
    } else if (difference < 0) {
      status = 'deficit';
    } else {
      status = 'balanced';
    }

    return {
      factoryId: factory.factoryId,
      factoryName: factory.name,
      availableEnergy: factory.availableEnergy,
      dailyConsumption: factory.dailyConsumption,
      difference,
      status
    };
  } finally {
    db.close();
  }
}

module.exports = {
  createEnergyTradingTopic,
  logToHederaTopic,
  registerFactory,
  mintEnergyTokens,
  transferEnergy,
  createEnergyTrade,
  executeTrade,
  getFactory,
  getAllFactories,
  getTrade,
  getFactoryHistory,
  updateAvailableEnergy,
  updateDailyConsumption,
  getEnergyStatus
};
