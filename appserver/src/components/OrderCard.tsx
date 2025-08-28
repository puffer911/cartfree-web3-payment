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
  const getCounterpartyLabel = () => {
    return type === 'selling' ? 'Buyer' : 'Seller';
  };

  const getCounterpartyAddress = () => {
    const counterparty = type === 'selling' ? order.buyer : order.seller;
    return counterparty?.wallet_address || 'Unknown';
  };

  const formatAddress = (address: string) => {
    if (address === 'Unknown') return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  return (
    <div className="order-card">
      <h5>{order.listings?.title || 'Unknown Listing'}</h5>
      <p>Amount: ${order.amount} USDC</p>
      <p>{getCounterpartyLabel()}: {formatAddress(getCounterpartyAddress())}</p>
      <div className="order-status">Status: {order.status}</div>
      <div className="order-chain">Source: {order.source_chain}</div>
    </div>
  );
};
