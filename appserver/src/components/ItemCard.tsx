import React, { useState, useCallback } from 'react';
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

  // Share menu + copy/share helpers
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const baseUrl = 'https://cartfree-web3-payment.vercel.app';
  const itemUrl = `${baseUrl}/item/${item.id}`;

  const toggleShareMenu = useCallback((e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setShowShareMenu((v) => !v);
  }, []);

  const handleCopyLink = useCallback(async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      await navigator.clipboard.writeText(itemUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', itemUrl);
    }
    setShowShareMenu(false);
  }, [itemUrl]);

  const handleShareX = useCallback((e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(itemUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  }, [itemUrl, item.title]);

  const handleShareWhatsApp = useCallback((e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(item.title + ' ' + itemUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  }, [itemUrl, item.title]);

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
        <div className="item-actions">
          <div className="share-container">
            <button
              onClick={toggleShareMenu}
              aria-label="Share"
              className="share-btn"
              title="Share"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.59 13.51L15.42 17.49" />
                <path d="M15.41 6.51L8.59 10.49" />
              </svg>
            </button>
            {showShareMenu && (
              <div className="share-menu share-menu-front">
                <button onClick={handleCopyLink} className="share-item">{copied ? 'Link copied' : 'Copy link'}</button>
                <button onClick={handleShareX} className="share-item">Share to X</button>
                <button onClick={handleShareWhatsApp} className="share-item">Share to WhatsApp</button>
              </div>
            )}
          </div>
          {showBuyButton && !isOwnItem && onBuyItem && (
            <BuyButton
              onClick={handleBuyClick}
              loading={buyLoading}
              label={buyLabel ?? undefined}
            />
          )}
        </div>
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
