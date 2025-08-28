import React from 'react';
import { Balance } from './wagmi/getBalance';
import { SendTransaction } from './wagmi/sendTransaction';

interface BlockchainActionsProps {
  isConnected: boolean;
  selectedChainId?: number;
}

export const BlockchainActions: React.FC<BlockchainActionsProps> = ({ isConnected, selectedChainId }) => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
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
          <li>Send ETH and USDC</li>
          <li>Cross-chain transfers (CCTP)</li>
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
      
      <div className="send-transaction-section">
        <h3 className="card-title">Send Transactions</h3>
        <SendTransaction />
      </div>
    </div>
  );
};
