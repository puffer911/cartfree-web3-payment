"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { Hex, parseUnits, encodeAbiParameters } from "viem";
import { DashboardLayout } from "../../../components/DashboardLayout";
import { ItemCard } from "../../../components/ItemCard";
import {
  ERC20_ABI,
  USDC_CONTRACTS,
  TOKEN_MESSENGER_ABI,
  TOKEN_MESSENGER_CONTRACTS,
  HOOK_EXECUTOR_CONTRACTS,
  CHAIN_DOMAINS,
} from "../../../components/wagmi/config";
import { performBuy } from '../../../lib/performBuy';
import '../../../components/App.css';

interface ItemDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  image_url?: string;
  seller?: {
    wallet_address: string;
  };
}

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { address } = useAccount();
  
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyMessage, setBuyMessage] = useState<string | null>(null);
  const [buyLabel, setBuyLabel] = useState<string | null>(null);
  const buyMessageTimeoutRef = React.useRef<number | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/marketplace/item/${itemId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch item');
        }

        setItem(result.item);
      } catch (err) {
        console.error('Error fetching item:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch item');
      } finally {
        setLoading(false);
      }
    };

    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const handleBuyItem = async (itemArg?: any) => {
    // Reuse shared performBuy helper (same behavior as marketplace tabs)
    // Accept optional itemArg so this function can be used as a callback from ItemCard (which passes the item)
    setBuyLoading(true);
    setBuyLabel(null);
    setBuyMessage(null);
    if (buyMessageTimeoutRef.current) {
      window.clearTimeout(buyMessageTimeoutRef.current);
      buyMessageTimeoutRef.current = null;
    }

    const targetItem = itemArg ?? item;

    try {
      const result = await performBuy({
        item: targetItem,
        buyerAddress: address as string,
        chainId: chainId as number | undefined,
        publicClient,
        writeContractAsync,
        onProgress: (step: string) => {
          const labels: Record<string, string> = {
            processing: 'Processing...',
            transferring: 'Transferring USDC...',
            burning: 'Burning (cross-chain)...',
            polling: 'Waiting for attestation...',
            finalizing: 'Finalizing on destination...',
            completed: 'Done'
          };
          setBuyLabel(labels[step] || step);
        }
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      setBuyMessage(result.message);

      // Hide success message after 5 seconds
      buyMessageTimeoutRef.current = window.setTimeout(() => {
        setBuyMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Error purchasing item:', err);
      setBuyMessage(err instanceof Error ? err.message : 'Failed to purchase item');

      // Hide error after 5s as well
      buyMessageTimeoutRef.current = window.setTimeout(() => {
        setBuyMessage(null);
      }, 5000);
    } finally {
      setBuyLoading(false);
      setBuyLabel(null);
    }
  };

  const isOwnItem = address && item?.seller?.wallet_address?.toLowerCase() === address.toLowerCase();

  return (
    <DashboardLayout showDashboardContent={false}>
      {/* Item Detail Section */}
      <div>
        {loading && (
          <div className="loading">Loading item details...</div>
        )}

        {error && (
          <div className="error">{error}</div>
        )}

        {buyMessage && (
          <div className={`message ${buyMessage.includes('success') ? 'success' : 'error'}`}>
            {buyMessage}
          </div>
        )}

          {!loading && !error && item && (
            <div style={{ width: '100%', maxWidth: '800px', margin: '20px auto 0' }}>
              <ItemCard
                item={item}
                currentUserAddress={address}
                onBuyItem={handleBuyItem}
                buyLoading={buyLoading}
                buyLabel={buyLoading ? buyLabel ?? undefined : undefined}
                showBuyButton={true}
                isClickable={false}
              />
            </div>
          )}
      </div>
    </DashboardLayout>
  );
}
