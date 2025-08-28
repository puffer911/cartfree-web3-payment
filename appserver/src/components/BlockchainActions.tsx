import React, { useState } from 'react';
import { Balance } from './wagmi/getBalance';
import { parseUnits } from 'viem';
import { useAccount, useChains, useWriteContract } from 'wagmi';
import { usdcABI } from '@/lib/blockchain/usdcABI';

interface BlockchainActionsProps {
  isConnected: boolean;
  selectedChainId?: number;
}

export const BlockchainActions: React.FC<BlockchainActionsProps> = ({ isConnected, selectedChainId }) => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [networkForTransfer, setNetworkForTransfer] = useState('');
  
  const chains = useChains();
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSendUSDC = async () => {
    if (!userAddress || !networkForTransfer || !amount || !recipientAddress) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Find the selected network details
      const networkDetails = chains.find((chain) => chain.id.toString() === networkForTransfer);
      
      if (!networkDetails) {
        alert('Invalid network selected');
        return;
      }

      // USDC contract addresses for different networks (these would need to be updated)
      const usdcContractAddresses: { [key: number]: `0x${string}` } = {
        1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
        137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
        // Add more networks as needed
      };

      const usdcContractAddress = usdcContractAddresses[networkDetails.id];
      
      if (!usdcContractAddress) {
        alert('USDC not supported on this network');
        return;
      }

      // Convert amount to wei (6 decimals for USDC)
      const amountInWei = parseUnits(amount, 6);

      // Execute the transfer
      await writeContractAsync({
        address: usdcContractAddress,
        abi: usdcABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountInWei]
      });

      alert('USDC transfer successful!');
      // Reset form
      setAmount('');
      setRecipientAddress('');
      setNetworkForTransfer('');
    } catch (error) {
      console.error('USDC transfer failed:', error);
      alert('USDC transfer failed');
    }
  };

  if (!isConnected) {
    return (
      <div className="blockchain-actions">
        <h3 className="card-title">
          <span className="card-icon">⛓️</span>
          Features
        </h3>
        <p>Once connected, you'll be able to:</p>
        <ul>
          <li>Check balance</li>
          <li>Create listings</li>
          <li>Process payments</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="blockchain-actions">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="card-title">
          <span className="card-icon">⛓️</span>
          Balance
        </h3>
        <button 
          onClick={handleRefresh} 
          className="refresh-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
          title="Refresh balance"
        >
          🔄
        </button>
      </div>
      <Balance key={`${selectedChainId}-${refreshTrigger}`} /> {/* Key to force re-render */}
      
      <div className="usdc-transfer-container">
        <h3 className="card-title">Send USDC</h3>
        <div className="usdc-form">
          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input 
              id="amount"
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="recipient">Recipient Address</label>
            <input 
              id="recipient"
              type="text" 
              placeholder="0x..." 
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="network">Network</label>
            <select 
              id="network"
              value={networkForTransfer}
              onChange={(e) => setNetworkForTransfer(e.target.value)}
              className="form-select"
            >
              <option value="">Select Network</option>
              {chains.map((chain) => (
                <option key={chain.id} value={chain.id.toString()}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleSendUSDC} 
            className="send-usdc-btn"
            disabled={!userAddress || !networkForTransfer || !amount || !recipientAddress}
          >
            Send USDC
          </button>
        </div>
      </div>
    </div>
  );
};
