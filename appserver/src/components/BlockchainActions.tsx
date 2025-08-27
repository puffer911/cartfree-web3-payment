import React from 'react';
import { Balance } from './wagmi/getBalance';

interface BlockchainActionsProps {
  isConnected: boolean;
}

export const BlockchainActions: React.FC<BlockchainActionsProps> = ({ isConnected }) => {
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
      <h3 className="card-title">
        <span className="card-icon">⛓️</span>
        Blockchain Actions
      </h3>
      <Balance />
    </div>
  );
};
