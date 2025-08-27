import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
console.log(supabaseUrl)
console.log(888)
const supabase = createClient(supabaseUrl, supabaseKey);

interface CheckoutProps {
  isConnected: boolean;
  userAddress?: string;
}

interface ListingFormData {
  title: string;
  description: string;
  price: number;
  currency: string;
}

export const Checkout: React.FC<CheckoutProps> = ({ isConnected, userAddress }) => {
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price: 0,
    currency: 'USDC'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
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
      // First, create or get user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', userAddress)
        .single();

      let userId = existingUser?.id;

      if (!userId) {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([{ wallet_address: userAddress }])
          .select('id')
          .single();

        if (userError) {
          throw new Error('Failed to create user: ' + userError.message);
        }
        userId = newUser.id;
      }

      // Create listing
      const { data, error } = await supabase
        .from('listings')
        .insert([
          {
            seller_id: userId,
            title: formData.title,
            description: formData.description,
            price: formData.price,
            currency: formData.currency,
            status: 'active'
          }
        ])
        .select()
        .single();

      if (error) {
        throw new Error('Failed to create listing: ' + error.message);
      }

      setMessage('Listing created successfully!');
      setFormData({
        title: '',
        description: '',
        price: 0,
        currency: 'USDC'
      });

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
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleInputChange}
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
            <option value="ETH">ETH</option>
          </select>
        </div>

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