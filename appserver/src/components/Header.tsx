import React from 'react';

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
  return (
    <div className="dashboard-header">
      <div className="brand-title">
        <span className="card-icon">🛒</span>
        <span className="brand-title-text">Cartfree - Worry free checkout</span>
      </div>
      {isConnected ? (
        <button 
          onClick={onDisconnect} 
          className="logout-btn"
          disabled={disconnectLoading}
        >
          {disconnectLoading ? 'Disconnecting...' : 'Log Out'}
        </button>
      ) : (
        <button 
          onClick={onConnect} 
          className="connect-btn"
          disabled={connectLoading}
        >
          {connectLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};