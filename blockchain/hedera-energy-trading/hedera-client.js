/**
 * Hedera Client Configuration
 * Sets up the connection to Hedera Testnet for energy trading
 */

const {
  Client,
  PrivateKey,
  Hbar
} = require("@hashgraph/sdk");
require("dotenv").config();

/**
 * Initialize and configure Hedera client
 * @returns {Object} Configured client and keys
 */
function initializeHederaClient() {
  const myAccountId = process.env.MY_ACCOUNT_ID;
  const myPrivateKey = process.env.MY_PRIVATE_KEY;
  const treasuryId = process.env.TREASURY_ACCOUNT_ID || myAccountId;

  // Validate environment variables
  if (!myAccountId || !myPrivateKey) {
    throw new Error(
      "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
    );
  }

  // Parse private key
  const privateKey = PrivateKey.fromString(myPrivateKey);

  // Set up the Hedera client for Testnet
  const client = Client.forTestnet();
  client.setOperator(myAccountId, privateKey);
  
  // Set default transaction and query fees
  client.setDefaultMaxTransactionFee(new Hbar(100));
  client.setDefaultMaxQueryPayment(new Hbar(50));

  console.log("✓ Hedera client initialized");
  console.log(`  Account ID: ${myAccountId}`);
  console.log(`  Network: Testnet`);

  return {
    client,
    operatorId: myAccountId,
    operatorKey: privateKey,
    treasuryId
  };
}

module.exports = { initializeHederaClient };
