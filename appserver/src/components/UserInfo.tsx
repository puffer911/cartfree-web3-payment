import React from 'react';

interface UserInfoProps {
  isConnected: boolean;
  address?: string;
  connector?: { name: string } | null;
  userInfo?: any;
  onGetUserInfo: () => void;
}

export const UserInfo: React.FC<UserInfoProps> = ({
  isConnected,
  address,
  connector,
  userInfo,
  onGetUserInfo
}) => {
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
        <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}</span>
      </div>
      <button onClick={onGetUserInfo} className="info-btn">
        Get User Info
      </button>
    </div>
  );
};