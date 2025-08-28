import React from 'react';
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";
import { useAccount } from "wagmi";
import { Header } from "./Header";
import { UserInfo } from "./UserInfo";
import { BlockchainActions } from "./BlockchainActions";
import { Checkout } from "./Checkout";
import './App.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showDashboardContent?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  showDashboardContent = true 
}) => {
  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { address, connector } = useAccount();

  return (
    <div className="dashboard">
      <Header
        isConnected={isConnected}
        onConnect={connect}
        onDisconnect={disconnect}
        connectLoading={connectLoading}
        disconnectLoading={disconnectLoading}
      />

      {/* Informational message below header */}
      <div className="payment-info-banner">
        USDC payment to the seller will be received in Base Sepolia network
      </div>

      {showDashboardContent && (
        <div className="dashboard-content">
          <UserInfo
            isConnected={isConnected}
            address={address}
            connector={connector}
            userInfo={userInfo}
            nonce=""
            signature=""
          />

          <BlockchainActions isConnected={isConnected} selectedChainId={undefined} />

          <Checkout isConnected={isConnected} userAddress={address} />
        </div>
      )}

      {children}

      {connectLoading && <div className="loading">Connecting...</div>}
      {connectError && <div className="error">{connectError.message}</div>}
      {disconnectLoading && <div className="loading">Disconnecting...</div>}
      {disconnectError && <div className="error">{disconnectError.message}</div>}
    </div>
  );
};
