"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from "wagmi";
import { DashboardLayout } from "../../../components/DashboardLayout";
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

  const handleBuyItem = async () => {
    if (!item || !address) {
      setBuyMessage('Please connect your wallet to make a purchase');
      return;
    }

    setBuyLoading(true);
    setBuyMessage(null);

    try {
      const response = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          listingId: item.id,
          amount: item.price,
          sourceChain: 'base-sepolia'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase item');
      }

      setBuyMessage('Purchase successful! Item added to your orders.');
    } catch (err) {
      console.error('Error purchasing item:', err);
      setBuyMessage(err instanceof Error ? err.message : 'Failed to purchase item');
    } finally {
      setBuyLoading(false);
    }
  };

  const isOwnItem = address && item?.seller?.wallet_address?.toLowerCase() === address.toLowerCase();

  return (
    <DashboardLayout showDashboardContent={false}>
      {/* Item Detail Section */}
      <div className="marketplace-tabs">
        <div className="tab-content">
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
            <div className="tab-panel">
              <div className="item-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="item-content">
                  <div className="item-info">
                    <div className="item-header">
                      <h5>{item.title}</h5>
                    </div>
                    <p>{item.description}</p>
                    <div className="item-details">
                      <div className="item-price">${item.price} USDC</div>
                      <div className="item-status">Status: {item.status}</div>
                      {item.seller && (
                        <div className="item-seller">
                          Seller: {item.seller.wallet_address.substring(0, 8)}...{item.seller.wallet_address.substring(item.seller.wallet_address.length - 6)}
                        </div>
                      )}
                      {!isOwnItem && (
                        <button
                          className="buy-btn"
                          onClick={handleBuyItem}
                          disabled={buyLoading}
                          style={{ marginTop: '20px' }}
                        >
                          {buyLoading ? 'Processing...' : 'Buy Now'}
                        </button>
                      )}
                    </div>
                  </div>
                  {item.image_url && (
                    <div className="item-image-right">
                      <img src={item.image_url} alt={item.title} style={{ maxWidth: '400px' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
