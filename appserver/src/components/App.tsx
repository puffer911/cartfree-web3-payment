import { useAccount, useSignMessage } from "wagmi";
import { MarketplaceTabs } from "./MarketplaceTabs";
import { DashboardLayout } from "./DashboardLayout";
import { useState, useEffect } from 'react';
import { useWeb3AuthUser } from "@web3auth/modal/react";

function App() {
  const { address } = useAccount();
  const { userInfo } = useWeb3AuthUser();
  const { signMessage, data: signatureData, isPending: signPending } = useSignMessage();
  
  const [nonce, setNonce] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

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
    if (!address) {
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
    if (address && userInfo) {
      setIsConnected(true);
      // Trigger automatic signing when user connects
      handleSignNonce();
    } else {
      setIsConnected(false);
    }
  }, [address, userInfo, handleSignNonce]);

  return (
    <DashboardLayout>
      {/* Marketplace Tabs */}
      <MarketplaceTabs userAddress={address} />
    </DashboardLayout>
  );
}

export default App;
