import React from 'react';
import Image from 'next/image';
import BuyButton from './BuyButton';

interface Item {
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

interface ItemCardProps {
  item: Item;
  currentUserAddress?: string;
  onBuyItem?: (item: Item) => void;
  buyLoading?: boolean;
  buyLabel?: string;
  showBuyButton?: boolean;
  isClickable?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  currentUserAddress,
  onBuyItem,
  buyLoading = false,
  buyLabel,
  showBuyButton = true,
  isClickable = true
}) => {
  const isOwnItem = currentUserAddress && item.seller?.wallet_address?.toLowerCase() === currentUserAddress.toLowerCase();
  
  const handleClick = (e: React.MouseEvent) => {
    if (!isClickable) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    // Prevent anchor navigation when clicking the Buy button and stop bubbling
    e.preventDefault();
    e.stopPropagation();
    if (onBuyItem && !isOwnItem) {
      onBuyItem(item);
    }
  };

  const cardContent = (
    <div className="item-content">
      <div className="item-info">
        <div className="item-header">
          <h5>{item.title}</h5>
        </div>
        <p style={{ whiteSpace: 'pre-line' }}>{item.description}</p>
        <div className="item-details">
          <div className="item-price">${item.price} USDC</div>
          <div className="item-status">Status: {item.status}</div>
          {item.seller && (
            <div className="item-seller">
              Seller: {item.seller.wallet_address.substring(0, 8)}...{item.seller.wallet_address.substring(item.seller.wallet_address.length - 6)}
            </div>
          )}
        </div>
        {showBuyButton && !isOwnItem && onBuyItem && (
          <BuyButton
            onClick={handleBuyClick}
            loading={buyLoading}
            label={buyLabel ?? undefined}
            style={{ marginTop: '15px' }}
          />
        )}
      </div>
      {item.image_url && (
        <div className="item-image-right">
          <Image src={item.image_url} alt={item.title} width={500} height={500} />
        </div>
      )}
    </div>
  );

  if (isClickable) {
    return (
      <a 
        href={`/item/${item.id}`} 
        className="item-card" 
        style={{ textDecoration: 'none' }}
        onClick={handleClick}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div className="item-card">
      {cardContent}
    </div>
  );
};
