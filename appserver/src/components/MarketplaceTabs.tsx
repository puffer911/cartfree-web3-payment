import React, { useState, useEffect } from 'react';

interface MarketplaceTabsProps {
  userAddress?: string;
}

export const MarketplaceTabs: React.FC<MarketplaceTabsProps> = ({ userAddress }) => {
  const [activeTab, setActiveTab] = useState<'sale' | 'listings' | 'selling' | 'buying'>('sale');
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [sellingOrders, setSellingOrders] = useState<any[]>([]);
  const [buyingOrders, setBuyingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [buyMessage, setBuyMessage] = useState<string | null>(null);

  const fetchData = async (tab: 'sale' | 'listings' | 'selling' | 'buying') => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      let requiresAuth = false;
      
      switch (tab) {
        case 'sale':
          endpoint = '/api/marketplace/sale';
          break;
        case 'listings':
          endpoint = '/api/marketplace/listings';
          requiresAuth = true;
          break;
        case 'selling':
          endpoint = '/api/marketplace/selling';
          requiresAuth = true;
          break;
        case 'buying':
          endpoint = '/api/marketplace/buying';
          requiresAuth = true;
          break;
      }

      if (requiresAuth && !userAddress) {
        // For authenticated tabs, just set empty arrays instead of error
        switch (tab) {
          case 'listings':
            setListings([]);
            break;
          case 'selling':
            setSellingOrders([]);
            break;
          case 'buying':
            setBuyingOrders([]);
            break;
        }
        return;
      }

      const url = requiresAuth ? `${endpoint}?walletAddress=${userAddress}` : endpoint;
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      switch (tab) {
        case 'sale':
          setSaleItems(result.saleItems || []);
          break;
        case 'listings':
          setListings(result.listings || []);
          break;
        case 'selling':
          setSellingOrders(result.sellingOrders || []);
          break;
        case 'buying':
          setBuyingOrders(result.buyingOrders || []);
          break;
      }
    } catch (err) {
      console.error(`Error fetching ${tab}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, userAddress]);

  const handleTabChange = (tab: 'sale' | 'listings' | 'selling' | 'buying') => {
    setActiveTab(tab);
  };

  const handleBuyItem = async (item: any) => {
    if (!userAddress) {
      setBuyMessage('Please connect your wallet to make a purchase');
      return;
    }

    setBuyLoading(item.id);
    setBuyMessage(null);

    try {
      const response = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: userAddress,
          listingId: item.id,
          amount: item.price,
          sourceChain: 'base-sepolia' // Hardcoded as per requirements
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase item');
      }

      setBuyMessage('Purchase successful! Item added to your orders.');
      // Refresh the buying orders tab
      if (activeTab === 'buying') {
        fetchData('buying');
      }
    } catch (err) {
      console.error('Error purchasing item:', err);
      setBuyMessage(err instanceof Error ? err.message : 'Failed to purchase item');
    } finally {
      setBuyLoading(null);
    }
  };

  const tabs = [
    { id: 'sale' as const, label: 'Sale', icon: '🏷️' },
    { id: 'listings' as const, label: 'My Listing Items', icon: '📋' },
    { id: 'selling' as const, label: 'My Selling Order', icon: '💰' },
    { id: 'buying' as const, label: 'My Buying Order', icon: '🛒' }
  ];

  return (
    <div className="marketplace-tabs">
      {/* Tab Navigation */}
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            disabled={loading}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading && (
          <div className="loading">Loading...</div>
        )}

        {error && (
          <div className="error">{error}</div>
        )}

        {buyMessage && (
          <div className={`message ${buyMessage.includes('success') ? 'success' : 'error'}`}>
            {buyMessage}
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'sale' && (
              <div className="tab-panel">
                <h4>All Items for Sale ({saleItems.length})</h4>
                {saleItems.length === 0 ? (
                  <p>No items available for sale.</p>
                ) : (
                  <div className="items-list">
                    {saleItems.map((item) => (
                      <div key={item.id} className="item-card">
                        <h5>{item.title}</h5>
                        <p>{item.description}</p>
                        <div className="item-price">${item.price} USDC</div>
                        <div className="item-status">Status: {item.status}</div>
                        <div className="item-seller">
                          Seller: {item.seller?.wallet_address?.substring(0, 8)}...{item.seller?.wallet_address?.substring(item.seller.wallet_address.length - 6)}
                        </div>
                        <button
                          className="buy-btn"
                          onClick={() => handleBuyItem(item)}
                          disabled={buyLoading === item.id}
                        >
                          {buyLoading === item.id ? 'Processing...' : 'Buy Now'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'listings' && (
              <div className="tab-panel">
                <h4>My Listing Items ({listings.length})</h4>
                {listings.length === 0 ? (
                  <p>No listings found. Create your first listing to get started.</p>
                ) : (
                  <div className="items-list">
                    {listings.map((listing) => (
                      <div key={listing.id} className="item-card">
                        <h5>{listing.title}</h5>
                        <p>{listing.description}</p>
                        <div className="item-price">${listing.price} USDC</div>
                        <div className="item-status">Status: {listing.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'selling' && (
              <div className="tab-panel">
                <h4>My Selling Orders ({sellingOrders.length})</h4>
                {sellingOrders.length === 0 ? (
                  <p>No selling orders found. Your sales will appear here.</p>
                ) : (
                  <div className="orders-list">
                    {sellingOrders.map((order) => (
                      <div key={order.id} className="order-card">
                        <h5>{order.listings?.title || 'Unknown Listing'}</h5>
                        <p>Amount: ${order.amount} USDC</p>
                        <p>Buyer: {order.buyer?.wallet_address?.substring(0, 8)}...{order.buyer?.wallet_address?.substring(order.buyer.wallet_address.length - 6)}</p>
                        <div className="order-status">Status: {order.status}</div>
                        <div className="order-chain">Source: {order.source_chain}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'buying' && (
              <div className="tab-panel">
                <h4>My Buying Orders ({buyingOrders.length})</h4>
                {buyingOrders.length === 0 ? (
                  <p>No buying orders found. Your purchases will appear here.</p>
                ) : (
                  <div className="orders-list">
                    {buyingOrders.map((order) => (
                      <div key={order.id} className="order-card">
                        <h5>{order.listings?.title || 'Unknown Listing'}</h5>
                        <p>Amount: ${order.amount} USDC</p>
                        <p>Seller: {order.seller?.wallet_address?.substring(0, 8)}...{order.seller?.wallet_address?.substring(order.seller.wallet_address.length - 6)}</p>
                        <div className="order-status">Status: {order.status}</div>
                        <div className="order-chain">Source: {order.source_chain}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
