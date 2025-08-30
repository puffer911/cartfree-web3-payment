import React, { useState } from 'react';
import Image from 'next/image';

interface CheckoutProps {
  isConnected: boolean;
  userAddress?: string;
}

interface ListingFormData {
  title: string;
  description: string;
  price: number;
  image?: File;
}

export const Checkout: React.FC<CheckoutProps> = ({ isConnected, userAddress }) => {
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price: 0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Minimized (compact) state: show a small preview of the form by default
  const [minimized, setMinimized] = useState(true);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(jpeg|png)/)) {
      setMessage('Only JPEG and PNG images are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image must be less than 5MB');
      return;
    }

    setFormData(prev => ({ ...prev, image: file }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: undefined }));
    setImagePreview(null);
  };

  const createListing = async () => {
    if (!isConnected || !userAddress) {
      setMessage('Please connect your wallet first');
      return;
    }

    if (!formData.title || !formData.price) {
      setMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('walletAddress', userAddress);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price.toString());
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = await fetch('/api/listings/create', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create listing');
      }

      setMessage('Listing created successfully!');
      setFormData({
        title: '',
        description: '',
        price: 0
      });
      setImagePreview(null);

      // Optionally minimize the form after successful creation
      setMinimized(true);
    } catch (error) {
      console.error('Error creating listing:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="checkout-card">
        <h3 className="card-title">
          <span className="card-icon">💳</span>
          Marketplace
        </h3>
        <p>Connect your wallet to create listings and start selling on our decentralized marketplace.</p>
        <div className="info-item">
          <span>Status:</span>
          <span>Connect Required</span>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-card">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'space-between'}}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <span className="card-icon">💳</span>
          Create Listing
        </h3>
      </div>
      
      {/* Compact/minimized preview OR full form */}
      {minimized ? (
        <div className="checkout-form compact" style={{ marginTop: '12px' }}>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label htmlFor="title">Product Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter product title"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 8 }}>
            <label htmlFor="price">Price *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setMinimized(false)}
              className="show-more-btn"
              style={{
                background: '#ffffff',
                border: '1px solid #10B981',
                color: '#10B981',
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Show more
            </button>
            <div style={{ color: '#6b7280', fontSize: 13 }}>Click "Show more" to enter full details</div>
          </div>

          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`} style={{ marginTop: '10px' }}>
              {message}
            </div>
          )}
        </div>
      ) : (
        <div className="checkout-form" style={{ marginTop: '12px' }}>
          <div className="form-group">
            <label htmlFor="title">Product Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter product title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your product"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Product Image</label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
            />
            <small>Max 5MB, JPEG or PNG only</small>
          </div>

          {imagePreview && (
            <div className="image-preview">
              <Image src={imagePreview} alt="Preview" width={100} height={100} />
              <button type="button" onClick={removeImage} className="remove-image-btn">
                Remove Image
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={createListing}
              className="create-listing-btn"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>

            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="hide-form-btn"
              style={{
                background: 'transparent',
                border: '1px solid #ddd',
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Hide
            </button>
          </div>

          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`} style={{ marginTop: '10px' }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
