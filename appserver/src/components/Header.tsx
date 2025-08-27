import React from 'react';
import { useChainId, useSwitchChain } from 'wagmi';

interface HeaderProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  connectLoading: boolean;
  disconnectLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  onConnect,
  onDisconnect,
  connectLoading,
  disconnectLoading
}) => {
  const chainId = useChainId();
  const { chains, switchChain, error } = useSwitchChain();

  return (
    <div className="dashboard-header">
      <div className="brand-title">
        <span className="card-icon">🛒</span>
        <span className="brand-title-text">Cartfree - Worry free checkout</span>
      </div>
      
{isConnected ? (
        <div className="header-actions">
          <div className="header-network-selector">
            <select 
              value={chainId} 
              onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
              className="network-dropdown"
            >
              {chains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={onDisconnect} 
            className="logout-btn"
            disabled={disconnectLoading}
          >
            {disconnectLoading ? 'Disconnecting...' : 'Log Out'}
          </button>
        </div>
      ) : (
        <button 
          onClick={onConnect} 
          className="connect-btn"
          disabled={connectLoading}
        >
          {connectLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}

      {error && <div className="network-error">{error.message}</div>}
    </div>
  );
};
