import React, { useState } from 'react';

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
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
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
      <h3 className="card-title">
        <span className="card-icon">💳</span>
        Create Listing
      </h3>
      
      <div className="checkout-form">
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
            <img src={imagePreview} alt="Preview" />
            <button type="button" onClick={removeImage} className="remove-image-btn">
              Remove Image
            </button>
          </div>
        )}

        <button
          onClick={createListing}
          className="create-listing-btn"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Listing'}
        </button>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
