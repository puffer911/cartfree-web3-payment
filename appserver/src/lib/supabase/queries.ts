import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Reusable Supabase query helpers for marketplace transactions and users.
 * Functions accept a Supabase client instance so they can be used in server routes.
 */

/**
 * Fetch a user record by wallet address.
 * Returns null if not found.
 */
export async function getUserByWallet(supabase: SupabaseClient, walletAddress: string) {
  if (!walletAddress) return null;
  const { data: user, error } = await supabase
    .from('users')
    .select('id, wallet_address')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) return null;
  return user;
}

/**
 * Fetch transactions where the provided walletAddress is the seller.
 * Ensures joined buyer and seller objects are present; if missing, fills the seller.wallet_address
 * with the provided walletAddress so the UI doesn't see "Unknown".
 */
export async function getSellingOrders(supabase: SupabaseClient, walletAddress: string) {
  const user = await getUserByWallet(supabase, walletAddress);
  if (!user) return [];

  const { data: sellingOrders, error } = await supabase
    .from('transactions')
    .select(`
      *,
      listings:listing_id (
        title,
        description,
        price
      ),
      buyer:buyer_id (
        wallet_address
      ),
      seller:seller_id (
        wallet_address
      )
    `)
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !sellingOrders) return [];

  // Normalize missing joins: ensure seller exists with wallet_address fallback
  return sellingOrders.map((tx: any) => {
    if (!tx.seller || !tx.seller.wallet_address) {
      tx.seller = { wallet_address: walletAddress };
    }
    if (!tx.buyer) {
      tx.buyer = { wallet_address: 'Unknown' };
    }
    return tx;
  });
}

/**
 * Fetch transactions where the provided walletAddress is the buyer.
 * Ensures joined buyer and seller objects are present; if missing, fills the buyer.wallet_address
 * with the provided walletAddress so the UI doesn't see "Unknown" on checkout.
 */
export async function getBuyingOrders(supabase: SupabaseClient, walletAddress: string) {
  const user = await getUserByWallet(supabase, walletAddress);
  if (!user) return [];

  const { data: buyingOrders, error } = await supabase
    .from('transactions')
    .select(`
      *,
      listings:listing_id (
        title,
        description,
        price
      ),
      buyer:buyer_id (
        wallet_address
      ),
      seller:seller_id (
        wallet_address
      )
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !buyingOrders) return [];

  // Normalize missing joins: ensure buyer exists with wallet_address fallback
  return buyingOrders.map((tx: any) => {
    if (!tx.buyer || !tx.buyer.wallet_address) {
      tx.buyer = { wallet_address: walletAddress };
    }
    if (!tx.seller) {
      tx.seller = { wallet_address: 'Unknown' };
    }
    return tx;
  });
}

/**
 * Utility: fetch a single transaction by id with joins.
 */
export async function getTransactionById(supabase: SupabaseClient, transactionId: string) {
  const { data: tx, error } = await supabase
    .from('transactions')
    .select(`
      *,
      listings:listing_id (
        title,
        description,
        price
      ),
      buyer:buyer_id (
        wallet_address
      ),
      seller:seller_id (
        wallet_address
      )
    `)
    .eq('id', transactionId)
    .single();

  if (error) return null;
  return tx;
}
