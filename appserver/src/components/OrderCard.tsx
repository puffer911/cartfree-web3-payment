import React from 'react';

interface Order {
  id: string;
  amount: number;
  status: string;
  source_chain: string;
  listings?: {
    title: string;
  };
  buyer?: {
    wallet_address: string;
  };
  seller?: {
    wallet_address: string;
  };
}

interface OrderCardProps {
  order: Order;
  type: 'selling' | 'buying';
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, type }) => {
  const getCounterpartyLabel = () => (type === 'selling' ? 'Buyer' : 'Seller');

  const getCounterpartyAddress = () => {
    const counterparty = type === 'selling' ? order.buyer : order.seller;
    return counterparty?.wallet_address || 'Unknown';
  };

  const formatAddress = (address: string) => {
    if (!address || address === 'Unknown') return 'Unknown';
    const a = address.trim();
    if (!a.startsWith('0x') || a.length < 10) return a;
    return `${a.substring(0, 8)}...${a.substring(a.length - 6)}`;
  };

  const formatAmount = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return amount.toFixed(2);
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return 'Unknown';
    const s = status.replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatChain = (chain: string) => {
    if (!chain) return 'Unknown';
    // Basic prettify; adjust mapping if needed
    switch (chain.toLowerCase()) {
      case 'base':
      case 'base sepolia':
        return 'Base Sepolia';
      case 'arbitrum':
      case 'arbitrum sepolia':
        return 'Arbitrum Sepolia';
      case 'ethereum':
      case 'sepolia':
        return 'Ethereum Sepolia';
      default:
        return chain;
    }
  };

  const counterpartyAddress = getCounterpartyAddress();

  return (
    <div className="order-card">
      <h5 title={order.listings?.title || 'Unknown Listing'}>
        {order.listings?.title || 'Unknown Listing'}
      </h5>

      <p>
        Amount: {formatAmount(order.amount)} USDC
      </p>

      <p title={counterpartyAddress}>
        {getCounterpartyLabel()}: {formatAddress(counterpartyAddress)}
      </p>

      <div className="order-status">
        Status: {formatStatus(order.status)}
      </div>

      <div className="order-chain">
        Source: {formatChain(order.source_chain)}
      </div>
    </div>
  );
};
