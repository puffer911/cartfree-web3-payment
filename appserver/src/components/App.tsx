import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";
import { useAccount, useSignMessage } from "wagmi";
import { Header } from "./Header";
import { UserInfo } from "./UserInfo";
import { BlockchainActions } from "./BlockchainActions";
import { Checkout } from "./Checkout";
import './App.css';
import { useState, useEffect } from 'react';

function App() {
  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { address, connector } = useAccount();
  const { signMessage, data: signatureData, error: signError, isPending: signPending } = useSignMessage();
  
  const [nonce, setNonce] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [signing, setSigning] = useState(false);

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
      console.log(...args);
    }
  }

  const generateNonce = () => {
    const newNonce = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    setNonce(newNonce);
    setSignature('');
    return newNonce;
  };

  const handleSignNonce = () => {
    if (!isConnected || !address) {
      uiConsole('Please connect your wallet first');
      return;
    }

    const currentNonce = nonce || generateNonce();
    const message = `Sign in to Cartfree: ${currentNonce}`;
    
    // For wagmi v2, signMessage is called directly and updates the signatureData
    signMessage({ message });
  };

  // Update signature when signatureData changes
  useEffect(() => {
    if (signatureData) {
      setSignature(signatureData);
      uiConsole('Signature successful:', { nonce, signature: signatureData });
    }
  }, [signatureData]);

  // Update signing state
  useEffect(() => {
    setSigning(signPending);
  }, [signPending]);

  return (
    <div className="dashboard">
      <Header
        isConnected={isConnected}
        onConnect={connect}
        onDisconnect={disconnect}
        connectLoading={connectLoading}
        disconnectLoading={disconnectLoading}
      />

      <div className="dashboard-content">
        <UserInfo
          isConnected={isConnected}
          address={address}
          connector={connector}
          userInfo={userInfo}
          onGetUserInfo={() => uiConsole(userInfo)}
        />

        <BlockchainActions isConnected={isConnected} />

        <Checkout isConnected={isConnected} userAddress={address} />
      </div>

      {connectLoading && <div className="loading">Connecting...</div>}
      {connectError && <div className="error">{connectError.message}</div>}
      {disconnectLoading && <div className="loading">Disconnecting...</div>}
      {disconnectError && <div className="error">{disconnectError.message}</div>}

      <div id="console" className="console">
        <p></p>
      </div>

      {/* Nonce Signing Section */}
      {isConnected && (
        <div className="nonce-section" style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Nonce Signing Test</h3>
          
          <button 
            onClick={handleSignNonce} 
            disabled={signing}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: signing ? '#ccc' : '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: signing ? 'not-allowed' : 'pointer'
            }}
          >
            {signing ? 'Signing...' : 'Sign Nonce'}
          </button>

          {nonce && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Nonce:</h4>
              <code style={{ wordBreak: 'break-all', display: 'block', margin: '0.5rem 0' }}>
                {nonce}
              </code>
            </div>
          )}

          {signature && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Signature:</h4>
              <code style={{ wordBreak: 'break-all', display: 'block', margin: '0.5rem 0' }}>
                {signature}
              </code>
            </div>
          )}

          {signError && (
            <div style={{ marginTop: '1rem', color: 'red' }}>
              <h4>Error:</h4>
              <p>{signError.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
