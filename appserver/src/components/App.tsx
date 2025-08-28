import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";
import { useAccount, useSignMessage } from "wagmi";
import { Header } from "./Header";
import { UserInfo } from "./UserInfo";
import { BlockchainActions } from "./BlockchainActions";
import { Checkout } from "./Checkout";
import { MarketplaceTabs } from "./MarketplaceTabs";
import './App.css';
import { useState, useEffect } from 'react';

function App() {
  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { address, connector } = useAccount();
  const { signMessage, data: signatureData, error: signError, isPending: signPending } = useSignMessage();
  
  const [nonce, setNonce] = useState<string>('');

  // Load nonce from local storage on component mount
  useEffect(() => {
    const storedNonce = localStorage.getItem('cartfree_nonce');
    if (storedNonce) {
      setNonce(storedNonce);
    }
  }, []);

  // Save nonce to local storage whenever it changes
  useEffect(() => {
    if (nonce) {
      localStorage.setItem('cartfree_nonce', nonce);
    }
  }, [nonce]);
  const [signature, setSignature] = useState<string>('');
  const [signing, setSigning] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<number | undefined>(undefined);

  const generateNonce = () => {
    const newNonce = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    setNonce(newNonce);
    setSignature('');
    return newNonce;
  };

  const handleSignNonce = () => {
    if (!isConnected || !address) {
      return;
    }

    const currentNonce = nonce || generateNonce();
    const message = `Sign in to Cartfree: ${currentNonce}`;
    
    signMessage({ message });
  };

  // Handle signature response and send to backend
  useEffect(() => {
    const authenticateWithBackend = async (signature: string) => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: address,
            nonce: nonce,
            signature: signature
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log('Authentication successful:', result);
        } else {
          console.log('Authentication failed:', result.error);
        }
      } catch (error) {
        console.error('Backend authentication failed:', error);
      } finally {
        setSigning(false);
      }
    };

    if (signatureData) {
      setSignature(signatureData);
      authenticateWithBackend(signatureData);
    }
  }, [signatureData, address, nonce]);

  // Update signing state
  useEffect(() => {
    setSigning(signPending);
  }, [signPending]);

  // Automatically sign nonce when user connects
  useEffect(() => {
    if (isConnected && address && userInfo) {
      // Trigger automatic signing when user connects
      handleSignNonce();
    }
  }, [isConnected, address, userInfo]);

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
      <div style={{ 
        margin: '10px 0',
        textAlign: 'center', 
        padding: '10px 20px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #e9ecef',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        USDC payment to the seller will be received in Base Sepolia network
      </div>

      <div className="dashboard-content">
        <UserInfo
          isConnected={isConnected}
          address={address}
          connector={connector}
          userInfo={userInfo}
          nonce={nonce}
          signature={signature}
        />

        <BlockchainActions isConnected={isConnected} selectedChainId={selectedChainId} />

        <Checkout isConnected={isConnected} userAddress={address} />
      </div>

      {/* Marketplace Tabs */}
      <MarketplaceTabs userAddress={address} />

      {connectLoading && <div className="loading">Connecting...</div>}
      {connectError && <div className="error">{connectError.message}</div>}
      {disconnectLoading && <div className="loading">Disconnecting...</div>}
      {disconnectError && <div className="error">{disconnectError.message}</div>}
    </div>
  );
}

export default App;
