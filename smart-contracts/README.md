# CCTP Auto Receiver Smart Contract

This smart contract automatically receives and processes CCTP (Cross-Chain Transfer Protocol) messages on Base Sepolia, eliminating the need for manual minting steps in cross-chain USDC transfers.

## Overview

The `CCTPAutoReceiver` contract acts as a hook that automatically handles the `receiveMessage()` step of CCTP transfers. When USDC is transferred from Ethereum Sepolia or Arbitrum Sepolia to Base Sepolia, this contract automatically processes the message and mints USDC to the recipient.

## Features

- ✅ **Automatic Message Processing**: No manual intervention required
- ✅ **Gas Management**: Pre-funded with ETH for automatic operations
- ✅ **Batch Processing**: Handle multiple messages in one transaction
- ✅ **Admin Controls**: Pause/unpause, gas limit management, fund withdrawal
- ✅ **Error Handling**: Robust error handling with retry capabilities
- ✅ **Event Logging**: Complete audit trail of all operations

## Smart Contract Architecture

### Core Functions

- `processMessage()`: Automatically process a single CCTP message
- `batchProcessMessages()`: Process multiple messages in batch
- `getStatus()`: Get contract status and configuration
- `isMessageProcessed()`: Check if a message has been processed

### Admin Functions

- `setGasLimit()`: Update gas limit for automatic processing
- `setMinGasReserve()`: Set minimum ETH reserve
- `withdrawFunds()`: Withdraw excess ETH
- `pause()`/`unpause()`: Emergency controls

## Installation

1. Navigate to the smart contracts directory:
```bash
cd smart-contracts
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PRIVATE_KEY=your_private_key_without_0x
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

## Compilation

Compile the smart contracts:
```bash
npm run compile
```

## Testing

Run the test suite:
```bash
npm test
```

## Deployment

### Deploy to Base Sepolia

1. Fund your deployer wallet with Base Sepolia ETH
2. Deploy the contract:
```bash
npm run deploy:sepolia
```

3. The deployment script will:
   - Deploy the `CCTPAutoReceiver` contract
   - Fund it with 0.1 ETH for gas
   - Display deployment information

### Verify Contract

After deployment, verify on Basescan:
```bash
CONTRACT_ADDRESS=0x... npm run verify
```

## Configuration

### Contract Addresses (Base Sepolia)

- **MessageTransmitter**: `0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5`
- **TokenMessenger**: `0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5`  
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Domain IDs

- Ethereum Sepolia: `0`
- Arbitrum Sepolia: `3` 
- Base Sepolia: `6`

## Usage

### Frontend Integration

After deploying the contract, update your frontend to use the automatic receiver:

```javascript
// Instead of manual CCTP flow, transfers to Base will be automatic
const transferToBase = async (amount, recipient) => {
  // User only needs to do depositForBurn on source chain
  // Your deployed contract will automatically handle the rest
};
```

### Monitoring

Monitor contract events to track automatic processing:

```javascript
const contract = new ethers.Contract(contractAddress, abi, provider);

contract.on('MessageReceived', (messageHash, sourceDomain, recipient, amount, success) => {
  console.log('Auto-processed transfer:', {
    messageHash,
    sourceDomain: sourceDomain.toString(),
    recipient,
    amount: ethers.formatUnits(amount, 6), // USDC has 6 decimals
    success
  });
});
```

## Gas Management

The contract requires ETH to pay for automatic message processing:

- **Initial Funding**: 0.1 ETH (provided during deployment)
- **Gas per Process**: ~200,000-500,000 gas
- **Monitoring**: Check contract balance regularly
- **Refilling**: Send ETH directly to contract address

```bash
# Check contract balance
cast balance <CONTRACT_ADDRESS> --rpc-url https://sepolia.base.org

# Send more ETH if needed
cast send <CONTRACT_ADDRESS> --value 0.1ether --private-key <PRIVATE_KEY>
```

## Security Features

- **Access Control**: Owner-only admin functions
- **Reentrancy Protection**: All external calls protected
- **Pause Mechanism**: Emergency stop functionality
- **Gas Limits**: Configurable gas limits prevent abuse
- **Duplicate Prevention**: Messages can't be processed twice

## Troubleshooting

### Common Issues

1. **Out of Gas**: Contract needs ETH funding
   - Send ETH to contract address
   - Check `minGasReserve` setting

2. **Message Not Processing**: Check attestation status
   - Verify message is attested by Circle
   - Check if message was already processed

3. **Permission Errors**: Only owner can call admin functions
   - Verify you're using the deployer wallet

### Emergency Procedures

If issues arise:

1. **Pause Contract**:
```bash
cast send <CONTRACT_ADDRESS> "pause()" --private-key <PRIVATE_KEY>
```

2. **Withdraw Funds**:
```bash
cast send <CONTRACT_ADDRESS> "withdrawFunds(address,uint256)" <YOUR_ADDRESS> <AMOUNT> --private-key <PRIVATE_KEY>
```

## Development

### Project Structure

```
smart-contracts/
├── contracts/           # Smart contracts
│   └── CCTPAutoReceiver.sol
├── interfaces/          # Contract interfaces
│   ├── IMessageTransmitter.sol
│   └── ITokenMessenger.sol
├── scripts/            # Deployment scripts
│   ├── deploy.js
│   └── verify.js
├── test/              # Test files
│   └── CCTPAutoReceiver.test.js
└── hardhat.config.js  # Hardhat configuration
```

### Adding Features

To extend the contract:

1. Add new functions to `CCTPAutoReceiver.sol`
2. Update tests in `test/CCTPAutoReceiver.test.js`
3. Update deployment script if needed
4. Test on local network first

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review contract events for error details
3. Test on local hardhat network first
4. Verify contract addresses and configuration
