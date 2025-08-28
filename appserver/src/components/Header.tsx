import React from 'react';
import { useChainId, useSwitchChain, useChains } from 'wagmi';
import Link from 'next/link';
import { SiWebmoney } from "react-icons/si";

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
  const [selectedChainId, setSelectedChainId] = React.useState<number | undefined>(useChainId());
  const { chains, switchChain, error } = useSwitchChain();
  
  React.useEffect(() => {
    const storedChainId = localStorage.getItem('selectedChainId');
    if (storedChainId) {
      setSelectedChainId(Number(storedChainId));
    }
  }, []);

  React.useEffect(() => {
    if (selectedChainId) {
      localStorage.setItem('selectedChainId', selectedChainId.toString());
    }
  }, [selectedChainId]);

  return (
    <div className="dashboard-header">
      <Link href="/" className="brand-title" style={{ textDecoration: 'none' }}>
<span className="card-icon"><SiWebmoney /></span>
        <span className="brand-title-text">Cartfree - Worry free checkout</span>
      </Link>
      
      {isConnected ? (
        <div className="header-actions">
          <div className="header-network-selector">
            <select 
              value={selectedChainId} 
              onChange={(e) => {
                const newChainId = Number(e.target.value);
                setSelectedChainId(newChainId);
                switchChain({ chainId: newChainId });
              }}
              className="network-dropdown"
              style={{ width: '155px' }} // Adjust width to accommodate longer names
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
