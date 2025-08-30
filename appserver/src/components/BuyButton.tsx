import React from 'react';

interface BuyButtonProps {
  onClick: (e: React.MouseEvent) => void;
  loading?: boolean;
  label?: string | null;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const BuyButton: React.FC<BuyButtonProps> = ({
  onClick,
  loading = false,
  label = null,
  disabled = false,
  className,
  style,
  title
}) => {
  const displayLabel = label ?? (loading ? 'Processing...' : 'Buy Now');

  return (
    <button
      type="button"
      className={className ?? 'buy-btn'}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
      title={title}
    >
      {displayLabel}
    </button>
  );
};

export default BuyButton;
