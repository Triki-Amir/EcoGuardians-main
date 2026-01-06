import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class BlockchainScreen extends StatefulWidget {
  final VoidCallback onBack;
  final String factoryId;
  final String factoryName;

  const BlockchainScreen({
    super.key,
    required this.onBack,
    required this.factoryId,
    required this.factoryName,
  });

  @override
  State<BlockchainScreen> createState() => _BlockchainScreenState();
}

class _BlockchainScreenState extends State<BlockchainScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  String? _hederaAccountId;
  double? _tecBalance;
  bool _isLoading = true;
  
  // Hedera blockchain data
  List<Map<String, dynamic>> _transactions = [];
  int? _blockHeight;
  String? _latestBlockHash;
  DateTime? _latestBlockTime;
  int? _transactionCount;
  bool _loadingBlockchainData = true;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    _fetchFactoryData();
    _fetchBlockchainData();
  }

  Future<void> _fetchFactoryData() async {
    try {
      final result = await ApiService.getFactory(widget.factoryId);
      final factoryData = result['data'] as Map<String, dynamic>;
      
      setState(() {
        _hederaAccountId = factoryData['hederaAccountId'] as String?;
        _tecBalance = (factoryData['currencyBalance'] as num?)?.toDouble();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchBlockchainData() async {
    try {
      // Fetch treasury transactions and latest block info in parallel
      final results = await Future.wait([
        ApiService.getTreasuryTransactions(limit: 10),
        ApiService.getLatestBlockInfo(),
      ]);

      final transactionsResult = results[0] as Map<String, dynamic>;
      final blockInfoResult = results[1] as Map<String, dynamic>;

      final transactionsData = transactionsResult['data'] as List;
      final blockData = blockInfoResult['data'] as Map<String, dynamic>;

      setState(() {
        _transactions = transactionsData.map((tx) => tx as Map<String, dynamic>).toList();
        _blockHeight = blockData['blockNumber'] as int?;
        _latestBlockHash = blockData['hash'] as String?;
        _transactionCount = blockData['transactionCount'] as int?;
        
        // Parse timestamp
        final timestampStr = blockData['timestamp'] as String?;
        if (timestampStr != null) {
          _latestBlockTime = DateTime.parse(timestampStr);
        }
        
        _loadingBlockchainData = false;
      });
    } catch (e) {
      print('Error fetching blockchain data: $e');
      setState(() {
        _loadingBlockchainData = false;
      });
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copied to clipboard'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _truncateHash(String hash) {
    return '${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0a0a0a),
      appBar: AppBar(
        backgroundColor: Colors.grey.shade900.withOpacity(0.5),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: widget.onBack,
        ),
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'lib/screens/assets/logo.png',
                width: 40,
                height: 40,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Next Gen Power',
                    style: TextStyle(fontSize: 18, color: Colors.white),
                  ),
                  Text(
                    'Blockchain Explorer',
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Wallet Summary Card
          Card(
            color: Colors.grey.shade900.withOpacity(0.5),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.blue.shade600.withOpacity(0.2),
                    Colors.purple.shade600.withOpacity(0.2),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.blue.shade600.withOpacity(0.3),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Token Balance',
                            style: TextStyle(
                              color: Colors.blue.shade300,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          _isLoading
                              ? const SizedBox(
                                  height: 32,
                                  width: 32,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Text(
                                  '${_tecBalance?.toStringAsFixed(2) ?? '0.00'} TEC',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                          Text(
                            'TEC Coin Balance',
                            style: TextStyle(
                              color: Colors.blue.shade300,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        onPressed: () {},
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade600,
                          shape: const CircleBorder(),
                          padding: const EdgeInsets.all(12),
                        ),
                        child: const Icon(Icons.qr_code, size: 20, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.grey),
                          ),
                          child: const Text('Send', style: TextStyle(color: Colors.white)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.grey),
                          ),
                          child: const Text('Receive', style: TextStyle(color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Block Height
          Card(
            color: Colors.grey.shade900.withOpacity(0.5),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Block Height',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  _loadingBlockchainData
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _blockHeight != null
                              ? _blockHeight.toString().replaceAllMapped(
                                    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                    (Match m) => '${m[1]},',
                                  )
                              : 'N/A',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Live Transactions Feed
          Card(
            color: Colors.grey.shade900.withOpacity(0.5),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Live Transactions',
                        style: TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                      Row(
                        children: [
                          FadeTransition(
                            opacity: _pulseController,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.green,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'Live',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_loadingBlockchainData)
                    const Center(
                      child: CircularProgressIndicator(
                        color: Colors.white,
                      ),
                    )
                  else if (_transactions.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20.0),
                        child: Text(
                          'No transactions available',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ),
                    )
                  else
                    ..._transactions.take(5).map((tx) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildTransactionItemFromHedera(tx),
                      );
                    }).toList(),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Latest Block
          Card(
            color: Colors.grey.shade900.withOpacity(0.5),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Latest Block',
                    style: TextStyle(color: Colors.grey, fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  if (_loadingBlockchainData)
                    const Center(
                      child: CircularProgressIndicator(
                        color: Colors.white,
                      ),
                    )
                  else ...[
                    _buildStatRow('Block Number', _blockHeight?.toString() ?? 'N/A'),
                    _buildStatRow(
                      'Timestamp',
                      _latestBlockTime != null
                          ? '${_latestBlockTime!.hour.toString().padLeft(2, '0')}:${_latestBlockTime!.minute.toString().padLeft(2, '0')}:${_latestBlockTime!.second.toString().padLeft(2, '0')}'
                          : 'N/A',
                    ),
                    _buildStatRow('Transactions', _transactionCount?.toString() ?? 'N/A'),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Block Hash',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        Row(
                          children: [
                            Text(
                              _latestBlockHash != null && _latestBlockHash!.length > 20
                                  ? '${_latestBlockHash!.substring(0, 10)}...${_latestBlockHash!.substring(_latestBlockHash!.length - 8)}'
                                  : _latestBlockHash ?? 'N/A',
                              style: TextStyle(
                                color: Colors.purple.shade400,
                                fontSize: 12,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.open_in_new, size: 12, color: Colors.grey),
                          ],
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Validator Status
          Card(
            color: Colors.grey.shade900.withOpacity(0.5),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.green.shade600.withOpacity(0.2),
                    Colors.green.shade800.withOpacity(0.2),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.green.shade600.withOpacity(0.3),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Validator Status',
                            style: TextStyle(
                              color: Colors.green.shade300,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.green.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Active',
                              style: TextStyle(color: Colors.greenAccent, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Rewards Earned',
                            style: TextStyle(
                              color: Colors.green.shade300,
                              fontSize: 10,
                            ),
                          ),
                          const Text(
                            '147 TEC',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_hederaAccountId != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Colors.blue.withOpacity(0.3),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.account_balance, color: Colors.blueAccent, size: 16),
                              const SizedBox(width: 8),
                              const Text(
                                'Hedera Account ID',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _hederaAccountId!,
                                  style: const TextStyle(
                                    color: Colors.blueAccent,
                                    fontSize: 14,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.copy, size: 16, color: Colors.blueAccent),
                                onPressed: () => _copyToClipboard(_hederaAccountId!),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Uptime',
                              style: TextStyle(
                                color: Colors.green.shade300,
                                fontSize: 12,
                              ),
                            ),
                            const Text(
                              '99.8%',
                              style: TextStyle(color: Colors.white, fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Blocks Validated',
                              style: TextStyle(
                                color: Colors.green.shade300,
                                fontSize: 12,
                              ),
                            ),
                            const Text(
                              '1,247',
                              style: TextStyle(color: Colors.white, fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // QR Code Scanner Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple.shade600,
              ),
              icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
              label: const Text('Scan QR Code', style: TextStyle(color: Colors.white)),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildTransactionItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String type,
    required Color typeColor,
    required String amount,
    required DateTime time,
    required String hash,
  }) {
    return Card(
      color: Colors.grey.shade800.withOpacity(0.5),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.grey.shade700.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: typeColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          type,
                          style: TextStyle(
                            color: typeColor,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}:${time.second.toString().padLeft(2, '0')}',
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade900.withOpacity(0.5),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              _truncateHash(hash),
                              style: TextStyle(
                                color: Colors.purple.shade400,
                                fontSize: 10,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => _copyToClipboard(hash),
                            child: const Icon(Icons.copy, size: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                      Text(
                        amount,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.grey, fontSize: 12),
          ),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionItemFromHedera(Map<String, dynamic> tx) {
    // Parse transaction data
    final transactionId = tx['transactionId'] as String? ?? '';
    final timestamp = tx['consensusTimestamp'] as String? ?? '';
    final type = tx['type'] as String? ?? 'UNKNOWN';
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0.0;
    final result = tx['result'] as String? ?? '';
    
    // Parse timestamp
    DateTime? txTime;
    try {
      if (timestamp.isNotEmpty) {
        txTime = DateTime.parse(timestamp);
      }
    } catch (e) {
      txTime = DateTime.now();
    }
    
    // Determine icon and color based on transaction type
    IconData icon = Icons.swap_horiz;
    Color iconColor = Colors.blue;
    String title = type;
    Color typeColor = Colors.blue;
    
    if (type.contains('MINT') || type.contains('CREATE')) {
      icon = Icons.add_circle;
      iconColor = Colors.green;
      typeColor = Colors.green;
      title = 'Token Mint';
    } else if (type.contains('TRANSFER')) {
      icon = Icons.swap_horiz;
      iconColor = Colors.blue;
      typeColor = Colors.blue;
      title = 'Token Transfer';
    } else if (type.contains('ASSOCIATE')) {
      icon = Icons.link;
      iconColor = Colors.purple;
      typeColor = Colors.purple;
      title = 'Token Association';
    }
    
    // Format amount
    final amountStr = amount > 0 ? '${amount.toStringAsFixed(2)} TEC' : 'N/A';
    
    return _buildTransactionItem(
      icon: icon,
      iconColor: iconColor,
      title: title,
      type: result,
      typeColor: result == 'SUCCESS' ? Colors.green : Colors.red,
      amount: amountStr,
      time: txTime ?? DateTime.now(),
      hash: transactionId,
    );
  }
}
