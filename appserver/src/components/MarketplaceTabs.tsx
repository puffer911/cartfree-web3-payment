import React, { useState } from 'react';

interface MarketplaceTabsProps {
  userAddress?: string;
}

export const MarketplaceTabs: React.FC<MarketplaceTabsProps> = ({ userAddress }) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'selling' | 'buying'>('listings');

  const tabs = [
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
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'listings' && (
          <div className="tab-panel">
            <h4>My Listing Items</h4>
            <p>Your created listings will appear here.</p>
            {!userAddress && (
              <p className="info-message">Connect your wallet to view your listings.</p>
            )}
          </div>
        )}

        {activeTab === 'selling' && (
          <div className="tab-panel">
            <h4>My Selling Orders</h4>
            <p>Your active sales and order history will appear here.</p>
            {!userAddress && (
              <p className="info-message">Connect your wallet to view your selling orders.</p>
            )}
          </div>
        )}

        {activeTab === 'buying' && (
          <div className="tab-panel">
            <h4>My Buying Orders</h4>
            <p>Your purchase history and active buys will appear here.</p>
            {!userAddress && (
              <p className="info-message">Connect your wallet to view your buying orders.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
