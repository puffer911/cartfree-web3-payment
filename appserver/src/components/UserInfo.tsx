import React, { useState } from 'react';

interface UserInfoProps {
  isConnected: boolean;
  address?: string;
  connector?: { name: string } | null;
  userInfo?: any;
  nonce?: string;
  signature?: string;
}

export const UserInfo: React.FC<UserInfoProps> = ({
  isConnected,
  address,
  connector,
  userInfo,
  nonce,
  signature
}) => {
  const [copyMessage, setCopyMessage] = useState('');

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Copied!');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopyMessage('Failed to copy');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="user-info-card">
        <h3 className="card-title">
          <span className="card-icon">👤</span>
          Welcome to Cartfree
        </h3>
        <p>Connect your wallet to get started with worry-free Web3 payments.</p>
        <div className="info-item">
          <span>Status:</span>
          <span>Not Connected</span>
        </div>
        <div className="info-item">
          <span>Wallet:</span>
          <span>Please connect</span>
        </div>
      </div>
    );
  }

  return (
    <div className="user-info-card">
      <h3 className="card-title">
        <span className="card-icon">👤</span>
        User Information
      </h3>
      <div className="info-item">
        <span>Connected to:</span>
        <span>{connector?.name || 'Unknown'}</span>
      </div>
      <div className="info-item">
        <span>Wallet Address:</span>
        <span 
          style={{ 
            wordBreak: 'break-all', 
            fontSize: '12px', 
            cursor: address ? 'pointer' : 'default',
            color: address ? '#0984e3' : '#2d3436'
          }}
          onClick={() => address && copyToClipboard(address)}
          title={address ? 'Click to copy' : ''}
        >
          {address || 'N/A'}
        </span>
      </div>
      {copyMessage && (
        <div style={{ 
          color: '#00b894', 
          fontSize: '12px', 
          textAlign: 'center', 
          marginTop: '5px' 
        }}>
          {copyMessage}
        </div>
      )}
      {nonce && (
        <div className="info-item">
          <span>Nonce:</span>
          <span 
            style={{ 
              wordBreak: 'break-all', 
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#666'
            }}
          >
            {nonce}
          </span>
        </div>
      )}
      {signature && (
        <div className="info-item">
          <span>Signature:</span>
          <span 
            style={{ 
              wordBreak: 'break-all', 
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#666'
            }}
          >
            {signature.substring(0, 20)}...{signature.substring(signature.length - 20)}
          </span>
        </div>
      )}
    </div>
  );
};
